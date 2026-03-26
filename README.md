# Coder

A full-stack **code and AI workspace**: React + TypeScript frontend (Vite, Monaco Editor) and a **Python Flask** backend with authentication, projects, a code editor API, design docs, LLM chat/management, and GPU management. Optional **Docker Compose** runs the API, web UI, and an example miner service.

## Features

### Web app (`app/`)

- **Code editor** — Monaco-based editing, file tree, projects, AI-assisted panel
- **Design docs** — Project documentation workspace
- **LLM chat** — Chat against configured models
- **LLM manager** — Model and provider configuration
- **GPU management** — Register and monitor GPUs for workloads
- **Accounts** — Login, registration, profile/settings (JWT/session flow via backend)

### Backend (`backend/`)

- **REST API** with SQLAlchemy and SQLite by default (`coder.db`)
- **Blueprints registered in `app.py`:**  
  `/api/auth`, `/api/users`, `/api/projects`, `/api/code-editor`, `/api/design-docs`, `/api/llm`, `/api/llm/manager`, `/api/gpus`
- **Health check:** `GET /api/health`

> The repo also contains older route modules under `backend/routes/` (e.g. mining, wallets, prices) that are **not** registered in the default `app.py`. Use or wire them only if you extend the app.

## Project structure

```
Coder/
├── app/                  # React (Vite) frontend
├── backend/              # Flask API
│   ├── routes/           # API blueprints
│   ├── instance/         # Local SQLite (coder.db) when not using Docker DB path
│   ├── app.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── start.sh / start.bat
├── documents/            # Extra docs (troubleshooting, GPU setup); see documents/README.md
├── miner/                # Miner image context (used by compose)
├── scripts/              # Helper scripts (e.g. freeing ports)
├── docker-compose.yml    # Backend + frontend (+ optional miner)
└── start.sh              # Dev: backend + frontend (repo root)
```

## Quick start (Docker)

**Prerequisites:** Docker with Compose support.

```bash
docker compose up -d
```

- **Frontend:** http://localhost:5173  
- **Backend:** http://localhost:5000  
- **Health:** `curl http://localhost:5000/api/health`

View logs: `docker compose logs -f` · Stop: `docker compose down` · Rebuild: `docker compose up -d --build`

Compose also defines an optional **miner** service (`miner-1`) that builds from `backend/miner/Dockerfile` and talks to the main backend; adjust or disable it if you do not need it.

## Manual setup

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Or use `./start.sh` (macOS/Linux) / `start.bat` (Windows) from `backend/`.

API: http://localhost:5000 — default DB file: `backend/instance/coder.db` unless `DATABASE_URL` is set.

### Frontend

```bash
cd app
npm install
npm run dev
```

Point the UI at your API (see **Environment variables**). Default dev URL is typically http://localhost:5173 (see Vite config / console output).

### Repo root: both servers

From the repository root, `./start.sh` can start the backend and frontend together (see script for behavior).

## Environment variables

| Scope | Variable | Purpose |
|--------|----------|---------|
| Backend | `DATABASE_URL` | SQLAlchemy URL (default: SQLite `instance/coder.db` under `backend/`) |
| Backend | `FLASK_APP`, `FLASK_DEBUG`, `PORT` | Flask / server port (default `5000`) |
| Frontend | `VITE_API_URL` | Backend base URL (e.g. `http://localhost:5000` for local dev) |

In Docker Compose, `DATABASE_URL` for the main API is set to SQLite at `/app/data/coder.db` with `./backend/data` mounted there.

## Database

- **Local:** `backend/instance/coder.db` (created automatically)  
- **Docker:** `/app/data/coder.db` inside the container (host: `backend/data/`)

To use PostgreSQL or MySQL, set `DATABASE_URL` accordingly in the environment or `docker-compose.yml`.

## Documentation

- **[documents/README.md](documents/README.md)** — Index of guides  
- **[documents/TROUBLESHOOTING.md](documents/TROUBLESHOOTING.md)** — CORS, ports, backend not running  
- **[documents/GPU_SETUP.md](documents/GPU_SETUP.md)** — GPU management architecture  

## Development notes

- **New API surface:** add a blueprint under `backend/routes/`, then `app.register_blueprint(...)` in `backend/app.py`.  
- **Models:** define in `backend/models.py` (or split modules as the project grows) and run migrations/schema updates as appropriate for your DB.

## Technologies

- **Frontend:** React, TypeScript, Vite, Monaco Editor  
- **Backend:** Python, Flask, Flask-SQLAlchemy, SQLAlchemy  
- **Database:** SQLite by default; configurable via `DATABASE_URL`  
- **Containers:** Docker, Docker Compose  

## License

See the repository for license terms if provided; otherwise treat as private/internal unless stated otherwise.
