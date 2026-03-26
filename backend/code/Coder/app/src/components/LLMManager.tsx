import { useState, useEffect } from 'react'
import { llmManagerApi, gpuApi } from '../services/api'
import type { OllamaModel, GPU } from '../services/api'
import './LLMManager.css'

interface LLMManagerProps {
  onClose?: () => void
}

export function LLMManager({ onClose }: LLMManagerProps) {
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([])
  const [installedModels, setInstalledModels] = useState<Record<string, any[]>>({})
  const [gpus, setGpus] = useState<GPU[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedGpu, setSelectedGpu] = useState<number | null>(null)

  useEffect(() => {
    loadAvailableModels()
    loadInstalledModels()
    loadGPUs()
    
    // Refresh installed models every 10 seconds
    const interval = setInterval(() => {
      loadInstalledModels()
    }, 10000)
    
    return () => clearInterval(interval)
  }, [])

  const loadAvailableModels = async () => {
    try {
      const data = await llmManagerApi.getAvailableModels()
      setAvailableModels(data.models)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models')
    }
  }

  const loadInstalledModels = async () => {
    try {
      const data = await llmManagerApi.getInstalledModels()
      setInstalledModels(data.installed_models || {})
    } catch (err) {
      // Silently fail
    }
  }

  const loadGPUs = async () => {
    try {
      const data = await gpuApi.getGPUs()
      setGpus(data)
    } catch (err) {
      // Silently fail
    }
  }

  const handleInstall = async (modelName: string) => {
    if (!selectedGpu && gpus.length > 0) {
      setSelectedGpu(gpus[0].id)
    }
    
    if (!selectedGpu) {
      setError('Please select a GPU/client')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await llmManagerApi.installModel(modelName, selectedGpu)
      // Model installation is async, will show up when complete
      setTimeout(() => loadInstalledModels(), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install model')
    } finally {
      setLoading(false)
    }
  }

  const handleRemove = async (modelName: string, clientHost: string) => {
    if (!window.confirm(`Remove ${modelName} from ${clientHost}?`)) return

    setLoading(true)
    try {
      const gpu = gpus.find(g => g.host_system === clientHost)
      await llmManagerApi.removeModel(modelName, gpu?.id)
      setTimeout(() => loadInstalledModels(), 1000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove model')
    } finally {
      setLoading(false)
    }
  }

  const isModelInstalled = (modelName: string, clientHost?: string) => {
    if (clientHost) {
      return installedModels[clientHost]?.some(m => m.name === modelName)
    }
    return Object.values(installedModels).some(models =>
      models.some(m => m.name === modelName)
    )
  }

  return (
    <div className="llm-manager">
      <div className="llm-manager-header">
        <h2>📦 LLM Model Manager</h2>
        {onClose && (
          <button className="btn-close" onClick={onClose}>×</button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <div className="llm-manager-controls">
        <div className="control-group">
          <label>Target GPU/Client:</label>
          <select
            value={selectedGpu || ''}
            onChange={(e) => setSelectedGpu(e.target.value ? parseInt(e.target.value) : null)}
            className="form-select"
            disabled={loading}
          >
            <option value="">Auto-select</option>
            {gpus.map((gpu) => (
              <option key={gpu.id} value={gpu.id}>
                {gpu.name} ({gpu.host_system || 'unknown'})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="llm-manager-content">
        <div className="models-section">
          <h3>Available Models</h3>
          <div className="models-grid">
            {availableModels.map((model) => (
              <div key={model.name} className="model-card">
                <div className="model-header">
                  <h4>{model.name}</h4>
                  <span className="model-size">{model.size}</span>
                </div>
                <p className="model-description">{model.description}</p>
                <div className="model-status">
                  {isModelInstalled(model.name) ? (
                    <span className="status-installed">✓ Installed</span>
                  ) : (
                    <span className="status-not-installed">Not Installed</span>
                  )}
                </div>
                <button
                  className="btn-install"
                  onClick={() => handleInstall(model.name)}
                  disabled={loading || isModelInstalled(model.name)}
                >
                  {isModelInstalled(model.name) ? '✓ Installed' : '📥 Install'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="installed-section">
          <h3>Installed Models by Client</h3>
          {Object.keys(installedModels).length === 0 ? (
            <div className="empty-state">
              <p>No models installed yet</p>
            </div>
          ) : (
            Object.entries(installedModels).map(([clientHost, models]) => (
              <div key={clientHost} className="client-models">
                <h4>{clientHost}</h4>
                <div className="installed-models-list">
                  {models.map((model: any) => (
                    <div key={model.name} className="installed-model-item">
                      <span className="model-name">{model.name}</span>
                      <span className="model-size">{model.size ? `${(model.size / 1e9).toFixed(2)}GB` : 'N/A'}</span>
                      <button
                        className="btn-remove"
                        onClick={() => handleRemove(model.name, clientHost)}
                        disabled={loading}
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
