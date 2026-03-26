import React, { useState, useEffect } from 'react'
import './GitDialog.css'
import { codeEditorApi } from '../../../services/api'

interface GitDialogProps {
  isOpen: boolean
  onClose: () => void
  currentProjectId: string | null
  currentProjectName: string | null
  onCloneSuccess?: () => void
}

export const GitDialog: React.FC<GitDialogProps> = ({
  isOpen,
  onClose,
  currentProjectId,
  currentProjectName,
  onCloneSuccess,
  onCreateProjectFromClone
}) => {
  const [activeTab, setActiveTab] = useState<'clone' | 'push' | 'pull' | 'status' | 'commit' | 'init'>('clone')
  const [cloneUrl, setCloneUrl] = useState('')
  const [clonePath, setClonePath] = useState('')
  const [cloneBranch, setCloneBranch] = useState('')
  const [isCloning, setIsCloning] = useState(false)
  const [cloneError, setCloneError] = useState<string | null>(null)
  const [cloneSuccess, setCloneSuccess] = useState<string | null>(null)
  
  const [pushMessage, setPushMessage] = useState('')
  const [isPushing, setIsPushing] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)
  const [pushSuccess, setPushSuccess] = useState<string | null>(null)
  
  const [isPulling, setIsPulling] = useState(false)
  const [pullError, setPullError] = useState<string | null>(null)
  const [pullSuccess, setPullSuccess] = useState<string | null>(null)
  
  const [gitStatus, setGitStatus] = useState<any>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && currentProjectName) {
      setClonePath(`/${currentProjectName}`)
      loadGitStatus()
    }
  }, [isOpen, currentProjectName])

  // Listen for tab change events from menu
  useEffect(() => {
    const handleTabChange = (e: CustomEvent) => {
      const tab = e.detail as 'clone' | 'push' | 'pull' | 'status'
      setActiveTab(tab)
    }
    
    window.addEventListener('git-tab-change', handleTabChange as EventListener)
    return () => {
      window.removeEventListener('git-tab-change', handleTabChange as EventListener)
    }
  }, [])

  const loadGitStatus = async () => {
    if (!currentProjectId) return
    
    setIsLoadingStatus(true)
    setStatusError(null)
    try {
      const currentProject = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/projects/${currentProjectId}`, {
        headers: {
          'X-User-Id': localStorage.getItem('currentUserId') || '',
          'Content-Type': 'application/json'
        }
      }).then(r => r.json())
      
      const projectPath = currentProject?.name ? `/${currentProject.name}` : undefined
      const status = await codeEditorApi.gitStatus(projectPath)
      setGitStatus(status)
    } catch (err: any) {
      setStatusError(err.message || 'Failed to load Git status')
    } finally {
      setIsLoadingStatus(false)
    }
  }

  const handleClone = async () => {
    if (!cloneUrl.trim()) {
      setCloneError('Repository URL is required')
      return
    }

    setIsCloning(true)
    setCloneError(null)
    setCloneSuccess(null)

    try {
      const targetPath = clonePath || undefined
      const result = await codeEditorApi.gitClone(cloneUrl, targetPath)
      
      if (result.success) {
        setCloneSuccess(`Repository cloned successfully to ${result.path}`)
        setCloneUrl('')
        setClonePath('')
        setCloneBranch('')
        if (onCloneSuccess) {
          setTimeout(() => {
            onCloneSuccess()
          }, 1000)
        }
      } else {
        setCloneError(result.error || 'Failed to clone repository')
      }
    } catch (err: any) {
      setCloneError(err.message || 'Failed to clone repository')
    } finally {
      setIsCloning(false)
    }
  }

  const handlePush = async () => {
    if (!currentProjectId) {
      setPushError('No project selected')
      return
    }

    setIsPushing(true)
    setPushError(null)
    setPushSuccess(null)

    try {
      const currentProject = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/projects/${currentProjectId}`, {
        headers: {
          'X-User-Id': localStorage.getItem('currentUserId') || '',
          'Content-Type': 'application/json'
        }
      }).then(r => r.json())
      
      const projectPath = currentProject?.name ? `/${currentProject.name}` : undefined
      
      // First commit if there are changes
      if (gitStatus?.has_changes) {
        const commitMessage = pushMessage || 'Update files'
        await codeEditorApi.gitCommit(projectPath, commitMessage)
      }
      
      // Then push
      const result = await codeEditorApi.gitPush(projectPath)
      
      if (result.success) {
        setPushSuccess('Code pushed successfully')
        setPushMessage('')
        await loadGitStatus()
      } else {
        setPushError(result.error || 'Failed to push code')
      }
    } catch (err: any) {
      setPushError(err.message || 'Failed to push code')
    } finally {
      setIsPushing(false)
    }
  }

  const handlePull = async () => {
    if (!currentProjectId) {
      setPullError('No project selected')
      return
    }

    setIsPulling(true)
    setPullError(null)
    setPullSuccess(null)

    try {
      const currentProject = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/projects/${currentProjectId}`, {
        headers: {
          'X-User-Id': localStorage.getItem('currentUserId') || '',
          'Content-Type': 'application/json'
        }
      }).then(r => r.json())
      
      const projectPath = currentProject?.name ? `/${currentProject.name}` : undefined
      const result = await codeEditorApi.gitPull(projectPath)
      
      if (result.success) {
        setPullSuccess('Code pulled successfully')
        await loadGitStatus()
        if (onCloneSuccess) {
          setTimeout(() => {
            onCloneSuccess()
          }, 500)
        }
      } else {
        setPullError(result.error || 'Failed to pull code')
      }
    } catch (err: any) {
      setPullError(err.message || 'Failed to pull code')
    } finally {
      setIsPulling(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="git-dialog-overlay" onClick={onClose}>
      <div className="git-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="git-dialog-header">
          <h2>Git Operations</h2>
          <button className="git-dialog-close" onClick={onClose}>×</button>
        </div>
        
        <div className="git-dialog-tabs">
          <button
            className={`git-tab ${activeTab === 'clone' ? 'active' : ''}`}
            onClick={() => setActiveTab('clone')}
          >
            Clone Repository
          </button>
          <button
            className={`git-tab ${activeTab === 'push' ? 'active' : ''}`}
            onClick={() => setActiveTab('push')}
          >
            Push Code
          </button>
          <button
            className={`git-tab ${activeTab === 'pull' ? 'active' : ''}`}
            onClick={() => setActiveTab('pull')}
          >
            Pull Changes
          </button>
          <button
            className={`git-tab ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('status')
              loadGitStatus()
            }}
          >
            Status
          </button>
        </div>

        <div className="git-dialog-content">
          {activeTab === 'clone' && (
            <div className="git-tab-content">
              <div className="git-form-group">
                <label>Repository URL</label>
                <input
                  type="text"
                  className="git-input"
                  placeholder="https://github.com/username/repo.git"
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                  disabled={isCloning}
                />
              </div>
              
              <div className="git-form-group">
                <label>Target Path (optional)</label>
                <input
                  type="text"
                  className="git-input"
                  placeholder={`/${currentProjectName || 'project'}/repo-name`}
                  value={clonePath}
                  onChange={(e) => setClonePath(e.target.value)}
                  disabled={isCloning}
                />
                <small className="git-hint">Leave empty to use repository name</small>
              </div>
              
              <div className="git-form-group">
                <label>Branch (optional)</label>
                <input
                  type="text"
                  className="git-input"
                  placeholder="main"
                  value={cloneBranch}
                  onChange={(e) => setCloneBranch(e.target.value)}
                  disabled={isCloning}
                />
                <small className="git-hint">Leave empty to clone default branch</small>
              </div>
              
              {cloneError && (
                <div className="git-error">{cloneError}</div>
              )}
              
              {cloneSuccess && (
                <div className="git-success">{cloneSuccess}</div>
              )}
              
              <button
                className="git-btn git-btn-primary"
                onClick={handleClone}
                disabled={isCloning || !cloneUrl.trim()}
              >
                {isCloning ? 'Cloning...' : 'Clone Repository'}
              </button>
            </div>
          )}

          {activeTab === 'push' && (
            <div className="git-tab-content">
              {gitStatus && (
                <div className="git-status-info">
                  <div className="git-status-item">
                    <strong>Repository:</strong> {gitStatus.is_git_repo ? '✓ Initialized' : '✗ Not initialized'}
                  </div>
                  {gitStatus.has_changes && (
                    <div className="git-status-item git-status-warning">
                      <strong>Changes:</strong> You have uncommitted changes
                    </div>
                  )}
                  {gitStatus.status && (
                    <div className="git-status-details">
                      <pre>{gitStatus.status}</pre>
                    </div>
                  )}
                </div>
              )}
              
              <div className="git-form-group">
                <label>Commit Message (if you have uncommitted changes)</label>
                <input
                  type="text"
                  className="git-input"
                  placeholder="Update files"
                  value={pushMessage}
                  onChange={(e) => setPushMessage(e.target.value)}
                  disabled={isPushing}
                />
              </div>
              
              {pushError && (
                <div className="git-error">{pushError}</div>
              )}
              
              {pushSuccess && (
                <div className="git-success">{pushSuccess}</div>
              )}
              
              <div className="git-actions">
                <button
                  className="git-btn git-btn-secondary"
                  onClick={loadGitStatus}
                  disabled={isPushing || isLoadingStatus}
                >
                  {isLoadingStatus ? 'Loading...' : 'Refresh Status'}
                </button>
                <button
                  className="git-btn git-btn-primary"
                  onClick={handlePush}
                  disabled={isPushing || !gitStatus?.is_git_repo}
                >
                  {isPushing ? 'Pushing...' : 'Push Code'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'pull' && (
            <div className="git-tab-content">
              <div className="git-info-box">
                <p>Pull the latest changes from the remote repository.</p>
              </div>
              
              {pullError && (
                <div className="git-error">{pullError}</div>
              )}
              
              {pullSuccess && (
                <div className="git-success">{pullSuccess}</div>
              )}
              
              <button
                className="git-btn git-btn-primary"
                onClick={handlePull}
                disabled={isPulling || !gitStatus?.is_git_repo}
              >
                {isPulling ? 'Pulling...' : 'Pull Changes'}
              </button>
            </div>
          )}

          {activeTab === 'status' && (
            <div className="git-tab-content">
              <div className="git-status-header">
                <h3>Git Repository Status</h3>
                <button
                  className="git-btn git-btn-small"
                  onClick={loadGitStatus}
                  disabled={isLoadingStatus}
                >
                  {isLoadingStatus ? 'Loading...' : 'Refresh'}
                </button>
              </div>
              
              {statusError && (
                <div className="git-error">{statusError}</div>
              )}
              
              {gitStatus ? (
                <div className="git-status-info">
                  <div className="git-status-item">
                    <strong>Repository:</strong> {gitStatus.is_git_repo ? '✓ Initialized' : '✗ Not initialized'}
                  </div>
                  <div className="git-status-item">
                    <strong>Has Changes:</strong> {gitStatus.has_changes ? 'Yes' : 'No'}
                  </div>
                  {gitStatus.status && (
                    <div className="git-status-details">
                      <strong>Status Details:</strong>
                      <pre>{gitStatus.status}</pre>
                    </div>
                  )}
                  {!gitStatus.is_git_repo && (
                    <div className="git-info-box">
                      <p>This project is not a Git repository. Initialize it first or clone a repository.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="git-loading">Loading Git status...</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
