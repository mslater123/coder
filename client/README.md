# GPU Client

The GPU client detects GPUs on the system and executes jobs assigned by the backend server.

## Features

- **Auto-detection**: Automatically detects NVIDIA GPUs using `nvidia-smi`
- **Job execution**: Runs assigned work:
  - **AI Training**: machine learning training
  - **AI Inference**: inference / prediction
  - **System tasks**: scripts and general CPU/GPU work
  - **Ollama / LLM** flows when the backend assigns them
- **Progress Reporting**: Reports job progress to backend in real-time
- **Error Handling**: Gracefully handles errors and reports them

## Installation

### Prerequisites

1. **NVIDIA GPU** (optional, for GPU tasks):
   - NVIDIA drivers installed
   - `nvidia-smi` available

2. **Python 3.11+**

3. **Docker** (for containerized deployment):
   - NVIDIA Container Toolkit for GPU access

### Setup

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment variables**:
   ```bash
   export BACKEND_URL=http://your-backend-server:5000
   export CLIENT_ID=my-gpu-system
   ```

3. **Run the client**:
   ```bash
   python gpu_client.py
   ```

### Docker Deployment

```bash
docker-compose up -d
```

## Job types

### 1. AI Training

Trains machine learning models using PyTorch.

**Configuration**:
```json
{
  "task_type": "ai_training",
  "task_name": "ResNet Training",
  "config": {
    "model": "resnet50",
    "epochs": 100,
    "batch_size": 64
  }
}
```

**Execution**:
- Uses GPU if available (CUDA)
- Falls back to CPU if GPU unavailable
- Reports training loss and epoch progress

### 2. AI Inference

Runs model inference for predictions.

**Configuration**:
```json
{
  "task_type": "ai_inference",
  "task_name": "Object Detection",
  "config": {
    "model_path": "/models/yolov5",
    "batch_size": 32,
    "num_batches": 100
  }
}
```

**Execution**:
- Loads model from path or uses pretrained
- Processes batches on GPU/CPU
- Reports throughput and progress

### 3. System task

Executes general system tasks (scripts, commands, or CPU work).

**Configuration**:
```json
{
  "task_type": "system_task",
  "task_name": "Data Processing",
  "config": {
    "script": "/path/to/script.py",
    "command": "python process_data.py",
    "duration": 3600
  }
}
```

**Execution**:
- Runs Python scripts
- Executes shell commands
- Simulates CPU work if no script/command provided

## Architecture

```
┌─────────────────────────────────────┐
│         Backend Server              │
│  - Assigns tasks                    │
│  - Tracks progress                  │
└──────────────┬──────────────────────┘
               │
               │ HTTP API
               │
┌──────────────▼──────────────────────┐
│         GPU Client                   │
│  - Detects GPUs                      │
│  - Polls for tasks                   │
│  - Executes jobs                     │
│  - Reports progress                  │
└──────────────┬──────────────────────┘
               │
    ┌──────────┴──────────┐
    │                   │
┌───▼────┐        ┌────▼────┐
│ GPU 0  │        │ GPU 1   │
│        │        │         │
│ Infer  │        │ Train   │
└────────┘        └─────────┘
```

## Job Execution Flow

1. **Client polls backend** for new tasks every 5 seconds
2. **Backend assigns task** to available GPU
3. **Client receives task** and creates `JobExecutor`
4. **JobExecutor starts** in background thread
5. **Progress updates** sent to backend every second
6. **Job completes** or is stopped by backend
7. **Client cleans up** and marks GPU as available

## Progress Reporting

Jobs report progress with:
- **Progress percentage** (0-100)
- **Metadata** (job-specific data):
  - AI Training: epoch, loss
  - AI Inference: batch, throughput
  - System Task: iterations, elapsed time

## Error Handling

- **Import errors**: Falls back to simulation if libraries unavailable
- **Execution errors**: Reports error to backend and stops job
- **Network errors**: Retries with exponential backoff
- **GPU errors**: Falls back to CPU execution

## Monitoring

The client logs:
- GPU detection results
- Task start/stop events
- Progress updates
- Errors and warnings

View logs:
```bash
docker logs gpu-client-default
```

## Configuration

### Environment Variables

- `BACKEND_URL`: Backend server URL (default: http://localhost:5000)
- `CLIENT_ID`: Unique client identifier (default: hostname)
- `UPDATE_INTERVAL`: Status update interval in seconds (default: 5)

### Optional Dependencies

For GPU acceleration:
- `torch`: PyTorch for AI tasks
- `torchvision`: Vision models

The client works without these but will use CPU fallbacks.

## Troubleshooting

### GPUs Not Detected

1. Check `nvidia-smi` works:
   ```bash
   nvidia-smi
   ```

2. Verify NVIDIA drivers installed

3. Check Docker GPU access:
   ```bash
   docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
   ```

### Jobs Not Starting

1. Check backend connection:
   ```bash
   curl http://backend:5000/api/health
   ```

2. Verify GPU is registered:
   ```bash
   curl http://backend:5000/api/gpus
   ```

3. Check client logs for errors

### Performance Issues

1. **GPU not used**: Install PyCUDA or PyTorch
2. **Slow execution**: Check GPU utilization with `nvidia-smi`
3. **High CPU usage**: Reduce number of concurrent jobs

## Security

- Client only connects to specified backend
- No authentication required (add for production)
- Jobs run in isolated threads
- Process termination on stop command

## Future Enhancements

- [ ] AMD GPU support (ROCm)
- [ ] Multi-GPU job distribution
- [ ] Job queuing and scheduling
- [ ] Resource limits per job
- [ ] Job checkpointing/resume
- [ ] Remote job monitoring
- [ ] WebSocket for real-time updates
