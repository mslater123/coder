export interface CodeEditorProps {
  onClose?: () => void
}

export interface FileNode {
  name: string
  type: 'file' | 'folder'
  path: string
  children?: FileNode[]
  content?: string
}

export interface FileOperation {
  type: 'create' | 'edit' | 'delete'
  path: string
  content?: string
  description?: string
  oldContent?: string
  language?: string // Language of the code (e.g., 'python', 'javascript')
}

export interface ParsedAIResponse {
  text: string
  fileOperations: FileOperation[]
  hasOperations: boolean
}

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  parsed?: ParsedAIResponse
  isStreaming?: boolean
}

export interface Project {
  id: string
  name: string
  description?: string
  files: FileNode[]
  createdAt: Date
  updatedAt: Date
  settings?: {
    language?: string
    theme?: string
  }
}

export interface EditorPane {
  id: string
  activeTab: string
  tabs: Array<{ path: string; name: string; content: string; modified: boolean }>
}

export interface EditorSplitGroup {
  id: string
  orientation: 'horizontal' | 'vertical'
  sizes: number[] // Percentage sizes for each child
  children: (EditorPane | EditorSplitGroup)[]
}

export type EditorPaneNode = EditorPane | EditorSplitGroup

export interface EditorGroup {
  id: string
  panes: EditorPane[]
  orientation: 'horizontal' | 'vertical'
  sizes: number[] // Percentage sizes for each pane
}

export interface ThemeColors {
  // Main colors
  bg: string
  fg: string
  accent: string
  
  // UI component colors
  menuBarBg: string
  menuBarFg: string
  menuBarBorder: string
  menuDropdownBg: string
  menuDropdownFg: string
  menuDropdownHover: string
  menuDropdownBorder: string
  
  headerBg: string
  headerFg: string
  headerBorder: string
  
  sidebarBg: string
  sidebarFg: string
  sidebarBorder: string
  sidebarItemHover: string
  sidebarItemSelected: string
  
  editorBg: string
  editorFg: string
  
  aiPanelBg: string
  aiPanelFg: string
  aiPanelBorder: string
  aiMessageBg: string
  aiInputBg: string
  aiInputFg: string
  aiInputBorder: string
  
  terminalBg: string
  terminalFg: string
  terminalBorder: string
  
  dialogBg: string
  dialogFg: string
  dialogBorder: string
  dialogHeaderBg: string
  
  buttonBg: string
  buttonFg: string
  buttonHover: string
  buttonPrimaryBg: string
  buttonPrimaryFg: string
  
  inputBg: string
  inputFg: string
  inputBorder: string
  inputFocusBorder: string
  
  tabBg: string
  tabFg: string
  tabActiveBg: string
  tabActiveFg: string
  tabBorder: string
  
  statusBarBg: string
  statusBarFg: string
  statusBarBorder: string
}

export interface EditorSettings {
  fontSize: number
  tabSize: number
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded'
  minimap: boolean
  formatOnPaste: boolean
  formatOnType: boolean
  lineNumbers: 'on' | 'off' | 'relative' | 'interval'
  renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all'
  renderLineHighlight: 'none' | 'gutter' | 'line' | 'all'
  cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid'
  cursorSmoothCaretAnimation: boolean
  smoothScrolling: boolean
  mouseWheelZoom: boolean
  multiCursorModifier: 'ctrlCmd' | 'alt'
  quickSuggestions: boolean
  quickSuggestionsDelay: number
  suggestOnTriggerCharacters: boolean
  acceptSuggestionOnEnter: 'on' | 'smart' | 'off'
  acceptSuggestionOnCommitCharacter: boolean
  snippetSuggestions: 'top' | 'bottom' | 'inline' | 'none'
  wordBasedSuggestions: 'off' | 'allDocuments' | 'matchingDocuments' | 'currentDocument'
  fontFamily: string
  fontLigatures: boolean
  bracketPairColorization: boolean
  guides: {
    bracketPairs: boolean
    indentation: boolean
  }
  autoIndent: 'none' | 'keep' | 'brackets' | 'advanced' | 'full'
  detectIndentation: boolean
  trimAutoWhitespace: boolean
  scrollBeyondLastLine: boolean
  renderIndentGuides: boolean
  highlightActiveIndentGuide: boolean
  links: boolean
  colorDecorators: boolean
  folding: boolean
  foldingStrategy: 'auto' | 'indentation'
  showFoldingControls: 'always' | 'mouseover' | 'never'
  unfoldOnClickAfterEndOfLine: boolean
  matchBrackets: 'always' | 'near' | 'never'
  automaticLayout: boolean
}

