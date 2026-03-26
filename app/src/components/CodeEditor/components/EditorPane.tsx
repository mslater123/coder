import React, { useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { detectLanguage, computeDiff, type DiffLine } from '../utils'
import { EditorTabs } from './EditorTabs'

interface EditorPaneProps {
  paneId: string
  activeTab: string
  tabs: Array<{ path: string; name: string; content: string; modified: boolean; oldContent?: string }>
  code: string
  language: string
  theme: string
  editorSettings: any
  showMarkdownPreview: boolean
  setShowMarkdownPreview: (show: boolean) => void
  showTerminal: boolean
  terminalHeight: number
  onTabClick: (path: string) => void
  onTabClose: (e: React.MouseEvent, path: string) => void
  onCloseAllTabs: () => void
  onCodeChange: (value: string | undefined) => void
  onEditorMount: (editor: any, monaco: any, paneId: string) => void
  editorRef: React.RefObject<any>
  monacoRef: React.RefObject<any>
  height: string
}

export const EditorPane: React.FC<EditorPaneProps> = ({
  paneId,
  activeTab,
  tabs,
  code,
  language,
  theme,
  editorSettings,
  showMarkdownPreview,
  setShowMarkdownPreview,
  showTerminal,
  terminalHeight,
  onTabClick,
  onTabClose,
  onCloseAllTabs,
  onCodeChange,
  onEditorMount,
  editorRef,
  monacoRef,
  height
}) => {
  // Track decorations for diff visualization
  const decorationIdsRef = useRef<string[]>([])

  // Apply diff decorations when code changes and oldContent exists
  useEffect(() => {
    const editor = editorRef?.current
    const monaco = monacoRef?.current
    const activeTabData = tabs.find(t => t.path === activeTab)

    if (!editor || !monaco || !activeTabData || !activeTabData.oldContent) {
      // Clear decorations if no old content
      if (editor && decorationIdsRef.current.length > 0) {
        editor.deltaDecorations(decorationIdsRef.current, [])
        decorationIdsRef.current = []
      }
      return
    }

    // Wait a bit for editor to be ready
    const timer = setTimeout(() => {
      if (!editor || !monaco) return
      
      try {
        // Compute diff between old and new content
        const diffLines = computeDiff(activeTabData.oldContent, code || '')
        const decorations: any[] = []
        const newLines = (code || '').split('\n')
        const oldLines = activeTabData.oldContent.split('\n')

        // Track which new line numbers have been marked as added
        const addedLines = new Set<number>()
        
        // First pass: mark added lines
        diffLines.forEach((diffLine) => {
          if (diffLine.type === 'added' && diffLine.newLineNumber) {
            const lineNum = diffLine.newLineNumber
            if (lineNum > 0 && lineNum <= newLines.length && !addedLines.has(lineNum)) {
              addedLines.add(lineNum)
              decorations.push({
                range: new monaco.Range(lineNum, 1, lineNum, Number.MAX_SAFE_INTEGER),
                options: {
                  isWholeLine: true,
                  className: 'diff-line-added',
                  glyphMarginClassName: 'diff-glyph-added',
                  minimap: {
                    color: { id: 'diff.added', defaults: { dark: '#4ec9b0', light: '#4caf50' } },
                    position: 1
                  },
                  overviewRuler: {
                    color: { id: 'diff.added.ruler', defaults: { dark: '#4ec9b0', light: '#4caf50' } },
                    position: 1
                  },
                  stickiness: 1 // Stick to the line
                }
              })
            }
          }
        })

        // Second pass: mark removed lines
        // For removed lines, we need to find where they would appear in the new content
        // by tracking the mapping between old and new line numbers
        const removedLines: Array<{ oldLineNum: number, showAtNewLine: number }> = []
        let currentNewLine = 0
        
        // Build mapping: for each removed line, find where to show it
        diffLines.forEach((diffLine) => {
          if (diffLine.type === 'unchanged' && diffLine.newLineNumber) {
            currentNewLine = diffLine.newLineNumber
          } else if (diffLine.type === 'added' && diffLine.newLineNumber) {
            currentNewLine = diffLine.newLineNumber
          } else if (diffLine.type === 'removed' && diffLine.oldLineNumber) {
            // Show removed line at the position of the next unchanged/added line
            // or at the current position if we're at the start
            const showAt = currentNewLine > 0 ? currentNewLine : 1
            removedLines.push({
              oldLineNum: diffLine.oldLineNumber,
              showAtNewLine: showAt
            })
          }
        })
        
        // Apply removed line decorations
        removedLines.forEach(({ showAtNewLine }) => {
          if (showAtNewLine > 0 && showAtNewLine <= newLines.length && !addedLines.has(showAtNewLine)) {
            decorations.push({
              range: new monaco.Range(showAtNewLine, 1, showAtNewLine, Number.MAX_SAFE_INTEGER),
              options: {
                isWholeLine: true,
                className: 'diff-line-removed',
                glyphMarginClassName: 'diff-glyph-removed',
                minimap: {
                  color: { id: 'diff.removed', defaults: { dark: '#f48771', light: '#f44336' } },
                  position: 1
                },
                overviewRuler: {
                  color: { id: 'diff.removed.ruler', defaults: { dark: '#f48771', light: '#f44336' } },
                  position: 2
                },
                stickiness: 1
              }
            })
          }
        })

        // Apply decorations
        if (decorations.length > 0) {
          decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, decorations)
        } else {
          // Clear decorations if no diff
          if (decorationIdsRef.current.length > 0) {
            editor.deltaDecorations(decorationIdsRef.current, [])
            decorationIdsRef.current = []
          }
        }
      } catch (error) {
        console.error('Error applying diff decorations:', error)
      }
    }, 100) // Small delay to ensure editor is ready

    return () => clearTimeout(timer)
  }, [code, activeTab, tabs, editorRef, monacoRef, paneId])

  // DEBUG: Log whenever code prop changes
  useEffect(() => {
    console.log(`[EditorPane ${paneId}] CODE PROP CHANGED:`, {
      codeLength: code?.length || 0,
      codePreview: code?.substring(0, 100) || 'EMPTY',
      activeTab,
      hasEditor: !!editorRef?.current,
      hasMonaco: !!monacoRef?.current
    })
  }, [code, activeTab, paneId])
  // Track if component is mounted to prevent operations after unmount
  const isMountedRef = useRef(true)
  
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Helper function to safely check if editor/model is valid
  const isEditorValid = (editor: any): boolean => {
    try {
      return editor && !editor._isDisposed && editor.getModel && typeof editor.getModel === 'function'
    } catch {
      return false
    }
  }

  const isModelValid = (model: any): boolean => {
    try {
      return model && !model.isDisposed && model.getValue && typeof model.getValue === 'function'
    } catch {
      return false
    }
  }

  const handleEditorDidMount = (editor: any, monaco: any) => {
    if (!isMountedRef.current) return
    
    // Check if editor and its DOM node are valid
    if (!editor || !editor.getDomNode || !editor.getDomNode()) {
      console.warn(`[EditorPane ${paneId}] Editor DOM node not ready`)
      return
    }
    
    try {
      if (editorRef) {
        (editorRef as React.MutableRefObject<any>).current = editor
      }
      if (monacoRef) {
        (monacoRef as React.MutableRefObject<any>).current = monaco
      }
      
      console.log(`[handleEditorDidMount ${paneId}] activeTab: ${activeTab}, code length: ${(code || '').length}`)
      
      // ALWAYS set the code immediately when editor mounts
      if (code && code.length > 0) {
        console.log(`[handleEditorDidMount ${paneId}] Setting code immediately, length: ${code.length}`)
        if (activeTab && monaco) {
          const normalizedPath = activeTab.startsWith('/') ? activeTab : '/' + activeTab
          const uri = monaco.Uri.parse(`file://${normalizedPath}`)
          const detectedLang = detectLanguage(activeTab) || 'plaintext'
          
          // Check if model already exists
          let model = monaco.editor.getModel(uri)
          if (!model) {
            // Create new model with the code and correct language
            model = monaco.editor.createModel(code, detectedLang, uri)
            console.log(`[handleEditorDidMount ${paneId}] Created new model with code and language: ${detectedLang}`)
          } else {
            // Update existing model - ensure language is correct
            const currentLang = model.getLanguageId()
            if (currentLang !== detectedLang) {
              monaco.editor.setModelLanguage(model, detectedLang)
              console.log(`[handleEditorDidMount ${paneId}] Updated model language from ${currentLang} to ${detectedLang}`)
            }
            // Update code content
            if (model.getValue() !== code) {
              model.setValue(code)
              console.log(`[handleEditorDidMount ${paneId}] Updated existing model with code`)
            }
          }
          
          // Verify editor is still valid before setting model
          if (editor && editor.getDomNode && editor.getDomNode()) {
            editor.setModel(model)
          }
        } else {
          // No activeTab, just set the code on current model
          const currentModel = editor.getModel()
          if (currentModel && editor.getDomNode && editor.getDomNode()) {
            if (currentModel.getValue() !== code) {
              currentModel.setValue(code)
              console.log(`[handleEditorDidMount ${paneId}] Set code on current model`)
            }
          }
        }
      }
      
      onEditorMount(editor, monaco, paneId)
    } catch (error) {
      console.error('Error in handleEditorDidMount:', error)
    }
  }
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      // Don't dispose models here - let Monaco handle it
      // Just clear refs to prevent access after unmount
      if (editorRef) {
        (editorRef as React.MutableRefObject<any>).current = null
      }
    }
  }, [editorRef])

  // Update model value when code changes - FORCE IT EVERY TIME
  useEffect(() => {
    if (!isMountedRef.current) return
    
    const forceSetCode = () => {
      const editor = editorRef?.current
      const monaco = monacoRef?.current
      
      if (!editor || !monaco) {
        setTimeout(forceSetCode, 50)
        return
      }
      
      // Check if editor DOM node is still valid
      if (!editor.getDomNode || !editor.getDomNode()) {
        return // Editor is being unmounted or not ready
      }
      
      if (!code || code.length === 0) return
      
      try {
        if (activeTab) {
          const normalizedPath = activeTab.startsWith('/') ? activeTab : '/' + activeTab
          const uri = monaco.Uri.parse(`file://${normalizedPath}`)
          const detectedLang = detectLanguage(activeTab) || 'plaintext'
          let model = monaco.editor.getModel(uri)
          
          if (!model) {
            model = monaco.editor.createModel(code, detectedLang, uri)
          } else {
            // Ensure language is correct for syntax highlighting
            const currentLang = model.getLanguageId()
            if (currentLang !== detectedLang) {
              monaco.editor.setModelLanguage(model, detectedLang)
            }
          }
          
          // Verify editor is still valid before setting model
          if (editor.getDomNode && editor.getDomNode()) {
            model.setValue(code)
            editor.setModel(model)
          }
        } else {
          const model = editor.getModel()
          if (model && editor.getDomNode && editor.getDomNode()) {
            model.setValue(code)
          }
        }
      } catch (error) {
        // Silently handle errors - editor might be unmounting
        if (error instanceof Error && !error.message.includes('domNode')) {
          console.error(`[EditorPane ${paneId}] Error setting code:`, error)
        }
      }
    }
    
    forceSetCode()
    const timeout1 = setTimeout(forceSetCode, 10)
    const timeout2 = setTimeout(forceSetCode, 50)
    const timeout3 = setTimeout(forceSetCode, 100)
    
    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
      clearTimeout(timeout3)
    }
  }, [code, activeTab, editorRef, monacoRef, paneId])

  // Ensure language is updated when activeTab changes (for syntax highlighting)
  useEffect(() => {
    if (!isMountedRef.current) return
    
    const updateLanguage = () => {
      const editor = editorRef?.current
      const monaco = monacoRef?.current
      
      if (!editor || !monaco || !activeTab) return
      
      try {
        const normalizedPath = activeTab.startsWith('/') ? activeTab : '/' + activeTab
        const uri = monaco.Uri.parse(`file://${normalizedPath}`)
        const detectedLang = detectLanguage(activeTab) || 'plaintext'
        const model = monaco.editor.getModel(uri)
        
        if (model) {
          const currentLang = model.getLanguageId()
          if (currentLang !== detectedLang) {
            // Set the correct language for syntax highlighting
            monaco.editor.setModelLanguage(model, detectedLang)
          }
        }
      } catch (error) {
        console.error(`[EditorPane ${paneId}] Error updating language:`, error)
      }
    }
    
    updateLanguage()
    const timeout1 = setTimeout(updateLanguage, 10)
    const timeout2 = setTimeout(updateLanguage, 50)
    
    return () => {
      clearTimeout(timeout1)
      clearTimeout(timeout2)
    }
  }, [activeTab, editorRef, monacoRef, paneId])

  // Check if there are pending changes (diff exists)
  const activeTabData = tabs.find(t => t.path === activeTab)
  const hasPendingChanges = activeTabData?.oldContent && activeTabData.oldContent !== code

  return (
    <div className="editor-pane" style={{ height, display: 'flex', flexDirection: 'column' }}>
      {hasPendingChanges && (
        <div className="diff-control-bar">
          <div className="diff-control-info">
            <span className="diff-indicator">●</span>
            <span>AI changes pending review</span>
            <span className="diff-stats">
              {(() => {
                const diffLines = computeDiff(activeTabData.oldContent || '', code || '')
                const added = diffLines.filter(l => l.type === 'added').length
                const removed = diffLines.filter(l => l.type === 'removed').length
                return (
                  <>
                    <span className="diff-stat added">+{added}</span>
                    <span className="diff-stat removed">-{removed}</span>
                  </>
                )
              })()}
            </span>
          </div>
          <div className="diff-control-actions">
            <button
              className="diff-reject-btn"
              onClick={() => {
                // Reject changes - restore old content
                if (activeTabData?.oldContent !== undefined) {
                  onCodeChange(activeTabData.oldContent)
                  // Clear oldContent after rejecting to remove diff
                  // This will be handled by parent via onCodeChange
                }
              }}
              title="Reject changes (Ctrl+Z)"
            >
              ✕ Reject
            </button>
            <button
              className="diff-accept-btn"
              onClick={() => {
                // Accept changes - keep current content and clear oldContent
                onCodeChange(code, true)
              }}
              title="Accept changes (Ctrl+S)"
            >
              ✓ Accept
            </button>
          </div>
        </div>
      )}
      <EditorTabs
        openTabs={tabs}
        activeTab={activeTab}
        handleTabClick={onTabClick}
        handleTabClose={onTabClose}
        closeAllTabs={onCloseAllTabs}
      />
      
      <div className="monaco-wrapper" style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab ? (
          language === 'markdown' && showMarkdownPreview ? (
            <div className="markdown-preview-container" style={{ 
              height: showTerminal ? `calc(100% - ${terminalHeight}px - 4px)` : "100%", 
              overflow: 'auto', 
              padding: '20px' 
            }}>
              <div className="markdown-preview-header" style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '16px', 
                paddingBottom: '12px', 
                borderBottom: '1px solid var(--theme-border, #3e3e42)' 
              }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Markdown Preview</h3>
                <button
                  onClick={() => setShowMarkdownPreview(false)}
                  style={{
                    padding: '4px 12px',
                    background: 'var(--theme-button-bg, #0e639c)',
                    color: 'var(--theme-button-fg, white)',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Edit Source
                </button>
              </div>
              <div className="markdown-preview-content" style={{ 
                fontFamily: editorSettings.fontFamily,
                fontSize: editorSettings.fontSize + 'px',
                lineHeight: '1.6',
                color: 'var(--theme-fg, #cccccc)'
              }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {code}
                </ReactMarkdown>
              </div>
            </div>
          ) : (
            <>
              {language === 'markdown' && (
                <div className="markdown-editor-header" style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-end', 
                  padding: '8px 12px', 
                  borderBottom: '1px solid var(--theme-border, #3e3e42)', 
                  background: 'var(--theme-editor-bg, #1e1e1e)' 
                }}>
                  <button
                    onClick={() => setShowMarkdownPreview(true)}
                    style={{
                      padding: '4px 12px',
                      background: 'var(--theme-button-bg, #0e639c)',
                      color: 'var(--theme-button-fg, white)',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    Preview
                  </button>
                </div>
              )}
              <Editor
                key={`editor-${paneId}-${activeTab || 'empty'}`}
                height={showTerminal ? `calc(100% - ${terminalHeight}px - ${language === 'markdown' ? '44px' : '4px'})` : language === 'markdown' ? "calc(100% - 40px)" : "100%"}
                language={language || detectLanguage(activeTab || '') || 'plaintext'}
                theme={theme}
                value={code || ''}
                onChange={onCodeChange}
                onMount={(editor, monaco) => {
                  // Verify editor and DOM node are ready
                  if (!editor || !editor.getDomNode || !editor.getDomNode()) {
                    console.warn(`[EditorPane ${paneId}] Editor not ready on mount`)
                    // Retry after a short delay
                    setTimeout(() => {
                      if (editor && editor.getDomNode && editor.getDomNode()) {
                        handleEditorDidMount(editor, monaco)
                      }
                    }, 100)
                    return
                  }
                  
                  if (editorRef) {
                    (editorRef as React.MutableRefObject<any>).current = editor
                  }
                  if (monacoRef) {
                    (monacoRef as React.MutableRefObject<any>).current = monaco
                  }
                  
                  // FORCE SET CODE IMMEDIATELY
                  const setCodeNow = () => {
                    // Check editor is still valid
                    if (!editor || !editor.getDomNode || !editor.getDomNode()) {
                      return
                    }
                    
                    if (activeTab && monaco) {
                      const normalizedPath = activeTab.startsWith('/') ? activeTab : '/' + activeTab
                      const uri = monaco.Uri.parse(`file://${normalizedPath}`)
                      const detectedLang = detectLanguage(activeTab) || 'plaintext'
                      
                      let model = monaco.editor.getModel(uri)
                      if (!model) {
                        // Create new model with correct language
                        model = monaco.editor.createModel(code || '', detectedLang, uri)
                      } else {
                        // Update existing model - ensure language is correct
                        const currentLang = model.getLanguageId()
                        if (currentLang !== detectedLang) {
                          // Set the correct language for syntax highlighting
                          monaco.editor.setModelLanguage(model, detectedLang)
                        }
                        // Update code content
                        if (code !== undefined && model.getValue() !== code) {
                          model.setValue(code)
                        }
                      }
                      // Verify editor DOM node is still valid before setting model
                      if (editor.getDomNode && editor.getDomNode()) {
                        editor.setModel(model)
                      }
                    } else {
                      const model = editor.getModel()
                      if (model && editor.getDomNode && editor.getDomNode()) {
                        // Update code if provided
                        if (code !== undefined && model.getValue() !== code) {
                          model.setValue(code)
                        }
                        // Ensure language is set correctly even without activeTab
                        const detectedLang = activeTab ? detectLanguage(activeTab) || 'plaintext' : 'plaintext'
                        const currentLang = model.getLanguageId()
                        if (currentLang !== detectedLang && activeTab) {
                          monaco.editor.setModelLanguage(model, detectedLang)
                        }
                      }
                    }
                  }
                  
                  setCodeNow()
                  setTimeout(setCodeNow, 10)
                  setTimeout(setCodeNow, 50)
                  setTimeout(setCodeNow, 100)
                  
                  onEditorMount(editor, monaco, paneId)
                }}
                beforeUnmount={(editor) => {
                  // Cleanup before unmount - don't dispose models here as they might be shared
                  try {
                    if (editor && isEditorValid(editor)) {
                      // Check if DOM node still exists before accessing
                      const domNode = editor.getDomNode && editor.getDomNode()
                      if (domNode && domNode.parentNode) {
                        // Just clear the model reference, don't dispose
                        editor.setModel(null)
                      }
                    }
                  } catch (error) {
                    // Ignore errors during cleanup - editor might already be disposed
                    // This is expected when component unmounts
                  }
                }}
                loading={<div className="editor-loading"><div className="loading-spinner"></div><p>Loading code editor...</p></div>}
                options={{
                  fontSize: editorSettings.fontSize,
                  fontFamily: editorSettings.fontFamily,
                  fontLigatures: editorSettings.fontLigatures,
                  minimap: { enabled: editorSettings.minimap },
                  wordWrap: editorSettings.wordWrap,
                  automaticLayout: editorSettings.automaticLayout,
                  tabSize: editorSettings.tabSize,
                  insertSpaces: true,
                  formatOnPaste: editorSettings.formatOnPaste,
                  formatOnType: editorSettings.formatOnType,
                  lineNumbers: editorSettings.lineNumbers,
                  renderWhitespace: editorSettings.renderWhitespace,
                  renderLineHighlight: editorSettings.renderLineHighlight,
                  cursorBlinking: editorSettings.cursorBlinking,
                  cursorSmoothCaretAnimation: editorSettings.cursorSmoothCaretAnimation ? 'on' : 'off',
                  smoothScrolling: editorSettings.smoothScrolling,
                  mouseWheelZoom: editorSettings.mouseWheelZoom,
                  multiCursorModifier: editorSettings.multiCursorModifier,
                  quickSuggestions: editorSettings.quickSuggestions ? { other: true, comments: true, strings: true } : false,
                  quickSuggestionsDelay: editorSettings.quickSuggestionsDelay,
                  suggestOnTriggerCharacters: editorSettings.suggestOnTriggerCharacters,
                  acceptSuggestionOnEnter: editorSettings.acceptSuggestionOnEnter,
                  acceptSuggestionOnCommitCharacter: editorSettings.acceptSuggestionOnCommitCharacter,
                  snippetSuggestions: editorSettings.snippetSuggestions,
                  wordBasedSuggestions: editorSettings.wordBasedSuggestions,
                  bracketPairColorization: { enabled: editorSettings.bracketPairColorization },
                  guides: editorSettings.guides,
                  autoIndent: editorSettings.autoIndent,
                  detectIndentation: editorSettings.detectIndentation,
                  trimAutoWhitespace: editorSettings.trimAutoWhitespace,
                  scrollBeyondLastLine: editorSettings.scrollBeyondLastLine,
                  links: editorSettings.links,
                  colorDecorators: editorSettings.colorDecorators,
                  folding: editorSettings.folding,
                  foldingStrategy: editorSettings.foldingStrategy,
                  showFoldingControls: editorSettings.showFoldingControls,
                  unfoldOnClickAfterEndOfLine: editorSettings.unfoldOnClickAfterEndOfLine,
                  matchBrackets: editorSettings.matchBrackets,
                  validate: true,
                  semanticHighlighting: { enabled: true },
                  renderValidationDecorations: 'on',
                  codeLens: true,
                  hover: { enabled: true },
                  parameterHints: { enabled: true },
                  quickSuggestions: editorSettings.quickSuggestions ? { other: true, comments: true, strings: true } : false
                }}
              />
            </>
          )
        ) : (
          <div className="editor-empty">
            <div className="editor-empty-content">
              <div className="empty-icon">📄</div>
              <h3>No file open</h3>
              <p>Select a file from the explorer to start editing</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
