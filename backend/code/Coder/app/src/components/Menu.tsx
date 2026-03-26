import { useState, useEffect, useRef } from 'react'
import './Menu.css'

interface MenuProps {
  isAuthenticated: boolean
  username?: string
  onLogin: (username: string, password: string) => void
  onLogout: () => void
  onRegister: (username: string, password: string, email?: string) => void
  showUserManagement: () => void
}

export function Menu({ isAuthenticated, username, onLogin, onLogout, onRegister, showUserManagement }: MenuProps) {
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [loginForm, setLoginForm] = useState({ username: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ username: '', password: '', email: '', confirmPassword: '' })
  const [error, setError] = useState<string | null>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!loginForm.username || !loginForm.password) {
      setError('Please fill in all fields')
      return
    }
    onLogin(loginForm.username, loginForm.password)
    setShowLoginModal(false)
    setLoginForm({ username: '', password: '' })
  }

  const handleRegister = (e: React.FormEvent) => {
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
    onRegister(registerForm.username, registerForm.password, registerForm.email)
    setShowRegisterModal(false)
    setRegisterForm({ username: '', password: '', email: '', confirmPassword: '' })
  }

  return (
    <>
      <nav className="top-menu-bar">
        <div className="menu-left">
          <div className="menu-brand">
            <span className="brand-icon">⚡</span>
            <span className="brand-text">Bitcoin Tracker</span>
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
                <div className="user-avatar">
                  {getInitials(username)}
                </div>
                <span className="username-text">{username}</span>
                <span className={`dropdown-arrow ${showUserMenu ? 'open' : ''}`}>▼</span>
              </button>
              
              {showUserMenu && (
                <div className="user-dropdown-menu">
                  <div className="dropdown-header">
                    <div className="dropdown-avatar">
                      {getInitials(username)}
                    </div>
                    <div className="dropdown-user-info">
                      <div className="dropdown-username">{username}</div>
                      <div className="dropdown-email">User Account</div>
                    </div>
                  </div>
                  <div className="dropdown-divider"></div>
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
                  <button
                    className="dropdown-menu-item"
                    onClick={() => {
                      setShowUserMenu(false)
                      // Add settings handler here if needed
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
