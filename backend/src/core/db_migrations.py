"""SQLite one-off migrations and safety checks after ``db.create_all()``."""

from __future__ import annotations

from datetime import datetime

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect, text


def run_sqlite_migrations(db: SQLAlchemy) -> None:
    """
    Best-effort schema updates for existing SQLite databases.

    Safe to call on every startup; failures are logged and ignored when columns/tables already match.
    """
    _migrate_prices_table_rename(db)
    try:
        inspector = inspect(db.engine)
        _migrate_users_table(db, inspector)
        _migrate_user_settings_columns(db, inspector)
        _ensure_project_users_table(db, inspector)
    except Exception as e:
        print(f"Note: Could not migrate database schema: {e}")
        try:
            db.session.rollback()
        except Exception:
            pass


def _migrate_prices_table_rename(db: SQLAlchemy) -> None:
    try:
        with db.engine.begin() as conn:
            has_new = conn.execute(
                text("SELECT 1 FROM sqlite_master WHERE type='table' AND name='coder_prices'")
            ).fetchone()
            has_old = conn.execute(
                text("SELECT 1 FROM sqlite_master WHERE type='table' AND name='bitcoin_prices'")
            ).fetchone()
            if not has_new and has_old:
                conn.execute(text("ALTER TABLE bitcoin_prices RENAME TO coder_prices"))
                print("Migrated table bitcoin_prices -> coder_prices")
    except Exception as rename_err:
        print(f"Note: price table rename skipped: {rename_err}")


def _migrate_users_table(db: SQLAlchemy, inspector) -> None:
    try:
        user_columns = [col["name"] for col in inspector.get_columns("users")]
        with db.engine.connect() as conn:
            result = conn.execute(text("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'"))
            create_sql = result.fetchone()
            if create_sql and create_sql[0]:
                sql_str = create_sql[0].upper()
                if "ID INTEGER" in sql_str or "ID INT" in sql_str:
                    print("ERROR: users.id column is INTEGER but should be VARCHAR(36) for UUIDs.")
                    print("The users table needs to be recreated. Attempting to fix...")
                    try:
                        existing_users = conn.execute(text("SELECT * FROM users")).fetchall()
                        print(f"Found {len(existing_users)} existing users to migrate")

                        conn.execute(
                            text("""
                                    CREATE TABLE users_new (
                                        id VARCHAR(36) PRIMARY KEY,
                                        username VARCHAR(80) UNIQUE NOT NULL,
                                        email VARCHAR(120) UNIQUE,
                                        password_hash VARCHAR(255) NOT NULL,
                                        name VARCHAR(200),
                                        address TEXT,
                                        profile_image VARCHAR(500),
                                        is_active BOOLEAN NOT NULL DEFAULT 1,
                                        is_admin BOOLEAN NOT NULL DEFAULT 0,
                                        created_at DATETIME NOT NULL,
                                        last_login DATETIME
                                    )
                                """)
                        )

                        import uuid as uuid_module

                        for user_row in existing_users:
                            new_id = str(uuid_module.uuid4())
                            conn.execute(
                                text("""
                                        INSERT INTO users_new (id, username, email, password_hash, name, address, 
                                                              profile_image, is_active, is_admin, created_at, last_login)
                                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                                    """),
                                (
                                    new_id,
                                    user_row[1] if len(user_row) > 1 else None,
                                    user_row[2] if len(user_row) > 2 else None,
                                    user_row[3] if len(user_row) > 3 else None,
                                    user_row[4] if len(user_row) > 4 else None,
                                    user_row[5] if len(user_row) > 5 else None,
                                    user_row[6] if len(user_row) > 6 else None,
                                    user_row[7] if len(user_row) > 7 else 1,
                                    user_row[8] if len(user_row) > 8 else 0,
                                    user_row[9] if len(user_row) > 9 else datetime.utcnow(),
                                    user_row[10] if len(user_row) > 10 else None,
                                ),
                            )

                        conn.execute(text("DROP TABLE users"))
                        conn.execute(text("ALTER TABLE users_new RENAME TO users"))
                        conn.commit()
                        print("Successfully migrated users table to use VARCHAR(36) for IDs")
                    except Exception as migrate_error:
                        conn.rollback()
                        print(f"Failed to migrate users table: {migrate_error}")
                        print("You may need to manually fix the database schema")

            if "name" not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN name VARCHAR(200)"))
                conn.commit()
            if "address" not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN address TEXT"))
                conn.commit()
            if "profile_image" not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN profile_image VARCHAR(500)"))
                conn.commit()
    except Exception as e:
        print(f"Note: Could not migrate users table: {e}")


def _migrate_user_settings_columns(db: SQLAlchemy, inspector) -> None:
    try:
        settings_columns = [col["name"] for col in inspector.get_columns("user_settings")]
        with db.engine.connect() as conn:
            if "ai_auto_apply" not in settings_columns:
                conn.execute(text("ALTER TABLE user_settings ADD COLUMN ai_auto_apply INTEGER DEFAULT 1"))
                conn.commit()
            if "selected_agent_id" not in settings_columns:
                conn.execute(text("ALTER TABLE user_settings ADD COLUMN selected_agent_id INTEGER"))
                conn.commit()
            if "git_use_git" not in settings_columns:
                conn.execute(text("ALTER TABLE user_settings ADD COLUMN git_use_git INTEGER DEFAULT 0"))
                conn.commit()
            if "git_repo_path" not in settings_columns:
                conn.execute(text("ALTER TABLE user_settings ADD COLUMN git_repo_path VARCHAR(500)"))
                conn.commit()
            if "git_repo_url" not in settings_columns:
                conn.execute(text("ALTER TABLE user_settings ADD COLUMN git_repo_url VARCHAR(500)"))
                conn.commit()
            if "git_auto_commit" not in settings_columns:
                conn.execute(text("ALTER TABLE user_settings ADD COLUMN git_auto_commit INTEGER DEFAULT 0"))
                conn.commit()
            if "use_file_system" not in settings_columns:
                conn.execute(text("ALTER TABLE user_settings ADD COLUMN use_file_system INTEGER DEFAULT 1"))
                conn.commit()
            if "additional_settings" not in settings_columns:
                conn.execute(text("ALTER TABLE user_settings ADD COLUMN additional_settings TEXT"))
                conn.commit()
    except Exception as e:
        print(f"Note: Could not migrate user_settings table: {e}")
        try:
            db.session.rollback()
        except Exception:
            pass


def _ensure_project_users_table(db: SQLAlchemy, inspector) -> None:
    try:
        tables = inspector.get_table_names()
        if "project_users" not in tables:
            print("Warning: project_users table does not exist. It should be created by db.create_all()")
            with db.engine.connect() as conn:
                conn.execute(
                    text("""
                            CREATE TABLE IF NOT EXISTS project_users (
                                project_id VARCHAR(36) NOT NULL,
                                user_id VARCHAR(36) NOT NULL,
                                role VARCHAR(50) DEFAULT 'member',
                                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                PRIMARY KEY (project_id, user_id),
                                FOREIGN KEY (project_id) REFERENCES projects(id),
                                FOREIGN KEY (user_id) REFERENCES users(id)
                            )
                        """)
                )
                conn.commit()
            print("Created project_users table manually")
    except Exception as e:
        print(f"Note: Could not ensure project_users table exists: {e}")
        try:
            db.session.rollback()
        except Exception:
            pass
