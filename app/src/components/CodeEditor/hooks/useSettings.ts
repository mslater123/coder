import { useState } from 'react'

export function useSettings() {
  const [editorSettings, setEditorSettings] = useState({
    fontSize: 14,
    tabSize: 2,
    wordWrap: 'on' as 'on' | 'off' | 'wordWrapColumn' | 'bounded',
    minimap: true,
    formatOnPaste: true,
    formatOnType: true,
    lineNumbers: 'on' as 'on' | 'off' | 'relative' | 'interval',
    renderWhitespace: 'none' as 'none' | 'boundary' | 'selection' | 'trailing' | 'all',
    renderLineHighlight: 'all' as 'none' | 'gutter' | 'line' | 'all',
    cursorBlinking: 'blink' as 'blink' | 'smooth' | 'phase' | 'expand' | 'solid',
    cursorSmoothCaretAnimation: false,
    smoothScrolling: false,
    mouseWheelZoom: false,
    multiCursorModifier: 'alt' as 'ctrlCmd' | 'alt',
    quickSuggestions: true,
    quickSuggestionsDelay: 10,
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on' as 'on' | 'smart' | 'off',
    acceptSuggestionOnCommitCharacter: true,
    snippetSuggestions: 'top' as 'top' | 'bottom' | 'inline' | 'none',
    wordBasedSuggestions: 'matchingDocuments' as 'off' | 'allDocuments' | 'matchingDocuments' | 'currentDocument',
    fontFamily: 'Consolas, "Courier New", monospace',
    fontLigatures: false,
    bracketPairColorization: true,
    guides: {
      bracketPairs: true,
      indentation: true
    },
    autoIndent: 'full' as 'none' | 'keep' | 'brackets' | 'advanced' | 'full',
    detectIndentation: true,
    trimAutoWhitespace: true,
    scrollBeyondLastLine: true,
    renderIndentGuides: true,
    highlightActiveIndentGuide: true,
    links: true,
    colorDecorators: true,
    folding: true,
    foldingStrategy: 'auto' as 'auto' | 'indentation',
    showFoldingControls: 'mouseover' as 'always' | 'mouseover' | 'never',
    unfoldOnClickAfterEndOfLine: false,
    matchBrackets: 'always' as 'always' | 'near' | 'never',
    automaticLayout: true
  })
  
  const [appearanceSettings, setAppearanceSettings] = useState({
    colorTheme: 'vs-dark' as 'vs-dark' | 'vs' | 'hc-black' | 'hc-light',
    iconTheme: 'vs-seti' as string,
    activityBarVisible: true,
    statusBarVisible: true,
    sidebarVisible: true
  })
  
  const [modelSettings, setModelSettings] = useState({
    defaultModel: 'codellama',
    temperature: 0.3,
    maxTokens: 2048,
    autoApply: true
  })
  
  const [gitSettings, setGitSettings] = useState({
    useGit: false,
    gitRepoPath: '',
    gitRepoUrl: '',
    autoCommit: false
  })
  
  const [terminalSettings, setTerminalSettings] = useState({
    fontSize: 14,
    fontFamily: 'Consolas, "Courier New", monospace',
    cursorBlinking: true,
    cursorStyle: 'block' as 'block' | 'line' | 'underline',
    scrollback: 1000,
    copyOnSelection: false,
    rightClickBehavior: 'default' as 'default' | 'copyPaste' | 'selectWord' | 'paste',
    enableBell: false,
    shell: '',
    shellArgs: [] as string[],
    env: {} as Record<string, string>
  })
  
  const [fileSettings, setFileSettings] = useState({
    autoSave: 'afterDelay' as 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowChange',
    autoSaveDelay: 1000,
    filesExclude: {} as Record<string, boolean>,
    filesAssociations: {} as Record<string, string>,
    filesEncoding: 'utf8' as 'utf8' | 'utf8bom' | 'utf16le' | 'utf16be',
    eol: 'auto' as '\n' | '\r\n' | 'auto',
    trimTrailingWhitespace: true,
    insertFinalNewline: true,
    filesWatcherExclude: {} as Record<string, boolean>,
    hotExit: 'onExit' as 'off' | 'onExit' | 'onExitAndWindowClose',
    restoreWindows: 'all' as 'all' | 'folders' | 'one' | 'none'
  })
  
  const [searchSettings, setSearchSettings] = useState({
    searchOnType: true,
    searchOnTypeDebouncePeriod: 300,
    searchCaseSensitive: false,
    searchSmartCase: false,
    searchUseGlobalIgnoreFiles: true,
    searchUseIgnoreFiles: true,
    searchExclude: {} as Record<string, boolean>,
    searchShowLineNumbers: true,
    searchCollapseResults: 'auto' as 'alwaysCollapse' | 'alwaysExpand' | 'auto'
  })
  
  const [workspaceSettings, setWorkspaceSettings] = useState({
    foldersExclude: {} as Record<string, boolean>,
    filesExclude: {} as Record<string, boolean>,
    maxFileSize: 50 * 1024 * 1024,
    enablePreview: true,
    enableHotExit: true,
    restoreWindows: true
  })
  
  const [performanceSettings, setPerformanceSettings] = useState({
    maxTokenizationLineLength: 20000,
    maxComputationTime: 5000,
    maxFileSize: 50 * 1024 * 1024,
    largeFileOptimizations: true,
    editorLargeFileOptimizations: true
  })
  
  const [securitySettings, setSecuritySettings] = useState({
    telemetry: false,
    crashReports: false,
    allowLocalFileAccess: true,
    allowRemoteAccess: false,
    enableExperimentalFeatures: false
  })
  
  return {
    editorSettings, setEditorSettings,
    appearanceSettings, setAppearanceSettings,
    modelSettings, setModelSettings,
    gitSettings, setGitSettings,
    terminalSettings, setTerminalSettings,
    fileSettings, setFileSettings,
    searchSettings, setSearchSettings,
    workspaceSettings, setWorkspaceSettings,
    performanceSettings, setPerformanceSettings,
    securitySettings, setSecuritySettings,
  }
}
