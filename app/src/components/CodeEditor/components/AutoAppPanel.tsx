import React, { useState, useEffect, useRef } from 'react'
import { AutoImprovementPanel } from './AutoImprovementPanel'

interface AutoAppPanelProps {
  position: 'left' | 'right'
  width: number
  workingDir?: string
  currentProjectId?: string | null
  currentProjectName?: string
  onFilesChanged?: () => void
  setAutoAppPanelVisible: (visible: boolean) => void
  setAutoAppPanelPosition: (position: 'left' | 'right') => void
  onResizeStart: (e: React.MouseEvent) => void
  selectedAgentId: number | null
  selectedAgentIds: number[]
  selectedGpu: number | null
  agents: any[]
  setSelectedAgentId: (id: number | null) => void
  setSelectedAgentIds: (ids: number[]) => void
  requestAIAssistance: (prompt?: string) => void
  applyFileOperations: (operations: any[]) => Promise<void>
  isAIAssisting: boolean
  isAIThinking: boolean
  aiStatus: string
  aiMessages: any[]
}

export const AutoAppPanel: React.FC<AutoAppPanelProps> = ({
  position,
  width,
  workingDir,
  currentProjectId,
  currentProjectName,
  onFilesChanged,
  setAutoAppPanelVisible,
  setAutoAppPanelPosition,
  onResizeStart,
  selectedAgentId,
  selectedAgentIds,
  selectedGpu,
  agents,
  setSelectedAgentId,
  setSelectedAgentIds,
  requestAIAssistance,
  applyFileOperations,
  isAIAssisting,
  isAIThinking,
  aiStatus,
  aiMessages
}) => {
  const [showAgentSelector, setShowAgentSelector] = useState(false)
  const agentSelectorRef = useRef<HTMLDivElement>(null)

  // Close agent selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (agentSelectorRef.current && !agentSelectorRef.current.contains(event.target as Node)) {
        setShowAgentSelector(false)
      }
    }

    if (showAgentSelector) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAgentSelector])

  return (
    <>
      {position === 'left' && (
        <div 
          className="resize-handle resize-handle-vertical"
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onResizeStart(e)
          }}
          style={{ cursor: 'col-resize', zIndex: 20 }}
        />
      )}
      {position === 'right' && (
        <div 
          className="resize-handle resize-handle-vertical"
          onMouseDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onResizeStart(e)
          }}
          style={{ cursor: 'col-resize', zIndex: 20 }}
        />
      )}
      <div className="auto-app-panel cursor-style" style={{ width: width + 'px' }}>
        <div className="auto-app-panel-header">
          <div className="auto-app-panel-header-left">
            <h3>🔧 Auto App Builder</h3>
            <div className="auto-app-agent-selector-container" ref={agentSelectorRef}>
              <button
                className={`auto-app-agent-selector-btn ${showAgentSelector ? 'open' : ''}`}
                onClick={() => setShowAgentSelector(!showAgentSelector)}
              >
                <span className="auto-app-agent-selector-text">
                  {selectedAgentId 
                    ? agents.find(a => a.id === selectedAgentId)?.name || `Agent ${selectedAgentId}`
                    : selectedAgentIds.length > 0
                    ? `${selectedAgentIds.length} agents`
                    : selectedGpu
                    ? `GPU ${selectedGpu}`
                    : 'Select Agent'}
                </span>
                <span className="auto-app-agent-selector-arrow">▼</span>
              </button>
              {showAgentSelector && (
                <div 
                  className="auto-app-agent-selector-dropdown"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className={`auto-app-agent-selector-item ${(!selectedAgentId && selectedAgentIds.length === 0 && !selectedGpu) ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedAgentId(null)
                      setSelectedAgentIds([])
                      setShowAgentSelector(false)
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div className="auto-app-agent-selector-item-name">Auto (No Agent)</div>
                      <div className="auto-app-agent-selector-item-desc">Use default GPU selection</div>
                    </div>
                    {(!selectedAgentId && selectedAgentIds.length === 0 && !selectedGpu) && (
                      <span className="auto-app-agent-selector-item-check">✓</span>
                    )}
                  </div>
                  {agents.map((agent) => {
                    const isSelected = selectedAgentIds.includes(agent.id) || selectedAgentId === agent.id
                    const handleCheckboxChange = (checked: boolean) => {
                      if (checked) {
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
                    }
                    return (
                      <div
                        key={agent.id}
                        className={`auto-app-agent-selector-item ${isSelected ? 'selected' : ''} ${!agent.is_available ? 'unavailable' : ''}`}
                        onClick={(e) => {
                          // Don't handle click if clicking on checkbox
                          const target = e.target as HTMLElement
                          if (target.tagName === 'INPUT') {
                            return
                          }
                          e.stopPropagation()
                          if (e.shiftKey || e.metaKey || e.ctrlKey) {
                            // Multi-select mode - toggle the agent
                            handleCheckboxChange(!isSelected)
                          } else {
                            // Single select mode
                            setSelectedAgentId(agent.id)
                            setSelectedAgentIds([agent.id])
                            setShowAgentSelector(false)
                          }
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation()
                            handleCheckboxChange(e.target.checked)
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                          }}
                          style={{ marginRight: '8px', cursor: 'pointer' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div className="auto-app-agent-selector-item-name">
                            {agent.name}
                            {!agent.is_available && (
                              <span style={{ opacity: 0.6, fontSize: '11px' }}> (unavailable)</span>
                            )}
                          </div>
                          <div className="auto-app-agent-selector-item-desc">
                            {agent.agent_type} • {agent.model}
                            {agent.gpu_id && ` • GPU ${agent.gpu_id}`}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="auto-app-panel-controls">
            <button
              className="panel-position-btn"
              onClick={() => setAutoAppPanelPosition(position === 'left' ? 'right' : 'left')}
              title={`Move to ${position === 'left' ? 'Right' : 'Left'}`}
            >
              {position === 'left' ? '→' : '←'}
            </button>
            <button
              className="panel-hide-btn"
              onClick={() => setAutoAppPanelVisible(false)}
              title="Hide Panel"
            >
              Hide
            </button>
            <button
              className="panel-close-btn"
              onClick={() => setAutoAppPanelVisible(false)}
              title="Close Panel"
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="auto-app-panel-content">
          <AutoImprovementPanel
            workingDir={workingDir}
            currentProjectName={currentProjectName}
            selectedAgentId={selectedAgentId}
            selectedAgentIds={selectedAgentIds}
            selectedGpu={selectedGpu}
            agents={agents}
            requestAIAssistance={requestAIAssistance}
            applyFileOperations={applyFileOperations}
            isAIAssisting={isAIAssisting}
            isAIThinking={isAIThinking}
            aiMessages={aiMessages}
            onImprovementsApplied={(count, filesModified) => {
              if (onFilesChanged) {
                onFilesChanged()
              }
            }}
          />
        </div>
      </div>
    </>
  )
}
