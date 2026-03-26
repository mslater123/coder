import { useState, useEffect } from 'react'
import { userApi } from '../services/api'
import type { User } from '../services/api'
import './UserManagement.css'


interface UserManagementProps {
  onClose: () => void
  currentUser: string
  currentUserObj?: User | null
  onUserUpdated?: (user: User) => void
}

export function UserManagement({ onClose, currentUser, currentUserObj, onUserUpdated }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({ name: '', address: '', email: '', is_admin: false })
  const [uploadingImage, setUploadingImage] = useState(false)
  
  const isAdmin = currentUserObj?.is_admin || false
  const currentUserId = currentUserObj?.id

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
    // Only fetch users if admin
    if (isAdmin) {
      fetchUsers()
    } else {
      setError('Admin access required to view user management')
    }
  }, [isAdmin])

  const handleToggleActive = async (userId: string) => {
    try {
      const updatedUser = await userApi.toggleUserActive(userId)
      setUsers(users.map(u => u.id === userId ? updatedUser : u))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return
    try {
      await userApi.deleteUser(userId)
      setUsers(users.filter(u => u.id !== userId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user')
    }
  }

  const handleEditUser = (user: User) => {
    // Only allow editing own profile or if admin
    if (!isAdmin && user.username !== currentUser) {
      setError('You can only edit your own profile')
      return
    }
    setEditingUser(user)
    setEditForm({
      name: user.name || '',
      address: user.address || '',
      email: user.email || '',
      is_admin: user.is_admin || false
    })
  }

  const handleSaveUser = async () => {
    if (!editingUser) return
    try {
      const updateData: any = {
        name: editForm.name,
        address: editForm.address,
        email: editForm.email
      }
      
      // Only admins can change is_admin status
      if (isAdmin && editingUser.id !== currentUserId) {
        updateData.is_admin = editForm.is_admin
      }
      
      const updatedUser = await userApi.updateUser(editingUser.id, updateData)
      setUsers(users.map(u => u.id === editingUser.id ? updatedUser : u))
      
      // If this is the current user, notify parent to update
      if (editingUser.username === currentUser && onUserUpdated) {
        onUserUpdated(updatedUser)
      }
      
      setEditingUser(null)
      setEditForm({ name: '', address: '', email: '', is_admin: false })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, userId: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const result = await userApi.uploadProfileImage(userId, file)
      const updatedUser = result.user
      setUsers(users.map(u => u.id === userId ? updatedUser : u))
      
      // If this is the current user, notify parent to update
      const user = users.find(u => u.id === userId)
      if (user && user.username === currentUser && onUserUpdated) {
        onUserUpdated(updatedUser)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const getProfileImageUrl = (user: User): string => {
    if (user.profile_image) {
      if (user.profile_image.startsWith('http')) {
        return user.profile_image
      }
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5174'
      return `${apiBase}${user.profile_image}`
    }
    return ''
  }

  const getInitials = (user: User): string => {
    if (user.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return user.username.slice(0, 2).toUpperCase()
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
                      <div className="user-profile-section">
                        <div className="user-avatar-container">
                          {getProfileImageUrl(user) ? (
                            <img 
                              src={getProfileImageUrl(user)} 
                              alt={user.name || user.username}
                              className="user-profile-image"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                                const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement
                                if (fallback) fallback.style.display = 'flex'
                              }}
                            />
                          ) : null}
                          <div 
                            className="user-avatar-fallback"
                            style={{ display: getProfileImageUrl(user) ? 'none' : 'flex' }}
                          >
                            {getInitials(user)}
                          </div>
                          {(isAdmin || user.username === currentUser) && (
                            <label className="profile-image-upload-btn" title="Upload profile image">
                              📷
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                onChange={(e) => handleImageUpload(e, user.id)}
                                disabled={uploadingImage}
                              />
                            </label>
                          )}
                        </div>
                        <div className="user-details">
                          <div className="user-name">
                            {user.name || user.username}
                            {user.username === currentUser && <span className="current-user-badge">You</span>}
                            {user.is_admin && <span className="admin-badge">Admin</span>}
                          </div>
                          <div className="user-username">@{user.username}</div>
                          <div className="user-email">{user.email || 'No email'}</div>
                          {user.address && (
                            <div className="user-address">📍 {user.address}</div>
                          )}
                          <div className="user-meta">
                            Joined: {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="user-actions">
                      {(isAdmin || user.username === currentUser) && (
                        <button
                          className="action-btn edit-btn"
                          onClick={() => handleEditUser(user)}
                          title="Edit profile"
                        >
                          ✏️ Edit
                        </button>
                      )}
                      {isAdmin && (
                        <>
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
                        </>
                      )}
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

      {editingUser && (
        <div className="modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="user-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit User Profile</h2>
              <button className="modal-close" onClick={() => setEditingUser(null)}>×</button>
            </div>
            <div className="edit-form">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="Email address"
                />
              </div>
              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="Address"
                  rows={3}
                />
              </div>
              {isAdmin && editingUser && editingUser.id !== currentUserId && (
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={editForm.is_admin}
                      onChange={(e) => setEditForm({ ...editForm, is_admin: e.target.checked })}
                    />
                    Admin User
                  </label>
                </div>
              )}
              <div className="form-actions">
                <button className="btn btn-primary" onClick={handleSaveUser}>
                  Save
                </button>
                <button className="btn btn-secondary" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
