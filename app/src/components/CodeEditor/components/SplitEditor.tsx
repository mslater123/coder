import React, { useState, useRef, useEffect } from 'react'
import { EditorPane } from './EditorPane'
import { SplitGroup } from './SplitGroup'
import type { EditorPaneNode, EditorPane as EditorPaneType } from '../types'
import * as splitUtils from '../utils/splitEditorUtils'

interface SplitEditorProps {
  root: EditorPaneNode
  activePaneId: string
  setActivePaneId: (id: string) => void
  onPaneTabClick: (paneId: string, path: string) => void
  onPaneTabClose: (paneId: string, e: React.MouseEvent, path: string) => void
  onPaneCloseAllTabs: (paneId: string) => void
  onPaneCodeChange: (paneId: string, value: string | undefined, clearOldContent?: boolean) => void
  onPaneEditorMount: (editor: any, monaco: any, paneId: string) => void
  getPaneCode: (paneId: string) => string
  getPaneLanguage: (paneId: string) => string
  theme: string
  editorSettings: any
  showMarkdownPreview: boolean
  setShowMarkdownPreview: (show: boolean) => void
  showTerminal: boolean
  terminalHeight: number
  onSplitPane: (paneId: string, orientation: 'horizontal' | 'vertical') => void
  onClosePane: (paneId: string) => void
  onGroupSizesChange: (groupId: string, sizes: number[]) => void
  onAIAction: (paneId: string, action: string) => void
  editorRefs: Map<string, React.RefObject<any>>
  monacoRefs: Map<string, React.RefObject<any>>
}

