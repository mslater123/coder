# Docker Setup Guide

This guide explains how to run each service using Docker Compose, including running miners on different computers.

## Architecture

- **Backend**: Central API server (runs on one machine)
- **Frontend**: Web interface (runs on one machine, connects to backend)
- **Miners**: Mining workers (can run on multiple different machines)

## Quick Start

### Option 1: All Services on One Machine (Development)

```bash
# From project root
docker-compose up -d
```

This starts:
- Backend on port 5000
- Frontend on port 5173
- One miner (miner-1)

### Option 2: Separate Services (Production)

#### Backend Only

```bash
cd backend
docker-compose up -d
```

Backend will be available at `http://localhost:5000`

#### Frontend Only

```bash
cd app
docker-compose up -d
```

Frontend will be available at `http://localhost:5173`

**Note**: The frontend compose file includes an optional backend service for local development. For production, configure `VITE_API_URL` to point to your backend server.

#### Miner Only (Single Machine)

```bash
cd miner
docker-compose up -d
```

## Running Miners on Different Computers

### Prerequisites

1. Backend must be accessible from miner machines (public IP or domain)
2. Network connectivity between miners and backend
3. Docker installed on each machine

### Setup Steps

#### Step 1: Start Backend (Main Server)

On the main server machine:

```bash
cd backend
docker-compose up -d
```

Note the backend's IP address or domain name (e.g., `192.168.1.100` or `api.example.com`)

#### Step 2: Configure Miner on Remote Machine

On each miner machine:

1. **Copy miner directory** to the remote machine (or clone the repo)

2. **Create environment file**:
```bash
cd miner
cp .env.example .env
```

3. **Edit `.env` file**:
```bash
MINER_ID=1                    # Unique ID for this miner
MINER_NAME=Miner-1            # Human-readable name
BACKEND_URL=http://192.168.1.100:5000  # Backend server URL
MINER_PORT=5001               # Optional: port for miner status
```

4. **Start the miner**:
```bash
docker-compose --env-file .env up -d
```

#### Step 3: Add More Miners

For each additional miner machine:

1. Use a unique `MINER_ID` (2, 3, 4, etc.)
2. Use the same `BACKEND_URL` pointing to your backend server
3. Optionally use different `MINER_PORT` if exposing status API

Example for Miner 2:
```bash
MINER_ID=2
MINER_NAME=Miner-2
BACKEND_URL=http://192.168.1.100:5000
MINER_PORT=5002
```

### Network Configuration

#### Option A: Same Local Network

If all machines are on the same network:
- Use local IP addresses (e.g., `192.168.1.100`)
- Ensure firewall allows port 5000

#### Option B: Different Networks / Internet

If miners are on different networks:
- Use public IP or domain name for backend
- Ensure backend is accessible from internet
- Consider using reverse proxy (nginx, traefik) with SSL
- Update firewall rules to allow connections

#### Option C: VPN

For secure connections:
- Set up VPN between machines
- Use VPN IP addresses in `BACKEND_URL`

## Docker Compose Files

### `docker-compose.yml` (Root)
Main orchestration file for local development with all services.

### `backend/docker-compose.yml`
Standalone backend service.

**Usage:**
```bash
cd backend
docker-compose up -d
```

**Environment Variables:**
- `PORT`: Backend port (default: 5000)
- `FLASK_DEBUG`: Enable debug mode (default: False)
- `DATABASE_URL`: Database connection string

### `app/docker-compose.yml`
Frontend service with optional backend.

**Usage:**
```bash
cd app
docker-compose up -d
```

**Environment Variables:**
- `PORT`: Frontend port (default: 5173)
- `VITE_API_URL`: Backend API URL

### `miner/docker-compose.yml`
Miner service for distributed mining.

**Usage:**
```bash
cd miner
docker-compose --env-file .env up -d
```

**Environment Variables:**
- `MINER_ID`: Unique miner identifier
- `MINER_NAME`: Human-readable miner name
- `BACKEND_URL`: Backend API URL (required for remote miners)
- `MINER_PORT`: Port for miner status API (optional)

## Scaling Miners

### Scale on Same Machine

```bash
cd miner
MINER_ID=1 docker-compose up -d
MINER_ID=2 docker-compose up -d
MINER_ID=3 docker-compose up -d
```

### Scale Across Multiple Machines

Run the same setup on different machines with different `MINER_ID` values.

## Monitoring

### Check Backend Status

```bash
curl http://localhost:5000/api/health
```

### Check Miner Status

If miner port is exposed:
```bash
curl http://localhost:5001/api/health
```

### View Logs

**Backend:**
```bash
cd backend
docker-compose logs -f
```

**Miner:**
```bash
cd miner
docker-compose logs -f
```

**All Services:**
```bash
docker-compose logs -f
```

## Troubleshooting

### Miner Can't Connect to Backend

1. **Check backend is running:**
   ```bash
   curl http://BACKEND_URL/api/health
   ```

2. **Check network connectivity:**
   ```bash
   ping BACKEND_IP
   ```

3. **Check firewall rules:**
   - Backend must allow incoming connections on port 5000
   - Miner must be able to make outbound connections

4. **Verify BACKEND_URL in .env:**
   - Use correct IP/domain
   - Include `http://` or `https://`
   - Include port if not default

### Port Conflicts

If ports are already in use:

1. **Backend:** Change `PORT` in `backend/docker-compose.yml`
2. **Frontend:** Change `PORT` in `app/docker-compose.yml`
3. **Miner:** Change `MINER_PORT` in `miner/.env`

### Database Issues

Each miner uses its own database file:
- `miner_1.db` for MINER_ID=1
- `miner_2.db` for MINER_ID=2
- etc.

Data is persisted in `miner/data/` directory.

## Production Recommendations

1. **Use reverse proxy** (nginx, traefik) for backend
2. **Enable SSL/TLS** for secure connections
3. **Use environment-specific .env files**
4. **Set up monitoring** (Prometheus, Grafana)
5. **Configure log aggregation** (ELK stack, Loki)
6. **Use container orchestration** (Kubernetes) for large scale
7. **Implement authentication** for backend API
8. **Use managed database** instead of SQLite for production

## Example: Multi-Machine Setup

### Machine 1: Backend Server
```bash
# IP: 192.168.1.100
cd backend
docker-compose up -d
```

### Machine 2: Miner 1
```bash
# IP: 192.168.1.101
cd miner
echo "MINER_ID=1" > .env
echo "BACKEND_URL=http://192.168.1.100:5000" >> .env
docker-compose --env-file .env up -d
```

### Machine 3: Miner 2
```bash
# IP: 192.168.1.102
cd miner
echo "MINER_ID=2" > .env
echo "BACKEND_URL=http://192.168.1.100:5000" >> .env
docker-compose --env-file .env up -d
```

### Machine 4: Frontend (Optional)
```bash
# IP: 192.168.1.103
cd app
echo "VITE_API_URL=http://192.168.1.100:5000" > .env
docker-compose --env-file .env up -d
```

## Stopping Services

### Stop All Services
```bash
docker-compose down
```

### Stop Individual Service
```bash
cd backend
docker-compose down

cd miner
docker-compose down
```

### Stop and Remove Volumes
```bash
docker-compose down -v
```
