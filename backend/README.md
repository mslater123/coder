# Coder backend

Flask API for the **Coder** app: authentication, projects, code editor filesystem, design docs, LLM routes, and GPU management.

## Layout

- **`app.py`** — WSGI entrypoint (adds `backend/` to `sys.path`, builds the app via `create_app()`).
- **`src/core/`** — App wiring: `app_factory.create_app()`, `config`, `cors`, `db_migrations`, `blueprints`, `health`, `paths`, `exceptions`, `constants`.
- **`src/application.py`** — Re-exports `create_app` from `src.core.app_factory` (stable import for older docs/tools).
- **`src/models/`** — SQLAlchemy `db` (`base.py`) and domain modules (user, ledger, gpu, llm, project, etc.).
- **`src/api/routers/`** — Blueprints (auth, users, projects, code editor, design docs, LLM, GPUs, etc.).
- **`src/services/`** — Domain/logic helpers used by routers.
- **`src/schemas/`** — Pydantic models for JSON request validation; use `parse_json(request, Schema)` from `src.schemas.common` in routes when adopting strict validation.
- **`src/utils/`** — Small shared helpers: `get_current_user_id(request)`, `get_request_json`, `safe_json_loads` / `safe_json_dumps`, `utc_now` / `parse_iso_datetime`, `truncate`, etc.

## Quick start

**macOS/Linux:** `./start.sh` · **Windows:** `start.bat`

Or manually: `python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && python app.py`

API base: `http://localhost:5000` · Health: `GET /api/health`

## Environment

- `DATABASE_URL` — SQLAlchemy URL (default: SQLite `instance/coder.db` under `backend/`)
- `FLASK_APP`, `FLASK_DEBUG`, `PORT`

## Default blueprints

Registered in `src/application.py`: auth, users, projects, code editor, design docs, LLM + LLM manager, GPUs.

Optional blueprint modules under `src/api/routers/` (e.g. `price_routes`, `wallet_routes`, `transaction_routes`) are **not** registered by default; import and `register_blueprint(...)` in `application.py` if you need them.