export const SplitEditor: React.FC<SplitEditorProps> = ({
  root,
  activePaneId,
  setActivePaneId,
  onPaneTabClick,
  onPaneTabClose,
  onPaneCloseAllTabs,
  onPaneCodeChange,
  onPaneEditorMount,
  getPaneCode,
  getPaneLanguage,
  theme,
  editorSettings,
  showMarkdownPreview,
  setShowMarkdownPreview,
  showTerminal,
  terminalHeight,
  onSplitPane,
  onClosePane,
  onGroupSizesChange,
  onAIAction,
  editorRefs,
  monacoRefs
}) => {
  const [paneMenuOpen, setPaneMenuOpen] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setPaneMenuOpen(null)
      }
    }
    
    if (paneMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [paneMenuOpen])
  
  const renderPaneNode = (node: EditorPaneNode, depth: number = 0): React.ReactNode => {
    if (splitUtils.isPane(node)) {
      const editorRef = editorRefs.get(node.id) || React.createRef()
      const monacoRef = monacoRefs.get(node.id) || React.createRef()
      const isActive = node.id === activePaneId
      
      return (
        <div
          className={`editor-pane-wrapper ${isActive ? 'active' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            height: '100%',
            width: '100%'
          }}
          onClick={() => setActivePaneId(node.id)}
        >
          <div className="editor-pane-header" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '4px 8px', 
            background: isActive ? 'var(--theme-tab-active-bg, #1e1e1e)' : 'var(--theme-tab-bg, #2d2d30)',
            borderBottom: '1px solid var(--theme-tab-border, #3e3e42)',
            gap: '8px',
            cursor: 'pointer',
            position: 'relative'
          }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span 
                style={{ 
                  fontSize: '11px', 
                  color: 'var(--theme-fg-secondary, #858585)',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '3px',
                  transition: 'background 0.2s'
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setPaneMenuOpen(paneMenuOpen === node.id ? null : node.id)
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--theme-menu-dropdown-hover, #37373d)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                Editor ▼
              </span>
              {paneMenuOpen === node.id && (
                <div 
                  ref={menuRef}
                  className="pane-options-menu"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    background: 'var(--theme-menu-dropdown-bg, #252526)',
                    border: '1px solid var(--theme-menu-dropdown-border, #3e3e42)',
                    borderRadius: '4px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    zIndex: 1000,
                    minWidth: '180px',
                    padding: '4px 0'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="pane-menu-section">
                    <div className="pane-menu-section-title">AI Actions</div>
                    <div 
                      className="pane-menu-item"
                      onClick={() => {
                        onAIAction(node.id, 'fix-errors')
                        setPaneMenuOpen(null)
                      }}
                    >
                      <span className="pane-menu-icon">🔧</span>
                      <span>Fix Errors</span>
                    </div>
                    <div 
                      className="pane-menu-item"
                      onClick={() => {
                        onAIAction(node.id, 'refactor')
                        setPaneMenuOpen(null)
                      }}
                    >
                      <span className="pane-menu-icon">♻️</span>
                      <span>Refactor Code</span>
                    </div>
                    <div 
                      className="pane-menu-item"
                      onClick={() => {
                        onAIAction(node.id, 'optimize')
                        setPaneMenuOpen(null)
                      }}
                    >
                      <span className="pane-menu-icon">⚡</span>
                      <span>Optimize Performance</span>
                    </div>
                    <div 
                      className="pane-menu-item"
                      onClick={() => {
                        onAIAction(node.id, 'add-docs')
                        setPaneMenuOpen(null)
                      }}
                    >
                      <span className="pane-menu-icon">📝</span>
                      <span>Add Documentation</span>
                    </div>
                    <div 
                      className="pane-menu-item"
                      onClick={() => {
                        onAIAction(node.id, 'explain')
                        setPaneMenuOpen(null)
                      }}
                    >
                      <span className="pane-menu-icon">💡</span>
                      <span>Explain Code</span>
                    </div>
                    <div 
                      className="pane-menu-item"
                      onClick={() => {
                        onAIAction(node.id, 'suggest-improvements')
                        setPaneMenuOpen(null)
                      }}
                    >
                      <span className="pane-menu-icon">✨</span>
                      <span>Suggest Improvements</span>
                    </div>
                  </div>
                  <div className="pane-menu-divider"></div>
                  <div className="pane-menu-section">
                    <div className="pane-menu-section-title">Pane Actions</div>
                    <div 
                      className="pane-menu-item"
                      onClick={(e) => {
                        e.stopPropagation()
                        onClosePane(node.id)
                        setPaneMenuOpen(null)
                      }}
                    >
                      <span className="pane-menu-icon">✕</span>
                      <span>Close Pane</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
              <button
                className="split-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onSplitPane(node.id, 'vertical')
                }}
                title="Split Right"
                style={{
                  padding: '2px 6px',
                  background: 'transparent',
                  border: '1px solid var(--theme-border, #3e3e42)',
                  borderRadius: '3px',
                  color: 'var(--theme-fg, #cccccc)',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                ⬌
              </button>
              <button
                className="split-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onSplitPane(node.id, 'horizontal')
                }}
                title="Split Down"
                style={{
                  padding: '2px 6px',
                  background: 'transparent',
                  border: '1px solid var(--theme-border, #3e3e42)',
                  borderRadius: '3px',
                  color: 'var(--theme-fg, #cccccc)',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                ⬍
              </button>
              <button
                className="close-pane-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onClosePane(node.id)
                }}
                title="Close Pane"
                style={{
                  padding: '2px 6px',
                  background: 'transparent',
                  border: '1px solid var(--theme-border, #3e3e42)',
                  borderRadius: '3px',
                  color: 'var(--theme-fg-secondary, #858585)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--theme-button-hover, #454545)'
                  e.currentTarget.style.color = 'var(--theme-fg, #cccccc)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--theme-fg-secondary, #858585)'
                }}
              >
                ✕
              </button>
            </div>
          </div>
          <EditorPane
            paneId={node.id}
            activeTab={node.activeTab}
            tabs={node.tabs}
            code={getPaneCode(node.id)}
            language={getPaneLanguage(node.id)}
            theme={theme}
            editorSettings={editorSettings}
            showMarkdownPreview={showMarkdownPreview}
            setShowMarkdownPreview={setShowMarkdownPreview}
            showTerminal={showTerminal}
            terminalHeight={terminalHeight}
            onTabClick={(path) => onPaneTabClick(node.id, path)}
            onTabClose={(e, path) => onPaneTabClose(node.id, e, path)}
            onCloseAllTabs={() => onPaneCloseAllTabs(node.id)}
            onCodeChange={(value, clearOldContent) => onPaneCodeChange(node.id, value, clearOldContent)}
            onEditorMount={onPaneEditorMount}
            editorRef={editorRef}
            monacoRef={monacoRef}
            height="calc(100% - 28px)"
          />
        </div>
      )
    }
    
    // It's a split group - use the SplitGroup component
    return (
      <SplitGroup
        group={node}
        depth={depth}
        activePaneId={activePaneId}
        setActivePaneId={setActivePaneId}
        onPaneTabClick={onPaneTabClick}
        onPaneTabClose={onPaneTabClose}
        onPaneCloseAllTabs={onPaneCloseAllTabs}
        onPaneCodeChange={onPaneCodeChange}
        onPaneEditorMount={onPaneEditorMount}
        getPaneCode={getPaneCode}
        getPaneLanguage={getPaneLanguage}
        theme={theme}
        editorSettings={editorSettings}
        showMarkdownPreview={showMarkdownPreview}
        setShowMarkdownPreview={setShowMarkdownPreview}
        showTerminal={showTerminal}
        terminalHeight={terminalHeight}
        onSplitPane={onSplitPane}
        onClosePane={onClosePane}
        onGroupSizesChange={onGroupSizesChange}
        editorRefs={editorRefs}
        monacoRefs={monacoRefs}
        renderPaneNode={renderPaneNode}
      />
    )
  }
  
  return (
    <div className="split-editor-container" style={{ height: '100%', width: '100%' }}>
      {renderPaneNode(root)}
    </div>
  )
}
