import React, { useRef, useEffect } from 'react'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { detectLanguage } from '../utils'
import { EditorTabs } from './EditorTabs'

interface EditorPaneProps {
  paneId: string
  activeTab: string
  tabs: Array<{ path: string; name: string; content: string; modified: boolean }>
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
          const detectedLang = detectLanguage(activeTab)
          
          // Check if model already exists
          let model = monaco.editor.getModel(uri)
          if (!model) {
            // Create new model with the code
            model = monaco.editor.createModel(code, detectedLang, uri)
            console.log(`[handleEditorDidMount ${paneId}] Created new model with code`)
          } else {
            // Update existing model
            if (model.getValue() !== code) {
              model.setValue(code)
              console.log(`[handleEditorDidMount ${paneId}] Updated existing model with code`)
            }
          }
          editor.setModel(model)
        } else {
          // No activeTab, just set the code on current model
          const currentModel = editor.getModel()
          if (currentModel) {
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

  // Update model value when code changes - FORCE IT
  useEffect(() => {
    if (!isMountedRef.current || !code || code.length === 0) return
    
    const editor = editorRef?.current
    const monaco = monacoRef?.current
    
    if (!editor || !monaco || !isEditorValid(editor)) return
    
    try {
      if (activeTab) {
        const normalizedPath = activeTab.startsWith('/') ? activeTab : '/' + activeTab
        const uri = monaco.Uri.parse(`file://${normalizedPath}`)
        let model = monaco.editor.getModel(uri)
        
        if (!model) {
          const detectedLang = detectLanguage(activeTab)
          model = monaco.editor.createModel(code, detectedLang, uri)
        }
        
        // ALWAYS set the value - don't check if it's different
        model.setValue(code)
        editor.setModel(model)
        console.log(`[EditorPane ${paneId}] CODE UPDATED - length: ${code.length}`)
      } else {
        const model = editor.getModel()
        if (model && isModelValid(model)) {
          model.setValue(code)
        }
      }
    } catch (error) {
      console.error(`[EditorPane ${paneId}] Error:`, error)
    }
  }, [code, activeTab, editorRef, monacoRef, paneId])

  return (
    <div className="editor-pane" style={{ height, display: 'flex', flexDirection: 'column' }}>
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
                defaultValue={code || ''}
                value={code || ''}
                onChange={onCodeChange}
                onMount={(editor, monaco) => {
                  console.log(`[EditorPane ${paneId}] MOUNTED - code: "${code?.substring(0, 100)}", length: ${code?.length || 0}`)
                  
                  if (editorRef) {
                    (editorRef as React.MutableRefObject<any>).current = editor
                  }
                  if (monacoRef) {
                    (monacoRef as React.MutableRefObject<any>).current = monaco
                  }
                  
                  // IMMEDIATELY set the code - don't wait
                  if (code && code.length > 0 && activeTab && monaco) {
                    const normalizedPath = activeTab.startsWith('/') ? activeTab : '/' + activeTab
                    const uri = monaco.Uri.parse(`file://${normalizedPath}`)
                    const detectedLang = detectLanguage(activeTab)
                    
                    // Get or create model
                    let model = monaco.editor.getModel(uri)
                    if (!model) {
                      model = monaco.editor.createModel(code, detectedLang, uri)
                    } else {
                      model.setValue(code)
                    }
                    editor.setModel(model)
                    console.log(`[EditorPane ${paneId}] CODE SET - length: ${code.length}`)
                  }
                  
                  onEditorMount(editor, monaco, paneId)
                }}
                beforeUnmount={(editor) => {
                  // Cleanup before unmount - don't dispose models here as they might be shared
                  try {
                    if (editor && isEditorValid(editor)) {
                      // Just clear the model reference, don't dispose
                      editor.setModel(null)
                    }
                  } catch (error) {
                    // Ignore errors during cleanup
                    console.warn('Error in beforeUnmount:', error)
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
