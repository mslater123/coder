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
  selectedAgentId: number | null
  selectedAgentIds: number[]
  agents: any[]
  selectedGpu: number | null
  gpus: any[]
  showAgentSelector: boolean
  setShowAgentSelector: (show: boolean) => void
  setSelectedAgentId: (id: number | null) => void
  setSelectedAgentIds: (ids: number[]) => void
  setSelectedGpu: (gpu: number | null) => void
  setShowSettings: (show: boolean) => void
  aiPanelVisible: boolean
  setAiPanelVisible: (visible: boolean) => void
  analyzeCodebase: (forceRefresh?: boolean) => Promise<void>
  isAnalyzing: boolean
  analysisCacheStatus: 'none' | 'cached' | 'fresh'
  codebaseAnalysis: any
  localDirectory: string
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
  selectedAgentId,
  selectedAgentIds,
  agents,
  selectedGpu,
  gpus,
  showAgentSelector,
  setShowAgentSelector,
  setSelectedAgentId,
  setSelectedAgentIds,
  setSelectedGpu,
  setShowSettings,
  aiPanelVisible,
  setAiPanelVisible,
  analyzeCodebase,
  isAnalyzing,
  analysisCacheStatus,
  codebaseAnalysis,
  localDirectory
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
          >
            {currentProject?.name || 'No Project'} ▼
          </button>
          {showProjectSwitcher && (
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
                {projects.map((project) => (
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
                ))}
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
        <div className="agent-selector-wrapper">
          <button
            className="agent-selector-btn"
            onClick={() => setShowAgentSelector(!showAgentSelector)}
            title="Select AI Agent"
          >
            <span className="agent-selector-icon">🤖</span>
            <span className="agent-selector-text">
              {selectedAgentIds.length > 1
                ? `${selectedAgentIds.length} Agents`
                : selectedAgentIds.length === 1
                  ? agents.find(a => a.id === selectedAgentIds[0])?.name || 'Select Agent'
                  : selectedAgentId
                    ? agents.find(a => a.id === selectedAgentId)?.name || 'Select Agent'
                    : selectedGpu
                      ? `GPU ${gpus.find(g => g.id === selectedGpu)?.name || selectedGpu}`
                      : 'No Agent'}
            </span>
            <span className="agent-selector-arrow">▼</span>
          </button>
          {showAgentSelector && (
            <div className="agent-selector-dropdown" onClick={(e) => e.stopPropagation()}>
              <div className="agent-selector-header">
                <span>Select AI Agent{selectedAgentIds.length > 1 ? ` (${selectedAgentIds.length} selected)` : ''}</span>
                <button
                  className="agent-selector-close"
                  onClick={() => setShowAgentSelector(false)}
                >
                  ×
                </button>
              </div>
              <div className="agent-selector-list">
                <div
                  className={`agent-selector-item ${selectedAgentIds.length === 0 && !selectedAgentId && !selectedGpu ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedAgentId(null)
                    setSelectedAgentIds([])
                    setSelectedGpu(null)
                    setShowAgentSelector(false)
                  }}
                >
                  <div className="agent-item-icon">⚡</div>
                  <div className="agent-item-info">
                    <div className="agent-item-name">Auto (No Agent)</div>
                    <div className="agent-item-desc">Use default GPU selection</div>
                  </div>
                  {selectedAgentIds.length === 0 && !selectedAgentId && !selectedGpu && (
                    <div className="agent-item-check">✓</div>
                  )}
                </div>
                {agents.map((agent) => {
                  const isSelected = selectedAgentIds.includes(agent.id) || selectedAgentId === agent.id
                  return (
                    <div
                      key={agent.id}
                      className={`agent-selector-item ${isSelected ? 'selected' : ''} ${!agent.is_available ? 'unavailable' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (e.shiftKey || e.metaKey || e.ctrlKey) {
                          // Multi-select mode
                          if (selectedAgentIds.includes(agent.id)) {
                            setSelectedAgentIds(selectedAgentIds.filter(id => id !== agent.id))
                            if (selectedAgentIds.length === 1) {
                              setSelectedAgentId(null)
                            }
                          } else {
                            setSelectedAgentIds([...selectedAgentIds, agent.id])
                            setSelectedAgentId(null) // Clear single selection
                          }
                        } else {
                          // Single select mode
                          setSelectedAgentId(agent.id)
                          setSelectedAgentIds([agent.id])
                          setSelectedGpu(null)
                          setShowAgentSelector(false)
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation()
                          if (e.target.checked) {
                            if (!selectedAgentIds.includes(agent.id)) {
                              setSelectedAgentIds([...selectedAgentIds, agent.id])
                              setSelectedAgentId(null) // Clear single selection
                            }
                          } else {
                            setSelectedAgentIds(selectedAgentIds.filter(id => id !== agent.id))
                            if (selectedAgentIds.length === 1) {
                              setSelectedAgentId(null)
                            }
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ marginRight: '8px', cursor: 'pointer' }}
                      />
                      <div className="agent-item-icon">
                        {agent.agent_type === 'local' ? '💻' :
                         agent.agent_type === 'client' ? '🖥️' :
                         agent.agent_type === 'remote' ? '🌐' : '☁️'}
                      </div>
                      <div className="agent-item-info">
                        <div className="agent-item-name">
                          {agent.name}
                          {agent.is_available ? (
                            <span className="agent-status-badge available">✓</span>
                          ) : (
                            <span className="agent-status-badge unavailable">✗</span>
                          )}
                        </div>
                        <div className="agent-item-desc">
                          {agent.agent_type} • {agent.model}
                          {agent.gpu_id && ` • GPU ${agent.gpu_id}`}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="agent-item-check">✓</div>
                      )}
                    </div>
                  )
                })}
                {agents.length === 0 && (
                  <div className="agent-selector-empty">
                    <div className="empty-icon">🔌</div>
                    <div className="empty-text">No agents configured</div>
                    <button
                      className="btn-small btn-primary"
                      onClick={() => {
                        setShowAgentSelector(false)
                        setShowSettings(true)
                      }}
                    >
                      Create Agent
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <select
          value={selectedGpu || ''}
          onChange={(e) => setSelectedGpu(e.target.value ? parseInt(e.target.value) : null)}
          className="gpu-select"
          style={{ display: 'none' }}
        >
          <option value="">Auto GPU</option>
          {gpus.map((gpu) => (
            <option key={gpu.id} value={gpu.id}>
              {gpu.name} {gpu.is_available ? '✓' : '✗'}
            </option>
          ))}
        </select>
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
