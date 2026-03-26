import React from 'react'
import type { Project } from '../types'

interface StatusBarProps {
  language: string
  editorRef: React.RefObject<any>
  activeTab: string
  openTabs: Array<{ path: string; name: string; content: string; modified: boolean }>
  currentProject: Project | undefined
  isAIAssisting: boolean
  venvInfo?: { path: string; python_path: string } | null
  onSelectPythonInterpreter?: () => void
  onShowVenvManager?: () => void
}

export const StatusBar: React.FC<StatusBarProps> = ({
  language,
  editorRef,
  activeTab,
  openTabs,
  currentProject,
  isAIAssisting,
  venvInfo,
  onSelectPythonInterpreter,
  onShowVenvManager
}) => {
  const getVenvDisplayName = () => {
    if (!venvInfo) return 'Select Python Interpreter'
    const venvName = venvInfo.path.split(/[/\\]/).pop() || 'venv'
    const pythonVersion = venvInfo.python_path.includes('python3') ? 'Python 3' : 'Python'
    return `${pythonVersion}: ${venvName}`
  }

  return (
    <div className="editor-statusbar">
      <div className="statusbar-left">
        <span className="statusbar-item">{language.toUpperCase()}</span>
        <span className="statusbar-item">Ln {editorRef.current?.getPosition()?.lineNumber || 1}, Col {editorRef.current?.getPosition()?.column || 1}</span>
        <span className="statusbar-item">Spaces: 2</span>
        {activeTab && (
          <span className="statusbar-item file-status">
            {openTabs.find(t => t.path === activeTab)?.modified ? '● ' : ''}
            {activeTab.split('/').pop()}
          </span>
        )}
      </div>
      <div className="statusbar-right">
        {currentProject && <span className="statusbar-item project-status">📁 {currentProject.name}</span>}
        {isAIAssisting && <span className="statusbar-item ai-status">🤖 AI Processing...</span>}
        {(language === 'python' || venvInfo) && (
          <span 
            className="statusbar-item statusbar-clickable python-interpreter"
            onClick={onSelectPythonInterpreter || onShowVenvManager}
            title={venvInfo ? `Python: ${venvInfo.python_path}` : 'Select Python Interpreter'}
          >
            🐍 {getVenvDisplayName()}
          </span>
        )}
      </div>
    </div>
  )
}
