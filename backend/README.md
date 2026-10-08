# InsightFlow Backend

This is the FastAPI backend for the InsightFlow platform.

## Requirements
- Python 3.9+
- SQLite (for local dev)

## Setup Instructions

1. **Create Virtual Environment**
   ```bash
   cd backend
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # Mac/Linux:
   source venv/bin/activate
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   ```

4. **Start the Server**
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend will be available at `http://127.0.0.1:8000`.

## API Documentation

- **Swagger UI:** `http://127.0.0.1:8000/docs`
- **ReDoc:** `http://127.0.0.1:8000/redoc`

## Database

By default, the backend uses SQLite (`insightflow.db`). To use PostgreSQL, update the `DATABASE_URL` in the `.env` file.
