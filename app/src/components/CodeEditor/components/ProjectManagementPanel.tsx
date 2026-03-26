import React, { useState, useEffect } from 'react'
import type { Project } from '../types'
import { projectApi, userApi } from '../../../services/api'
import type { User } from '../../../services/api'
import './ProjectManagementPanel.css'

interface ProjectManagementPanelProps {
  isOpen: boolean
  onClose: () => void
  projects: Project[]
  currentProjectId: string | null
  currentUserId: string | null
  onProjectUpdated: () => void
  onProjectSelected: (projectId: string) => void
}

interface ProjectUser {
  user_id: string
  username: string
  email?: string
  name?: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  is_creator: boolean
}

export const ProjectManagementPanel: React.FC<ProjectManagementPanelProps> = ({
  isOpen,
  onClose,
  projects,
  currentProjectId,
  currentUserId,
  onProjectUpdated,
  onProjectSelected
}) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddUserDialog, setShowAddUserDialog] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member' | 'viewer'>('member')
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | 'viewer' | null>(null)

  useEffect(() => {
    if (isOpen && currentProjectId) {
      const project = projects.find(p => p.id === currentProjectId)
      if (project) {
        setSelectedProject(project)
        loadProjectUsers(project.id)
      }
    }
  }, [isOpen, currentProjectId, projects])

  useEffect(() => {
    if (selectedProject && currentUserId) {
      checkUserRole()
    }
  }, [selectedProject, currentUserId])

  const checkUserRole = async () => {
    if (!selectedProject || !currentUserId) return
    
    try {
      const response = await projectApi.getProjectUsers(selectedProject.id)
      if (response.success) {
        const user = response.users.find(u => u.user_id === currentUserId)
        if (user) {
          setUserRole(user.role as 'owner' | 'admin' | 'member' | 'viewer')
        } else if (selectedProject.created_by === currentUserId) {
          setUserRole('owner')
        } else {
          setUserRole(null)
        }
      }
    } catch (err) {
      console.error('Failed to check user role:', err)
    }
  }

  const loadProjectUsers = async (projectId: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await projectApi.getProjectUsers(projectId)
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
    if (!selectedProject) return
    
    try {
      // Use the project-specific endpoint that allows project owners/admins
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/list-for-project?project_id=${selectedProject.id}`, {
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
    } catch (err) {
      console.error('Failed to load users:', err)
      setAllUsers([])
    }
  }

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project)
    setEditingProject(null)
    loadProjectUsers(project.id)
    onProjectSelected(project.id)
  }

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
    setEditName(project.name)
    setEditDescription(project.description || '')
  }

  const handleSaveProject = async () => {
    if (!editingProject) return
    
    setLoading(true)
    setError(null)
    try {
      await projectApi.updateProject(editingProject.id, {
        name: editName,
        description: editDescription
      })
      setEditingProject(null)
      onProjectUpdated()
      // Reload selected project
      if (selectedProject?.id === editingProject.id) {
        const updated = await projectApi.getProject(editingProject.id)
        if (updated.success) {
          setSelectedProject({
            ...updated.project,
            createdAt: new Date(updated.project.created_at),
            updatedAt: new Date(updated.project.updated_at)
          })
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update project')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }
    
    setLoading(true)
    setError(null)
    try {
      await projectApi.deleteProject(projectId)
      onProjectUpdated()
      if (selectedProject?.id === projectId) {
        setSelectedProject(null)
        setProjectUsers([])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete project')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async () => {
    if (!selectedProject || !selectedUserId) return
    
    setLoading(true)
    setError(null)
    try {
      await projectApi.addProjectUser(selectedProject.id, selectedUserId, selectedRole)
      await loadProjectUsers(selectedProject.id)
      setShowAddUserDialog(false)
      setSelectedUserId('')
      setSelectedRole('member')
    } catch (err: any) {
      setError(err.message || 'Failed to add user to project')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateUserRole = async (userId: string, newRole: 'admin' | 'member' | 'viewer') => {
    if (!selectedProject) return
    
    setLoading(true)
    setError(null)
    try {
      await projectApi.updateProjectUserRole(selectedProject.id, userId, newRole)
      await loadProjectUsers(selectedProject.id)
    } catch (err: any) {
      setError(err.message || 'Failed to update user role')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveUser = async (userId: string) => {
    if (!selectedProject) return
    if (!window.confirm('Are you sure you want to remove this user from the project?')) {
      return
    }
    
    setLoading(true)
    setError(null)
    try {
      await projectApi.removeProjectUser(selectedProject.id, userId)
      await loadProjectUsers(selectedProject.id)
    } catch (err: any) {
      setError(err.message || 'Failed to remove user from project')
    } finally {
      setLoading(false)
    }
  }

  const canManageUsers = userRole === 'owner' || userRole === 'admin'

  const filteredUsers = allUsers.filter(user => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      user.username.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.name?.toLowerCase().includes(query)
    )
  })

  const availableUsers = filteredUsers.filter(user => {
    // Don't show users already in the project
    return !projectUsers.some(pu => pu.user_id === user.id)
  })

  if (!isOpen) return null

  return (
    <div className="project-management-overlay" onClick={onClose}>
      <div className="project-management-panel" onClick={(e) => e.stopPropagation()}>
        <div className="project-management-header">
          <h2>Project Management</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {error && (
          <div className="project-management-error">{error}</div>
        )}

        <div className="project-management-content">
          <div className="project-management-sidebar">
            <h3>Projects</h3>
            <div className="project-list-management">
              {projects.map(project => (
                <div
                  key={project.id}
                  className={`project-item-management ${selectedProject?.id === project.id ? 'active' : ''}`}
                  onClick={() => handleProjectSelect(project)}
                >
                  <div className="project-item-name">{project.name}</div>
                  {project.description && (
                    <div className="project-item-desc">{project.description}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="project-management-main">
            {selectedProject ? (
              <>
                <div className="project-details-header">
                  <div>
                    {editingProject ? (
                      <div className="project-edit-form">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Project name"
                          className="project-edit-input"
                        />
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Project description"
                          className="project-edit-textarea"
                        />
                        <div className="project-edit-actions">
                          <button onClick={handleSaveProject} disabled={loading || !editName.trim()}>
                            Save
                          </button>
                          <button onClick={() => setEditingProject(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3>{selectedProject.name}</h3>
                        {selectedProject.description && (
                          <p className="project-description">{selectedProject.description}</p>
                        )}
                        <div className="project-actions">
                          <button onClick={() => handleEditProject(selectedProject)}>Edit</button>
                          {userRole === 'owner' && (
                            <button
                              className="delete-btn"
                              onClick={() => handleDeleteProject(selectedProject.id)}
                              disabled={loading}
                            >
                              Delete Project
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="project-users-section">
                  <div className="project-users-header">
                    <h4>Project Users</h4>
                    {canManageUsers && (
                      <button
                        className="add-user-btn"
                        onClick={() => {
                          setShowAddUserDialog(true)
                          loadAllUsers()
                        }}
                      >
                        + Add User
                      </button>
                    )}
                  </div>

                  {loading && projectUsers.length === 0 ? (
                    <div className="loading">Loading users...</div>
                  ) : (
                    <div className="project-users-list">
                      {projectUsers.map(user => (
                        <div key={user.user_id} className="project-user-item">
                          <div className="user-info">
                            <div className="user-name">
                              {user.name || user.username}
                              {user.is_creator && <span className="creator-badge">Creator</span>}
                            </div>
                            <div className="user-details">
                              <span className="user-username">@{user.username}</span>
                              {user.email && <span className="user-email">{user.email}</span>}
                            </div>
                          </div>
                          <div className="user-role-section">
                            {user.is_creator ? (
                              <span className="user-role owner">Owner</span>
                            ) : canManageUsers ? (
                              <select
                                value={user.role}
                                onChange={(e) => handleUpdateUserRole(user.user_id, e.target.value as 'admin' | 'member' | 'viewer')}
                                className="role-select"
                                disabled={loading}
                              >
                                <option value="admin">Admin</option>
                                <option value="member">Member</option>
                                <option value="viewer">Viewer</option>
                              </select>
                            ) : (
                              <span className={`user-role ${user.role}`}>{user.role}</span>
                            )}
                            {canManageUsers && !user.is_creator && (
                              <button
                                className="remove-user-btn"
                                onClick={() => handleRemoveUser(user.user_id)}
                                disabled={loading}
                                title="Remove user from project"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="no-project-selected">
                <p>Select a project to manage</p>
              </div>
            )}
          </div>
        </div>

        {showAddUserDialog && (
          <div className="add-user-dialog-overlay" onClick={() => setShowAddUserDialog(false)}>
            <div className="add-user-dialog" onClick={(e) => e.stopPropagation()}>
              <h3>Add User to Project</h3>
              <div className="add-user-search">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="add-user-list">
                {availableUsers.length === 0 ? (
                  <div className="no-users">No users found</div>
                ) : (
                  availableUsers.map(user => (
                    <div
                      key={user.id}
                      className={`add-user-item ${selectedUserId === user.id ? 'selected' : ''}`}
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      <div className="user-name">{user.name || user.username}</div>
                      <div className="user-username">@{user.username}</div>
                      {user.email && <div className="user-email">{user.email}</div>}
                    </div>
                  ))
                )}
              </div>
              <div className="add-user-role">
                <label>Role:</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'member' | 'viewer')}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <div className="add-user-actions">
                <button
                  onClick={handleAddUser}
                  disabled={loading || !selectedUserId}
                >
                  Add User
                </button>
                <button onClick={() => setShowAddUserDialog(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
