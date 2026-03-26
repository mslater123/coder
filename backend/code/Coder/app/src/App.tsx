import { useState, useEffect, useCallback } from 'react'
import { api, authApi } from './services/api'
import type { MiningStats } from './services/api'
import { Menu } from './components/Menu'
import { Sidebar } from './components/Sidebar'
import { UserManagement } from './components/UserManagement'
import { GPUMangement } from './components/GPUMangement'
import { LLMChat } from './components/LLMChat'
import { LLMManager } from './components/LLMManager'
import { CodeEditor } from './components/CodeEditor'
import './App.css'

function App() {
  const [stats, setStats] = useState<MiningStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [autoStart, setAutoStart] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(1000)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState<string | undefined>()
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [currentPage, setCurrentPage] = useState('mining')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const data = await api.getStatus()
      setStats(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status')
    }
  }, [])

  const handleStart = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await api.startMining()
      await fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start mining')
    } finally {
      setLoading(false)
    }
  }, [fetchStatus])

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, refreshInterval)
    return () => clearInterval(interval)
  }, [refreshInterval, fetchStatus])

  useEffect(() => {
    if (autoStart && !stats?.is_mining && !loading) {
      handleStart()
    }
  }, [autoStart, stats?.is_mining, loading, handleStart])

  const handleStop = async () => {
    setLoading(true)
    setError(null)
    try {
      await api.stopMining()
      await fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop mining')
    } finally {
      setLoading(false)
    }
  }

  const handleDifficultyChange = async (difficulty: number) => {
    if (stats?.is_mining) {
      setError('Stop mining before changing difficulty')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await api.setDifficulty(difficulty)
      await fetchStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set difficulty')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatNumber = (num: number) => {
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M'
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K'
    return num.toLocaleString()
  }

  const calculateEfficiency = () => {
    if (!stats || stats.elapsed_time === 0) return 0
    return (stats.total_hashes / stats.elapsed_time).toFixed(2)
  }

  const calculateBlockRate = () => {
    if (!stats || stats.elapsed_time === 0) return '0.00'
    return (stats.blocks_found / (stats.elapsed_time / 3600)).toFixed(2)
  }

  const exportStats = () => {
    if (!stats) return
    const data = {
      timestamp: new Date().toISOString(),
      ...stats,
      efficiency: calculateEfficiency(),
      blockRate: calculateBlockRate()
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mining-stats-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resetStats = async () => {
    if (stats?.is_mining) {
      setError('Stop mining before resetting stats')
      return
    }
    if (window.confirm('Are you sure you want to reset all statistics?')) {
      await handleStop()
      // Stats will reset when mining starts again
      setError(null)
    }
  }

  const handleLogin = async (username: string, password: string) => {
    try {
      const user = await authApi.login(username, password)
      setIsAuthenticated(true)
      setUsername(user.username)
      // Store user in localStorage for CodeEditor to access
      localStorage.setItem('currentUser', JSON.stringify(user))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } catch (err) {
      // Continue with logout even if API call fails
    }
    setIsAuthenticated(false)
    setUsername(undefined)
    localStorage.removeItem('currentUser')
    setShowUserManagement(false)
  }

  const handleRegister = async (username: string, password: string, email?: string) => {
    try {
      const user = await authApi.register(username, password, email)
      setIsAuthenticated(true)
      setUsername(user.username)
      // Store user in localStorage for CodeEditor to access
      localStorage.setItem('currentUser', JSON.stringify(user))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  const renderPageContent = () => {
    switch (currentPage) {
      case 'mining':
        return (
          <>
            <header className="header">
              <h1>⚡ Bitcoin Miner</h1>
              <p className="subtitle">Educational Mining Simulation</p>
            </header>
            {renderMiningDashboard()}
          </>
        )
      case 'dashboard':
        return (
          <div className="page-content">
            <h1>📊 Dashboard</h1>
            <p>Dashboard content coming soon...</p>
          </div>
        )
      case 'wallets':
        return (
          <div className="page-content">
            <h1>💼 Wallets</h1>
            <p>Wallet management coming soon...</p>
          </div>
        )
      case 'transactions':
        return (
          <div className="page-content">
            <h1>💸 Transactions</h1>
            <p>Transaction history coming soon...</p>
          </div>
        )
      case 'prices':
        return (
          <div className="page-content">
            <h1>📈 Price History</h1>
            <p>Price tracking coming soon...</p>
          </div>
        )
      case 'sessions':
        return (
          <div className="page-content">
            <h1>📋 Mining Sessions</h1>
            <p>Session history coming soon...</p>
          </div>
        )
      case 'statistics':
        return (
          <div className="page-content">
            <h1>📉 Statistics</h1>
            <p>Statistics dashboard coming soon...</p>
          </div>
        )
      case 'settings':
        return (
          <div className="page-content">
            <h1>⚙️ Settings</h1>
            <p>Settings page coming soon...</p>
          </div>
        )
      case 'gpus':
        return (
          <GPUMangement />
        )
      case 'llm':
        return (
          <LLMChat />
        )
      case 'llm-manager':
        return (
          <LLMManager />
        )
      case 'editor':
        return (
          <CodeEditor />
        )
      default:
        return renderMiningDashboard()
    }
  }

  const renderMiningDashboard = () => (
    <>
      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      <div className="dashboard">
        <div className="control-panel">
          <div className="button-group">
            <button
              onClick={handleStart}
              disabled={loading || stats?.is_mining}
              className="btn btn-start"
            >
              {stats?.is_mining ? '⛏️ Mining...' : '▶️ Start Mining'}
            </button>
            <button
              onClick={handleStop}
              disabled={loading || !stats?.is_mining}
              className="btn btn-stop"
            >
              ⏹️ Stop Mining
            </button>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="btn btn-secondary"
            >
              {showAdvanced ? '⚙️ Hide Options' : '⚙️ More Options'}
            </button>
          </div>

          {showAdvanced && (
            <div className="advanced-options">
              <div className="option-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={autoStart}
                    onChange={(e) => setAutoStart(e.target.checked)}
                    disabled={stats?.is_mining}
                  />
                  <span>Auto-start mining</span>
                </label>
                <label className="checkbox-label">
                  <span>Refresh Rate:</span>
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="select-input"
                  >
                    <option value={500}>0.5s (Fast)</option>
                    <option value={1000}>1s (Normal)</option>
                    <option value={2000}>2s (Slow)</option>
                    <option value={5000}>5s (Very Slow)</option>
                  </select>
                </label>
              </div>
              <div className="option-group">
                <button
                  onClick={exportStats}
                  className="btn btn-export"
                  disabled={!stats}
                >
                  📥 Export Stats
                </button>
                <button
                  onClick={resetStats}
                  className="btn btn-reset"
                  disabled={stats?.is_mining || loading}
                >
                  🔄 Reset Stats
                </button>
              </div>
            </div>
          )}

          <div className="difficulty-selector">
            <label>Difficulty: {stats?.current_difficulty || 4}</label>
            <div className="difficulty-buttons">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((diff) => (
                <button
                  key={diff}
                  onClick={() => handleDifficultyChange(diff)}
                  disabled={loading || stats?.is_mining}
                  className={`difficulty-btn ${stats?.current_difficulty === diff ? 'active' : ''}`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Status</div>
            <div className={`stat-value ${stats?.is_mining ? 'mining' : 'stopped'}`}>
              {stats?.is_mining ? '⛏️ MINING' : '⏸️ STOPPED'}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Hash Rate</div>
            <div className="stat-value">
              {stats ? formatNumber(stats.hashes_per_second) : '0'} H/s
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Total Hashes</div>
            <div className="stat-value">
              {stats ? formatNumber(stats.total_hashes) : '0'}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Blocks Found</div>
            <div className="stat-value">
              {stats?.blocks_found || 0}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Elapsed Time</div>
            <div className="stat-value">
              {stats ? formatTime(stats.elapsed_time) : '00:00:00'}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Last Hash</div>
            <div className="stat-value hash-value">
              {stats?.last_hash || 'N/A'}
            </div>
          </div>

          {showAdvanced && (
            <>
              <div className="stat-card">
                <div className="stat-label">Efficiency</div>
                <div className="stat-value">
                  {stats ? calculateEfficiency() : '0'} H/s avg
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Block Rate</div>
                <div className="stat-value">
                  {stats ? calculateBlockRate() : '0.00'} /hr
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Session ID</div>
                <div className="stat-value">
                  {stats?.session_id || 'N/A'}
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Start Time</div>
                <div className="stat-value" style={{ fontSize: '0.9rem' }}>
                  {stats?.start_time ? new Date(stats.start_time).toLocaleTimeString() : 'N/A'}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <footer className="footer">
        <p>⚠️ This is an educational simulation. Real Bitcoin mining requires specialized ASIC hardware.</p>
      </footer>
    </>
  )

  return (
    <div className="app">
      <Menu
        isAuthenticated={isAuthenticated}
        username={username}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onRegister={handleRegister}
        showUserManagement={() => setShowUserManagement(true)}
      />

      {showUserManagement && (
        <UserManagement
          onClose={() => setShowUserManagement(false)}
          currentUser={username || ''}
        />
      )}

      <div className={`app-content ${currentPage === 'editor' ? 'editor-mode' : ''}`}>
        <Sidebar
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onCollapseChange={setSidebarCollapsed}
        />
        <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${currentPage === 'editor' ? 'editor-fullscreen' : ''}`}>
          {renderPageContent()}
        </main>
      </div>
    </div>
  )
}

export default App
