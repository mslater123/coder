import { useState, useEffect } from 'react'
import { authApi } from './services/api'
import { Menu } from './components/Menu'
import { Sidebar } from './components/Sidebar'
import { UserManagement } from './components/UserManagement'
import { UserSettings } from './components/UserSettings'
import { GPUMangement } from './components/GPUMangement'
import { LLMChat } from './components/LLMChat'
import { LLMManager } from './components/LLMManager'
import { CodeEditor } from './components/CodeEditor'
import { DesignDocs } from './components/DesignDocs'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState<string | undefined>()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [showUserSettings, setShowUserSettings] = useState(false)
  const [currentPage, setCurrentPage] = useState('editor')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser')
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        if (user && user.username) {
          setIsAuthenticated(true)
          setUsername(user.username)
          setCurrentUser(user)
          // Also ensure currentUserId is set
          if (user.id) {
            localStorage.setItem('currentUserId', String(user.id))
          }
        }
      } catch (err) {
        console.error('Failed to load user from localStorage:', err)
        localStorage.removeItem('currentUser')
        localStorage.removeItem('currentUserId')
      }
    }
  }, [])

  const handleLogin = async (username: string, password: string) => {
    try {
      const user = await authApi.login(username, password)
      setIsAuthenticated(true)
      setUsername(user.username)
      setCurrentUser(user)
      // Store user in localStorage for CodeEditor to access
      localStorage.setItem('currentUser', JSON.stringify(user))
      // Also store user ID separately for easy access
      if (user.id) {
        localStorage.setItem('currentUserId', String(user.id))
      }
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
    setCurrentUser(null)
    localStorage.removeItem('currentUser')
    localStorage.removeItem('currentUserId')
    setShowUserManagement(false)
  }

  const handleRegister = async (username: string, password: string, email?: string) => {
    try {
      const user = await authApi.register(username, password, email)
      setIsAuthenticated(true)
      setUsername(user.username)
      setCurrentUser(user)
      // Store user in localStorage for CodeEditor to access
      localStorage.setItem('currentUser', JSON.stringify(user))
      // Also store user ID separately for easy access
      if (user.id) {
        localStorage.setItem('currentUserId', String(user.id))
      }
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  const renderPageContent = () => {
    switch (currentPage) {
      case 'design-docs':
        return <DesignDocs />
      case 'gpus':
        return <GPUMangement />
      case 'llm':
        return <LLMChat />
      case 'llm-manager':
        return <LLMManager />
      case 'editor':
        return <CodeEditor />
      default:
        return <CodeEditor />
    }
  }

  const handleShowSettings = () => {
    setShowUserSettings(true)
  }

  return (
    <div className="app">
      <Menu
        isAuthenticated={isAuthenticated}
        username={username}
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onRegister={handleRegister}
        showUserManagement={() => setShowUserManagement(true)}
        onShowSettings={handleShowSettings}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />

      {showUserManagement && (
        <UserManagement
          onClose={() => setShowUserManagement(false)}
          currentUser={username || ''}
          currentUserObj={currentUser}
          onUserUpdated={(updatedUser) => {
            setCurrentUser(updatedUser)
            localStorage.setItem('currentUser', JSON.stringify(updatedUser))
          }}
        />
      )}

      {showUserSettings && (
        <UserSettings
          show={showUserSettings}
          onClose={() => setShowUserSettings(false)}
          currentUser={currentUser}
          onUserUpdated={(updatedUser) => {
            setCurrentUser(updatedUser)
            localStorage.setItem('currentUser', JSON.stringify(updatedUser))
          }}
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
