"""Assemble the Flask application: config, extensions, routes, database bootstrap."""

from flask import Flask
from sqlalchemy.exc import OperationalError, ProgrammingError

from src.core.blueprints import register_default_blueprints
from src.core.config import apply_flask_config
from src.core.cors import init_cors
from src.core.db_migrations import run_sqlite_migrations
from src.core.health import register_health_routes
from src.core.paths import BACKEND_ROOT
from src.models import db


def create_app() -> Flask:
    app = Flask(__name__)

    apply_flask_config(app, backend_root=BACKEND_ROOT)
    init_cors(app)
    db.init_app(app)

    register_default_blueprints(app)
    register_health_routes(app)

    with app.app_context():
        try:
            db.create_all()
        except (OperationalError, ProgrammingError) as e:
            # SQLite often raises if an index from an older schema already exists
            msg = str(e.orig) if getattr(e, "orig", None) else str(e)
            if "already exists" in msg.lower():
                print(f"Note: db.create_all skipped overlapping DDL ({msg})")
            else:
                raise
        run_sqlite_migrations(db)

    return app
