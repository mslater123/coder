import React, { useState, useEffect } from 'react'

interface Improvement {
  type: string
  file_path: string
  line_number: number
  description: string
  current_code: string
  suggested_code: string
  priority: number
  confidence: number
  category: string
  auto_apply: boolean
}

interface AutoImprovementPanelProps {
  workingDir?: string
  onImprovementsApplied?: (count: number, filesModified: string[]) => void
}

export const AutoImprovementPanel: React.FC<AutoImprovementPanelProps> = ({
  workingDir,
  onImprovementsApplied
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [improvements, setImprovements] = useState<Improvement[]>([])
  const [analysis, setAnalysis] = useState<any>(null)
  const [autoMode, setAutoMode] = useState(false)
  const [lastRun, setLastRun] = useState<Date | null>(null)

  const analyzeImprovements = async () => {
    setIsAnalyzing(true)
    try {
      const { codeEditorApi } = await import('../../../services/api')
      const response = await codeEditorApi.analyzeImprovements(workingDir, 100)
      if (response.success) {
        setAnalysis(response.analysis)
        setImprovements(response.analysis.improvements || [])
      }
    } catch (err: any) {
      console.error('Failed to analyze improvements:', err)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const applyAutoImprovements = async () => {
    setIsApplying(true)
    try {
      const { codeEditorApi } = await import('../../../services/api')
      const response = await codeEditorApi.autoImproveCodebase(workingDir, 50, 10)
      if (response.success) {
        setAnalysis(response.analysis)
        setImprovements(response.analysis.improvements || [])
        setLastRun(new Date())
        if (onImprovementsApplied) {
          onImprovementsApplied(response.results.applied, response.results.files_modified || [])
        }
      }
    } catch (err: any) {
      console.error('Failed to apply improvements:', err)
    } finally {
      setIsApplying(false)
    }
  }

  const applySelectedImprovements = async (selected: Improvement[]) => {
    setIsApplying(true)
    try {
      const { codeEditorApi } = await import('../../../services/api')
      const response = await codeEditorApi.applyImprovements(workingDir, selected, false)
      if (response.success) {
        setLastRun(new Date())
        if (onImprovementsApplied) {
          onImprovementsApplied(response.results.applied, response.results.files_modified || [])
        }
        // Refresh analysis
        await analyzeImprovements()
      }
    } catch (err: any) {
      console.error('Failed to apply improvements:', err)
    } finally {
      setIsApplying(false)
    }
  }

  // Auto-mode: periodically apply improvements
  useEffect(() => {
    if (!autoMode) return

    const interval = setInterval(async () => {
      await applyAutoImprovements()
    }, 300000) // Every 5 minutes

    return () => clearInterval(interval)
  }, [autoMode, workingDir])

  const autoApplicable = improvements.filter(imp => imp.auto_apply)
  const byCategory = improvements.reduce((acc, imp) => {
    acc[imp.category] = (acc[imp.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="auto-improvement-panel">
      <div className="improvement-header">
        <h3>🔧 Auto App Builder</h3>
        <div className="improvement-controls">
          <button
            className={`auto-mode-btn ${autoMode ? 'active' : ''}`}
            onClick={() => setAutoMode(!autoMode)}
            title={autoMode ? 'Disable auto-improvements' : 'Enable auto-improvements'}
          >
            {autoMode ? '⏸️ Auto' : '▶️ Auto'}
          </button>
          <button
            className="analyze-btn"
            onClick={analyzeImprovements}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? '⏳ Analyzing...' : '🔍 Analyze'}
          </button>
          <button
            className="apply-btn"
            onClick={applyAutoImprovements}
            disabled={isApplying || autoApplicable.length === 0}
          >
            {isApplying ? '⏳ Applying...' : `✨ Apply (${autoApplicable.length})`}
          </button>
        </div>
      </div>

      {analysis && (
        <div className="improvement-summary">
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-label">Total:</span>
              <span className="stat-value">{analysis.total_improvements}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Auto-apply:</span>
              <span className="stat-value">{analysis.auto_applicable}</span>
            </div>
            {lastRun && (
              <div className="stat">
                <span className="stat-label">Last run:</span>
                <span className="stat-value">{lastRun.toLocaleTimeString()}</span>
              </div>
            )}
          </div>
          {Object.keys(byCategory).length > 0 && (
            <div className="category-breakdown">
              {Object.entries(byCategory).map(([cat, count]) => (
                <span key={cat} className="category-badge">
                  {cat}: {count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {improvements.length > 0 && (
        <div className="improvements-list">
          <div className="improvements-header-row">
            <span>File</span>
            <span>Line</span>
            <span>Category</span>
            <span>Priority</span>
            <span>Action</span>
          </div>
          {improvements
            .sort((a, b) => b.priority - a.priority)
            .slice(0, 20)
            .map((imp, idx) => (
              <div key={idx} className={`improvement-item ${imp.auto_apply ? 'auto-apply' : ''}`}>
                <span className="imp-file">{imp.file_path.split('/').pop()}</span>
                <span className="imp-line">{imp.line_number}</span>
                <span className="imp-category">{imp.category}</span>
                <span className="imp-priority">
                  {'★'.repeat(Math.min(imp.priority, 5))}
                </span>
                <button
                  className="apply-single-btn"
                  onClick={() => applySelectedImprovements([imp])}
                  disabled={isApplying || !imp.auto_apply}
                  title={imp.description}
                >
                  {imp.auto_apply ? '✓ Apply' : '👁️ Review'}
                </button>
              </div>
            ))}
        </div>
      )}

      {improvements.length === 0 && !isAnalyzing && (
        <div className="improvement-empty">
          <p>No improvements found. Click "Analyze" to scan the codebase.</p>
        </div>
      )}
    </div>
  )
}
