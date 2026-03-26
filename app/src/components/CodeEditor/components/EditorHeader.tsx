import React, { useState } from 'react'
import type { Project } from '../types'
import { CodebaseCacheMenu } from './CodebaseCacheMenu'

interface EditorHeaderProps {
  isSidebarAlwaysVisible: boolean
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  currentProject: Project | undefined
  currentProjectId: string | null
  showProjectSwitcher: boolean
  setShowProjectSwitcher: (show: boolean) => void
  setShowNewProjectDialog: (show: boolean) => void
  projects: Project[]
  openProject: (id: string) => void
  deleteProject: (id: string) => void
  activeTab: string
  selectedFile: string
  openTabs: Array<{ path: string; name: string; content: string; modified: boolean }>
  setShowSettings: (show: boolean) => void
  aiPanelVisible: boolean
  setAiPanelVisible: (visible: boolean) => void
  autoAppPanelVisible: boolean
  setAutoAppPanelVisible: (visible: boolean) => void
  analyzeCodebase: (forceRefresh?: boolean) => Promise<void>
  isAnalyzing: boolean
  analysisCacheStatus: 'none' | 'cached' | 'fresh'
  codebaseAnalysis: any
  localDirectory: string
  onOpenProjectManagement?: () => void
  minimapEnabled: boolean
  toggleMinimap: () => void
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  isSidebarAlwaysVisible,
  sidebarCollapsed,
  setSidebarCollapsed,
  currentProject,
  currentProjectId,
  showProjectSwitcher,
  setShowProjectSwitcher,
  setShowNewProjectDialog,
  projects,
  openProject,
  deleteProject,
  activeTab,
  selectedFile,
  openTabs,
  setShowSettings,
  aiPanelVisible,
  setAiPanelVisible,
  autoAppPanelVisible,
  setAutoAppPanelVisible,
  analyzeCodebase,
  isAnalyzing,
  analysisCacheStatus,
  codebaseAnalysis,
  localDirectory,
  onOpenProjectManagement,
  minimapEnabled,
  toggleMinimap
}) => {
  const [showCacheMenu, setShowCacheMenu] = useState(false)
  return (
    <div className="editor-header">
      <div className="header-left">
        {!isSidebarAlwaysVisible && (
          <button 
            className="sidebar-toggle-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title="Toggle Sidebar (Ctrl+B)"
          >
            ☰
          </button>
        )}
        <div className="project-selector">
          <button
            className="project-selector-btn"
            onClick={() => setShowProjectSwitcher(!showProjectSwitcher)}
            title="Switch Project"
            disabled={projects.length === 0}
          >
            {currentProject?.name || 'No Project'} ▼
          </button>
          {showProjectSwitcher && projects.length > 0 && (
            <div className="project-switcher-dropdown">
              <div className="project-switcher-header">
                <span>Projects</span>
                <button
                  className="new-project-btn-small"
                  onClick={() => {
                    setShowProjectSwitcher(false)
                    setShowNewProjectDialog(true)
                  }}
                  title="New Project"
                >
                  + New
                </button>
              </div>
              <div className="project-list">
                {projects.length === 0 ? (
                  <div className="project-item-empty">No projects available. Please log in.</div>
                ) : (
                  projects.map((project) => (
                  <div
                    key={project.id}
                    className={`project-item ${project.id === currentProjectId ? 'active' : ''}`}
                    onClick={() => openProject(project.id)}
                  >
                    <div className="project-item-info">
                      <div className="project-item-name">{project.name}</div>
                      {project.description && (
                        <div className="project-item-desc">{project.description}</div>
                      )}
                      <div className="project-item-meta">
                        {new Date(project.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      className="project-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteProject(project.id)
                      }}
                      title="Delete Project"
                    >
                      ×
                    </button>
                  </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <span className="editor-title">
          {activeTab ? activeTab.split('/').pop() : (selectedFile.split('/').pop() || 'Code Editor')}
          {openTabs.find(t => t.path === activeTab)?.modified && <span className="title-modified"> ●</span>}
        </span>
      </div>
      <div className="header-right">
        <div className="analyze-btn-wrapper">
          <button
            className={`analyze-btn ${isAnalyzing ? 'analyzing' : ''} ${analysisCacheStatus !== 'none' ? 'has-cache' : ''}`}
            onClick={() => analyzeCodebase(false)}
            onContextMenu={(e) => {
              e.preventDefault()
              analyzeCodebase(true)
            }}
            title={analysisCacheStatus === 'cached' ? 'Re-analyze codebase (Right-click to force refresh)' : 'Analyze codebase (Right-click to force refresh)'}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <span className="analyze-spinner"></span>
                <span className="analyze-btn-text">Analyzing...</span>
              </>
            ) : (
              <>
                {analysisCacheStatus === 'cached' ? '📊' : '🔍'}
                <span className="analyze-btn-text">
                  {analysisCacheStatus === 'cached' ? 'Cached' : 'Analyze'}
                </span>
              </>
            )}
          </button>
          {isAnalyzing && (
            <div className="analyze-progress-bar">
              <div className="analyze-progress-fill"></div>
            </div>
          )}
          {analysisCacheStatus !== 'none' && (
            <button
              className="cache-menu-btn"
              onClick={() => setShowCacheMenu(true)}
              title="View codebase cache details"
            >
              ▼
            </button>
          )}
        </div>
        {showCacheMenu && (
          <CodebaseCacheMenu
            isOpen={showCacheMenu}
            onClose={() => setShowCacheMenu(false)}
            analyzeCodebase={analyzeCodebase}
            isAnalyzing={isAnalyzing}
            analysisCacheStatus={analysisCacheStatus}
            codebaseAnalysis={codebaseAnalysis}
            localDirectory={localDirectory}
          />
        )}
        <button
          className={`ai-panel-toggle ${aiPanelVisible ? 'active' : ''}`}
          onClick={() => setAiPanelVisible(!aiPanelVisible)}
          title="Toggle AI Panel (Ctrl+Shift+A)"
        >
          🤖 AI
        </button>
        <button
          className={`auto-app-panel-toggle ${autoAppPanelVisible ? 'active' : ''}`}
          onClick={() => setAutoAppPanelVisible(!autoAppPanelVisible)}
          title="Toggle Auto App Builder"
        >
          🔧 Auto App
        </button>
        <button
          className="project-management-btn"
          onClick={() => onOpenProjectManagement?.()}
          title="Project Management"
        >
          📁 Projects
        </button>
        <button
          className={`minimap-toggle ${!minimapEnabled ? 'disabled' : ''}`}
          onClick={toggleMinimap}
          title={minimapEnabled ? 'Hide Minimap' : 'Show Minimap'}
        >
          {minimapEnabled ? '🗺️' : '🗺️'}
        </button>
        <button
          className="theme-toggle"
          onClick={() => setShowSettings(true)}
          title="Open Settings"
        >
          ⚙️
        </button>
      </div>
    </div>
  )
}
