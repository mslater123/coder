import { useState, useEffect } from 'react'
import { userApi } from '../services/api'
import type { User } from '../services/api'
import './UserManagement.css'


interface UserManagementProps {
  onClose: () => void
  currentUser: string
}

export function UserManagement({ onClose, currentUser }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await userApi.getUsers()
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleToggleActive = async (userId: number) => {
    try {
      const updatedUser = await userApi.toggleUserActive(userId)
      setUsers(users.map(u => u.id === userId ? updatedUser : u))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return
    try {
      await userApi.deleteUser(userId)
      setUsers(users.filter(u => u.id !== userId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    }
  }

  useEffect(() => {
    if (searchTerm) {
      const searchUsers = async () => {
        setLoading(true)
        try {
          const results = await userApi.searchUsers(searchTerm)
          setUsers(results)
        } catch (err) {
          // Fallback to local filtering if search fails
          setError(err instanceof Error ? err.message : 'Search failed')
        } finally {
          setLoading(false)
        }
      }
      const timeoutId = setTimeout(searchUsers, 300)
      return () => clearTimeout(timeoutId)
    } else {
      fetchUsers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  const filteredUsers = users

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="user-management-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>👥 User Management</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        <div className="user-management-content">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          {loading ? (
            <div className="loading">Loading users...</div>
          ) : (
            <div className="users-list">
              {filteredUsers.length === 0 ? (
                <div className="empty-state">No users found</div>
              ) : (
                filteredUsers.map((user) => (
                  <div key={user.id} className="user-item">
                    <div className="user-info">
                      <div className="user-name">
                        {user.username}
                        {user.username === currentUser && <span className="current-user-badge">You</span>}
                      </div>
                      <div className="user-email">{user.email || 'No email'}</div>
                      <div className="user-meta">
                        Joined: {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="user-actions">
                      <button
                        className={`action-btn ${user.is_active ? 'active' : 'inactive'}`}
                        onClick={() => handleToggleActive(user.id)}
                        disabled={user.username === currentUser}
                      >
                        {user.is_active ? '✓ Active' : '✗ Inactive'}
                      </button>
                      <button
                        className="action-btn delete-btn"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={user.username === currentUser}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="user-stats">
            <div className="stat-item">
              <span className="stat-label">Total Users:</span>
              <span className="stat-value">{users.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Active:</span>
              <span className="stat-value">{users.filter(u => u.is_active).length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
