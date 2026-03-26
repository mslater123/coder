import { useState, useEffect, useRef } from 'react'
import './Menu.css'

interface MenuProps {
  isAuthenticated: boolean
  username?: string
  currentUser?: any
  onLogin: (username: string, password: string) => Promise<void>
  onLogout: () => void
  onRegister: (username: string, password: string, email?: string) => Promise<void>
  showUserManagement: () => void
  onShowSettings?: () => void
  currentPage?: string
  onPageChange?: (page: string) => void
}

export function Menu({ isAuthenticated, username, currentUser, onLogin, onLogout, onRegister, showUserManagement, onShowSettings, currentPage, onPageChange }: MenuProps) {
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ username: '', password: '', email: '', confirmPassword: '' })
  const [error, setError] = useState<string | null>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node) && showUserMenu) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!loginForm.username || !loginForm.password) {
      setError('Please fill in all fields')
      return
    }
    try {
      await onLogin(loginForm.username, loginForm.password)
      setShowLoginModal(false)
      setLoginForm({ username: '', password: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!registerForm.username || !registerForm.password || !registerForm.confirmPassword) {
      setError('Please fill in all required fields')
      return
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (registerForm.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    try {
      await onRegister(registerForm.username, registerForm.password, registerForm.email)
      setShowRegisterModal(false)
      setRegisterForm({ username: '', password: '', email: '', confirmPassword: '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <>
      <nav className="top-menu-bar">
        <div className="menu-left">
          <div className="menu-brand">
            <span className="brand-icon">💻</span>
            <span className="brand-text">Coder Platform</span>
          </div>
        </div>
        
        <div className="menu-right">
          {!isAuthenticated ? (
            <div className="auth-buttons">
              <button className="btn-login" onClick={() => setShowLoginModal(true)}>
                Login
              </button>
              <button className="btn-register" onClick={() => setShowRegisterModal(true)}>
                Register
              </button>
            </div>
          ) : (
            <div className="user-profile-container" ref={userMenuRef}>
              <button 
                className="user-profile-btn" 
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-label="User menu"
              >
                {currentUser?.profile_image ? (
                  <img 
                    src={currentUser.profile_image.startsWith('http') ? currentUser.profile_image : `${import.meta.env.VITE_API_URL || 'http://localhost:5174'}${currentUser.profile_image}`}
                    alt={currentUser.name || username}
                    className="user-avatar-image"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none'
                      const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement
                      if (fallback) fallback.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div className="user-avatar" style={{ display: currentUser?.profile_image ? 'none' : 'flex' }}>
                  {getInitials(currentUser?.name || username)}
                </div>
                <span className="username-text">{currentUser?.name || username}</span>
                <span className={`dropdown-arrow ${showUserMenu ? 'open' : ''}`}>▼</span>
              </button>
              
              {showUserMenu && (
                <div className="user-dropdown-menu">
                  <div className="dropdown-header">
                    {currentUser?.profile_image ? (
                      <img 
                        src={currentUser.profile_image.startsWith('http') ? currentUser.profile_image : `${import.meta.env.VITE_API_URL || 'http://localhost:5174'}${currentUser.profile_image}`}
                        alt={currentUser.name || username}
                        className="dropdown-avatar-image"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                          const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement
                          if (fallback) fallback.style.display = 'flex'
                        }}
                      />
                    ) : null}
                    <div className="dropdown-avatar" style={{ display: currentUser?.profile_image ? 'none' : 'flex' }}>
                      {getInitials(currentUser?.name || username)}
                    </div>
                    <div className="dropdown-user-info">
                      <div className="dropdown-username">{currentUser?.name || username}</div>
                      <div className="dropdown-email">{currentUser?.email || 'User Account'}</div>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
                  {currentUser?.is_admin && (
                    <button 
                      className="dropdown-menu-item" 
                      onClick={() => {
                        showUserManagement()
                        setShowUserMenu(false)
                      }}
                    >
                      <span className="menu-icon">👥</span>
                      <span>User Management</span>
                    </button>
                  )}
                  <button 
                    className="dropdown-menu-item" 
                    onClick={() => {
                      onShowSettings?.()
                      setShowUserMenu(false)
                    }}
                  >
                    <span className="menu-icon">⚙️</span>
                    <span>Settings</span>
                  </button>
                  <div className="dropdown-divider"></div>
                  <button 
                    className="dropdown-menu-item logout-item" 
                    onClick={() => {
                      onLogout()
                      setShowUserMenu(false)
                    }}
                  >
                    <span className="menu-icon">🚪</span>
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Login</h3>
              <button className="modal-close" onClick={() => setShowLoginModal(false)}>×</button>
            </div>
            <form onSubmit={handleLogin} className="auth-form">
              {error && <div className="form-error">{error}</div>}
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">Login</button>
            </form>
          </div>
        </div>
      )}

      {showRegisterModal && (
        <div className="modal-overlay" onClick={() => setShowRegisterModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Register</h3>
              <button className="modal-close" onClick={() => setShowRegisterModal(false)}>×</button>
            </div>
            <form onSubmit={handleRegister} className="auth-form">
              {error && <div className="form-error">{error}</div>}
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={registerForm.username}
                  onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                  placeholder="Enter username"
                  required
                />
              </div>
              <div className="form-group">
                <label>Email (Optional)</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  placeholder="Enter email"
                />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  placeholder="Enter password"
                  autoComplete="new-password"
                  required
                />
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">Register</button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
