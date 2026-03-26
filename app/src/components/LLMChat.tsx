import { useState, useEffect, useRef } from 'react'
import { llmApi, gpuApi } from '../services/api'
import type { LLMQuery, OllamaModel, GPU } from '../services/api'
import './LLMChat.css'

interface LLMChatProps {
  onClose?: () => void
}

export function LLMChat({ onClose }: LLMChatProps) {
  const [queries, setQueries] = useState<LLMQuery[]>([])
  const [models, setModels] = useState<OllamaModel[]>([])
  const [gpus, setGpus] = useState<GPU[]>([])
  const [selectedModel, setSelectedModel] = useState('llama2')
  const [selectedGpu, setSelectedGpu] = useState<number | null>(null)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadModels()
    loadGPUs()
    loadQueries()
    
    // Poll for query updates
    const interval = setInterval(() => {
      loadQueries()
    }, 2000)
    setPollingInterval(interval)
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [queries])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadModels = async () => {
    try {
      const data = await llmApi.getAvailableModels()
      setModels(data.models)
      if (data.models.length > 0 && !selectedModel) {
        setSelectedModel(data.models[0].name)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models')
    }
  }

  const loadGPUs = async () => {
    try {
      const data = await gpuApi.getAvailableGPUs()
      setGpus(data)
      if (data.length > 0 && !selectedGpu) {
        setSelectedGpu(data[0].id)
      }
    } catch (err) {
      // Silently fail - GPUs optional
    }
  }

  const loadQueries = async () => {
    try {
      const data = await llmApi.getQueries(undefined, undefined, 50)
      setQueries(data.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ))
    } catch (err) {
      // Silently fail
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || loading) return

    setLoading(true)
    setError(null)

    try {
      await llmApi.createQuery(
        prompt,
        selectedModel,
        selectedGpu || undefined,
        512,
        0.7
      )
      setPrompt('')
      // Query will be loaded by polling
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create query')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteQuery = async (queryId: string) => {
    if (!window.confirm('Delete this query?')) return
    
    try {
      await llmApi.deleteQuery(queryId)
      loadQueries()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete query')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4caf50'
      case 'running': return '#2196f3'
      case 'failed': return '#f44336'
      default: return '#999'
    }
  }

  return (
    <div className="llm-chat">
      <div className="llm-header">
        <h2>🤖 LLM Chat</h2>
        {onClose && (
          <button className="btn-close" onClick={onClose}>×</button>
        )}
      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <div className="llm-controls">
        <div className="control-group">
          <label>Model:</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="form-select"
            disabled={loading}
          >
            {models.map((model) => (
              <option key={model.name} value={model.name}>
                {model.name}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>GPU:</label>
          <select
            value={selectedGpu || ''}
            onChange={(e) => setSelectedGpu(e.target.value ? parseInt(e.target.value) : null)}
            className="form-select"
            disabled={loading}
          >
            <option value="">Auto-select</option>
            {gpus.map((gpu) => (
              <option key={gpu.id} value={gpu.id}>
                {gpu.name} {gpu.is_available ? '(Available)' : '(Busy)'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="llm-input-form">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here..."
          className="llm-input"
          rows={3}
          disabled={loading}
        />
        <button
          type="submit"
          className="btn-submit"
          disabled={loading || !prompt.trim()}
        >
          {loading ? '⏳ Sending...' : '🚀 Send'}
        </button>
      </form>

      <div className="llm-messages">
        {queries.length === 0 ? (
          <div className="empty-state">
            <p>No queries yet. Send a message to start!</p>
          </div>
        ) : (
          queries.map((query) => (
            <div key={query.id} className="llm-message">
              <div className="message-header">
                <span className="message-model">{query.model}</span>
                <span
                  className="message-status"
                  style={{ color: getStatusColor(query.status) }}
                >
                  {query.status}
                </span>
                {query.task_progress !== undefined && query.status === 'running' && (
                  <span className="message-progress">
                    {query.task_progress.toFixed(0)}%
                  </span>
                )}
                <button
                  className="btn-delete-message"
                  onClick={() => handleDeleteQuery(query.query_id)}
                  title="Delete query"
                >
                  ×
                </button>
              </div>
              
              <div className="message-prompt">
                <strong>Prompt:</strong> {query.prompt}
              </div>
              
              {query.response ? (
                <div className="message-response">
                  <strong>Response:</strong>
                  <div className="response-text">{query.response}</div>
                </div>
              ) : query.status === 'running' ? (
                <div className="message-loading">
                  <div className="spinner"></div>
                  <span>Generating response...</span>
                </div>
              ) : query.status === 'failed' ? (
                <div className="message-error">
                  Failed to generate response
                </div>
              ) : null}
              
              <div className="message-footer">
                {new Date(query.created_at).toLocaleString()}
                {query.completed_at && (
                  <span> • Completed: {new Date(query.completed_at).toLocaleString()}</span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
