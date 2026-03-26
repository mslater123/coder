# Coder — Documentation

This folder is the main documentation index for the **Coder** platform: a full-stack app with a React + TypeScript frontend, Flask backend, code editor, LLM features, design docs, and optional GPU management.

## Quick links

| Document | Description |
|----------|-------------|
| [Troubleshooting](./TROUBLESHOOTING.md) | CORS, 404s, backend/frontend startup, health checks |
| [GPU setup](./GPU_SETUP.md) | GPU management architecture, registration, and distributed clients |

## Repository layout

```
Coder/
├── app/                 # React (Vite) frontend
├── backend/             # Flask API (Python)
├── documents/           # This documentation hub
├── scripts/             # Helper shell scripts (e.g. port cleanup)
├── docker-compose.yml   # Local full-stack (backend + frontend)
└── README.md            # Project overview and Docker/manual setup (repo root)
```

## What’s in the app

- **Code editor** — In-browser editing with AI assistance
- **Design docs** — Project documentation area
- **LLM chat & LLM manager** — Chat and model/configuration workflows
- **GPU management** — Register and monitor GPUs (see [GPU_SETUP.md](./GPU_SETUP.md))
- **Auth** — Login, registration, user settings (backend uses SQLite by default: `instance/coder.db` locally, `/app/data/coder.db` in Docker)

## Running locally

**Docker (recommended for a full stack):** from the repo root:

```bash
docker compose up -d
```

- Frontend: `http://localhost:5173` (see `docker-compose.yml` for the exact port)
- Backend API: `http://localhost:5000` — health: `GET /api/health`

**Without Docker:** start the backend (`backend/start.sh` or `python app.py` in `backend/`), then the frontend (`npm run dev` in `app/`). Details and env vars are in the [root README](../README.md) and `backend/README.md`.

## Getting unstuck

Start with [Troubleshooting](./TROUBLESHOOTING.md) if the API is unreachable, you see CORS issues, or ports are already in use.

## Contributing to docs

Add new guides as Markdown files under `documents/` and link them from this README so they stay discoverable.
