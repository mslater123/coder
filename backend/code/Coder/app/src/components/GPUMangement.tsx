import { useState, useEffect } from 'react'
import { gpuApi } from '../services/api'
import type { GPU, GPUTask } from '../services/api'
import './GPUMangement.css'

interface GPUMangementProps {
  onClose?: () => void
}

export function GPUMangement({ onClose }: GPUMangementProps) {
  const [gpus, setGpus] = useState<GPU[]>([])
  const [tasks, setTasks] = useState<GPUTask[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedGpu, setSelectedGpu] = useState<number | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [taskForm, setTaskForm] = useState({ task_type: 'mining', task_name: '' })

  useEffect(() => {
    fetchGPUs()
    fetchTasks()
    const interval = setInterval(() => {
      fetchGPUs()
      fetchTasks()
    }, 5000) // Update every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const fetchGPUs = async () => {
    try {
      const data = await gpuApi.getGPUs()
      setGpus(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch GPUs')
    }
  }

  const fetchTasks = async () => {
    try {
      const data = await gpuApi.getTasks()
      setTasks(data)
    } catch (err) {
      // Silently fail for tasks
    }
  }

  const handleDetectGPUs = async () => {
    setLoading(true)
    setError(null)
    try {
      await gpuApi.detectGPUs()
      await fetchGPUs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to detect GPUs')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignTask = async () => {
    if (!selectedGpu) return
    
    setLoading(true)
    setError(null)
    try {
      await gpuApi.assignTask(selectedGpu, taskForm.task_type, taskForm.task_name)
      setShowAssignModal(false)
      setTaskForm({ task_type: 'mining', task_name: '' })
      await fetchGPUs()
      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign task')
    } finally {
      setLoading(false)
    }
  }

  const handleStopTask = async (taskId: number) => {
    if (!window.confirm('Are you sure you want to stop this task?')) return
    
    setLoading(true)
    try {
      await gpuApi.stopTask(taskId)
      await fetchGPUs()
      await fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop task')
    } finally {
      setLoading(false)
    }
  }

  const formatMemory = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(2)} GB`
  }

  const getTaskForGPU = (gpuId: number) => {
    return tasks.find(t => t.gpu_id === gpuId && t.status === 'running')
  }

  return (
    <div className="gpu-management">
      <div className="gpu-header">
        <h2>🎮 GPU Management</h2>
        <div className="gpu-actions">
          <button
            className="btn-detect"
            onClick={handleDetectGPUs}
            disabled={loading}
          >
            🔍 Detect GPUs
          </button>
        </div>
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {gpus.length === 0 ? (
        <div className="empty-state">
          <p>No GPUs detected. Click "Detect GPUs" to scan for available GPUs.</p>
        </div>
      ) : (
        <div className="gpu-grid">
          {gpus.map((gpu) => {
            const currentTask = getTaskForGPU(gpu.id)
            return (
              <div key={gpu.id} className={`gpu-card ${gpu.is_available ? 'available' : 'busy'}`}>
                <div className="gpu-card-header">
                  <div className="gpu-name">
                    <span className="gpu-icon">🎮</span>
                    <div>
                      <h3>{gpu.name}</h3>
                      <span className="gpu-vendor">{gpu.vendor || 'Unknown'}</span>
                    </div>
                  </div>
                  <div className={`gpu-status ${gpu.is_available ? 'available' : 'busy'}`}>
                    {gpu.is_available ? '✓ Available' : '✗ Busy'}
                  </div>
                </div>

                <div className="gpu-specs">
                  <div className="spec-item">
                    <span className="spec-label">Memory:</span>
                    <span className="spec-value">
                      {formatMemory(gpu.memory_used)} / {formatMemory(gpu.memory_total)}
                    </span>
                  </div>
                  {gpu.temperature && (
                    <div className="spec-item">
                      <span className="spec-label">Temperature:</span>
                      <span className="spec-value">{gpu.temperature}°C</span>
                    </div>
                  )}
                  {gpu.utilization !== null && (
                    <div className="spec-item">
                      <span className="spec-label">Utilization:</span>
                      <span className="spec-value">{gpu.utilization?.toFixed(1)}%</span>
                    </div>
                  )}
                  {gpu.power_usage && (
                    <div className="spec-item">
                      <span className="spec-label">Power:</span>
                      <span className="spec-value">{gpu.power_usage?.toFixed(1)}W</span>
                    </div>
                  )}
                  <div className="spec-item">
                    <span className="spec-label">Current Task:</span>
                    <span className="spec-value task-badge">{gpu.current_task || 'idle'}</span>
                  </div>
                </div>

                {currentTask && (
                  <div className="gpu-task-info">
                    <div className="task-header">
                      <span>Active Task: {currentTask.task_name || currentTask.task_type}</span>
                      <span className="task-progress">{currentTask.progress?.toFixed(0) || 0}%</span>
                    </div>
                    <div className="task-actions">
                      <button
                        className="btn-stop-task"
                        onClick={() => handleStopTask(currentTask.id)}
                        disabled={loading}
                      >
                        ⏹️ Stop Task
                      </button>
                    </div>
                  </div>
                )}

                <div className="gpu-actions-card">
                  {gpu.is_available ? (
                    <button
                      className="btn-assign"
                      onClick={() => {
                        setSelectedGpu(gpu.id)
                        setShowAssignModal(true)
                      }}
                    >
                      ➕ Assign Task
                    </button>
                  ) : (
                    <span className="gpu-busy-text">GPU is currently busy</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Assign Task to GPU</h3>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleAssignTask(); }} className="task-form">
              <div className="form-group">
                <label>Task Type</label>
                <select
                  value={taskForm.task_type}
                  onChange={(e) => setTaskForm({ ...taskForm, task_type: e.target.value })}
                  className="form-select"
                >
                  <option value="mining">Bitcoin Mining</option>
                  <option value="ai_training">AI Training</option>
                  <option value="ai_inference">AI Inference</option>
                  <option value="system_task">System Task</option>
                </select>
              </div>
              <div className="form-group">
                <label>Task Name (Optional)</label>
                <input
                  type="text"
                  value={taskForm.task_name}
                  onChange={(e) => setTaskForm({ ...taskForm, task_name: e.target.value })}
                  placeholder="Enter task name"
                  className="form-input"
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                Assign Task
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
