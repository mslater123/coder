import React, { useState, useEffect } from 'react'
import type { Project } from '../types'
import { projectApi, userApi } from '../../../services/api'
import type { User } from '../../../services/api'
import './ProjectSettingsDialog.css'

interface ProjectSettingsDialogProps {
  isOpen: boolean
  onClose: () => void
  currentProject: Project | undefined
  currentProjectId: string | null
  currentUserId: string | null
  onProjectUpdated: () => void
}

interface ProjectUser {
  user_id: string
  username: string
  email?: string
  name?: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  is_creator: boolean
}

export const ProjectSettingsDialog: React.FC<ProjectSettingsDialogProps> = ({
  isOpen,
  onClose,
  currentProject,
  currentProjectId,
  currentUserId,
  onProjectUpdated
}) => {
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddUserDialog, setShowAddUserDialog] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member' | 'viewer'>('member')
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | 'viewer' | null>(null)

  useEffect(() => {
    if (isOpen && currentProjectId) {
      loadProjectUsers()
      loadAllUsers()
      checkUserRole()
    }
  }, [isOpen, currentProjectId, currentProject])

  const checkUserRole = async () => {
    if (!currentProjectId || !currentUserId) return
    
    try {
      const response = await projectApi.getProjectUsers(currentProjectId)
      if (response.success) {
        const user = response.users.find(u => u.user_id === currentUserId)
        if (user) {
          setUserRole(user.role as 'owner' | 'admin' | 'member' | 'viewer')
        } else if (currentProject?.created_by === currentUserId) {
          setUserRole('owner')
        } else {
          setUserRole(null)
        }
      }
    } catch (err) {
      console.error('Failed to check user role:', err)
    }
  }

  const loadProjectUsers = async () => {
    if (!currentProjectId) return
    
    setLoading(true)
    setError(null)
    try {
      const response = await projectApi.getProjectUsers(currentProjectId)
      if (response.success) {
        setProjectUsers(response.users)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load project users')
    } finally {
      setLoading(false)
    }
  }

  const loadAllUsers = async () => {
    try {
      // Use the project-specific endpoint that allows project owners/admins
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/list-for-project?project_id=${currentProjectId}`, {
        headers: {
          'X-User-Id': currentUserId || '',
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        // Fallback to empty list if not authorized
        setAllUsers([])
        return
      }
      
      const data = await response.json()
      if (data.success && data.users) {
        setAllUsers(data.users || [])
      } else {
        setAllUsers([])
      }
    } catch (err: any) {
      console.error('Failed to load all users:', err)
      setAllUsers([])
    }
  }

  const handleAddUser = async () => {
    if (!currentProjectId || !selectedUserId) return
    
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await projectApi.addProjectUser(currentProjectId, selectedUserId, selectedRole)
      setSuccess(`User added successfully with role: ${selectedRole}`)
      await loadProjectUsers()
      setShowAddUserDialog(false)
      setSelectedUserId('')
      setSelectedRole('member')
      onProjectUpdated()
    } catch (err: any) {
      setError(err.message || 'Failed to add user to project')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUserRole = async (userId: string, newRole: 'admin' | 'member' | 'viewer') => {
    if (!currentProjectId) return
    
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await projectApi.updateProjectUserRole(currentProjectId, userId, newRole)
      setSuccess(`User role updated to: ${newRole}`)
      await loadProjectUsers()
      onProjectUpdated()
    } catch (err: any) {
      setError(err.message || 'Failed to update user role')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!currentProjectId) return
    if (!window.confirm('Are you sure you want to remove this user from the project?')) {
      return
    }
    
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await projectApi.removeProjectUser(currentProjectId, userId)
      setSuccess('User removed from project')
      await loadProjectUsers()
      onProjectUpdated()
    } catch (err: any) {
      setError(err.message || 'Failed to remove user from project')
    } finally {
      setLoading(false)
    }
  }

  const canManageUsers = userRole === 'owner' || userRole === 'admin'
  const filteredUsers = allUsers.filter(user => 
    !projectUsers.some(pu => pu.user_id === user.id) &&
    (searchQuery === '' || 
     user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
     (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
     (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase())))
  )

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content project-settings-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Project Settings: {currentProject?.name || 'Unknown Project'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="project-settings-content">
          {!currentProjectId ? (
            <div className="project-settings-empty">
              <p>No project selected. Please open a project first.</p>
            </div>
          ) : !canManageUsers ? (
            <div className="project-settings-empty">
              <p>You don't have permission to manage users for this project. Only owners and admins can manage users.</p>
              <p>Your role: <strong>{userRole || 'None'}</strong></p>
            </div>
          ) : (
            <>
              <div className="project-settings-section">
                <h3>Project Users</h3>
                <p className="section-description">Manage users who have access to this project</p>

                {error && (
                  <div className="project-settings-error">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="project-settings-success">
                    {success}
                  </div>
                )}

                <div className="project-users-list">
                  {loading && projectUsers.length === 0 ? (
                    <div className="loading">Loading users...</div>
                  ) : projectUsers.length === 0 ? (
                    <div className="empty-state">No users in this project</div>
                  ) : (
                    <table className="project-users-table">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectUsers.map((user) => (
                          <tr key={user.user_id}>
                            <td>
                              <div className="user-info">
                                <strong>{user.name || user.username}</strong>
                                {user.is_creator && <span className="creator-badge">Creator</span>}
                              </div>
                            </td>
                            <td>{user.email || '-'}</td>
                            <td>
                              {user.is_creator ? (
                                <span className="role-badge role-owner">Owner</span>
                              ) : (
                                <select
                                  value={user.role}
                                  onChange={(e) => handleUpdateUserRole(user.user_id, e.target.value as any)}
                                  disabled={user.is_creator || loading}
                                  className="role-select"
                                >
                                  <option value="admin">Admin</option>
                                  <option value="member">Member</option>
                                  <option value="viewer">Viewer</option>
                                </select>
                              )}
                            </td>
                            <td>
                              {!user.is_creator && (
                                <button
                                  className="remove-user-btn"
                                  onClick={() => handleRemoveUser(user.user_id)}
                                  disabled={loading}
                                  title="Remove user from project"
                                >
                                  Remove
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="project-settings-actions">
                  <button
                    className="add-user-btn"
                    onClick={() => setShowAddUserDialog(true)}
                    disabled={loading}
                  >
                    + Add User
                  </button>
                </div>
              </div>

              {showAddUserDialog && (
                <div className="add-user-dialog">
                  <h4>Add User to Project</h4>
                  
                  <div className="form-group">
                    <label>Search Users</label>
                    <input
                      type="text"
                      placeholder="Search by username, email, or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="user-search-input"
                    />
                  </div>

                  <div className="form-group">
                    <label>Select User</label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="user-select"
                    >
                      <option value="">-- Select a user --</option>
                      {filteredUsers.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name || user.username} {user.email && `(${user.email})`}
                        </option>
                      ))}
                    </select>
                    {filteredUsers.length === 0 && searchQuery && (
                      <p className="form-hint">No users found matching your search</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Role</label>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as any)}
                      className="role-select"
                    >
                      <option value="admin">Admin - Can manage users and edit project</option>
                      <option value="member">Member - Can edit project files</option>
                      <option value="viewer">Viewer - Can only view project files</option>
                    </select>
                  </div>

                  <div className="dialog-actions">
                    <button
                      className="btn-primary"
                      onClick={handleAddUser}
                      disabled={!selectedUserId || loading}
                    >
                      {loading ? 'Adding...' : 'Add User'}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setShowAddUserDialog(false)
                        setSelectedUserId('')
                        setSearchQuery('')
                        setSelectedRole('member')
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
