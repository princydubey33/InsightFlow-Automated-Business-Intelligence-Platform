import unittest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.routes.auth import hash_password
from app.config import settings

# In-memory SQLite for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

class TestPasswordResetFlow(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.db = TestingSessionLocal()
        self.client = TestClient(app)

        # Create a test user
        self.test_email = "regular_user@example.com"
        self.test_password = "OriginalPassword123!"
        self.user = User(
            name="Regular User",
            email=self.test_email,
            password=hash_password(self.test_password),
            role="User"
        )
        self.db.add(self.user)

        # Create a second user to test dynamic recipient isolation
        self.second_email = "another_person@example.com"
        self.second_user = User(
            name="Another Person",
            email=self.second_email,
            password=hash_password("OtherPassword456!"),
            role="User"
        )
        self.db.add(self.second_user)
        self.db.commit()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=engine)

    @patch("app.routes.auth.send_reset_email")
    def test_email_recipient_selection(self, mock_send_email):
        """Test that password reset email is sent specifically to the requesting user."""
        mock_send_email.return_value = True

        # Request reset for regular_user@example.com
        res1 = self.client.post("/api/auth/forgot-password", json={"email": self.test_email})
        self.assertEqual(res1.status_code, 200)
        self.assertIn("regular_user@example.com", res1.json()["message"])

        mock_send_email.assert_called_once()
        recipient1, reset_link1 = mock_send_email.call_args[0]
        self.assertEqual(recipient1, self.test_email)
        self.assertIn("/reset-password?token=", reset_link1)
        self.assertIn(f"email={self.test_email}", reset_link1)
        self.assertTrue(reset_link1.startswith(settings.frontend_url.rstrip("/")))

        # Now request reset for another_person@example.com
        mock_send_email.reset_mock()
        res2 = self.client.post("/api/auth/forgot-password", json={"email": self.second_email})
        self.assertEqual(res2.status_code, 200)
        self.assertIn("another_person@example.com", res2.json()["message"])

        mock_send_email.assert_called_once()
        recipient2, reset_link2 = mock_send_email.call_args[0]
        self.assertEqual(recipient2, self.second_email)
        self.assertNotEqual(recipient2, self.test_email)
        self.assertIn(f"email={self.second_email}", reset_link2)

    @patch("app.routes.auth.send_reset_email")
    def test_token_expiry(self, mock_send_email):
        """Test that tokens older than 1 hour cannot be used to reset passwords."""
        mock_send_email.return_value = True

        # Request reset
        self.client.post("/api/auth/forgot-password", json={"email": self.test_email})
        _, reset_link = mock_send_email.call_args[0]
        token = reset_link.split("token=")[1].split("&")[0]

        # Simulate expired token (> 1 hour in the past)
        db_user = self.db.query(User).filter(User.email == self.test_email).first()
        db_user.reset_token_expires = datetime.now(timezone.utc) - timedelta(minutes=5)
        self.db.commit()

        # Attempt to reset password with expired token
        res = self.client.post("/api/auth/reset-password", json={
            "token": token,
            "new_password": "NewSecretPassword123!"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("expired", res.json()["detail"].lower())

    def test_invalid_tokens(self):
        """Test that non-existent or tampered tokens are rejected."""
        res = self.client.post("/api/auth/reset-password", json={
            "token": "completely_fake_token_12345",
            "new_password": "NewSecretPassword123!"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid or expired", res.json()["detail"])

    @patch("app.routes.auth.send_reset_email")
    def test_successful_password_reset_and_single_use(self, mock_send_email):
        """Test complete successful password reset flow and verify single-use enforcement."""
        mock_send_email.return_value = True

        # 1. Request reset
        res_req = self.client.post("/api/auth/forgot-password", json={"email": self.test_email})
        self.assertEqual(res_req.status_code, 200)

        # Extract token
        _, reset_link = mock_send_email.call_args[0]
        token = reset_link.split("token=")[1].split("&")[0]

        # 2. Reset password
        new_password = "BrandNewSecurePassword123!"
        res_reset = self.client.post("/api/auth/reset-password", json={
            "token": token,
            "new_password": new_password
        })
        self.assertEqual(res_reset.status_code, 200)
        self.assertIn("successfully", res_reset.json()["message"])

        # 3. Old password should fail login
        old_login = self.client.post("/api/auth/login", json={
            "email": self.test_email,
            "password": self.test_password
        })
        self.assertEqual(old_login.status_code, 401)

        # 4. New password should succeed login
        new_login = self.client.post("/api/auth/login", json={
            "email": self.test_email,
            "password": new_password
        })
        self.assertEqual(new_login.status_code, 200)
        self.assertEqual(new_login.json()["email"], self.test_email)

        # 5. Token reuse MUST fail (single-use token)
        reuse_attempt = self.client.post("/api/auth/reset-password", json={
            "token": token,
            "new_password": "AnotherPassword789!"
        })
        self.assertEqual(reuse_attempt.status_code, 400)

    @patch("app.routes.auth.send_reset_email")
    def test_missing_smtp_configuration_graceful_handling(self, mock_send_email):
        """Test that if email delivery fails or SMTP is unconfigured, token is cleared and clean 500 is returned."""
        mock_send_email.return_value = False

        res = self.client.post("/api/auth/forgot-password", json={"email": self.test_email})
        self.assertEqual(res.status_code, 500)
        self.assertIn("SMTP", res.json()["detail"])

        # Verify token was NOT left in DB
        db_user = self.db.query(User).filter(User.email == self.test_email).first()
        self.assertIsNone(db_user.reset_token)
        self.assertIsNone(db_user.reset_token_expires)

    def test_short_password_rejected(self):
        """Test that new password under 8 characters is rejected."""
        res = self.client.post("/api/auth/reset-password", json={
            "token": "any_token",
            "new_password": "short"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("at least 8 characters", res.json()["detail"])

    def test_signup_and_login_regression(self):
        """Ensure standard signup and login flows are not broken."""
        # Signup
        signup_res = self.client.post("/api/auth/signup", json={
            "name": "New User",
            "email": "newbie@example.com",
            "password": "Password999!"
        })
        self.assertEqual(signup_res.status_code, 200)
        self.assertEqual(signup_res.json()["email"], "newbie@example.com")

        # Duplicate signup fails
        dup_res = self.client.post("/api/auth/signup", json={
            "name": "New User 2",
            "email": "newbie@example.com",
            "password": "Password999!"
        })
        self.assertEqual(dup_res.status_code, 400)

        # Login
        login_res = self.client.post("/api/auth/login", json={
            "email": "newbie@example.com",
            "password": "Password999!"
        })
        self.assertEqual(login_res.status_code, 200)

    @patch("smtplib.SMTP")
    def test_email_service_smtp_dispatch(self, mock_smtp_cls):
        """Test direct send_reset_email function dispatches to SMTP server correctly."""
        from app.services.email_service import send_reset_email

        mock_server = MagicMock()
        mock_smtp_cls.return_value = mock_server

        with patch.object(settings, "smtp_host", "smtp.test.com"), \
             patch.object(settings, "smtp_user", "test_smtp_user@example.com"), \
             patch.object(settings, "smtp_password", "test_smtp_pass"), \
             patch.object(settings, "smtp_port", 587):
            success = send_reset_email("target_recipient@example.com", "https://frontend.com/reset-password?token=abc")
            self.assertTrue(success)
            mock_smtp_cls.assert_called_with("smtp.test.com", 587, timeout=15)
            mock_server.starttls.assert_called_once()
            mock_server.login.assert_called_with("test_smtp_user@example.com", "test_smtp_pass")
            self.assertTrue(mock_server.sendmail.called)
            # Verify recipient
            _, call_args, _ = mock_server.sendmail.mock_calls[0]
            self.assertIn("target_recipient@example.com", call_args[1])

if __name__ == "__main__":
    unittest.main()
