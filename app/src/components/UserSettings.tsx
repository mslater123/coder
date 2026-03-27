import { useState, useEffect } from 'react'
import { userApi } from '../services/api'
import type { User } from '../services/api'
import './UserSettings.css'

interface UserSettingsProps {
  show: boolean
  onClose: () => void
  currentUser: User | null
  onUserUpdated?: (user: User) => void
}

export function UserSettings({ show, onClose, currentUser, onUserUpdated }: UserSettingsProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: ''
  })
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    if (currentUser && show) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        address: currentUser.address || ''
      })
      setError(null)
      setSuccess(null)
    }
  }, [currentUser, show])

  if (!show || !currentUser) return null

  const getProfileImageUrl = (): string => {
    if (currentUser.profile_image) {
      if (currentUser.profile_image.startsWith('http')) {
        return currentUser.profile_image
      }
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000'
      return `${apiBase}${currentUser.profile_image}`
    }
    return ''
  }

  const getInitials = (): string => {
    if (currentUser.name) {
      return currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return currentUser.username.slice(0, 2).toUpperCase()
  }

  const handleSave = async () => {
    if (!currentUser) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const updatedUser = await userApi.updateUser(currentUser.id, {
        name: formData.name,
        email: formData.email,
        address: formData.address
      })

      if (onUserUpdated) {
        onUserUpdated(updatedUser)
      }

      setSuccess('Profile updated successfully!')
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser) return

    setUploadingImage(true)
    setError(null)
    setSuccess(null)

    try {
      const result = await userApi.uploadProfileImage(currentUser.id, file)
      if (onUserUpdated) {
        onUserUpdated(result.user)
      }
      setSuccess('Profile image updated successfully!')
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="user-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>User Settings</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {success && (
          <div className="success-banner">
            {success}
          </div>
        )}

        <div className="user-settings-content">
          <div className="profile-section">
            <div className="profile-image-section">
              {getProfileImageUrl() ? (
                <img 
                  src={getProfileImageUrl()} 
                  alt={currentUser.name || currentUser.username}
                  className="profile-image-large"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                    const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement
                    if (fallback) fallback.style.display = 'flex'
                  }}
                />
              ) : null}
              <div 
                className="profile-avatar-large"
                style={{ display: getProfileImageUrl() ? 'none' : 'flex' }}
              >
                {getInitials()}
              </div>
              <label className="upload-image-btn">
                {uploadingImage ? 'Uploading...' : '📷 Change Photo'}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
              </label>
            </div>

            <div className="profile-info-section">
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  value={currentUser.username}
                  disabled
                  className="form-input disabled"
                />
                <small>Username cannot be changed</small>
              </div>

              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your full name"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter your email"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter your address"
                  rows={3}
                  className="form-textarea"
                />
              </div>

              <div className="form-actions">
                <button 
                  className="btn btn-primary" 
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
