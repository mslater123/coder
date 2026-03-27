# Docker setup (Coder)

Root `docker-compose.yml` runs **backend** (Flask) and **frontend** (React/Vite) with a shared `coder-network` bridge.

## Quick start

```bash
cd /path/to/Coder
docker compose up -d --build
```

| Service   | URL                    |
|----------|-------------------------|
| Frontend | http://localhost:3000   |
| Backend  | http://localhost:5000   |

- Logs: `docker compose logs -f`  
- Stop: `docker compose down`  
- Rebuild: `docker compose up -d --build`

## Volumes

- `sqlite_data` — backend SQLite database file  
- `uploads_data` — user uploads on the backend

## GPU agent (optional)

The **optional GPU client** lives in `client/` and registers machines with the backend’s GPU API. It is **not** part of the root compose file. See `client/README.md` and `client/docker-compose.yml` if you run the agent in Docker.

## Per-service compose files

- `app/docker-compose.yml` — frontend-only stack for local/dev  
- `backend/docker-compose.yml` — backend-only stack  

These use the same `coder-network` convention so they can attach to other stacks if needed.
