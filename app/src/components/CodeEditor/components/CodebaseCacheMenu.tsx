import React, { useState, useEffect } from 'react'
import './CodebaseCacheMenu.css'

interface CodebaseCacheMenuProps {
  isOpen: boolean
  onClose: () => void
  analyzeCodebase: (forceRefresh?: boolean) => Promise<void>
  isAnalyzing: boolean
  analysisCacheStatus: 'none' | 'cached' | 'fresh'
  codebaseAnalysis: any
  localDirectory: string
}

export const CodebaseCacheMenu: React.FC<CodebaseCacheMenuProps> = ({
  isOpen,
  onClose,
  analyzeCodebase,
  isAnalyzing,
  analysisCacheStatus,
  codebaseAnalysis,
  localDirectory
}) => {
  const [cacheDetails, setCacheDetails] = useState<{
    fileCount: number
    totalDirs: number
    languages: Record<string, number>
    functions: number
    classes: number
    lastUpdated: string | null
    cached: boolean
  } | null>(null)

  useEffect(() => {
    if (isOpen && codebaseAnalysis) {
      // Extract cache details from analysis
      const analysis = codebaseAnalysis.analysis || codebaseAnalysis
      setCacheDetails({
        fileCount: analysis.total_files || 0,
        totalDirs: analysis.total_dirs || 0,
        languages: analysis.files_by_language || {},
        functions: analysis.functions?.length || 0,
        classes: analysis.classes?.length || 0,
        lastUpdated: codebaseAnalysis.updated_at || null,
        cached: codebaseAnalysis.cached || false
      })
    } else if (isOpen) {
      // Try to fetch cache status
      fetchCacheStatus()
    }
  }, [isOpen, codebaseAnalysis])

  const fetchCacheStatus = async () => {
    try {
      const { codeEditorApi } = await import('../../../services/api')
      const response = await codeEditorApi.getCachedAnalysis(localDirectory)
      if (response.success && response.analysis) {
        const analysis = response.analysis.analysis_data || response.analysis
        const parsed = typeof analysis === 'string' ? JSON.parse(analysis) : analysis
        setCacheDetails({
          fileCount: parsed.total_files || 0,
          totalDirs: parsed.total_dirs || 0,
          languages: parsed.files_by_language || {},
          functions: parsed.functions?.length || 0,
          classes: parsed.classes?.length || 0,
          lastUpdated: response.analysis.updated_at || null,
          cached: true
        })
      } else {
        setCacheDetails(null)
      }
    } catch (err) {
      console.warn('Failed to fetch cache status:', err)
      setCacheDetails(null)
    }
  }

  if (!isOpen) return null

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    try {
      const date = new Date(dateString)
      return date.toLocaleString()
    } catch {
      return 'Unknown'
    }
  }

  const getStatusColor = () => {
    if (isAnalyzing) return '#ffa500' // Orange
    if (analysisCacheStatus === 'fresh') return '#4caf50' // Green
    if (analysisCacheStatus === 'cached') return '#2196f3' // Blue
    return '#9e9e9e' // Gray
  }

  const getStatusText = () => {
    if (isAnalyzing) return 'Analyzing...'
    if (analysisCacheStatus === 'fresh') return 'Fresh'
    if (analysisCacheStatus === 'cached') return 'Cached'
    return 'Not Analyzed'
  }

  return (
    <div className="codebase-cache-menu-overlay" onClick={onClose}>
      <div className="codebase-cache-menu" onClick={(e) => e.stopPropagation()}>
        <div className="codebase-cache-menu-header">
          <h3>Codebase Cache</h3>
          <button className="codebase-cache-menu-close" onClick={onClose}>×</button>
        </div>
        
        <div className="codebase-cache-menu-content">
          {/* Status Section */}
          <div className="cache-status-section">
            <div className="cache-status-header">
              <span className="cache-status-label">Status:</span>
              <span 
                className="cache-status-badge"
                style={{ backgroundColor: getStatusColor() }}
              >
                {getStatusText()}
              </span>
            </div>
            {cacheDetails && (
              <div className="cache-status-details">
                <div className="cache-detail-item">
                  <span className="cache-detail-label">Last Updated:</span>
                  <span className="cache-detail-value">{formatDate(cacheDetails.lastUpdated)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Statistics Section */}
          {cacheDetails ? (
            <div className="cache-stats-section">
              <h4>Statistics</h4>
              <div className="cache-stats-grid">
                <div className="cache-stat-item">
                  <span className="cache-stat-value">{cacheDetails.fileCount}</span>
                  <span className="cache-stat-label">Files</span>
                </div>
                <div className="cache-stat-item">
                  <span className="cache-stat-value">{cacheDetails.totalDirs}</span>
                  <span className="cache-stat-label">Directories</span>
                </div>
                <div className="cache-stat-item">
                  <span className="cache-stat-value">{cacheDetails.functions}</span>
                  <span className="cache-stat-label">Functions</span>
                </div>
                <div className="cache-stat-item">
                  <span className="cache-stat-value">{cacheDetails.classes}</span>
                  <span className="cache-stat-label">Classes</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="cache-no-data">
              <div className="cache-no-data-icon">📊</div>
              <p>No cache data available</p>
              <p className="cache-no-data-hint">Click "Analyze" to build the cache</p>
            </div>
          )}

          {/* Languages Section */}
          {cacheDetails && cacheDetails.languages && Object.keys(cacheDetails.languages).length > 0 && (
            <div className="cache-languages-section">
              <h4>Languages</h4>
              <div className="cache-languages-list">
                {Object.entries(cacheDetails.languages)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([lang, count]) => (
                    <div key={lang} className="cache-language-item">
                      <span className="cache-language-name">{lang}</span>
                      <span className="cache-language-count">{count as number} files</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Actions Section */}
          <div className="cache-actions-section">
            <button
              className="cache-action-btn cache-action-primary"
              onClick={() => {
                analyzeCodebase(false)
                onClose()
              }}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? '⏳ Analyzing...' : '🔄 Re-analyze'}
            </button>
            <button
              className="cache-action-btn cache-action-secondary"
              onClick={() => {
                analyzeCodebase(true)
                onClose()
              }}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? '⏳ Analyzing...' : '🔄 Force Refresh'}
            </button>
            {cacheDetails && (
              <button
                className="cache-action-btn cache-action-info"
                onClick={fetchCacheStatus}
                disabled={isAnalyzing}
              >
                ℹ️ Refresh Status
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
