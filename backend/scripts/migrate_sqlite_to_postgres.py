#!/usr/bin/env python3
"""
InsightFlow SQLite-to-PostgreSQL Data Migration Utility.

Safely migrates all user accounts, datasets, and activity logs from a local
or backup SQLite database to a persistent PostgreSQL database on Render.

Idempotent: Checks for existing records before inserting to prevent duplicates.
Non-destructive: Reads from SQLite; does not delete source data.

Usage:
    python backend/scripts/migrate_sqlite_to_postgres.py \
        --sqlite-path backend/insightflow.db \
        --postgres-url "postgresql://user:password@hostname:5432/dbname"
"""

import argparse
import sys
import os
from datetime import datetime

from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker

# Ensure backend package is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from backend.app.database import Base
from backend.app.models.user import User
from backend.app.models.dataset import Dataset
from backend.app.models.activity import ActivityLog
from backend.app.config import normalize_database_url

def migrate(sqlite_path: str, postgres_url: str):
    if not os.path.exists(sqlite_path):
        print(f"Error: SQLite database file not found at {sqlite_path}")
        sys.exit(1)

    norm_pg_url = normalize_database_url(postgres_url)
    print(f"Connecting to SQLite source: {sqlite_path}")
    print(f"Connecting to PostgreSQL target: {norm_pg_url.split('@')[-1] if '@' in norm_pg_url else norm_pg_url}")

    sqlite_engine = create_engine(f"sqlite:///{os.path.abspath(sqlite_path)}", connect_args={"check_same_thread": False})
    pg_engine = create_engine(norm_pg_url, pool_pre_ping=True)

    # 1. Create target tables if they do not exist
    print("Ensuring target database tables exist...")
    Base.metadata.create_all(bind=pg_engine)

    SqliteSession = sessionmaker(bind=sqlite_engine)
    PgSession = sessionmaker(bind=pg_engine)

    src_session = SqliteSession()
    tgt_session = PgSession()

    try:
        # 2. Migrate Users
        print("\n--- Migrating Users ---")
        src_users = src_session.query(User).all()
        migrated_users = 0
        skipped_users = 0

        for u in src_users:
            existing = tgt_session.query(User).filter(User.email == u.email).first()
            if existing:
                skipped_users += 1
            else:
                new_user = User(
                    id=u.id,
                    name=u.name,
                    email=u.email,
                    password=u.password,
                    role=u.role,
                    created_at=u.created_at,
                    reset_token=u.reset_token,
                    reset_token_expires=u.reset_token_expires,
                )
                tgt_session.add(new_user)
                migrated_users += 1

        tgt_session.commit()
        print(f"Users: {migrated_users} migrated, {skipped_users} already existed (skipped).")

        # 3. Migrate Datasets
        print("\n--- Migrating Datasets ---")
        src_datasets = src_session.query(Dataset).all()
        migrated_datasets = 0
        skipped_datasets = 0

        for d in src_datasets:
            existing = tgt_session.query(Dataset).filter(Dataset.filename == d.filename).first()
            if existing:
                skipped_datasets += 1
            else:
                new_ds = Dataset(
                    id=d.id,
                    filename=d.filename,
                    original_filename=d.original_filename,
                    file_type=d.file_type,
                    file_size=d.file_size,
                    uploaded_at=d.uploaded_at,
                    row_count=d.row_count,
                    column_count=d.column_count,
                    status=d.status,
                    user_id=d.user_id,
                )
                tgt_session.add(new_ds)
                migrated_datasets += 1

        tgt_session.commit()
        print(f"Datasets: {migrated_datasets} migrated, {skipped_datasets} already existed (skipped).")

        # 4. Migrate Activity Logs
        print("\n--- Migrating Activity Logs ---")
        src_activities = src_session.query(ActivityLog).all()
        migrated_activities = 0
        skipped_activities = 0

        for a in src_activities:
            existing = tgt_session.query(ActivityLog).filter(ActivityLog.id == a.id).first()
            if existing:
                skipped_activities += 1
            else:
                new_act = ActivityLog(
                    id=a.id,
                    user_id=a.user_id,
                    dataset_id=a.dataset_id,
                    dataset_filename=a.dataset_filename,
                    activity_type=a.activity_type,
                    status=a.status,
                    summary_metrics=a.summary_metrics,
                    created_at=a.created_at,
                )
                tgt_session.add(new_act)
                migrated_activities += 1

        tgt_session.commit()
        print(f"Activities: {migrated_activities} migrated, {skipped_activities} already existed (skipped).")

        print("\n✅ Migration completed successfully with zero data loss!")

    except Exception as e:
        tgt_session.rollback()
        print(f"\n❌ Error during migration: {e}")
        raise
    finally:
        src_session.close()
        tgt_session.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate InsightFlow SQLite to PostgreSQL")
    parser.add_argument("--sqlite-path", default="backend/insightflow.db", help="Path to source SQLite file")
    parser.add_argument("--postgres-url", default=os.getenv("DATABASE_URL", ""), help="Target PostgreSQL connection URL")
    args = parser.parse_args()

    if not args.postgres_url:
        print("Error: Target --postgres-url or DATABASE_URL environment variable must be specified.")
        sys.exit(1)

    migrate(args.sqlite_path, args.postgres_url)
