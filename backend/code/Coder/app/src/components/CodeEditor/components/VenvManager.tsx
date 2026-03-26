import React, { useState, useEffect } from 'react'
import { codeEditorApi } from '../../../services/api'
import './VenvManager.css'

interface VenvManagerProps {
  workingDir?: string
  onVenvChange?: (venvPath: string | null) => void
  onClose?: () => void
}

interface VenvInfo {
  path: string
  name: string
  python_path: string
  exists: boolean
  active: boolean
}

interface Package {
  name: string
  version: string
}

export const VenvManager: React.FC<VenvManagerProps> = ({
  workingDir,
  onVenvChange,
  onClose
}) => {
  const [venv, setVenv] = useState<VenvInfo | null>(null)
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [packageInput, setPackageInput] = useState('')
  const [installing, setInstalling] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [venvName, setVenvName] = useState('venv')
  const [pythonVersion, setPythonVersion] = useState('')

  useEffect(() => {
    detectVenv()
  }, [workingDir])

  const detectVenv = async () => {
    if (!workingDir) return
    
    setLoading(true)
    setError(null)
    try {
      const response = await codeEditorApi.detectVenv(workingDir)
      if (response.success) {
        setVenv(response.venv)
        if (response.venv) {
          await loadPackages()
          if (onVenvChange) {
            onVenvChange(response.venv.path)
          }
        } else {
          if (onVenvChange) {
            onVenvChange(null)
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to detect virtual environment')
    } finally {
      setLoading(false)
    }
  }

  const loadPackages = async () => {
    if (!venv || !workingDir) return
    
    setLoading(true)
    try {
      const response = await codeEditorApi.listVenvPackages(workingDir, venv.path)
      if (response.success) {
        setPackages(response.packages || [])
      }
    } catch (err: any) {
      console.error('Failed to load packages:', err)
    } finally {
      setLoading(false)
    }
  }

  const createVenv = async () => {
    if (!workingDir) return
    
    setInstalling(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await codeEditorApi.createVenv(workingDir, venvName, pythonVersion || undefined)
      if (response.success) {
        setSuccess(response.message)
        setShowCreateDialog(false)
        await detectVenv()
      } else {
        setError('Failed to create virtual environment')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create virtual environment')
    } finally {
      setInstalling(false)
    }
  }

  const installPackage = async (packageName: string, upgrade: boolean = false) => {
    if (!venv || !workingDir) return
    
    setInstalling(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await codeEditorApi.installVenvPackage(workingDir, packageName, upgrade, venv.path)
      if (response.success) {
        setSuccess(response.message)
        setPackageInput('')
        await loadPackages()
      } else {
        setError(response.error || 'Failed to install package')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to install package')
    } finally {
      setInstalling(false)
    }
  }

  const installRequirements = async () => {
    if (!venv || !workingDir) return
    
    setInstalling(true)
    setError(null)
    setSuccess(null)
    try {
      const requirementsFile = `${workingDir}/requirements.txt`
      const response = await codeEditorApi.installVenvRequirements(workingDir, requirementsFile, venv.path)
      if (response.success) {
        setSuccess(response.message)
        await loadPackages()
      } else {
        setError(response.error || 'Failed to install requirements')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to install requirements')
    } finally {
      setInstalling(false)
    }
  }

  const uninstallPackage = async (packageName: string) => {
    if (!venv || !workingDir) return
    
    if (!confirm(`Are you sure you want to uninstall ${packageName}?`)) {
      return
    }
    
    setInstalling(true)
    setError(null)
    setSuccess(null)
    try {
      const response = await codeEditorApi.uninstallVenvPackage(workingDir, packageName, venv.path)
      if (response.success) {
        setSuccess(response.message)
        await loadPackages()
      } else {
        setError(response.error || 'Failed to uninstall package')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to uninstall package')
    } finally {
      setInstalling(false)
    }
  }

  useEffect(() => {
    if (venv) {
      loadPackages()
    }
  }, [venv])

  return (
    <div className="venv-manager">
      <div className="venv-manager-header">
        <h3>Virtual Environment</h3>
        {onClose && (
          <button className="venv-close-btn" onClick={onClose} title="Close">
            ×
          </button>
        )}
      </div>

      {error && (
        <div className="venv-error">
          {error}
        </div>
      )}

      {success && (
        <div className="venv-success">
          {success}
        </div>
      )}

      {loading && !venv && (
        <div className="venv-loading">
          Detecting virtual environment...
        </div>
      )}

      {!venv && !loading && (
        <div className="venv-none">
          <p>No virtual environment detected in this project.</p>
          <button 
            className="venv-create-btn"
            onClick={() => setShowCreateDialog(true)}
          >
            Create Virtual Environment
          </button>
        </div>
      )}

      {showCreateDialog && (
        <div className="venv-create-dialog">
          <h4>Create Virtual Environment</h4>
          <div className="venv-form-group">
            <label>Name:</label>
            <input
              type="text"
              value={venvName}
              onChange={(e) => setVenvName(e.target.value)}
              placeholder="venv"
            />
          </div>
          <div className="venv-form-group">
            <label>Python Version (optional):</label>
            <input
              type="text"
              value={pythonVersion}
              onChange={(e) => setPythonVersion(e.target.value)}
              placeholder="3.12 (leave empty for default)"
            />
          </div>
          <div className="venv-form-actions">
            <button 
              onClick={createVenv}
              disabled={installing || !venvName.trim()}
              className="venv-primary-btn"
            >
              {installing ? 'Creating...' : 'Create'}
            </button>
            <button 
              onClick={() => {
                setShowCreateDialog(false)
                setVenvName('venv')
                setPythonVersion('')
              }}
              disabled={installing}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {venv && (
        <div className="venv-info">
          <div className="venv-status">
            <span className="venv-status-label">Status:</span>
            <span className="venv-status-active">● Active</span>
          </div>
          <div className="venv-path">
            <span className="venv-path-label">Path:</span>
            <span className="venv-path-value">{venv.path}</span>
          </div>
          <div className="venv-python">
            <span className="venv-python-label">Python:</span>
            <span className="venv-python-value">{venv.python_path}</span>
          </div>
        </div>
      )}

      {venv && (
        <div className="venv-packages-section">
          <div className="venv-packages-header">
            <h4>Installed Packages ({packages.length})</h4>
            <button 
              onClick={loadPackages}
              disabled={loading}
              className="venv-refresh-btn"
              title="Refresh"
            >
              ↻
            </button>
          </div>

          {loading && packages.length === 0 && (
            <div className="venv-loading">Loading packages...</div>
          )}

          {packages.length > 0 && (
            <div className="venv-packages-list">
              {packages.map((pkg) => (
                <div key={pkg.name} className="venv-package-item">
                  <span className="venv-package-name">{pkg.name}</span>
                  <span className="venv-package-version">{pkg.version}</span>
                  <button
                    className="venv-uninstall-btn"
                    onClick={() => uninstallPackage(pkg.name)}
                    disabled={installing}
                    title="Uninstall"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="venv-install-section">
            <h4>Install Package</h4>
            <div className="venv-install-input">
              <input
                type="text"
                value={packageInput}
                onChange={(e) => setPackageInput(e.target.value)}
                placeholder="Package name (e.g., flask, numpy)"
                disabled={installing}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && packageInput.trim()) {
                    installPackage(packageInput.trim())
                  }
                }}
              />
              <button
                onClick={() => installPackage(packageInput.trim())}
                disabled={installing || !packageInput.trim()}
                className="venv-install-btn"
              >
                {installing ? 'Installing...' : 'Install'}
              </button>
            </div>
            <div className="venv-requirements-section">
              <button
                onClick={installRequirements}
                disabled={installing}
                className="venv-requirements-btn"
              >
                {installing ? 'Installing...' : 'Install from requirements.txt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
