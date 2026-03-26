import React, { useState, useMemo } from 'react'
import { AVAILABLE_THEMES, applyTheme } from '../themes'
import type { 
  EditorSettings, 
  AppearanceSettings, 
  ModelSettings, 
  GitSettings,
  TerminalSettings,
  FileSettings,
  SearchSettings,
  WorkspaceSettings,
  PerformanceSettings,
  SecuritySettings
} from '../types'

export type SettingsTab = 'model' | 'agents' | 'editor' | 'appearance' | 'git' | 'terminal' | 'files' | 'search' | 'workspace' | 'performance' | 'security' | 'keyboard'

// Default settings for new categories
const defaultTerminalSettings: TerminalSettings = {
  fontSize: 14,
  fontFamily: 'Consolas, "Courier New", monospace',
  cursorBlinking: true,
  cursorStyle: 'block',
  scrollback: 1000,
  copyOnSelection: false,
  rightClickBehavior: 'default',
  enableBell: false,
  shell: '',
  shellArgs: [],
  env: {}
}

const defaultFileSettings: FileSettings = {
  autoSave: 'afterDelay',
  autoSaveDelay: 1000,
  filesExclude: {},
  filesAssociations: {},
  filesEncoding: 'utf8',
  eol: 'auto',
  trimTrailingWhitespace: true,
  insertFinalNewline: true,
  filesWatcherExclude: {},
  hotExit: 'onExit',
  restoreWindows: 'all'
}

const defaultSearchSettings: SearchSettings = {
  searchOnType: true,
  searchOnTypeDebouncePeriod: 300,
  searchCaseSensitive: false,
  searchSmartCase: false,
  searchUseGlobalIgnoreFiles: true,
  searchUseIgnoreFiles: true,
  searchExclude: {},
  searchShowLineNumbers: true,
  searchCollapseResults: 'auto'
}

const defaultWorkspaceSettings: WorkspaceSettings = {
  foldersExclude: {},
  filesExclude: {},
  maxFileSize: 50 * 1024 * 1024,
  enablePreview: true,
  enableHotExit: true,
  restoreWindows: true
}

const defaultPerformanceSettings: PerformanceSettings = {
  maxTokenizationLineLength: 20000,
  maxComputationTime: 5000,
  maxFileSize: 50 * 1024 * 1024,
  largeFileOptimizations: true,
  editorLargeFileOptimizations: true
}

const defaultSecuritySettings: SecuritySettings = {
  telemetry: false,
  crashReports: false,
  allowLocalFileAccess: true,
  allowRemoteAccess: false,
  enableExperimentalFeatures: false
}

