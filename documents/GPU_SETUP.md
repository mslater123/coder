# GPU Management System

This platform now includes comprehensive GPU management capabilities for controlling multiple GPUs across different systems for mining and AI tasks.

## Features

### 🎮 Multi-GPU Support
- Detect and register GPUs from multiple systems
- Track GPU specifications (memory, temperature, power, utilization)
- Support for NVIDIA GPUs (AMD/Intel support can be added)
- Real-time monitoring and status updates

### 🔧 Task Assignment
- Assign different tasks to each GPU:
  - **Mining**: Bitcoin mining operations
  - **AI Training**: Machine learning model training
  - **AI Inference**: Model inference/prediction tasks
- Track task progress and status
- Start/stop tasks remotely

### 🌐 Distributed Architecture
- Backend server manages all GPUs
- Client containers run on each GPU system
- Clients auto-detect and register GPUs
- Real-time status synchronization

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Backend Server                        │
│  - Flask API                                            │
│  - Database (GPU registry, tasks, stats)                │
│  - Web Dashboard                                        │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │ REST API
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼───────┐ ┌───────▼───────┐ ┌───────▼───────┐
│ GPU Client 1  │ │ GPU Client 2  │ │ GPU Client N  │
│ - Detect GPUs │ │ - Detect GPUs │ │ - Detect GPUs │
│ - Run Tasks   │ │ - Run Tasks   │ │ - Run Tasks   │
│ - Report      │ │ - Report      │ │ - Report      │
└───────────────┘ └───────────────┘ └───────────────┘
```

## Setup Instructions

### Prerequisites

1. **NVIDIA GPU Systems**:
   - NVIDIA GPU with compute capability 3.0+
   - NVIDIA drivers installed
   - nvidia-smi available

2. **Docker with GPU Support**:
   ```bash
   # Install NVIDIA Container Toolkit
   distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
   curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
   curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
     sudo tee /etc/apt/sources.list.d/nvidia-docker.list
   
   sudo apt-get update
   sudo apt-get install -y nvidia-container-toolkit
   sudo systemctl restart docker
   ```

### 1. Start the Backend Server

```bash
cd backend
docker-compose up -d
```

The backend will be available at `http://localhost:5000`

### 2. Deploy GPU Clients

On each system with GPUs:

```bash
cd client

# Set backend URL and client ID
export BACKEND_URL=http://your-backend-server:5000
export CLIENT_ID=gpu-system-1

# Start the GPU client
docker-compose up -d
```

The client will:
- Auto-detect GPUs using nvidia-smi
- Register them with the backend
- Report status every 5 seconds
- Execute assigned tasks

### 3. Access the Web Dashboard

Open your browser to `http://localhost:5173` (or your server's URL)

Navigate to **GPU Management** in the sidebar to:
- View all registered GPUs
- See real-time stats (temperature, utilization, memory)
- Assign tasks to GPUs
- Monitor task progress
- Stop running tasks

## API Endpoints

### GPU Management

- `POST /api/gpus/detect` - Detect and register GPUs
- `GET /api/gpus` - List all GPUs
- `GET /api/gpus/available` - List available GPUs
- `GET /api/gpus/:id` - Get specific GPU details
- `PUT /api/gpus/:id/status` - Update GPU status

### Task Management

- `POST /api/gpus/:id/assign` - Assign task to GPU
- `GET /api/gpus/tasks` - List all tasks
- `GET /api/gpus/tasks/:id` - Get task details
- `POST /api/gpus/tasks/:id/stop` - Stop a task
- `PUT /api/gpus/tasks/:id/progress` - Update task progress

## Configuration

### Backend (docker-compose.yml)

```yaml
services:
  backend:
    # Uncomment for GPU access on backend server
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: all
    #           capabilities: [gpu]
```

### Client Environment Variables

- `BACKEND_URL`: URL of the backend server (default: http://localhost:5000)
- `CLIENT_ID`: Unique identifier for this client (default: hostname)
- `UPDATE_INTERVAL`: Status update frequency in seconds (default: 5)

## Task Types

### 1. Bitcoin Mining

Assigns GPU to mine Bitcoin using the mining service:

```json
{
  "task_type": "mining",
  "task_name": "BTC Mining Pool",
  "config": {
    "pool_url": "stratum+tcp://pool.example.com:3333",
    "wallet": "your_btc_address",
    "difficulty": 4
  }
}
```

### 2. AI Training

Assigns GPU for machine learning model training:

```json
{
  "task_type": "ai_training",
  "task_name": "ResNet Training",
  "config": {
    "model": "resnet50",
    "dataset": "imagenet",
    "epochs": 100,
    "batch_size": 64
  }
}
```

### 3. AI Inference

Assigns GPU for model inference:

```json
{
  "task_type": "ai_inference",
  "task_name": "Object Detection API",
  "config": {
    "model_path": "/models/yolov5",
    "endpoint": "/api/detect",
    "batch_size": 32
  }
}
```

## Monitoring

### GPU Metrics Tracked

- **Memory**: Total, used, free (bytes)
- **Temperature**: Current GPU temperature (°C)
- **Power Usage**: Current power draw (Watts)
- **Utilization**: GPU utilization percentage
- **Status**: Available/Busy
- **Current Task**: Active task type
- **Last Seen**: Last status update timestamp

### Task Metrics

- **Status**: running, completed, failed, stopped
- **Progress**: Completion percentage
- **Duration**: Start/end times
- **Error Messages**: Failure details if applicable

## Troubleshooting

### GPUs Not Detected

1. Check nvidia-smi is working:
   ```bash
   nvidia-smi
   ```

2. Verify NVIDIA Container Toolkit:
   ```bash
   docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
   ```

3. Check client logs:
   ```bash
   docker logs gpu-client-default
   ```

### Connection Issues

1. Verify backend is reachable:
   ```bash
   curl http://your-backend:5000/api/health
   ```

2. Check network configuration in docker-compose.yml

3. Ensure firewall allows traffic on port 5000

### Task Failures

1. Check task logs in backend database
2. Review GPU status for errors
3. Verify GPU has sufficient resources
4. Check task configuration is valid

## Security Considerations

1. **Authentication**: Enable authentication for production
2. **Network**: Use HTTPS and restrict backend access
3. **GPU Access**: Limit which users can assign tasks
4. **Resource Limits**: Set memory/compute limits per task
5. **Monitoring**: Set up alerts for unusual GPU activity

## Performance Tips

1. **Batch Updates**: Clients update every 5 seconds by default
2. **Database**: Use indexes for faster queries
3. **Caching**: Cache GPU status in memory
4. **Load Balancing**: Distribute tasks across available GPUs
5. **Monitoring**: Set up Prometheus/Grafana for metrics

## Future Enhancements

- [ ] AMD GPU support (using rocm-smi)
- [ ] Intel GPU support
- [ ] Automatic task scheduling/load balancing
- [ ] GPU health checks and alerts
- [ ] Historical performance graphs
- [ ] Multi-tenancy support
- [ ] Task queuing system
- [ ] Power consumption optimization
- [ ] Remote desktop access to GPU systems
- [ ] Kubernetes orchestration support

## License

This GPU management system is part of the Bitcoin Miner platform.