export interface AppearanceSettings {
  colorTheme: 'vs-dark' | 'vs' | 'hc-black' | 'hc-light'
  iconTheme: string
  activityBarVisible: boolean
  statusBarVisible: boolean
  sidebarVisible: boolean
}

export interface ModelSettings {
  defaultModel: string
  temperature: number
  maxTokens: number
  autoApply: boolean
}

export interface GitSettings {
  useGit: boolean
  gitRepoPath: string
  gitRepoUrl: string
  autoCommit: boolean
}

export interface TerminalSettings {
  fontSize: number
  fontFamily: string
  cursorBlinking: boolean
  cursorStyle: 'block' | 'line' | 'underline'
  scrollback: number
  copyOnSelection: boolean
  rightClickBehavior: 'default' | 'copyPaste' | 'selectWord' | 'paste'
  enableBell: boolean
  shell: string
  shellArgs: string[]
  env: Record<string, string>
}

export interface FileSettings {
  autoSave: 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowChange'
  autoSaveDelay: number
  filesExclude: Record<string, boolean>
  filesAssociations: Record<string, string>
  filesEncoding: 'utf8' | 'utf8bom' | 'utf16le' | 'utf16be'
  eol: '\n' | '\r\n' | 'auto'
  trimTrailingWhitespace: boolean
  insertFinalNewline: boolean
  filesWatcherExclude: Record<string, boolean>
  hotExit: 'off' | 'onExit' | 'onExitAndWindowClose'
  restoreWindows: 'all' | 'folders' | 'one' | 'none'
}

export interface SearchSettings {
  searchOnType: boolean
  searchOnTypeDebouncePeriod: number
  searchCaseSensitive: boolean
  searchSmartCase: boolean
  searchUseGlobalIgnoreFiles: boolean
  searchUseIgnoreFiles: boolean
  searchExclude: Record<string, boolean>
  searchShowLineNumbers: boolean
  searchCollapseResults: 'alwaysCollapse' | 'alwaysExpand' | 'auto'
}

export interface WorkspaceSettings {
  foldersExclude: Record<string, boolean>
  filesExclude: Record<string, boolean>
  maxFileSize: number
  enablePreview: boolean
  enableHotExit: boolean
  restoreWindows: boolean
}

export interface PerformanceSettings {
  maxTokenizationLineLength: number
  maxComputationTime: number
  maxFileSize: number
  largeFileOptimizations: boolean
  editorLargeFileOptimizations: boolean
}

export interface SecuritySettings {
  telemetry: boolean
  crashReports: boolean
  allowLocalFileAccess: boolean
  allowRemoteAccess: boolean
  enableExperimentalFeatures: boolean
}

export interface KeyboardShortcut {
  key: string
  command: string
  when?: string
}

export interface ContextMenu {
  x: number
  y: number
  filePath: string
  fileName: string
  isFolder?: boolean
}

export interface Terminal {
  id: string
  name: string
  output: string[]
  input: string
}

export interface ExecuteConfig {
  file: string
  arguments: string
  workingDirectory: string
  environment: 'local' | 'gpu' | 'docker'
  interpreter: string
  timeout: number
}