export interface SettingsDialogProps {
  show: boolean
  onClose: () => void
  settingsTab: SettingsTab
  setSettingsTab: (tab: SettingsTab) => void
  modelSettings: ModelSettings
  setModelSettings: React.Dispatch<React.SetStateAction<ModelSettings>>
  editorSettings: EditorSettings
  setEditorSettings: (settings: EditorSettings) => void
  appearanceSettings: AppearanceSettings
  setAppearanceSettings: (settings: AppearanceSettings) => void
  gitSettings: GitSettings
  setGitSettings: (settings: GitSettings) => void
  terminalSettings?: TerminalSettings
  setTerminalSettings?: (settings: TerminalSettings) => void
  fileSettings?: FileSettings
  setFileSettings?: (settings: FileSettings) => void
  searchSettings?: SearchSettings
  setSearchSettings?: (settings: SearchSettings) => void
  workspaceSettings?: WorkspaceSettings
  setWorkspaceSettings?: (settings: WorkspaceSettings) => void
  performanceSettings?: PerformanceSettings
  setPerformanceSettings?: (settings: PerformanceSettings) => void
  securitySettings?: SecuritySettings
  setSecuritySettings?: (settings: SecuritySettings) => void
  localDirectory: string
  setLocalDirectory: (dir: string) => void
  gitStatus: { is_git_repo: boolean; has_changes: boolean; status?: string[] } | null
  setGitStatus: (status: { is_git_repo: boolean; has_changes: boolean; status?: string[] } | null) => void
  agents: any[]
  loadAgents: () => Promise<void>
  setShowAgentDialog: (show: boolean) => void
  setNewAgent: (agent: any) => void
  setEditingAgent: (agent: any | null) => void
  gpus: any[]
  setTheme: (theme: string) => void
  saveSettings: () => void
  saveUserSettings: () => Promise<void>
  loadFilesFromBackend: () => Promise<void>
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  show,
  onClose,
  settingsTab,
  setSettingsTab,
  modelSettings,
  setModelSettings,
  editorSettings,
  setEditorSettings,
  appearanceSettings,
  setAppearanceSettings,
  gitSettings,
  setGitSettings,
  terminalSettings = defaultTerminalSettings,
  setTerminalSettings,
  fileSettings = defaultFileSettings,
  setFileSettings,
  searchSettings = defaultSearchSettings,
  setSearchSettings,
  workspaceSettings = defaultWorkspaceSettings,
  setWorkspaceSettings,
  performanceSettings = defaultPerformanceSettings,
  setPerformanceSettings,
  securitySettings = defaultSecuritySettings,
  setSecuritySettings,
  localDirectory,
  setLocalDirectory,
  gitStatus,
  setGitStatus,
  agents,
  loadAgents,
  setShowAgentDialog,
  setNewAgent,
  setEditingAgent,
  gpus,
  setTheme,
  saveSettings,
  saveUserSettings,
  loadFilesFromBackend
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  
  // Settings categories with icons and descriptions
  const settingsCategories = [
    { id: 'model' as SettingsTab, label: 'Model Settings', icon: '🤖', description: 'AI model configuration' },
    { id: 'agents' as SettingsTab, label: 'Agents', icon: '🔌', description: 'AI agent management' },
    { id: 'editor' as SettingsTab, label: 'Editor', icon: '⚙️', description: 'Code editor preferences' },
    { id: 'appearance' as SettingsTab, label: 'Appearance', icon: '🎨', description: 'Theme and UI customization' },
    { id: 'files' as SettingsTab, label: 'Files', icon: '📁', description: 'File handling and auto-save' },
    { id: 'search' as SettingsTab, label: 'Search', icon: '🔍', description: 'Search and find options' },
    { id: 'terminal' as SettingsTab, label: 'Terminal', icon: '💻', description: 'Integrated terminal settings' },
    { id: 'workspace' as SettingsTab, label: 'Workspace', icon: '📂', description: 'Workspace and folder settings' },
    { id: 'git' as SettingsTab, label: 'Git', icon: '🔄', description: 'Version control and sync' },
    { id: 'performance' as SettingsTab, label: 'Performance', icon: '⚡', description: 'Performance optimizations' },
    { id: 'security' as SettingsTab, label: 'Security', icon: '🔒', description: 'Privacy and security options' },
    { id: 'keyboard' as SettingsTab, label: 'Keyboard Shortcuts', icon: '⌨️', description: 'Customize keyboard shortcuts' },
  ]
  
  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return settingsCategories
    const query = searchQuery.toLowerCase()
    return settingsCategories.filter(cat => 
      cat.label.toLowerCase().includes(query) || 
      cat.description.toLowerCase().includes(query)
    )
  }, [searchQuery])
  
  if (!show) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-large settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        {/* Search Bar */}
        <div className="settings-search">
          <input
            type="text"
            placeholder="Search settings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="settings-search-input"
            autoFocus
          />
        </div>
        
        <div className="settings-container">
          <div className="settings-sidebar">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className={`settings-tab ${settingsTab === category.id ? 'active' : ''}`}
                onClick={() => setSettingsTab(category.id)}
                title={category.description}
              >
                <span className="settings-tab-icon">{category.icon}</span>
                <span className="settings-tab-label">{category.label}</span>
              </div>
            ))}
          </div>
          <div className="settings-content">
            {settingsTab === 'model' && (
              <div className="settings-section">
                <h3>Model Settings</h3>
                <div className="form-group">
                  <label>Default Model</label>
                  <select
                    value={modelSettings.defaultModel}
                    onChange={(e) => setModelSettings({ ...modelSettings, defaultModel: e.target.value })}
                  >
                    <option value="codellama">CodeLlama</option>
                    <option value="llama2">Llama 2</option>
                    <option value="mistral">Mistral</option>
                    <option value="phi">Phi</option>
                    <option value="deepseek-coder">DeepSeek Coder</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Temperature: {modelSettings.temperature}</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={modelSettings.temperature}
                    onChange={(e) => setModelSettings({ ...modelSettings, temperature: parseFloat(e.target.value) })}
                  />
                  <small>Controls randomness. Lower = more deterministic.</small>
                </div>
                <div className="form-group">
                  <label>Max Tokens</label>
                  <input
                    type="number"
                    min="256"
                    max="8192"
                    step="256"
                    value={modelSettings.maxTokens}
                    onChange={(e) => setModelSettings({ ...modelSettings, maxTokens: parseInt(e.target.value) })}
                  />
                  <small>Maximum number of tokens in the response.</small>
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={modelSettings.autoApply}
                      onChange={(e) => setModelSettings({ ...modelSettings, autoApply: e.target.checked })}
                    />
                    Auto-Apply File Changes
                  </label>
                  <small>Automatically apply file operations (create, edit, delete) when AI generates them. When disabled, you'll need to manually accept changes.</small>
                </div>
              </div>
            )}

            {settingsTab === 'agents' && (
              <div className="settings-section">
                <div className="settings-section-header">
                  <h3>AI Agents</h3>
                  <button 
                    className="btn-primary"
                    onClick={() => {
                      setNewAgent({
                        name: '',
                        agent_type: 'local',
                        description: '',
                        gpu_id: null,
                        host: '',
                        port: 8080,
                        endpoint: '',
                        api_key: '',
                        model: modelSettings.defaultModel,
                        max_tokens: modelSettings.maxTokens,
                        temperature: modelSettings.temperature
                      })
                      setEditingAgent(null)
                      setShowAgentDialog(true)
                    }}
                  >
                    + New Agent
                  </button>
                </div>
                <div className="agents-list">
                  {agents.length === 0 ? (
                    <div className="empty-state">No agents configured. Create one to get started.</div>
                  ) : (
                    agents.map((agent) => (
                      <div key={agent.id} className="agent-item">
                        <div className="agent-info">
                          <div className="agent-name">{agent.name}</div>
                          <div className="agent-meta">
                            <span className="agent-type">{agent.agent_type}</span>
                            {agent.model && <span className="agent-model">{agent.model}</span>}
                            {agent.is_available ? (
                              <span className="agent-status available">✓ Available</span>
                            ) : (
                              <span className="agent-status unavailable">✗ Unavailable</span>
                            )}
                          </div>
                          {agent.description && <div className="agent-description">{agent.description}</div>}
                        </div>
                        <div className="agent-actions">
                          <button
                            className="btn-small"
                            onClick={async () => {
                              try {
                                const { codeEditorApi } = await import('../../../services/api')
                                await codeEditorApi.testAgent(agent.id)
                                // Test successful
                              } catch (err: any) {
                                console.error(`Test failed: ${err.message}`)
                              }
                            }}
                          >
                            Test
                          </button>
                          <button
                            className="btn-small"
                            onClick={() => {
                              setEditingAgent(agent)
                              setNewAgent({
                                name: agent.name,
                                agent_type: agent.agent_type,
                                description: agent.description || '',
                                gpu_id: agent.gpu_id || null,
                                host: agent.host || '',
                                port: agent.port || 8080,
                                endpoint: agent.endpoint || '',
                                api_key: agent.api_key || '',
                                model: agent.model || modelSettings.defaultModel,
                                max_tokens: agent.max_tokens || modelSettings.maxTokens,
                                temperature: agent.temperature || modelSettings.temperature
                              })
                              setShowAgentDialog(true)
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn-small btn-danger"
                            onClick={async () => {
                              try {
                                const { codeEditorApi } = await import('../../../services/api')
                                await codeEditorApi.deleteAgent(agent.id)
                                loadAgents()
                              } catch (err: any) {
                                console.error(`Failed to delete: ${err.message}`)
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {settingsTab === 'editor' && (
              <div className="settings-section">
                <h3>Editor Options</h3>
                
                <div className="settings-subsection">
                  <h4>Font</h4>
                  <div className="form-group">
                    <label>Font Size</label>
                    <input
                      type="number"
                      min="8"
                      max="32"
                      value={editorSettings.fontSize}
                      onChange={(e) => setEditorSettings({ ...editorSettings, fontSize: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Font Family</label>
                    <input
                      type="text"
                      value={editorSettings.fontFamily}
                      onChange={(e) => setEditorSettings({ ...editorSettings, fontFamily: e.target.value })}
                      placeholder="Consolas, 'Courier New', monospace"
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.fontLigatures}
                        onChange={(e) => setEditorSettings({ ...editorSettings, fontLigatures: e.target.checked })}
                      />
                      Font Ligatures
                    </label>
                    <small>Enable font ligatures for better code readability</small>
                  </div>
                </div>

                <div className="settings-subsection">
                  <h4>Indentation</h4>
                  <div className="form-group">
                    <label>Tab Size</label>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={editorSettings.tabSize}
                      onChange={(e) => setEditorSettings({ ...editorSettings, tabSize: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Auto Indent</label>
                    <select
                      value={editorSettings.autoIndent}
                      onChange={(e) => setEditorSettings({ ...editorSettings, autoIndent: e.target.value as any })}
                    >
                      <option value="none">None</option>
                      <option value="keep">Keep</option>
                      <option value="brackets">Brackets</option>
                      <option value="advanced">Advanced</option>
                      <option value="full">Full</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.detectIndentation}
                        onChange={(e) => setEditorSettings({ ...editorSettings, detectIndentation: e.target.checked })}
                      />
                      Detect Indentation
                    </label>
                    <small>Automatically detect indentation from file content</small>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.renderIndentGuides}
                        onChange={(e) => setEditorSettings({ ...editorSettings, renderIndentGuides: e.target.checked })}
                      />
                      Render Indent Guides
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.highlightActiveIndentGuide}
                        onChange={(e) => setEditorSettings({ ...editorSettings, highlightActiveIndentGuide: e.target.checked })}
                      />
                      Highlight Active Indent Guide
                    </label>
                  </div>
                </div>

                <div className="settings-subsection">
                  <h4>Display</h4>
                  <div className="form-group">
                    <label>Line Numbers</label>
                    <select
                      value={editorSettings.lineNumbers}
                      onChange={(e) => setEditorSettings({ ...editorSettings, lineNumbers: e.target.value as any })}
                    >
                      <option value="on">On</option>
                      <option value="off">Off</option>
                      <option value="relative">Relative</option>
                      <option value="interval">Interval</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Render Whitespace</label>
                    <select
                      value={editorSettings.renderWhitespace}
                      onChange={(e) => setEditorSettings({ ...editorSettings, renderWhitespace: e.target.value as any })}
                    >
                      <option value="none">None</option>
                      <option value="boundary">Boundary</option>
                      <option value="selection">Selection</option>
                      <option value="trailing">Trailing</option>
                      <option value="all">All</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Render Line Highlight</label>
                    <select
                      value={editorSettings.renderLineHighlight}
                      onChange={(e) => setEditorSettings({ ...editorSettings, renderLineHighlight: e.target.value as any })}
                    >
                      <option value="none">None</option>
                      <option value="gutter">Gutter</option>
                      <option value="line">Line</option>
                      <option value="all">All</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Word Wrap</label>
                    <select
                      value={editorSettings.wordWrap}
                      onChange={(e) => setEditorSettings({ ...editorSettings, wordWrap: e.target.value as any })}
                    >
                      <option value="off">Off</option>
                      <option value="on">On</option>
                      <option value="wordWrapColumn">Word Wrap Column</option>
                      <option value="bounded">Bounded</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.minimap}
                        onChange={(e) => setEditorSettings({ ...editorSettings, minimap: e.target.checked })}
                      />
                      Show Minimap
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.scrollBeyondLastLine}
                        onChange={(e) => setEditorSettings({ ...editorSettings, scrollBeyondLastLine: e.target.checked })}
                      />
                      Scroll Beyond Last Line
                    </label>
                  </div>
                </div>

                <div className="settings-subsection">
                  <h4>Cursor</h4>
                  <div className="form-group">
                    <label>Cursor Blinking</label>
                    <select
                      value={editorSettings.cursorBlinking}
                      onChange={(e) => setEditorSettings({ ...editorSettings, cursorBlinking: e.target.value as any })}
                    >
                      <option value="blink">Blink</option>
                      <option value="smooth">Smooth</option>
                      <option value="phase">Phase</option>
                      <option value="expand">Expand</option>
                      <option value="solid">Solid</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.cursorSmoothCaretAnimation}
                        onChange={(e) => setEditorSettings({ ...editorSettings, cursorSmoothCaretAnimation: e.target.checked })}
                      />
                      Smooth Caret Animation
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Multi Cursor Modifier</label>
                    <select
                      value={editorSettings.multiCursorModifier}
                      onChange={(e) => setEditorSettings({ ...editorSettings, multiCursorModifier: e.target.value as any })}
                    >
                      <option value="ctrlCmd">Ctrl/Cmd</option>
                      <option value="alt">Alt</option>
                    </select>
                    <small>Modifier key for multi-cursor selection</small>
                  </div>
                </div>

                <div className="settings-subsection">
                  <h4>Formatting</h4>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.formatOnPaste}
                        onChange={(e) => setEditorSettings({ ...editorSettings, formatOnPaste: e.target.checked })}
                      />
                      Format on Paste
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.formatOnType}
                        onChange={(e) => setEditorSettings({ ...editorSettings, formatOnType: e.target.checked })}
                      />
                      Format on Type
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.trimAutoWhitespace}
                        onChange={(e) => setEditorSettings({ ...editorSettings, trimAutoWhitespace: e.target.checked })}
                      />
                      Trim Auto Whitespace
                    </label>
                    <small>Remove trailing whitespace on save</small>
                  </div>
                </div>

                <div className="settings-subsection">
                  <h4>Suggestions</h4>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.quickSuggestions}
                        onChange={(e) => setEditorSettings({ ...editorSettings, quickSuggestions: e.target.checked })}
                      />
                      Quick Suggestions
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Quick Suggestions Delay</label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      step="10"
                      value={editorSettings.quickSuggestionsDelay}
                      onChange={(e) => setEditorSettings({ ...editorSettings, quickSuggestionsDelay: parseInt(e.target.value) })}
                    />
                    <small>Delay in milliseconds before showing suggestions</small>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.suggestOnTriggerCharacters}
                        onChange={(e) => setEditorSettings({ ...editorSettings, suggestOnTriggerCharacters: e.target.checked })}
                      />
                      Suggest on Trigger Characters
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Accept Suggestion on Enter</label>
                    <select
                      value={editorSettings.acceptSuggestionOnEnter}
                      onChange={(e) => setEditorSettings({ ...editorSettings, acceptSuggestionOnEnter: e.target.value as any })}
                    >
                      <option value="on">On</option>
                      <option value="smart">Smart</option>
                      <option value="off">Off</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Snippet Suggestions</label>
                    <select
                      value={editorSettings.snippetSuggestions}
                      onChange={(e) => setEditorSettings({ ...editorSettings, snippetSuggestions: e.target.value as any })}
                    >
                      <option value="top">Top</option>
                      <option value="bottom">Bottom</option>
                      <option value="inline">Inline</option>
                      <option value="none">None</option>
                    </select>
                  </div>
                </div>

                <div className="settings-subsection">
                  <h4>Advanced</h4>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.bracketPairColorization}
                        onChange={(e) => setEditorSettings({ ...editorSettings, bracketPairColorization: e.target.checked })}
                      />
                      Bracket Pair Colorization
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.guides.bracketPairs}
                        onChange={(e) => setEditorSettings({ ...editorSettings, guides: { ...editorSettings.guides, bracketPairs: e.target.checked } })}
                      />
                      Bracket Pair Guides
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.guides.indentation}
                        onChange={(e) => setEditorSettings({ ...editorSettings, guides: { ...editorSettings.guides, indentation: e.target.checked } })}
                      />
                      Indentation Guides
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.folding}
                        onChange={(e) => setEditorSettings({ ...editorSettings, folding: e.target.checked })}
                      />
                      Code Folding
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Folding Strategy</label>
                    <select
                      value={editorSettings.foldingStrategy}
                      onChange={(e) => setEditorSettings({ ...editorSettings, foldingStrategy: e.target.value as any })}
                    >
                      <option value="auto">Auto</option>
                      <option value="indentation">Indentation</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Show Folding Controls</label>
                    <select
                      value={editorSettings.showFoldingControls}
                      onChange={(e) => setEditorSettings({ ...editorSettings, showFoldingControls: e.target.value as any })}
                    >
                      <option value="always">Always</option>
                      <option value="mouseover">Mouseover</option>
                      <option value="never">Never</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.links}
                        onChange={(e) => setEditorSettings({ ...editorSettings, links: e.target.checked })}
                      />
                      Enable Links
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.colorDecorators}
                        onChange={(e) => setEditorSettings({ ...editorSettings, colorDecorators: e.target.checked })}
                      />
                      Color Decorators
                    </label>
                    <small>Show color swatches in the editor</small>
                  </div>
                  <div className="form-group">
                    <label>Match Brackets</label>
                    <select
                      value={editorSettings.matchBrackets}
                      onChange={(e) => setEditorSettings({ ...editorSettings, matchBrackets: e.target.value as any })}
                    >
                      <option value="always">Always</option>
                      <option value="near">Near</option>
                      <option value="never">Never</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.smoothScrolling}
                        onChange={(e) => setEditorSettings({ ...editorSettings, smoothScrolling: e.target.checked })}
                      />
                      Smooth Scrolling
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={editorSettings.mouseWheelZoom}
                        onChange={(e) => setEditorSettings({ ...editorSettings, mouseWheelZoom: e.target.checked })}
                      />
                      Mouse Wheel Zoom
                    </label>
                    <small>Zoom with Ctrl/Cmd + Mouse Wheel</small>
                  </div>
                </div>
              </div>
            )}

            {settingsTab === 'appearance' && (
              <div className="settings-section">
                <h3>Appearance</h3>
                
                <div className="settings-subsection">
                  <h4>Color Theme</h4>
                  <div className="form-group">
                    <label>Color Theme</label>
                    <div className="theme-selector">
                      {AVAILABLE_THEMES.map((themeDef) => (
                        <div
                          key={themeDef.id}
                          className={`theme-option ${appearanceSettings.colorTheme === themeDef.id ? 'active' : ''}`}
                          onClick={() => {
                            setAppearanceSettings({ ...appearanceSettings, colorTheme: themeDef.id as any })
                            const themeId = themeDef.id
                            setTheme(themeId)
                            applyTheme(themeId)
                            saveUserSettings()
                          }}
                        >
                          <div className={`theme-preview theme-preview-${themeDef.id}`} style={{
                            backgroundColor: themeDef.colors.bg,
                            color: themeDef.colors.fg,
                            borderColor: themeDef.colors.accent
                          }}>
                            <div className="theme-preview-bar" style={{ backgroundColor: themeDef.colors.accent + '40' }}></div>
                            <div className="theme-preview-code">
                              <div className="theme-preview-line" style={{ backgroundColor: themeDef.colors.accent + '20' }}></div>
                              <div className="theme-preview-line"></div>
                              <div className="theme-preview-line" style={{ backgroundColor: themeDef.colors.accent + '10' }}></div>
                            </div>
                          </div>
                          <div className="theme-name">
                            {themeDef.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="settings-subsection">
                  <h4>UI Visibility</h4>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={appearanceSettings.activityBarVisible}
                        onChange={(e) => setAppearanceSettings({ ...appearanceSettings, activityBarVisible: e.target.checked })}
                      />
                      Activity Bar Visible
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={appearanceSettings.statusBarVisible}
                        onChange={(e) => setAppearanceSettings({ ...appearanceSettings, statusBarVisible: e.target.checked })}
                      />
                      Status Bar Visible
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={appearanceSettings.sidebarVisible}
                        onChange={(e) => setAppearanceSettings({ ...appearanceSettings, sidebarVisible: e.target.checked })}
                      />
                      Sidebar Visible
                    </label>
                  </div>
                </div>
              </div>
            )}

            {settingsTab === 'git' && (
              <div className="settings-section">
                <h3>Git & Sync</h3>
                
                <div className="settings-subsection">
                  <h4>Local Directory</h4>
                  <div className="form-group">
                    <label>Working Directory</label>
                    <input
                      type="text"
                      value={localDirectory}
                      onChange={(e) => setLocalDirectory(e.target.value)}
                      placeholder="~/Projects/my-project or leave empty for default"
                    />
                    <small>Path to local directory to work from. Supports ~ for home directory. Leave empty to use default code directory.</small>
                  </div>
                  <div className="form-group">
                    <button
                      className="btn-primary"
                      onClick={async () => {
                        try {
                          await loadFilesFromBackend()
                          // Files loaded
                        } catch (err: any) {
                          console.error(`Failed to load files: ${err.message}`)
                        }
                      }}
                    >
                      Load Files from Directory
                    </button>
                  </div>
                </div>

                <div className="settings-subsection">
                  <h4>Git Repository</h4>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={gitSettings.useGit}
                        onChange={(e) => setGitSettings({ ...gitSettings, useGit: e.target.checked })}
                      />
                      Enable Git Integration
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Repository URL</label>
                    <input
                      type="text"
                      value={gitSettings.gitRepoUrl}
                      onChange={(e) => setGitSettings({ ...gitSettings, gitRepoUrl: e.target.value })}
                      placeholder="https://github.com/user/repo.git"
                    />
                    <small>Remote repository URL for syncing</small>
                  </div>
                  <div className="form-group">
                    <label>Repository Path</label>
                    <input
                      type="text"
                      value={gitSettings.gitRepoPath}
                      onChange={(e) => setGitSettings({ ...gitSettings, gitRepoPath: e.target.value })}
                      placeholder="Leave empty to use working directory"
                    />
                    <small>Local path to git repository (defaults to working directory)</small>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={gitSettings.autoCommit}
                        onChange={(e) => setGitSettings({ ...gitSettings, autoCommit: e.target.checked })}
                      />
                      Auto-commit on Save
                    </label>
                    <small>Automatically commit changes when saving files</small>
                  </div>
                </div>

                <div className="settings-subsection">
                  <h4>Git Status</h4>
                  {gitStatus?.is_git_repo ? (
                    <div className="form-group">
                      <div style={{ padding: '10px', backgroundColor: 'var(--theme-input-bg)', borderRadius: '4px', marginBottom: '10px' }}>
                        <div style={{ marginBottom: '5px' }}>
                          <strong>Status:</strong> {gitStatus!.has_changes ? 'Has Changes' : 'Clean'}
                        </div>
                        {gitStatus!.has_changes && gitStatus!.status && Array.isArray(gitStatus!.status) && (gitStatus!.status as string[]).length > 0 && (
                          <div style={{ fontSize: '12px', color: 'var(--theme-fg-secondary)' }}>
                            {(gitStatus!.status as string[]).slice(0, 5).map((line, i) => (
                              <div key={i}>{line}</div>
                            ))}
                            {(gitStatus!.status as string[]).length > 5 && <div>... and {(gitStatus!.status as string[]).length - 5} more</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : gitStatus ? (
                    <div className="form-group">
                      <div style={{ padding: '10px', backgroundColor: 'var(--theme-input-bg)', borderRadius: '4px', marginBottom: '10px' }}>
                        <div>Not a git repository</div>
                      </div>
                    </div>
                  ) : null}
                  <div className="form-group" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      className="btn-small"
                      onClick={async () => {
                        try {
                          const { codeEditorApi } = await import('../../../services/api')
                          const repoPath = gitSettings.gitRepoPath || localDirectory || undefined
                          const status = await codeEditorApi.gitStatus(repoPath)
                          setGitStatus({
                            is_git_repo: status.is_git_repo,
                            has_changes: status.has_changes ?? false,
                            status: status.status
                          })
                        } catch (err: any) {
                          console.error(`Failed to get git status: ${err.message}`)
                        }
                      }}
                    >
                      Check Status
                    </button>
                    <button
                      className="btn-small"
                      onClick={async () => {
                        try {
                          const { codeEditorApi } = await import('../../../services/api')
                          const repoPath = gitSettings.gitRepoPath || localDirectory || undefined
                          await codeEditorApi.gitInit(repoPath)
                          const status = await codeEditorApi.gitStatus(repoPath)
                          setGitStatus({
                            is_git_repo: status.is_git_repo,
                            has_changes: status.has_changes ?? false,
                            status: status.status
                          })
                        } catch (err: any) {
                          console.error(`Failed to initialize git: ${err.message}`)
                        }
                      }}
                    >
                      Init Repository
                    </button>
                    {gitSettings.gitRepoUrl && (
                      <button
                        className="btn-small"
                        onClick={async () => {
                          try {
                            const { codeEditorApi } = await import('../../../services/api')
                            const targetPath = gitSettings.gitRepoPath || localDirectory || undefined
                            await codeEditorApi.gitClone(gitSettings.gitRepoUrl, targetPath)
                            await loadFilesFromBackend()
                          } catch (err: any) {
                            console.error(`Failed to clone repository: ${err.message}`)
                          }
                        }}
                      >
                        Clone Repository
                      </button>
                    )}
                  </div>
                </div>

                <div className="settings-subsection">
                  <h4>Sync Operations</h4>
                  <div className="form-group" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      className="btn-small btn-primary"
                      onClick={async () => {
                        try {
                          const { codeEditorApi } = await import('../../../services/api')
                          const repoPath = gitSettings.gitRepoPath || localDirectory || undefined
                          await codeEditorApi.gitAdd(repoPath)
                          await codeEditorApi.gitCommit(repoPath, 'Update')
                          const status = await codeEditorApi.gitStatus(repoPath)
                          setGitStatus({
                            is_git_repo: status.is_git_repo,
                            has_changes: status.has_changes ?? false,
                            status: status.status
                          })
                        } catch (err: any) {
                          console.error(`Failed to commit: ${err.message}`)
                        }
                      }}
                    >
                      Commit Changes
                    </button>
                    <button
                      className="btn-small btn-primary"
                      onClick={async () => {
                        try {
                          const { codeEditorApi } = await import('../../../services/api')
                          const repoPath = gitSettings.gitRepoPath || localDirectory || undefined
                          await codeEditorApi.gitPull(repoPath)
                          await loadFilesFromBackend()
                          const status = await codeEditorApi.gitStatus(repoPath)
                          setGitStatus({
                            is_git_repo: status.is_git_repo,
                            has_changes: status.has_changes ?? false,
                            status: status.status
                          })
                        } catch (err: any) {
                          console.error(`Failed to pull: ${err.message}`)
                        }
                      }}
                    >
                      Pull from Remote
                    </button>
                    <button
                      className="btn-small btn-primary"
                      onClick={async () => {
                        try {
                          const { codeEditorApi } = await import('../../../services/api')
                          const repoPath = gitSettings.gitRepoPath || localDirectory || undefined
                          await codeEditorApi.gitPush(repoPath)
                          const status = await codeEditorApi.gitStatus(repoPath)
                          setGitStatus({
                            is_git_repo: status.is_git_repo,
                            has_changes: status.has_changes ?? false,
                            status: status.status
                          })
                        } catch (err: any) {
                          console.error(`Failed to push: ${err.message}`)
                        }
                      }}
                    >
                      Push to Remote
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Files Settings */}
            {settingsTab === 'files' && setFileSettings && (
              <div className="settings-section">
                <h3>Files</h3>
                
                <div className="settings-subsection">
                  <h4>Auto Save</h4>
                  <div className="form-group">
                    <label>Auto Save</label>
                    <select
                      value={fileSettings.autoSave}
                      onChange={(e) => setFileSettings({ ...fileSettings, autoSave: e.target.value as any })}
                    >
                      <option value="off">Off</option>
                      <option value="afterDelay">After Delay</option>
                      <option value="onFocusChange">On Focus Change</option>
                      <option value="onWindowChange">On Window Change</option>
                    </select>
                    <small>Controls when files are automatically saved</small>
                  </div>
                  {fileSettings.autoSave === 'afterDelay' && (
                    <div className="form-group">
                      <label>Auto Save Delay (ms)</label>
                      <input
                        type="number"
                        min="100"
                        max="10000"
                        step="100"
                        value={fileSettings.autoSaveDelay}
                        onChange={(e) => setFileSettings({ ...fileSettings, autoSaveDelay: parseInt(e.target.value) })}
                      />
                    </div>
                  )}
                </div>

                <div className="settings-subsection">
                  <h4>File Encoding</h4>
                  <div className="form-group">
                    <label>Default Encoding</label>
                    <select
                      value={fileSettings.filesEncoding}
                      onChange={(e) => setFileSettings({ ...fileSettings, filesEncoding: e.target.value as any })}
                    >
                      <option value="utf8">UTF-8</option>
                      <option value="utf8bom">UTF-8 with BOM</option>
                      <option value="utf16le">UTF-16 LE</option>
                      <option value="utf16be">UTF-16 BE</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>End of Line</label>
                    <select
                      value={fileSettings.eol}
                      onChange={(e) => setFileSettings({ ...fileSettings, eol: e.target.value as any })}
                    >
                      <option value="auto">Auto</option>
                      <option value="\n">LF (\n)</option>
                      <option value="\r\n">CRLF (\r\n)</option>
                    </select>
                  </div>
                </div>

                <div className="settings-subsection">
                  <h4>File Handling</h4>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={fileSettings.trimTrailingWhitespace}
                        onChange={(e) => setFileSettings({ ...fileSettings, trimTrailingWhitespace: e.target.checked })}
                      />
                      Trim Trailing Whitespace
                    </label>
                    <small>Remove trailing whitespace when saving files</small>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={fileSettings.insertFinalNewline}
                        onChange={(e) => setFileSettings({ ...fileSettings, insertFinalNewline: e.target.checked })}
                      />
                      Insert Final Newline
                    </label>
                    <small>Insert a newline at the end of files when saving</small>
                  </div>
                </div>

                <div className="settings-subsection">
                  <h4>Hot Exit</h4>
                  <div className="form-group">
                    <label>Hot Exit</label>
                    <select
                      value={fileSettings.hotExit}
                      onChange={(e) => setFileSettings({ ...fileSettings, hotExit: e.target.value as any })}
                    >
                      <option value="off">Off</option>
                      <option value="onExit">On Exit</option>
                      <option value="onExitAndWindowClose">On Exit and Window Close</option>
                    </select>
                    <small>Controls whether unsaved files are restored when reopening</small>
                  </div>
                </div>
              </div>
            )}

            {/* Search Settings */}
            {settingsTab === 'search' && setSearchSettings && (
              <div className="settings-section">
                <h3>Search</h3>
                
                <div className="settings-subsection">
                  <h4>Search Behavior</h4>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={searchSettings.searchOnType}
                        onChange={(e) => setSearchSettings({ ...searchSettings, searchOnType: e.target.checked })}
                      />
                      Search on Type
                    </label>
                    <small>Start searching as you type</small>
                  </div>
                  {searchSettings.searchOnType && (
                    <div className="form-group">
                      <label>Search on Type Debounce Period (ms)</label>
                      <input
                        type="number"
                        min="0"
                        max="2000"
                        step="50"
                        value={searchSettings.searchOnTypeDebouncePeriod}
                        onChange={(e) => setSearchSettings({ ...searchSettings, searchOnTypeDebouncePeriod: parseInt(e.target.value) })}
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={searchSettings.searchCaseSensitive}
                        onChange={(e) => setSearchSettings({ ...searchSettings, searchCaseSensitive: e.target.checked })}
                      />
                      Case Sensitive
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={searchSettings.searchSmartCase}
                        onChange={(e) => setSearchSettings({ ...searchSettings, searchSmartCase: e.target.checked })}
                      />
                      Smart Case
                    </label>
                    <small>Automatically use case-sensitive search when query contains uppercase</small>
                  </div>
                </div>

                <div className="settings-subsection">
                  <h4>Search Results</h4>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={searchSettings.searchShowLineNumbers}
                        onChange={(e) => setSearchSettings({ ...searchSettings, searchShowLineNumbers: e.target.checked })}
                      />
                      Show Line Numbers
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Collapse Results</label>
                    <select
                      value={searchSettings.searchCollapseResults}
                      onChange={(e) => setSearchSettings({ ...searchSettings, searchCollapseResults: e.target.value as any })}
                    >
                      <option value="alwaysCollapse">Always Collapse</option>
                      <option value="alwaysExpand">Always Expand</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Terminal Settings */}
            {settingsTab === 'terminal' && setTerminalSettings && (
              <div className="settings-section">
                <h3>Terminal</h3>
                
                <div className="settings-subsection">
                  <h4>Font</h4>
                  <div className="form-group">
                    <label>Font Size</label>
                    <input
                      type="number"
                      min="8"
                      max="32"
                      value={terminalSettings.fontSize}
                      onChange={(e) => setTerminalSettings({ ...terminalSettings, fontSize: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Font Family</label>
                    <input
                      type="text"
                      value={terminalSettings.fontFamily}
                      onChange={(e) => setTerminalSettings({ ...terminalSettings, fontFamily: e.target.value })}
                      placeholder="Consolas, 'Courier New', monospace"
                    />
                  </div>
                </div>

                <div className="settings-subsection">
                  <h4>Cursor</h4>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={terminalSettings.cursorBlinking}
                        onChange={(e) => setTerminalSettings({ ...terminalSettings, cursorBlinking: e.target.checked })}
                      />
                      Cursor Blinking
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Cursor Style</label>
                    <select
                      value={terminalSettings.cursorStyle}
                      onChange={(e) => setTerminalSettings({ ...terminalSettings, cursorStyle: e.target.value as any })}
                    >
                      <option value="block">Block</option>
                      <option value="line">Line</option>
                      <option value="underline">Underline</option>
                    </select>
                  </div>
                </div>

                <div className="settings-subsection">
                  <h4>Behavior</h4>
                  <div className="form-group">
                    <label>Scrollback Lines</label>
                    <input
                      type="number"
                      min="100"
                      max="10000"
                      step="100"
                      value={terminalSettings.scrollback}
                      onChange={(e) => setTerminalSettings({ ...terminalSettings, scrollback: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={terminalSettings.copyOnSelection}
                        onChange={(e) => setTerminalSettings({ ...terminalSettings, copyOnSelection: e.target.checked })}
                      />
                      Copy on Selection
                    </label>
                    <small>Automatically copy selected text to clipboard</small>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={terminalSettings.enableBell}
                        onChange={(e) => setTerminalSettings({ ...terminalSettings, enableBell: e.target.checked })}
                      />
                      Enable Bell
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Workspace Settings */}
            {settingsTab === 'workspace' && setWorkspaceSettings && (
              <div className="settings-section">
                <h3>Workspace</h3>
                
                <div className="settings-subsection">
                  <h4>File Handling</h4>
                  <div className="form-group">
                    <label>Max File Size (bytes)</label>
                    <input
                      type="number"
                      min="1024"
                      max={1024 * 1024 * 1024}
                      step="1024"
                      value={workspaceSettings.maxFileSize}
                      onChange={(e) => setWorkspaceSettings({ ...workspaceSettings, maxFileSize: parseInt(e.target.value) })}
                    />
                    <small>Maximum file size to load in editor (default: 50MB)</small>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={workspaceSettings.enablePreview}
                        onChange={(e) => setWorkspaceSettings({ ...workspaceSettings, enablePreview: e.target.checked })}
                      />
                      Enable Preview Mode
                    </label>
                    <small>Open files in preview mode by default</small>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Settings */}
            {settingsTab === 'performance' && setPerformanceSettings && (
              <div className="settings-section">
                <h3>Performance</h3>
                
                <div className="settings-subsection">
                  <h4>Editor Performance</h4>
                  <div className="form-group">
                    <label>Max Tokenization Line Length</label>
                    <input
                      type="number"
                      min="1000"
                      max="100000"
                      step="1000"
                      value={performanceSettings.maxTokenizationLineLength}
                      onChange={(e) => setPerformanceSettings({ ...performanceSettings, maxTokenizationLineLength: parseInt(e.target.value) })}
                    />
                    <small>Lines longer than this will not be tokenized for performance</small>
                  </div>
                  <div className="form-group">
                    <label>Max Computation Time (ms)</label>
                    <input
                      type="number"
                      min="100"
                      max="10000"
                      step="100"
                      value={performanceSettings.maxComputationTime}
                      onChange={(e) => setPerformanceSettings({ ...performanceSettings, maxComputationTime: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={performanceSettings.largeFileOptimizations}
                        onChange={(e) => setPerformanceSettings({ ...performanceSettings, largeFileOptimizations: e.target.checked })}
                      />
                      Large File Optimizations
                    </label>
                    <small>Enable optimizations for large files</small>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={performanceSettings.editorLargeFileOptimizations}
                        onChange={(e) => setPerformanceSettings({ ...performanceSettings, editorLargeFileOptimizations: e.target.checked })}
                      />
                      Editor Large File Optimizations
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {settingsTab === 'security' && setSecuritySettings && (
              <div className="settings-section">
                <h3>Security & Privacy</h3>
                
                <div className="settings-subsection">
                  <h4>Privacy</h4>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={securitySettings.telemetry}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, telemetry: e.target.checked })}
                      />
                      Enable Telemetry
                    </label>
                    <small>Allow sending usage data to help improve the product</small>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={securitySettings.crashReports}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, crashReports: e.target.checked })}
                      />
                      Enable Crash Reports
                    </label>
                    <small>Automatically send crash reports</small>
                  </div>
                </div>

                <div className="settings-subsection">
                  <h4>Access Control</h4>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={securitySettings.allowLocalFileAccess}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, allowLocalFileAccess: e.target.checked })}
                      />
                      Allow Local File Access
                    </label>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={securitySettings.allowRemoteAccess}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, allowRemoteAccess: e.target.checked })}
                      />
                      Allow Remote Access
                    </label>
                    <small>Enable remote file access and connections</small>
                  </div>
                  <div className="form-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={securitySettings.enableExperimentalFeatures}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, enableExperimentalFeatures: e.target.checked })}
                      />
                      Enable Experimental Features
                    </label>
                    <small>Enable experimental and beta features</small>
                  </div>
                </div>
              </div>
            )}

            {/* Keyboard Shortcuts */}
            {settingsTab === 'keyboard' && (
              <div className="settings-section">
                <h3>Keyboard Shortcuts</h3>
                <div className="settings-subsection">
                  <p>Keyboard shortcut customization will be available in a future update.</p>
                  <p>Currently using default VS Code keybindings.</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={async () => {
            saveSettings()
            await saveUserSettings()
            onClose()
          }}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
