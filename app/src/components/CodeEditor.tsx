import React, { useState, useEffect, useRef } from 'react'
import Editor, { loader } from '@monaco-editor/react'

// Configure Monaco Editor loader to ensure all languages are available
// This ensures syntax highlighting works for all supported languages
if (typeof window !== 'undefined') {
  // Monaco Editor automatically loads language support, but we ensure it's configured
  // The @monaco-editor/react package handles language loading automatically
}
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { llmApi, gpuApi, codeEditorApi } from '../services/api'
import type { GPU } from '../services/api'
import './CodeEditor.css'
import type { CodeEditorProps, FileNode, Project, AIMessage, ParsedAIResponse, FileOperation } from './CodeEditor/types'
import { AVAILABLE_THEMES, applyTheme } from './CodeEditor/themes'
import { detectLanguage, detectLanguageFromPath, getFileIcon, getFileIconUrl, findFileInArray, findFirstFile, getAllFiles, parseMessageContent, parseAIResponse, mergeAIResponses, shouldSkipFile, shouldSkipReadingFile, validateFileOperation, analyzeCodePatterns } from './CodeEditor/utils'
import { MenuBar } from './CodeEditor/components/MenuBar'
import { EditorHeader } from './CodeEditor/components/EditorHeader'
import { FileExplorer } from './CodeEditor/components/FileExplorer'
import { AIPanel } from './CodeEditor/components/AIPanel'
import { AutoAppPanel } from './CodeEditor/components/AutoAppPanel'
import { ProjectManagementPanel } from './CodeEditor/components/ProjectManagementPanel'
import { ProjectSettingsDialog } from './CodeEditor/components/ProjectSettingsDialog'
import { PaymentDialog } from './CodeEditor/components/PaymentDialog'
import { GitDialog } from './CodeEditor/components/GitDialog'
import { TerminalPanel } from './CodeEditor/components/TerminalPanel'
import { EditorTabs } from './CodeEditor/components/EditorTabs'
import { StatusBar } from './CodeEditor/components/StatusBar'
import { SettingsDialog } from './CodeEditor/components/SettingsDialog'
import { VenvManager } from './CodeEditor/components/VenvManager'
import { CommandPalette } from './CodeEditor/components/CommandPalette'
import type { Command } from './CodeEditor/components/CommandPalette'
import { FindInFiles } from './CodeEditor/components/FindInFiles'
import { GoToSymbol } from './CodeEditor/components/GoToSymbol'
import { ProblemsPanel } from './CodeEditor/components/ProblemsPanel'
import type { Problem } from './CodeEditor/components/ProblemsPanel'
import { SplitEditor } from './CodeEditor/components/SplitEditor'
import type { EditorPane, EditorPaneNode } from './CodeEditor/types'
import * as splitUtils from './CodeEditor/utils/splitEditorUtils'
import { useKeyboardShortcuts } from './CodeEditor/hooks/useKeyboardShortcuts'
import { useProjectOperations } from './CodeEditor/hooks/useProjectOperations'


export function CodeEditor({ onClose }: CodeEditorProps) {
  const [code, setCode] = useState('// Welcome to AI Code Editor\n// Start typing and use Ctrl+Space for AI assistance\n\nfunction hello() {\n  console.log("Hello, World!");\n}')
  const [language, setLanguage] = useState('javascript')
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [files, setFiles] = useState<FileNode[]>([])
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [openTabs, setOpenTabs] = useState<Array<{ path: string; name: string; content: string; modified: boolean; oldContent?: string }>>([])
  const [activeTab, setActiveTab] = useState<string>('')
  
  // Split editor state - using tree structure
  const [editorRoot, setEditorRoot] = useState<EditorPaneNode>({
    id: 'pane-1',
    activeTab: '',
    tabs: []
  })
  const [activePaneId, setActivePaneId] = useState<string>('pane-1')
  const [paneCode, setPaneCode] = useState<Map<string, string>>(new Map())
  const [paneLanguages, setPaneLanguages] = useState<Map<string, string>>(new Map())
  const [paneEditorRefs, setPaneEditorRefs] = useState<Map<string, React.RefObject<any>>>(new Map())
  const [paneMonacoRefs, setPaneMonacoRefs] = useState<Map<string, React.RefObject<any>>>(new Map())
  const [isAIAssisting, setIsAIAssisting] = useState(false)
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [aiStatus, setAiStatus] = useState<string>('')
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)
  const [gpus, setGpus] = useState<GPU[]>([])
  const [selectedGpu, setSelectedGpu] = useState<number | null>(null)
  const [theme, setTheme] = useState<string>('vs-dark')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]) // Expanded folders per project
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)
  const savedAgentIdRef = useRef<number | null>(null)
  const isSavingSettingsRef = useRef<boolean>(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  // Sidebar is always visible on editor page
  const isSidebarAlwaysVisible = true
  const [aiPanelVisible, setAiPanelVisible] = useState(false)
  const [aiPanelPosition, setAiPanelPosition] = useState<'left' | 'right'>('right')
  const [autoAppPanelVisible, setAutoAppPanelVisible] = useState(false)
  const [autoAppPanelPosition, setAutoAppPanelPosition] = useState<'left' | 'right'>('right')
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([])
  // Panel sizes for resizing
  const [sidebarWidth, setSidebarWidth] = useState(250)
  const [aiPanelWidth, setAiPanelWidth] = useState(400)
  const [autoAppPanelWidth, setAutoAppPanelWidth] = useState(400)
  const [terminalHeight, setTerminalHeight] = useState(300)
  const [isResizing, setIsResizing] = useState<{ type: 'sidebar' | 'ai-panel' | 'auto-app-panel' | 'terminal' | null; startPos: number; startSize: number }>({ type: null, startPos: 0, startSize: 0 })
  const [aiInput, setAiInput] = useState('')
  const [currentPromptGoal, setCurrentPromptGoal] = useState<string>('')
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false)
  const [showProjectManagement, setShowProjectManagement] = useState(false)
  const [showProjectSettings, setShowProjectSettings] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showGitDialog, setShowGitDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [showOpenFileDialog, setShowOpenFileDialog] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [showFindInFiles, setShowFindInFiles] = useState(false)
  const [showGoToSymbol, setShowGoToSymbol] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [terminalPanelTab, setTerminalPanelTab] = useState<'problems' | 'output' | 'debug' | 'terminal' | 'ports'>('terminal')
  const [isRunning, setIsRunning] = useState(false)
  const [terminals, setTerminals] = useState<Array<{ id: string; name: string; output: string[]; input: string }>>([
    { id: '1', name: 'Terminal', output: [], input: '' }
  ])
  const [activeTerminalId, setActiveTerminalId] = useState<string>('1')
  const [problems, setProblems] = useState<Problem[]>([])
  const [output, setOutput] = useState<string[]>([])
  const [debugOutput, setDebugOutput] = useState<string[]>([])
  const [ports, setPorts] = useState<Array<{ port: number; name: string; process?: string }>>([])
  const [editingFileName, setEditingFileName] = useState<{ path: string; parentPath: string } | null>(null)
  const [editingFileNameValue, setEditingFileNameValue] = useState('')
  const [editingFolderName, setEditingFolderName] = useState<{ path: string; parentPath: string } | null>(null)
  const [editingFolderNameValue, setEditingFolderNameValue] = useState('')
  const [renamingFile, setRenamingFile] = useState<{ path: string; name: string } | null>(null)
  const [renamingFileNameValue, setRenamingFileNameValue] = useState('')
  const [commandPaletteInput, setCommandPaletteInput] = useState('')
  const [agents, setAgents] = useState<any[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null) // Keep for backward compatibility
  const [selectedAgentIds, setSelectedAgentIds] = useState<number[]>([]) // Multiple agents for parallel execution
  const [queuedRequests, setQueuedRequests] = useState<any[]>([])
  const [activeAgentRequests, setActiveAgentRequests] = useState<Record<number, { status: string; agentName: string }>>({})
  const [messageActions, setMessageActions] = useState<Record<string, { accepted?: boolean; rejected?: boolean }>>({})
  const [showSettings, setShowSettings] = useState(false)
  
  // Listen for settings open event from menu
  useEffect(() => {
    const handleOpenSettings = () => {
      setShowSettings(true)
    }
    window.addEventListener('openSettings', handleOpenSettings)
    return () => {
      window.removeEventListener('openSettings', handleOpenSettings)
    }
  }, [])
  const [settingsTab, setSettingsTab] = useState<'model' | 'agents' | 'editor' | 'appearance' | 'git' | 'terminal' | 'files' | 'search' | 'workspace' | 'performance' | 'security' | 'keyboard'>('model')
  const [showVenvManager, setShowVenvManager] = useState(false)
  const [venvInfo, setVenvInfo] = useState<{ path: string; python_path: string } | null>(null)
  const [showExecuteDialog, setShowExecuteDialog] = useState(false)
  const [showAgentSelector, setShowAgentSelector] = useState(false)
  const [codebaseAnalysis, setCodebaseAnalysis] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisCacheStatus, setAnalysisCacheStatus] = useState<'none' | 'cached' | 'fresh'>('none')
  const [executeConfig, setExecuteConfig] = useState({
    file: '',
    arguments: '',
    workingDirectory: '',
    environment: 'local' as 'local' | 'gpu' | 'docker',
    interpreter: 'auto',
    timeout: 30
  })
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
    autoApply: true // Auto-apply file operations by default
  })
  const [gitSettings, setGitSettings] = useState({
    useGit: false,
    gitRepoPath: '',
    gitRepoUrl: '',
    autoCommit: false
  })
  
  // New settings categories
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
  
  const [localDirectory, setLocalDirectory] = useState('') // Local directory path
  const [useFileSystem, setUseFileSystem] = useState(true) // Use backend file system by default
  const [gitStatus, setGitStatus] = useState<{ is_git_repo: boolean; has_changes: boolean; status?: string[] } | null>(null)
  const [editingAgent, setEditingAgent] = useState<any>(null)
  const [showAgentDialog, setShowAgentDialog] = useState(false)
  const [newAgent, setNewAgent] = useState({
    name: '',
    agent_type: 'local' as 'local' | 'remote' | 'cloud' | 'client',
    description: '',
    gpu_id: null as number | null,
    host: '',
    port: 8080,
    endpoint: '',
    api_key: '',
    model: 'codellama',
    max_tokens: 2048,
    temperature: 0.3
  })
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; filePath: string; fileName: string; isFolder?: boolean } | null>(null)
  const [copiedFilePath, setCopiedFilePath] = useState<string | null>(null)
  const [cutFilePath, setCutFilePath] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // Use project operations hook for proper backend integration (must be called early, before useEffects)
  const {
    loadProjects: loadProjectsFromHook,
    saveProjects: saveProjectsFromHook,
    saveCurrentProject: saveCurrentProjectFromHook,
    createNewProject: createNewProjectFromHook,
    openProject: openProjectFromHook,
    deleteProject: deleteProjectFromHook,
    getProjectPath: getProjectPathFromHook,
    getRelativePath: getRelativePathFromHook,
  } = useProjectOperations({
    projects,
    setProjects,
    currentProjectId,
    setCurrentProjectId,
    files,
    setFiles,
    openTabs,
    setOpenTabs,
    newProjectName,
    setNewProjectName,
    newProjectDescription,
    setNewProjectDescription,
    showNewProjectDialog,
    setShowNewProjectDialog,
    showProjectSwitcher,
    setShowProjectSwitcher,
  })

  // Use hook functions (they use backend API with proper UUIDs)
  const loadProjects = loadProjectsFromHook
  const saveProjects = saveProjectsFromHook
  const saveCurrentProject = saveCurrentProjectFromHook
  const createNewProject = createNewProjectFromHook
  const openProject = openProjectFromHook
  const deleteProject = deleteProjectFromHook
  const getProjectPath = getProjectPathFromHook
  const getRelativePath = getRelativePathFromHook

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenu && contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null)
      }
    }
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu])

  useEffect(() => {
    loadGPUs()
    loadAgents()
    loadUserFromStorage()
    loadSettings()
    loadPanelSizes()
    // Apply initial theme
    applyTheme(theme)
    // Note: Window layout will be loaded in loadUserSettings after user is loaded
    // Projects will be loaded after user is loaded (see useEffect below)
  }, [])
  
  // Listen for storage changes (when user logs in/out in another component)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currentUser' || e.key === 'currentUserId') {
        loadUserFromStorage()
      }
    }
    
    // Also check periodically in case storage events don't fire (same window)
    const checkUserInterval = setInterval(() => {
      const storedUserId = localStorage.getItem('currentUserId')
      const storedUser = localStorage.getItem('currentUser')
      
      if (storedUserId && storedUserId !== currentUserId) {
        // User ID changed - reload
        loadUserFromStorage()
      } else if (!storedUserId && !storedUser && currentUserId) {
        // User logged out
        setCurrentUserId(null)
        setProjects([])
        setCurrentProjectId(null)
      } else if (storedUser && !currentUserId) {
        // User logged in but we don't have the ID yet
        loadUserFromStorage()
      }
    }, 1000)
    
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(checkUserInterval)
    }
  }, [currentUserId])
  
  // Load projects when user is loaded
  useEffect(() => {
    if (currentUserId) {
      loadProjects(currentUserId)
    } else {
      // Clear projects when logged out
      setProjects([])
      setCurrentProjectId(null)
    }
  }, [currentUserId, loadProjects])

  // Detect virtual environment when project or working directory changes
  useEffect(() => {
    const detectVenv = async () => {
      if (localDirectory) {
        try {
          const { codeEditorApi } = await import('../services/api')
          const response = await codeEditorApi.detectVenv(localDirectory)
          if (response.success && response.venv) {
            setVenvInfo({
              path: response.venv.path,
              python_path: response.venv.python_path
            })
          } else {
            setVenvInfo(null)
          }
        } catch (err) {
          console.warn('Failed to detect virtual environment:', err)
          setVenvInfo(null)
        }
      } else {
        setVenvInfo(null)
      }
    }
    detectVenv()
  }, [localDirectory, currentProjectId])

  // Load panel sizes from localStorage (fallback if no user settings)
  const loadPanelSizes = () => {
    try {
      const saved = localStorage.getItem('codeEditorPanelSizes')
      if (saved) {
        const sizes = JSON.parse(saved)
        if (sizes.sidebarWidth) setSidebarWidth(sizes.sidebarWidth)
        if (sizes.aiPanelWidth) setAiPanelWidth(sizes.aiPanelWidth)
        if (sizes.terminalHeight) setTerminalHeight(sizes.terminalHeight)
      }
    } catch (e) {
      console.error('Failed to load panel sizes:', e)
    }
  }

  // Save panel sizes to localStorage
  const savePanelSizes = () => {
    try {
      const sizes = {
        sidebarWidth,
        aiPanelWidth,
        terminalHeight
      }
      localStorage.setItem('codeEditorPanelSizes', JSON.stringify(sizes))
    } catch (e) {
      console.error('Failed to save panel sizes:', e)
    }
  }

  // Save sizes when they change
  useEffect(() => {
    savePanelSizes()
    // Also save to user settings if logged in (debounced)
    // Only save if we have a valid user ID (not an old integer ID that might not exist)
    if (currentUserId && currentUserId.trim().length > 0) {
      const timeoutId = setTimeout(() => {
        // Check again before saving (user might have logged out)
        if (currentUserId && !isSavingSettingsRef.current) {
          saveUserSettings().catch(() => {
            // Silently handle errors - user might not exist
          })
        }
      }, 2000) // Wait 2 seconds after size changes to save
      return () => clearTimeout(timeoutId)
    }
  }, [sidebarWidth, aiPanelWidth, terminalHeight, currentUserId])
  
  // Save window layout when panel visibility/position changes
  useEffect(() => {
    if (currentUserId && currentUserId.trim().length > 0) {
      // Debounce saves to avoid too many API calls
      const timeoutId = setTimeout(() => {
        if (currentUserId && !isSavingSettingsRef.current) {
          saveUserSettings().catch(() => {
            // Silently handle errors - user might not exist
          })
        }
      }, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [aiPanelPosition, sidebarCollapsed, aiPanelVisible, showTerminal, currentUserId])

  // Save selected agent when it changes
  useEffect(() => {
    if (currentUserId && currentUserId.trim().length > 0 && selectedAgentId !== null) {
      // Debounce saves to avoid too many API calls
      const timeoutId = setTimeout(() => {
        if (currentUserId && !isSavingSettingsRef.current) {
          saveUserSettings().catch(() => {
            // Silently handle errors - user might not exist
          })
        }
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [selectedAgentId, currentUserId])

  // Resize handlers
  const handleResizeStart = (type: 'sidebar' | 'ai-panel' | 'auto-app-panel' | 'terminal', e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startPos = type === 'terminal' ? e.clientY : e.clientX
    const startSize = type === 'sidebar' ? sidebarWidth : type === 'ai-panel' ? aiPanelWidth : type === 'auto-app-panel' ? autoAppPanelWidth : terminalHeight
    setIsResizing({ type, startPos, startSize })
    
    // Add class to body to prevent text selection
    if (type === 'terminal') {
      document.body.classList.add('resizing-horizontal')
    } else {
      document.body.classList.add('resizing-vertical')
    }
  }

  useEffect(() => {
    if (!isResizing.type) return

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing.type === 'sidebar') {
        const newWidth = isResizing.startSize + (e.clientX - isResizing.startPos)
        setSidebarWidth(Math.max(150, Math.min(600, newWidth)))
      } else if (isResizing.type === 'ai-panel') {
        const newWidth = isResizing.startSize + (isResizing.type === 'ai-panel' && aiPanelPosition === 'left' 
          ? (e.clientX - isResizing.startPos) 
          : (isResizing.startPos - e.clientX))
        setAiPanelWidth(Math.max(200, Math.min(800, newWidth)))
      } else if (isResizing.type === 'auto-app-panel') {
        const newWidth = isResizing.startSize + (isResizing.type === 'auto-app-panel' && autoAppPanelPosition === 'left' 
          ? (e.clientX - isResizing.startPos) 
          : (isResizing.startPos - e.clientX))
        setAutoAppPanelWidth(Math.max(200, Math.min(800, newWidth)))
      } else if (isResizing.type === 'terminal') {
        const newHeight = isResizing.startSize + (isResizing.startPos - e.clientY)
        setTerminalHeight(Math.max(100, Math.min(600, newHeight)))
      }
    }

    const handleMouseUp = () => {
      setIsResizing({ type: null, startPos: 0, startSize: 0 })
      // Remove resize classes from body
      document.body.classList.remove('resizing', 'resizing-vertical', 'resizing-horizontal')
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, aiPanelPosition, autoAppPanelPosition, sidebarWidth, aiPanelWidth, autoAppPanelWidth, terminalHeight])

  // Apply theme whenever it changes
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const loadUserFromStorage = async () => {
    try {
      // Try to get user ID from localStorage or session
      const storedUser = localStorage.getItem('currentUser')
      const storedUserId = localStorage.getItem('currentUserId')
      
      // First, try to use stored user ID if available
      if (storedUserId && storedUserId.trim().length > 0) {
        setCurrentUserId(storedUserId.trim())
        try {
          await loadUserSettings(storedUserId.trim())
        } catch (err: any) {
          // If user doesn't exist, try to reload from currentUser
          console.warn('Failed to load user settings, trying to reload from currentUser')
        }
      }
      
      // Also check currentUser object
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser)
          if (user && user.id) {
            const userId = String(user.id).trim()
            // Accept any non-empty user ID
            if (userId.length > 0) {
              setCurrentUserId(userId)
              localStorage.setItem('currentUserId', userId)
              try {
                await loadUserSettings(userId)
              } catch (err: any) {
                // If user doesn't exist, clear the invalid ID
                if (err.message && (err.message.includes('User not found') || err.message.includes('404') || err.message.includes('500'))) {
                  console.warn('User not found in database, clearing invalid user ID')
                  setCurrentUserId(null)
                  localStorage.removeItem('currentUserId')
                  localStorage.removeItem('currentUser')
                }
              }
            }
          }
        } catch (parseError) {
          console.error('Failed to parse currentUser from localStorage:', parseError)
        }
      }
    } catch (err) {
      console.error('Failed to load user:', err)
    }
  }

  const loadUserSettings = async (userId: string) => {
    // Accept any non-empty user ID - let the backend validate if user exists
    if (!userId || userId.trim().length === 0) {
      return
    }
    
    try {
      const { userApi } = await import('../services/api')
      const response = await userApi.getUserSettings(userId)
      if (response.success && response.settings) {
        const settings = response.settings
        // Apply theme
        if (settings.editor_theme) {
          const themeId = settings.editor_theme
          setTheme(themeId)
          setAppearanceSettings(prev => ({ ...prev, colorTheme: themeId as any }))
          applyTheme(themeId)
        }
        // Apply other editor settings
        if (settings.editor_font_size) {
          setEditorSettings(prev => ({ ...prev, fontSize: settings.editor_font_size }))
        }
        if (settings.editor_font_family) {
          setEditorSettings(prev => ({ ...prev, fontFamily: settings.editor_font_family }))
        }
        if (settings.editor_tab_size) {
          setEditorSettings(prev => ({ ...prev, tabSize: settings.editor_tab_size }))
        }
        if (settings.editor_word_wrap) {
          setEditorSettings(prev => ({ ...prev, wordWrap: settings.editor_word_wrap as any }))
        }
        if (settings.editor_minimap !== undefined) {
          setEditorSettings(prev => ({ ...prev, minimap: settings.editor_minimap }))
        }
        if (settings.editor_line_numbers) {
          setEditorSettings(prev => ({ ...prev, lineNumbers: settings.editor_line_numbers as any }))
        }
        // Apply AI settings
        if (settings.ai_default_model) {
          setModelSettings(prev => ({ ...prev, defaultModel: settings.ai_default_model }))
        }
        if (settings.ai_temperature !== undefined) {
          setModelSettings(prev => ({ ...prev, temperature: settings.ai_temperature }))
        }
        if (settings.ai_max_tokens) {
          setModelSettings(prev => ({ ...prev, maxTokens: settings.ai_max_tokens }))
        }
        if (settings.ai_auto_apply !== undefined) {
          setModelSettings(prev => ({ ...prev, autoApply: settings.ai_auto_apply ?? true }))
        }
        // Apply Git settings
        if (settings.git_use_git !== undefined) {
          setGitSettings(prev => ({ ...prev, useGit: settings.git_use_git }))
        }
        if (settings.git_repo_path) {
          setGitSettings(prev => ({ ...prev, gitRepoPath: settings.git_repo_path || '' }))
        }
        if (settings.git_repo_url) {
          setGitSettings(prev => ({ ...prev, gitRepoUrl: settings.git_repo_url || '' }))
        }
        if (settings.git_auto_commit !== undefined) {
          setGitSettings(prev => ({ ...prev, autoCommit: settings.git_auto_commit }))
        }
        // Apply file system settings
        if (settings.use_file_system !== undefined) {
          setUseFileSystem(settings.use_file_system)
        }
        // Store saved agent ID to apply after agents are loaded
        if (settings.selected_agent_id !== undefined && settings.selected_agent_id !== null) {
          savedAgentIdRef.current = settings.selected_agent_id
        }
        // Apply window layout (overrides localStorage panel sizes)
        if (settings.window_layout) {
          const layout = settings.window_layout
          if (layout.sidebarWidth !== undefined) {
            setSidebarWidth(layout.sidebarWidth)
          }
          if (layout.aiPanelWidth !== undefined) {
            setAiPanelWidth(layout.aiPanelWidth)
          }
          if (layout.terminalHeight !== undefined) {
            setTerminalHeight(layout.terminalHeight)
          }
          if (layout.aiPanelPosition) {
            setAiPanelPosition(layout.aiPanelPosition)
          }
          if (layout.sidebarCollapsed !== undefined) {
            setSidebarCollapsed(layout.sidebarCollapsed)
          }
          if (layout.aiPanelVisible !== undefined) {
            setAiPanelVisible(layout.aiPanelVisible)
          }
          if (layout.showTerminal !== undefined) {
            setShowTerminal(layout.showTerminal)
          }
          if (layout.openTabs && layout.openTabs.length > 0) {
            // Only restore tabs if we're using file system (tabs from backend)
            // Otherwise, tabs are project-specific and shouldn't be restored
            if (useFileSystem) {
              setOpenTabs(layout.openTabs)
              if (layout.activeTab) {
                setActiveTab(layout.activeTab)
                setSelectedFile(layout.activeTab)
                // Load content for active tab
                const activeTabData = layout.openTabs.find(tab => tab.path === layout.activeTab)
                if (activeTabData) {
                  setCode(activeTabData.content)
                  handleDetectLanguage(activeTabData.name)
                }
              }
            }
          }
        }
        
        // Load expanded folders from additional_settings
        if (settings.additional_settings && typeof settings.additional_settings === 'object') {
          const expandedFoldersByProject = settings.additional_settings.expanded_folders || {}
          const projectKey = currentProjectId || 'default'
          if (expandedFoldersByProject[projectKey]) {
            setExpandedFolders(expandedFoldersByProject[projectKey])
          } else {
            // Default to empty array (all folders collapsed) if no saved state
            setExpandedFolders([])
          }
        } else {
          // Default to empty array (all folders collapsed) if no additional_settings
          setExpandedFolders([])
        }
      }
    } catch (err: any) {
      // If user doesn't exist, clear invalid ID silently
      if (err.message && (err.message.includes('User not found') || err.message.includes('404') || err.message.includes('Failed to fetch'))) {
        setCurrentUserId(null)
        localStorage.removeItem('currentUserId')
        localStorage.removeItem('currentUser')
        // Don't log - this is expected when user doesn't exist
      } else {
        // Only log unexpected errors
        console.error('Failed to load user settings:', err)
      }
      // Fallback to localStorage
      loadSettings()
    }
  }

  // Load expanded folders when project changes
  useEffect(() => {
    // Load expanded folders if we have a user ID
    if (currentUserId && currentUserId.trim().length > 0) {
      const loadExpandedFolders = async () => {
        try {
          const { userApi } = await import('../services/api')
          const response = await userApi.getUserSettings(currentUserId)
          if (response.success && response.settings?.additional_settings) {
            const additionalSettings = typeof response.settings.additional_settings === 'string'
              ? JSON.parse(response.settings.additional_settings)
              : response.settings.additional_settings
            
            if (additionalSettings?.expanded_folders) {
              const projectKey = currentProjectId || 'default'
              if (additionalSettings.expanded_folders[projectKey]) {
                setExpandedFolders(additionalSettings.expanded_folders[projectKey])
              } else {
                // Default to empty array (all folders collapsed)
                setExpandedFolders([])
              }
            } else {
              // Default to empty array (all folders collapsed) if no expanded_folders setting
              setExpandedFolders([])
            }
          } else {
            // Default to empty array (all folders collapsed) if no settings
            setExpandedFolders([])
          }
        } catch (err) {
          console.warn('Failed to load expanded folders:', err)
          // Default to empty array on error (all folders collapsed)
          setExpandedFolders([])
        }
      }
      loadExpandedFolders()
    } else {
      // No user ID - default to empty array (all folders collapsed)
      setExpandedFolders([])
    }
  }, [currentUserId, currentProjectId])

  const saveUserSettings = async () => {
    // Try to get user ID from currentUser if not set
    let userId = currentUserId
    if (!userId) {
      try {
        const storedUser = localStorage.getItem('currentUser')
        if (storedUser) {
          const user = JSON.parse(storedUser)
          if (user && user.id) {
            userId = String(user.id)
            // Only use if it looks like a UUID
            if (userId.length > 10 || userId.includes('-')) {
              setCurrentUserId(userId)
            } else {
              userId = null
            }
          }
        }
      } catch (err) {
        console.error('Failed to get user ID:', err)
      }
    }
    
    // Accept any non-empty user ID - let the backend validate if user exists
    if (!userId || userId.trim().length === 0) {
      // Just skip - don't call saveSettings() to avoid infinite loop
      // Settings will be saved to localStorage by saveSettings() if needed
      return
    }

    // Prevent recursive calls
    if (isSavingSettingsRef.current) {
      return
    }

    isSavingSettingsRef.current = true

    try {
      const { userApi } = await import('../services/api')
      // Save window layout
      const windowLayout = {
        sidebarWidth,
        aiPanelWidth,
        terminalHeight,
        aiPanelPosition,
        sidebarCollapsed,
        aiPanelVisible,
        showTerminal,
        openTabs: openTabs.map(tab => ({
          path: tab.path,
          name: tab.name,
          content: tab.content,
          modified: tab.modified
        })),
        activeTab
      }
      
      // Get existing additional_settings to preserve other settings
      let additionalSettings: any = {}
      try {
        const currentSettings = await userApi.getUserSettings(userId)
        if (currentSettings.success && currentSettings.settings?.additional_settings) {
          if (typeof currentSettings.settings.additional_settings === 'string') {
            additionalSettings = JSON.parse(currentSettings.settings.additional_settings)
          } else {
            additionalSettings = currentSettings.settings.additional_settings
          }
        }
      } catch (err: any) {
        // If user doesn't exist or settings don't exist, that's okay - we'll create them
        // Silently continue with empty additionalSettings - don't log errors
        // The error will be handled when we try to save
      }
      
      // Update expanded folders for current project
      if (!additionalSettings.expanded_folders) {
        additionalSettings.expanded_folders = {}
      }
      const projectKey = currentProjectId || 'default'
      additionalSettings.expanded_folders[projectKey] = expandedFolders
      
      await userApi.updateUserSettings(userId, {
        editor_theme: appearanceSettings.colorTheme,
        editor_font_size: editorSettings.fontSize,
        editor_font_family: editorSettings.fontFamily,
        editor_tab_size: editorSettings.tabSize,
        editor_word_wrap: editorSettings.wordWrap,
        editor_minimap: editorSettings.minimap,
        editor_line_numbers: editorSettings.lineNumbers,
        ai_default_model: modelSettings.defaultModel,
        ai_temperature: modelSettings.temperature,
        ai_max_tokens: modelSettings.maxTokens,
        ai_auto_apply: modelSettings.autoApply,
        selected_agent_id: selectedAgentId, // Save selected agent
        git_use_git: gitSettings.useGit,
        git_repo_path: gitSettings.gitRepoPath,
        git_repo_url: gitSettings.gitRepoUrl,
        git_auto_commit: gitSettings.autoCommit,
        use_file_system: useFileSystem,
        window_layout: windowLayout,
        additional_settings: additionalSettings
      })
    } catch (err: any) {
      // If user doesn't exist, clear invalid user ID silently
      if (err.message && (err.message.includes('User not found') || err.message.includes('404') || err.message.includes('Failed to fetch') || err.message.includes('Failed to update'))) {
        // Clear invalid user ID - user needs to log in again
        setCurrentUserId(null)
        localStorage.removeItem('currentUserId')
        localStorage.removeItem('currentUser')
        // Don't log - this is expected when user doesn't exist
      } else {
        // Only log unexpected errors
        console.error('Failed to save user settings:', err)
      }
      // Don't call saveSettings() here to prevent infinite loop
      // Just continue silently
    } finally {
      isSavingSettingsRef.current = false
    }
  }

  const loadAgents = async () => {
    try {
      const { codeEditorApi } = await import('../services/api')
      const response = await codeEditorApi.getAgents()
      if (response && response.success) {
        setAgents(response.agents || [])
        // Don't set default agent here - let the useEffect handle it after checking for saved agent
      } else {
        // Backend not available or no agents - set empty array
        setAgents([])
      }
    } catch (err) {
      // Silently handle errors - backend might not be available
      // Only log if it's not a network error
      if (err instanceof Error && !err.message.includes('fetch') && !err.message.includes('Failed to fetch')) {
        console.warn('Failed to load agents:', err)
      }
      setAgents([]) // Set empty array on error
    }
  }

  // Apply saved agent after agents are loaded
  useEffect(() => {
    if (agents.length > 0 && !selectedAgentId) {
      // If we have a saved agent ID, try to apply it
      if (savedAgentIdRef.current !== null) {
        const savedAgentId = savedAgentIdRef.current
        // Verify the agent still exists
        const agentExists = agents.some(agent => agent.id === savedAgentId)
        if (agentExists) {
          setSelectedAgentId(savedAgentId)
          setSelectedAgentIds([savedAgentId])
          savedAgentIdRef.current = null // Clear after applying
        } else {
          // Agent no longer exists, clear the saved selection
          savedAgentIdRef.current = null
          // Set default to first agent if no user logged in
          if (!currentUserId) {
            setSelectedAgentId(agents[0].id)
            setSelectedAgentIds([agents[0].id])
          }
        }
      } else if (!currentUserId) {
        // If no user logged in and no saved agent, set default to first agent
        setSelectedAgentId(agents[0].id)
        setSelectedAgentIds([agents[0].id])
      }
    }
  }, [agents.length, selectedAgentId, currentUserId])

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('codeEditorSettings')
      if (saved) {
        const settings = JSON.parse(saved)
        if (settings.editor) setEditorSettings({ ...editorSettings, ...settings.editor })
        if (settings.model) setModelSettings({ ...modelSettings, ...settings.model })
        if (settings.appearance) {
          setAppearanceSettings({ ...appearanceSettings, ...settings.appearance })
          setTheme(settings.appearance.colorTheme || 'vs-dark')
        }
      }
    } catch (e) {
      console.error('Failed to load settings:', e)
    }
  }

  const saveSettings = () => {
    try {
      const settings = {
        editor: editorSettings,
        model: modelSettings,
        appearance: appearanceSettings
      }
      localStorage.setItem('codeEditorSettings', JSON.stringify(settings))
      // Apply theme
      const newTheme = appearanceSettings.colorTheme
      setTheme(newTheme)
      applyTheme(newTheme)
      // Save to backend if user is logged in and not already saving
      // Use setTimeout to break potential recursion and ensure isSavingSettingsRef is checked
      if (currentUserId && !isSavingSettingsRef.current) {
        setTimeout(() => {
          // Double-check we're not already saving before calling
          if (!isSavingSettingsRef.current && currentUserId) {
            saveUserSettings()
          }
        }, 0)
      }
      // Apply editor settings
      if (editorRef.current) {
        editorRef.current.updateOptions({
          fontSize: editorSettings.fontSize,
          tabSize: editorSettings.tabSize,
          wordWrap: editorSettings.wordWrap,
          minimap: { enabled: editorSettings.minimap },
          formatOnPaste: editorSettings.formatOnPaste,
          formatOnType: editorSettings.formatOnType,
          lineNumbers: editorSettings.lineNumbers,
          renderWhitespace: editorSettings.renderWhitespace,
          renderLineHighlight: editorSettings.renderLineHighlight,
          cursorBlinking: editorSettings.cursorBlinking,
          cursorSmoothCaretAnimation: editorSettings.cursorSmoothCaretAnimation,
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
          fontFamily: editorSettings.fontFamily,
          fontLigatures: editorSettings.fontLigatures,
          bracketPairColorization: { enabled: editorSettings.bracketPairColorization },
          guides: editorSettings.guides,
          autoIndent: editorSettings.autoIndent,
          detectIndentation: editorSettings.detectIndentation,
          trimAutoWhitespace: editorSettings.trimAutoWhitespace,
          scrollBeyondLastLine: editorSettings.scrollBeyondLastLine,
          renderIndentGuides: editorSettings.renderIndentGuides,
          highlightActiveIndentGuide: editorSettings.highlightActiveIndentGuide,
          links: editorSettings.links,
          colorDecorators: editorSettings.colorDecorators,
          folding: editorSettings.folding,
          foldingStrategy: editorSettings.foldingStrategy,
          showFoldingControls: editorSettings.showFoldingControls,
          unfoldOnClickAfterEndOfLine: editorSettings.unfoldOnClickAfterEndOfLine,
          matchBrackets: editorSettings.matchBrackets,
          automaticLayout: editorSettings.automaticLayout
        })
      }
    } catch (e) {
      console.error('Failed to save settings:', e)
    }
  }

  // Always load files from backend when project changes or useFileSystem changes
  useEffect(() => {
    if (useFileSystem && currentProjectId) {
      loadFilesFromBackend()
    } else if (!useFileSystem && currentProjectId) {
      // Only use projects if not using file system
      const project = projects.find(p => p.id === currentProjectId)
      if (project) {
        setFiles(project.files)
        // Close all tabs when switching projects
        setOpenTabs([])
        setActiveTab('')
        if (project.files.length > 0) {
          const firstFile = findFirstFile(project.files)
          if (firstFile) {
            setSelectedFile(firstFile.path)
          }
        }
      }
    }
  }, [currentProjectId, projects, useFileSystem])

  useEffect(() => {
    // Load selected file content only when selectedFile changes (not when files change)
    // This prevents flashing when files are reloaded from backend
    if (!selectedFile) return
    
    const file = findFile(selectedFile)
    if (file && file.content !== undefined) {
      // Only update if the file content actually changed or if it's a new selection
      const existingTab = openTabs.find(tab => tab.path === selectedFile)
      if (!existingTab || existingTab.content !== file.content) {
        setCode(file.content)
        handleDetectLanguage(selectedFile)
        
        // Add to open tabs if not already open
        if (!existingTab) {
          const fileName = selectedFile.split('/').pop() || selectedFile
          setOpenTabs(prev => [...prev, {
            path: selectedFile,
            name: fileName,
            content: file.content || '',
            modified: false
          }])
        }
        setActiveTab(selectedFile)
      } else if (existingTab) {
        // File is already in tabs, just switch to it
        setActiveTab(selectedFile)
      }
    } else if (useFileSystem && selectedFile) {
      // File not in tree, try to load from backend
      const loadFileFromBackend = async () => {
        const { codeEditorApi } = await import('../services/api')
        const fullPath = getProjectPath(selectedFile)
        const workingDir = localDirectory || undefined
        // Get current project ID (UUID) to use for project directory
        const currentProject = projects.find(p => p.id === currentProjectId)
        const projectId = currentProject?.id || undefined
        
        if (!projectId) {
          // Only warn if there's actually a file selected (user action)
          // Don't warn on initial mount when no file is selected yet
          if (selectedFile) {
            console.warn('No project selected, cannot load file')
          }
          return
        }
        
        try {
          const result = await codeEditorApi.readFile(fullPath, workingDir, projectId)
          if (result.success) {
            const fileName = selectedFile.split('/').pop() || selectedFile
            setCode(result.content)
            handleDetectLanguage(selectedFile)
            setOpenTabs(prev => {
              const existing = prev.find(tab => tab.path === selectedFile)
              if (!existing) {
                return [...prev, {
                  path: selectedFile,
                  name: fileName,
                  content: result.content,
                  modified: false
                }]
              }
              return prev
            })
            setActiveTab(selectedFile)
          }
        } catch (err) {
          console.error('Failed to load file from backend:', err)
        }
      }
      loadFileFromBackend()
    }
  }, [selectedFile]) // Removed 'files' dependency to prevent flashing

  useEffect(() => {
    // Update code when switching tabs
    if (activeTab) {
      const tab = openTabs.find(t => t.path === activeTab)
      if (tab) {
        // Only update if we're actually switching to a different tab
        // This prevents unnecessary updates when the same tab is already active
        if (selectedFile !== activeTab) {
          setCode(tab.content)
          handleDetectLanguage(activeTab)
          setSelectedFile(activeTab)
        } else {
          // Tab is already selected, just ensure code is up to date
          if (code !== tab.content) {
            setCode(tab.content)
          }
        }
      }
    }
    // Save window layout when tabs change (debounced)
    if (currentUserId) {
      const timeoutId = setTimeout(() => {
        saveUserSettings()
      }, 2000) // Wait 2 seconds after tab changes to save
      return () => clearTimeout(timeoutId)
    }
  }, [activeTab, openTabs, currentUserId]) // Removed selectedFile from dependencies to prevent loops

  // Update Monaco Editor language when activeTab changes
  useEffect(() => {
    if (editorRef.current && monacoRef.current && activeTab) {
      const model = editorRef.current.getModel()
      if (model) {
        const detectedLang = detectLanguage(activeTab)
        const currentLang = model.getLanguageId()
        
        // Always update language to ensure correct file type detection
        if (detectedLang !== currentLang) {
          // Clear ALL existing diagnostics/errors from previous language
          monacoRef.current.editor.setModelMarkers(model, 'default', [])
          monacoRef.current.editor.setModelMarkers(model, 'owner', [])
          
          // Set the new language - this is critical for proper error checking
          monacoRef.current.editor.setModelLanguage(model, detectedLang)
          setLanguage(detectedLang)
          
          // Force re-validation after language change
          setTimeout(() => {
            if (editorRef.current && monacoRef.current) {
              const updatedModel = editorRef.current.getModel()
              if (updatedModel) {
                // Trigger re-validation by getting markers (this forces Monaco to re-check)
                monacoRef.current.editor.getModelMarkers({ resource: updatedModel.uri })
              }
            }
          }, 100)
        } else if (detectedLang === currentLang && detectedLang !== language) {
          // Language matches model but state is out of sync - update state
          setLanguage(detectedLang)
        }
      }
    }
  }, [activeTab]) // Only depend on activeTab, not language to avoid loops

  const loadGPUs = async () => {
    try {
      const data = await gpuApi.getAvailableGPUs()
      setGpus(data)
      if (data.length > 0 && !selectedGpu) {
        setSelectedGpu(data[0].id)
      }
    } catch (err) {
      // Silently fail
    }
  }


  const findFile = (path: string): FileNode | null => {
    const findInTree = (nodes: FileNode[]): FileNode | null => {
      for (const node of nodes) {
        if (node.path === path) return node
        if (node.children) {
          const found = findInTree(node.children)
          if (found) return found
        }
      }
      return null
    }
    return findInTree(files)
  }


  const handleDetectLanguage = (filename: string) => {
    const detectedLang = detectLanguage(filename)
    setLanguage(detectedLang)
    
    // Update Monaco Editor model language if editor is already mounted
    if (editorRef.current && monacoRef.current) {
      const model = editorRef.current.getModel()
      if (model) {
        const currentLang = model.getLanguageId()
        // Always update to ensure correct language
        if (detectedLang !== currentLang) {
          // Clear ALL existing diagnostics/errors from previous language
          monacoRef.current.editor.setModelMarkers(model, 'default', [])
          monacoRef.current.editor.setModelMarkers(model, 'owner', [])
          
          // Set the new language
          monacoRef.current.editor.setModelLanguage(model, detectedLang)
          
          // Force re-validation
          setTimeout(() => {
            if (editorRef.current && monacoRef.current) {
              const updatedModel = editorRef.current.getModel()
              if (updatedModel) {
                monacoRef.current.editor.getModelMarkers({ resource: updatedModel.uri })
              }
            }
          }, 100)
        }
      }
    }
    
    // Auto-enable markdown preview for markdown files
    if (detectedLang === 'markdown') {
      setShowMarkdownPreview(true)
    } else {
      setShowMarkdownPreview(false)
    }
  }

  // Track registered files to avoid duplicates
  const registeredFilesRef = useRef<Set<string>>(new Set())
  
  // Normalize file path for Monaco - ensures consistent path format
  const normalizeFilePath = (path: string): string => {
    // Remove leading slash if present, then add it back for consistency
    let normalized = path.replace(/^\/+/, '')
    // Normalize path separators
    normalized = normalized.replace(/\\/g, '/')
    // Ensure it starts with /
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized
    }
    return normalized
  }
  
  // Register all project files with Monaco for import resolution
  const registerProjectFilesWithMonaco = (monaco: any, updateFile?: string) => {
    if (!monaco) return
    
    // Get all files in the project
    const allFiles = getAllFiles(files)
    
    // Filter for TypeScript/JavaScript files that Monaco can understand
    const codeFiles = allFiles.filter(file => {
      const ext = file.path.split('.').pop()?.toLowerCase() || ''
      return ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'd.ts', 'json'].includes(ext)
    })
    
    // If updating a specific file, only process that one
    const filesToProcess = updateFile 
      ? codeFiles.filter(f => f.path === updateFile)
      : codeFiles
    
    // Register each file with Monaco's TypeScript/JavaScript language service
    filesToProcess.forEach(file => {
      if (!file.content) return
      
      const normalizedPath = normalizeFilePath(file.path)
      const uri = monaco.Uri.parse(`file://${normalizedPath}`)
      const language = detectLanguage(file.path)
      
      // Check if model already exists
      const existingModel = monaco.editor.getModel(uri)
      if (existingModel) {
        // Update existing model if content changed
        if (existingModel.getValue() !== file.content) {
          existingModel.setValue(file.content)
        }
      } else {
        // Create new model
        monaco.editor.createModel(file.content, language, uri)
      }
      
      if (!registeredFilesRef.current.has(normalizedPath)) {
        registeredFilesRef.current.add(normalizedPath)
      }
    })
    
    // Always rebuild all extra libs to ensure consistency
    // Use normalized paths that match how imports are resolved
    const allExtraLibs = codeFiles
      .filter(f => {
        const lang = detectLanguage(f.path)
        return (lang === 'typescript' || lang === 'javascript') && f.content
      })
      .map(f => {
        const normalizedPath = normalizeFilePath(f.path)
        registeredFilesRef.current.add(normalizedPath)
        // Use file:// URI format for proper module resolution
        // This allows Monaco to resolve relative imports correctly
        return { 
          content: f.content!, 
          filePath: `file://${normalizedPath}` 
        }
      })
    
    // Add stub declarations for common node_modules packages to prevent import errors
    const commonDependencyStubs = [
      {
        content: `
          // Stub declarations for common dependencies
          declare namespace React {
            interface Component<P = {}, S = {}, SS = any> {}
            interface FunctionComponent<P = {}> {
              (props: P, context?: any): any;
            }
            type FC<P = {}> = FunctionComponent<P>;
            type ReactElement = any;
            type ReactNode = any;
            function createElement(type: any, props?: any, ...children: any[]): any;
            namespace JSX {
              interface IntrinsicElements {
                [elemName: string]: any;
              }
              interface Element extends ReactElement {}
            }
            const Fragment: any;
          }
          declare module 'react' {
            export = React;
            export as namespace React;
          }
          declare module 'react-dom' {
            export = any;
          }
          declare module 'react-dom/client' {
            export = any;
          }
          declare module '@monaco-editor/react' {
            export = any;
          }
          declare module 'vscode-icons-js' {
            export = any;
          }
          declare module '*.svg' {
            const content: string;
            export default content;
          }
          declare module '*.png' {
            const content: string;
            export default content;
          }
          declare module '*.jpg' {
            const content: string;
            export default content;
          }
          declare module '*.json' {
            const content: any;
            export default content;
          }
        `,
        filePath: 'file:///node_modules/@types/common.d.ts'
      }
    ]
    
    // Set all extra libs at once (project files + dependency stubs)
    monaco.languages.typescript.typescriptDefaults.setExtraLibs([...allExtraLibs, ...commonDependencyStubs])
    monaco.languages.typescript.javascriptDefaults.setExtraLibs([...allExtraLibs, ...commonDependencyStubs])
  }
  
  // Update Monaco when files change
  useEffect(() => {
    if (monacoRef.current && files.length > 0) {
      registerProjectFilesWithMonaco(monacoRef.current)
    }
  }, [files])

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor
    monacoRef.current = monaco
    
    // Register all project files for import resolution
    registerProjectFilesWithMonaco(monaco)
    
    // Configure TypeScript/JavaScript compiler options to reduce import errors
    // This makes Monaco Editor more lenient with imports and module resolution
    const configureTypeScriptOptions = () => {
      // Configure TypeScript compiler options
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.Latest,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        jsxFactory: 'React.createElement',
        jsxFragmentFactory: 'React.Fragment',
        reactNamespace: 'React',
        allowJs: true,
        typeRoots: ['node_modules/@types'],
        // Disable strict import checking to reduce false positives for dependencies
        skipLibCheck: true,
        // Allow importing from node_modules without type definitions
        noResolve: false,
        // More lenient checking for external modules
        allowUmdGlobalAccess: true,
        // Allow importing from node_modules and other common locations
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        // More lenient module resolution with project-aware paths
        // baseUrl allows relative imports to work correctly
        baseUrl: '/',
        paths: {
          '*': ['*', 'node_modules/*', 'src/*', 'lib/*', 'dist/*', 'app/*', 'components/*', 'utils/*', 'services/*']
        },
        // Enable resolution of .ts, .tsx, .js, .jsx files without extensions
        allowImportingTsExtensions: false
      })
      
      // Configure JavaScript compiler options
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.Latest,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        noEmit: true,
        allowJs: true,
        // Disable strict import checking for dependencies
        skipLibCheck: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        jsxFactory: 'React.createElement',
        jsxFragmentFactory: 'React.Fragment',
        // Allow importing from node_modules without type definitions
        noResolve: false,
        // More lenient checking for external modules
        allowUmdGlobalAccess: true,
        // More lenient module resolution with project-aware paths
        // baseUrl allows relative imports to work correctly
        baseUrl: '/',
        paths: {
          '*': ['*', 'node_modules/*', 'src/*', 'lib/*', 'dist/*', 'app/*', 'components/*', 'utils/*', 'services/*']
        }
      })
      
      // Configure diagnostics - ignore errors for dependencies, comments, JSX/HTML, and external modules
      monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false, // Keep semantic validation
        noSyntaxValidation: false, // Keep syntax validation (but ignore comment-related errors)
        noSuggestionDiagnostics: false, // Keep suggestions
        // Ignore diagnostics for dependencies, comments, JSX/HTML, and common issues
        diagnosticCodesToIgnore: [
          2307, // Cannot find module (for node_modules and external dependencies)
          2304, // Cannot find name (for global types)
          2580, // Cannot find name 'process' (Node.js global)
          2588, // Cannot find global type
          2552, // Cannot find name
          2339, // Property does not exist on type
          2345, // Argument of type is not assignable
          7006, // Parameter implicitly has an 'any' type (for external libs)
          7016, // Could not find a declaration file for module
          // JSX/HTML related errors - ignore to prevent false positives
          17004, // Cannot use JSX unless the '--jsx' flag is provided
          17005, // Expected corresponding JSX closing tag
          17006, // JSX element has no corresponding closing tag
          17007, // Expected JSX closing tag
          17008, // Unterminated JSX contents
          17009, // JSX expressions must have one parent element
          17010, // Expected '>' or '/>' to close JSX tag
          17011, // Expected corresponding closing tag for JSX fragment
          6133, // 'JSX' is declared but its value is never read
          6138, // Property 'className' does not exist on type
          2322, // Type 'X' is not assignable to type 'Y' (common in JSX props)
          // Comment and syntax-related errors - comments should never show as errors
          1005, // '{' expected (can be triggered by comments in some contexts)
          1003, // Identifier expected (can be triggered by comments)
          1015, // '{' or '[' expected (can be triggered by comments)
          1010, // Unexpected token (can be triggered by comments)
          1128, // Declaration or statement expected (can be triggered by comments)
        ]
      })
      
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
        noSuggestionDiagnostics: false,
        // Ignore diagnostics for dependencies, comments, JSX/HTML, and common issues
        diagnosticCodesToIgnore: [
          2307, // Cannot find module (for node_modules and external dependencies)
          2304, // Cannot find name (for global types)
          2580, // Cannot find name 'process' (Node.js global)
          2588, // Cannot find global type
          2552, // Cannot find name
          2339, // Property does not exist on type
          2345, // Argument of type is not assignable
          7006, // Parameter implicitly has an 'any' type (for external libs)
          7016, // Could not find a declaration file for module
          // JSX/HTML related errors - ignore to prevent false positives
          17004, // Cannot use JSX unless the '--jsx' flag is provided
          17005, // Expected corresponding JSX closing tag
          17006, // JSX element has no corresponding closing tag
          17007, // Expected JSX closing tag
          17008, // Unterminated JSX contents
          17009, // JSX expressions must have one parent element
          17010, // Expected '>' or '/>' to close JSX tag
          17011, // Expected corresponding closing tag for JSX fragment
          6133, // 'JSX' is declared but its value is never read
          6138, // Property 'className' does not exist on type
          2322, // Type 'X' is not assignable to type 'Y' (common in JSX props)
          // Comment and syntax-related errors - comments should never show as errors
          1005, // '{' expected (can be triggered by comments in some contexts)
          1003, // Identifier expected (can be triggered by comments)
          1015, // '{' or '[' expected (can be triggered by comments)
          1010, // Unexpected token (can be triggered by comments)
          1128, // Declaration or statement expected (can be triggered by comments)
        ]
      })
    }
    
    configureTypeScriptOptions()
    
    // Filter out errors that occur within comments
    const filterCommentMarkers = () => {
      if (!monacoRef.current || !editorRef.current) return
      
      const model = editorRef.current.getModel()
      if (!model) return
      
      // Get all markers for this model
      const allMarkers = monacoRef.current.editor.getModelMarkers({ resource: model.uri })
      
      // Filter out markers that are in comments
      const filteredMarkers = allMarkers.filter((marker: any) => {
        const lineNumber = marker.startLineNumber
        const column = marker.startColumn
        const lineContent = model.getLineContent(lineNumber)
        
        // Get text before the error position
        const beforeError = lineContent.substring(0, column - 1)
        const fullLine = lineContent
        
        // Check for single-line comments (//)
        const singleLineCommentIndex = fullLine.indexOf('//')
        if (singleLineCommentIndex !== -1 && singleLineCommentIndex < column - 1) {
          // Check if we're not inside a string
          const beforeComment = fullLine.substring(0, singleLineCommentIndex)
          const quoteCount = (beforeComment.match(/['"`]/g) || []).length
          // If even number of quotes, we're not in a string, so it's a comment
          if (quoteCount % 2 === 0) {
            return false // Filter out - it's in a comment
          }
        }
        
        // Check for multi-line comments (/* */)
        // Find the last /* before the error position
        let lastCommentStart = -1
        for (let i = 0; i < beforeError.length - 1; i++) {
          if (beforeError.substring(i, i + 2) === '/*') {
            // Check if it's not in a string
            const beforeStart = beforeError.substring(0, i)
            const quoteCount = (beforeStart.match(/['"`]/g) || []).length
            if (quoteCount % 2 === 0) {
              lastCommentStart = i
            }
          }
        }
        
        if (lastCommentStart !== -1) {
          // Check if the comment is closed after the error position
          const afterCommentStart = fullLine.substring(lastCommentStart + 2)
          const commentEndIndex = afterCommentStart.indexOf('*/')
          
          if (commentEndIndex === -1) {
            // Comment continues to end of line or beyond - check next lines
            let foundEnd = false
            for (let nextLine = lineNumber + 1; nextLine <= model.getLineCount(); nextLine++) {
              const nextLineContent = model.getLineContent(nextLine)
              const endIndex = nextLineContent.indexOf('*/')
              if (endIndex !== -1) {
                foundEnd = true
                // If error is before the comment end, filter it out
                if (nextLine === lineNumber && endIndex + lastCommentStart + 2 < column - 1) {
                  return false
                } else if (nextLine > lineNumber) {
                  return false // Error is in a multi-line comment
                }
                break
              }
            }
            if (!foundEnd) {
              return false // Comment never closes, filter out
            }
          } else {
            // Comment ends on same line
            const commentEndColumn = lastCommentStart + 2 + commentEndIndex + 2
            if (column - 1 < commentEndColumn) {
              return false // Error is inside the comment
            }
          }
        }
        
        return true // Keep the marker
      })
      
      // Update markers if any were filtered
      if (filteredMarkers.length !== allMarkers.length) {
        monacoRef.current.editor.setModelMarkers(model, 'default', filteredMarkers)
      }
    }
    
    // Set up marker filtering when markers change
    if (monacoRef.current && editorRef.current) {
      const model = editorRef.current.getModel()
      if (model) {
        // Filter markers initially
        setTimeout(filterCommentMarkers, 100)
        
        // Filter markers whenever they change
        const disposable = monacoRef.current.editor.onDidChangeMarkers((uris: any[]) => {
          if (uris.some((uri: any) => uri.toString() === model.uri.toString())) {
            setTimeout(filterCommentMarkers, 50)
          }
        })
        
        // Store disposable for cleanup
        if (!(window as any).__monacoMarkerDisposables) {
          (window as any).__monacoMarkerDisposables = []
        }
        (window as any).__monacoMarkerDisposables.push(disposable)
      }
    }
    
    // Register embedded HTML highlighting for HTML inside strings in other languages
    // This uses Monaco's decoration API to highlight HTML patterns in strings
    const registerEmbeddedHTMLHighlighting = () => {
      if (!editorRef.current || !monacoRef.current) return
      
      // Languages that should support embedded HTML highlighting
      const languagesWithHTML = ['javascript', 'typescript', 'python', 'json', 'jsonc', 'php', 'ruby', 'java', 'csharp', 'go', 'rust']
      
      let decorationIds: string[] = []
      
      const updateHTMLDecorations = () => {
        if (!editorRef.current || !monacoRef.current) return
        
        const model = editorRef.current.getModel()
        if (!model) return
        
        const langId = model.getLanguageId()
        if (!languagesWithHTML.includes(langId)) {
          // Clear decorations if language doesn't support HTML highlighting
          decorationIds = editorRef.current.deltaDecorations(decorationIds, [])
          return
        }
            
            const decorations: any[] = []
            const lines = model.getLinesContent()
            const htmlTagPattern = /<[A-Za-z][\w\-]*(?:\s+[A-Za-z\-]+(?:="[^"]*")?)*\s*\/?>/g
            
            lines.forEach((line: string, lineIndex: number) => {
              // Get tokens for this line to identify string regions
              try {
                const tokens = monacoRef.current.editor.tokenize(line, langId)[0]
                
                // Find string tokens and check for HTML inside them
                for (let i = 0; i < tokens.length; i += 2) {
                  const startOffset = tokens[i]
                  const tokenType = tokens[i + 1]
                  const endOffset = i + 2 < tokens.length ? tokens[i + 2] : line.length
                  
                  // Check if this is a string token (including template literals)
                  if (tokenType && (tokenType.includes('string') || tokenType.includes('quoted'))) {
                    const stringContent = line.substring(startOffset, endOffset)
                    
                    // Find HTML tags in the string and highlight different parts
                    let match
                    htmlTagPattern.lastIndex = 0
                    while ((match = htmlTagPattern.exec(stringContent)) !== null) {
                      const htmlTag = match[0]
                      const htmlStart = startOffset + match.index
                      
                      // Parse the HTML tag to highlight different parts
                      const tagMatch = htmlTag.match(/<(\/?)([A-Za-z][\w\-]*)/)
                      if (tagMatch) {
                        const tagNameStart = htmlStart + 1 + (tagMatch[1] ? 1 : 0)
                        const tagNameEnd = tagNameStart + tagMatch[2].length
                        
                        // Highlight opening/closing bracket
                        decorations.push({
                          range: new monacoRef.current.Range(lineIndex + 1, htmlStart + 1, lineIndex + 1, tagNameStart),
                          options: {
                            inlineClassName: 'monaco-html-delimiter',
                            hoverMessage: { value: 'HTML delimiter' }
                          }
                        })
                        
                        // Highlight tag name
                        decorations.push({
                          range: new monacoRef.current.Range(lineIndex + 1, tagNameStart + 1, lineIndex + 1, tagNameEnd + 1),
                          options: {
                            inlineClassName: 'monaco-html-tag',
                            hoverMessage: { value: `HTML tag: ${tagMatch[2]}` }
                          }
                        })
                        
                        // Highlight attributes
                        const attrPattern = /\s+([A-Za-z\-]+)(?:="([^"]*)")?/g
                        let attrMatch
                        let lastAttrEnd = tagNameEnd
                        
                        while ((attrMatch = attrPattern.exec(htmlTag)) !== null) {
                          const attrStart = htmlStart + attrMatch.index + 1
                          const attrNameEnd = attrStart + attrMatch[1].length
                          const equalsPos = htmlTag.indexOf('=', attrMatch.index)
                          
                          // Attribute name
                          decorations.push({
                            range: new monacoRef.current.Range(lineIndex + 1, attrStart + 1, lineIndex + 1, attrNameEnd + 1),
                            options: {
                              inlineClassName: 'monaco-html-attribute',
                              hoverMessage: { value: `HTML attribute: ${attrMatch[1]}` }
                            }
                          })
                          
                          // Attribute value if present
                          if (attrMatch[2] && equalsPos !== -1) {
                            const valueStart = htmlStart + equalsPos + 2
                            const valueEnd = valueStart + attrMatch[2].length
                            
                            decorations.push({
                              range: new monacoRef.current.Range(lineIndex + 1, htmlStart + equalsPos + 1, lineIndex + 1, htmlStart + equalsPos + 2),
                              options: { inlineClassName: 'monaco-html-delimiter' }
                            })
                            
                            decorations.push({
                              range: new monacoRef.current.Range(lineIndex + 1, valueStart + 1, lineIndex + 1, valueEnd + 1),
                              options: {
                                inlineClassName: 'monaco-html-attribute-value',
                                hoverMessage: { value: `Value: ${attrMatch[2]}` }
                              }
                            })
                            
                            decorations.push({
                              range: new monacoRef.current.Range(lineIndex + 1, valueEnd + 1, lineIndex + 1, valueEnd + 2),
                              options: { inlineClassName: 'monaco-html-delimiter' }
                            })
                          }
                          
                          lastAttrEnd = htmlStart + attrMatch.index + attrMatch[0].length
                        }
                        
                        // Highlight closing bracket
                        const closingBracketStart = htmlTag.endsWith('/>') ? htmlStart + htmlTag.length - 2 : htmlStart + htmlTag.length - 1
                        decorations.push({
                          range: new monacoRef.current.Range(lineIndex + 1, closingBracketStart + 1, lineIndex + 1, htmlStart + htmlTag.length + 1),
                          options: {
                            inlineClassName: 'monaco-html-delimiter',
                            hoverMessage: { value: 'HTML delimiter' }
                          }
                        })
                      } else {
                        // Fallback: highlight entire tag as HTML
                        decorations.push({
                          range: new monacoRef.current.Range(lineIndex + 1, htmlStart + 1, lineIndex + 1, htmlStart + htmlTag.length + 1),
                          options: {
                            inlineClassName: 'monaco-html-embedded',
                            hoverMessage: { value: 'HTML tag' }
                          }
                        })
                      }
                    }
                  }
                }
              } catch (e) {
                // Skip if tokenization fails
              }
            })
            
        // Update decorations
        decorationIds = editorRef.current.deltaDecorations(decorationIds, decorations)
      }
      
      // Set up content change listener
      const model = editorRef.current.getModel()
      if (model) {
        const disposable = model.onDidChangeContent(() => {
          // Debounce to avoid too many updates
          clearTimeout((updateHTMLDecorations as any).timeout)
          ;(updateHTMLDecorations as any).timeout = setTimeout(updateHTMLDecorations, 150)
        })
        
        // Also listen for language changes
        const languageDisposable = model.onDidChangeLanguage(() => {
          setTimeout(updateHTMLDecorations, 100)
        })
        
        // Initial update
        setTimeout(updateHTMLDecorations, 200)
        
        // Clean up on dispose
        model.onWillDispose(() => {
          disposable.dispose()
          languageDisposable.dispose()
        })
      }
    }
    
    // Store the update function so it can be called when language changes
    ;(editor as any).updateHTMLHighlighting = () => {
      registerEmbeddedHTMLHighlighting()
    }
    
    // Register after a short delay to ensure editor is fully initialized
    setTimeout(registerEmbeddedHTMLHighlighting, 500)
    
    // Ensure all languages are registered and configured for syntax highlighting
    // Monaco Editor comes with built-in support for many languages, but we ensure
    // they're all properly configured for syntax highlighting
    
    // Register file associations for better language detection
    // This helps Monaco automatically detect languages from file extensions
    const registerFileAssociations = () => {
      // Register common file extensions that might not be auto-detected
      // Monaco already knows about most, but we ensure they're all registered
      const fileAssociations: Array<{ extension: string; language: string }> = [
        { extension: 'tsx', language: 'typescript' },
        { extension: 'jsx', language: 'javascript' },
        { extension: 'mts', language: 'typescript' },
        { extension: 'cts', language: 'typescript' },
        { extension: 'vue', language: 'vue' },
        { extension: 'svelte', language: 'svelte' },
        { extension: 'dockerfile', language: 'dockerfile' },
        { extension: 'makefile', language: 'makefile' },
        { extension: 'cmake', language: 'cmake' },
        { extension: 'groovy', language: 'groovy' },
        { extension: 'gradle', language: 'groovy' },
        { extension: 'coffee', language: 'coffeescript' },
        { extension: 'styl', language: 'stylus' },
        { extension: 'stylus', language: 'stylus' },
        { extension: 'toml', language: 'toml' },
        { extension: 'yaml', language: 'yaml' },
        { extension: 'yml', language: 'yaml' },
        { extension: 'jsonc', language: 'jsonc' },
        { extension: 'powershell', language: 'powershell' },
        { extension: 'ps1', language: 'powershell' },
        { extension: 'bat', language: 'bat' },
        { extension: 'cmd', language: 'bat' },
        { extension: 'shellscript', language: 'shellscript' },
        { extension: 'sh', language: 'shellscript' },
        { extension: 'bash', language: 'shellscript' },
        { extension: 'zsh', language: 'shellscript' },
        { extension: 'fish', language: 'shellscript' },
      ]
      
      // Register file associations if Monaco supports it
      fileAssociations.forEach(({ extension, language }) => {
        try {
          // Monaco automatically handles most extensions, but we ensure they're registered
          if (monaco.languages.getLanguages().find((lang: any) => lang.id === language)) {
            // Language is already registered, which is good
          }
        } catch (e) {
          // Language might not be available, that's okay - Monaco will use plaintext
        }
      })
    }
    
    registerFileAssociations()
    
    // Update editor model language based on current file
    const updateEditorLanguage = () => {
      const model = editor.getModel()
      if (model && activeTab) {
        const detectedLang = detectLanguage(activeTab)
        const currentLang = model.getLanguageId()
        
        // Always ensure language is correct on mount
        if (detectedLang !== currentLang) {
          // Clear ALL existing diagnostics/errors from previous language
          monaco.editor.setModelMarkers(model, 'default', [])
          monaco.editor.setModelMarkers(model, 'owner', [])
          
          // Set the new language - this enables syntax highlighting
          monaco.editor.setModelLanguage(model, detectedLang)
          setLanguage(detectedLang)
          
          // Update HTML highlighting for the new language
          if ((editor as any).updateHTMLHighlighting) {
            setTimeout(() => (editor as any).updateHTMLHighlighting(), 100)
          }
        } else {
          // Ensure state is in sync
          setLanguage(detectedLang)
        }
      } else if (model && !activeTab) {
        // No file open, set to plaintext
        const currentLang = model.getLanguageId()
        if (currentLang !== 'plaintext') {
          monaco.editor.setModelLanguage(model, 'plaintext')
          setLanguage('plaintext')
        }
      }
    }
    
    // Update language immediately
    updateEditorLanguage()
    
    // Register AI completion provider for current language
    const registerCompletionProvider = (lang: string) => {
      monaco.languages.registerCompletionItemProvider(lang, {
      provideCompletionItems: async (model: any, position: any) => {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        })
        
        // Trigger AI assistance on Ctrl+Space or when typing
        return {
          suggestions: []
        }
      }
    })
    }
    
    registerCompletionProvider(language)

    // Add keyboard shortcut for AI assistance
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      requestAIAssistance(undefined, undefined, undefined, 'ask')
    })
    
    // Store update function for later use
    ;(editor as any).updateLanguage = updateEditorLanguage
  }

  // Helper function to get Monaco Editor diagnostics (errors/warnings)
  const getEditorDiagnostics = (): Array<{ severity: string; message: string; line: number; column: number; code?: string }> => {
    if (!monacoRef.current || !editorRef.current) return []
    
    try {
      const model = editorRef.current.getModel()
      if (!model) return []
      
      const markers = monacoRef.current.editor.getModelMarkers({ resource: model.uri })
      return markers.map((marker: any) => ({
        severity: marker.severity === monacoRef.current.MarkerSeverity.Error ? 'error' :
                  marker.severity === monacoRef.current.MarkerSeverity.Warning ? 'warning' :
                  marker.severity === monacoRef.current.MarkerSeverity.Info ? 'info' : 'hint',
        message: marker.message,
        line: marker.startLineNumber,
        column: marker.startColumn,
        code: marker.code?.toString()
      }))
    } catch (err) {
      console.warn('Failed to get editor diagnostics:', err)
      return []
    }
  }

  // Helper function to intelligently select related files based on imports
  const getRelatedFiles = (currentFilePath: string, codebaseContext: any[]): any[] => {
    const currentFile = codebaseContext.find(f => f.path === currentFilePath)
    if (!currentFile || !currentFile.content) return []
    
    const relatedFiles: Set<string> = new Set()
    const imports: string[] = []
    
    // Extract imports from current file
    const importPatterns = [
      /^import\s+.*?\s+from\s+['"](.+?)['"]/gm,  // ES6 imports
      /^import\s+['"](.+?)['"]/gm,                // ES6 default imports
      /^const\s+.*?=\s+require\(['"](.+?)['"]\)/gm,  // CommonJS
      /^from\s+['"](.+?)['"]\s+import/gm,         // Python imports
      /^import\s+(.+?)$/gm                         // Python simple imports
    ]
    
    for (const pattern of importPatterns) {
      const matches = currentFile.content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          imports.push(match[1])
        }
      }
    }
    
    // Find files that match imports
    for (const importPath of imports) {
      // Try to resolve import path to actual file
      const resolvedFiles = codebaseContext.filter(f => {
        const filePath = f.path.toLowerCase()
        const fileName = f.name.toLowerCase()
        const importLower = importPath.toLowerCase()
        
        // Check if import matches file path or name
        return filePath.includes(importLower.replace(/[./]/g, '/')) ||
               fileName === importLower.split('/').pop() ||
               fileName === importLower.split('.').pop() ||
               filePath.endsWith(importLower.replace(/\./g, '/') + '.py') ||
               filePath.endsWith(importLower.replace(/\./g, '/') + '.js') ||
               filePath.endsWith(importLower.replace(/\./g, '/') + '.ts')
      })
      
      resolvedFiles.forEach(f => relatedFiles.add(f.path))
    }
    
    // Also include files that import the current file
    const currentFileName = currentFile.name.replace(/\.[^.]+$/, '')
    codebaseContext.forEach(file => {
      if (file.path !== currentFilePath && file.content) {
        const content = file.content.toLowerCase()
        if (content.includes(currentFileName.toLowerCase()) || 
            content.includes(currentFile.path.toLowerCase())) {
          relatedFiles.add(file.path)
        }
      }
    })
    
    return Array.from(relatedFiles).map(path => codebaseContext.find(f => f.path === path)).filter(Boolean)
  }

  // Helper function to detect task type from prompt
  const detectTaskType = (prompt: string): 'refactor' | 'debug' | 'add-feature' | 'fix-errors' | 'document' | 'test' | 'general' => {
    const lowerPrompt = prompt.toLowerCase()
    
    if (lowerPrompt.includes('refactor') || lowerPrompt.includes('improve') || lowerPrompt.includes('optimize')) {
      return 'refactor'
    }
    if (lowerPrompt.includes('bug') || lowerPrompt.includes('error') || lowerPrompt.includes('fix') || lowerPrompt.includes('debug')) {
      return 'debug'
    }
    if (lowerPrompt.includes('add') || lowerPrompt.includes('create') || lowerPrompt.includes('implement') || lowerPrompt.includes('feature')) {
      return 'add-feature'
    }
    if (lowerPrompt.includes('document') || lowerPrompt.includes('comment') || lowerPrompt.includes('docstring')) {
      return 'document'
    }
    if (lowerPrompt.includes('test') || lowerPrompt.includes('unit test') || lowerPrompt.includes('spec')) {
      return 'test'
    }
    
    return 'general'
  }

  // Helper function to build task-specific prompt
  const buildTaskSpecificPrompt = (taskType: string, basePrompt: string, diagnostics: any[], currentFile: string, language: string): string => {
    let enhancedPrompt = basePrompt
    
    switch (taskType) {
      case 'fix-errors':
      case 'debug':
        if (diagnostics.length > 0) {
          const errors = diagnostics.filter(d => d.severity === 'error')
          const warnings = diagnostics.filter(d => d.severity === 'warning')
          
          enhancedPrompt = `${basePrompt}\n\nCURRENT ERRORS AND WARNINGS IN ${currentFile}:\n`
          if (errors.length > 0) {
            enhancedPrompt += `\nErrors:\n${errors.map(e => `  - Line ${e.line}, Column ${e.column}: ${e.message}${e.code ? ` (Code: ${e.code})` : ''}`).join('\n')}\n`
          }
          if (warnings.length > 0) {
            enhancedPrompt += `\nWarnings:\n${warnings.map(w => `  - Line ${w.line}, Column ${w.column}: ${w.message}${w.code ? ` (Code: ${w.code})` : ''}`).join('\n')}\n`
          }
          enhancedPrompt += `\nPlease fix all errors and address warnings. Ensure the code is syntactically correct and follows ${language} best practices.`
        }
        break
        
      case 'refactor':
        enhancedPrompt = `${basePrompt}\n\nPlease refactor the code to:\n- Improve readability and maintainability\n- Follow ${language} best practices and conventions\n- Optimize performance where possible\n- Maintain existing functionality\n- Add appropriate comments and documentation`
        break
        
      case 'add-feature':
        enhancedPrompt = `${basePrompt}\n\nWhen implementing this feature:\n- Follow the existing code style and patterns\n- Ensure compatibility with existing code\n- Add appropriate error handling\n- Include necessary imports and dependencies\n- Update related files if needed`
        break
        
      case 'document':
        enhancedPrompt = `${basePrompt}\n\nPlease add comprehensive documentation:\n- Function/class docstrings following ${language} conventions\n- Inline comments for complex logic\n- Type hints/annotations where applicable\n- Usage examples if helpful`
        break
        
      case 'test':
        enhancedPrompt = `${basePrompt}\n\nPlease create comprehensive tests:\n- Unit tests for individual functions/methods\n- Integration tests if applicable\n- Edge cases and error conditions\n- Use appropriate testing framework for ${language}`
        break
    }
    
    return enhancedPrompt
  }

  const requestAIAssistance = async (customPrompt?: string, images?: Array<{ dataUrl: string; type: string; name: string }>, referencedFiles?: Array<{ path: string; name: string }>, promptMode: 'agent' | 'plan' | 'debug' | 'ask' = 'ask') => {
    if (isAIAssisting || isAIThinking) return

    // Determine which agents to use
    const agentIdsToUse = selectedAgentIds.length > 0 
      ? selectedAgentIds 
      : selectedAgentId 
        ? [selectedAgentId]
        : []
    
    const useGpu = !agentIdsToUse.length && selectedGpu
    
    if (agentIdsToUse.length === 0 && !useGpu) {
      return
    }

    setIsAIThinking(true)
    setIsAIAssisting(false)
    setAiSuggestion(null)
    setAiStatus(agentIdsToUse.length > 1 ? `Running ${agentIdsToUse.length} agents in parallel...` : 'Analyzing code context...')
    setAiPanelVisible(true)
    setActiveAgentRequests({})

    // Get editor state - Cursor style
    const selection = editorRef.current?.getSelection()
    const selectedText = editorRef.current?.getModel()?.getValueInRange(selection) || ''
    const fullCode = editorRef.current?.getValue() || code
    const cursorLine = selection?.startLineNumber || 1
    const cursorColumn = selection?.startColumn || 1
    const currentFile = activeTab || selectedFile
    const fileName = currentFile.split('/').pop() || 'untitled'
    
    // Get Monaco Editor diagnostics (errors/warnings)
    const diagnostics = getEditorDiagnostics()
    
    // Get all open files for context
    const openFilesContext = openTabs.map(tab => ({
      path: tab.path,
      name: tab.name,
      content: tab.content,
      language: detectLanguageFromPath(tab.path)
    }))
    
    // Get design documents for the current project
    let designDocsContext: any[] = []
    try {
      const { designDocsApi } = await import('../services/api')
      const currentProject = projects.find(p => p.id === currentProjectId)
      const projectName = currentProject?.name
      
      if (projectName) {
        // Try to get design docs for this project
        try {
          const docsResponse = await Promise.race([
            designDocsApi.listDocs(projectName),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
          ]) as { success: boolean; docs: any[] }
          
          if (docsResponse.success && docsResponse.docs) {
            designDocsContext = docsResponse.docs.map((doc: any) => ({
              title: doc.title,
              content: doc.content,
              tags: doc.tags || []
            }))
          }
        } catch (err) {
          // Design docs not available, continue without them
          console.log('Design docs not available:', err)
        }
      }
    } catch (err) {
      // Design docs API not available, continue without them
      console.log('Design docs API not available:', err)
    }
    
    // Get codebase context (all files in project)
    // Build comprehensive codebase context from analysis if available
    let codebaseContext: any[] = []
    
    // Try to get comprehensive analysis summary with all files
    try {
      const { codeEditorApi } = await import('../services/api')
      const analysisSummary = await Promise.race([
        codeEditorApi.getAnalysisSummary(localDirectory, currentProjectId || undefined),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ]) as { success: boolean; summary: any }
      
      if (analysisSummary && analysisSummary.success && analysisSummary.summary && analysisSummary.summary.all_files) {
        // Use files from analysis with their content
        codebaseContext = analysisSummary.summary.all_files.map((file: any) => ({
          path: file.path,
          name: file.name,
          language: file.language,
          content: file.content || '',
          functions: file.functions || [],
          classes: file.classes || [],
          imports: file.imports || []
        }))
      } else {
        // Fallback to current files (no analysis exists yet or analysis failed)
        codebaseContext = getAllFiles(files).map(file => ({
          path: file.path,
          name: file.name,
          content: file.content || '',
          language: detectLanguageFromPath(file.path)
        }))
      }
    } catch (err: any) {
      // Silently handle errors (404, timeout, etc.) - fallback to current files
      // This is expected when no analysis has been run yet
      codebaseContext = getAllFiles(files).map(file => ({
        path: file.path,
        name: file.name,
        content: file.content || '',
        language: detectLanguageFromPath(file.path)
      }))
    }

    // Extract surrounding code and context for better suggestions
    const lines = fullCode.split('\n')
    const startLine = Math.max(0, cursorLine - 16)
    const endLine = Math.min(lines.length, cursorLine + 15)
    const surroundingCode = lines.slice(startLine, endLine).join('\n')
    
    // Detect current function/class context
    let currentContext: { type: 'function' | 'method' | 'class' | null; name: string; startLine: number } = { type: null, name: '', startLine: 0 }
    if (editorRef.current) {
      const model = editorRef.current.getModel()
      if (model) {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: cursorLine,
          endColumn: cursorColumn
        })
        
        // Try to find function/class definition before cursor
        const functionMatch = textUntilPosition.match(/(?:^|\n)\s*(?:def|async\s+def)\s+(\w+)\s*\(/gm)
        const classMatch = textUntilPosition.match(/(?:^|\n)\s*class\s+(\w+)/gm)
        
        if (functionMatch && functionMatch.length > 0) {
          const lastMatch = functionMatch[functionMatch.length - 1]
          const funcName = lastMatch.match(/(?:def|async\s+def)\s+(\w+)/)?.[1] || ''
          const funcLine = textUntilPosition.substring(0, textUntilPosition.lastIndexOf(lastMatch)).split('\n').length
          currentContext = { type: 'function', name: funcName, startLine: funcLine }
        } else if (classMatch && classMatch.length > 0) {
          const lastMatch = classMatch[classMatch.length - 1]
          const className = lastMatch.match(/class\s+(\w+)/)?.[1] || ''
          const classLine = textUntilPosition.substring(0, textUntilPosition.lastIndexOf(lastMatch)).split('\n').length
          currentContext = { type: 'class', name: className, startLine: classLine }
        }
      }
    }

    // Detect task type from prompt
    let basePrompt = ''
    if (customPrompt && customPrompt.trim()) {
      basePrompt = customPrompt.trim()
    } else if (selectedText) {
      // Code completion for selected text
      basePrompt = `Complete this code:\n\`\`\`${language}\n${selectedText}\n\`\`\`\n\nProvide only the completion code, no explanations.`
    } else {
      // Context-aware code suggestion based on cursor position
      const contextInfo = currentContext.type 
        ? `\nNote: You're currently inside ${currentContext.type === 'function' ? 'function' : currentContext.type === 'method' ? 'method' : 'class'} "${currentContext.name}" starting at line ${currentContext.startLine}.`
        : ''
      basePrompt = `Based on this code context, suggest the next few lines at cursor position (line ${cursorLine}, column ${cursorColumn}):\n\`\`\`${language}\n${surroundingCode}\n\`\`\`${contextInfo}\n\nProvide only the code suggestion that fits naturally at the cursor position, no explanations.`
    }
    
    const taskType = detectTaskType(basePrompt)
    const userPrompt = buildTaskSpecificPrompt(taskType, basePrompt, diagnostics, currentFile, language)
    
    // Extract prompt goal/heading (first line or first sentence, max 80 chars)
    const extractPromptGoal = (prompt: string): string => {
      if (!prompt) return ''
      // Try to extract first meaningful line or sentence
      const firstLine = prompt.split('\n')[0].trim()
      if (firstLine.length > 0 && firstLine.length <= 80) {
        return firstLine
      }
      // If first line is too long, take first sentence
      const firstSentence = prompt.split(/[.!?]\s/)[0].trim()
      if (firstSentence.length > 0 && firstSentence.length <= 80) {
        return firstSentence
      }
      // Otherwise, truncate first line
      return firstLine.substring(0, 77) + '...'
    }
    
    const promptGoal = extractPromptGoal(userPrompt)
    setCurrentPromptGoal(promptGoal)
    
    // Ensure prompt is not empty
    if (!userPrompt || !userPrompt.trim()) {
      setIsAIThinking(false)
      setIsAIAssisting(false)
      setAiStatus('')
      setCurrentPromptGoal('')
      return
    }

    // Get codebase analysis if available (non-blocking with timeout)
    let codebaseAnalysis: any = null
    let analysisSummary: any = null
    
    // Start codebase analysis in parallel (don't block on it)
    const analysisPromise = (async () => {
    try {
      const { codeEditorApi } = await import('../services/api')
      const workingDir = localDirectory || undefined
        
        // Use Promise.race to add timeout - analyze ALL files with content
        const analysisResponse = await Promise.race([
          codeEditorApi.analyzeCodebase(workingDir, undefined, true), // No file limit, include content
          new Promise((_, reject) => setTimeout(() => reject(new Error('Analysis timeout')), 10000)) // Longer timeout for full analysis
        ]) as any
        
        if (analysisResponse?.success) {
        codebaseAnalysis = analysisResponse.analysis
        }
        
        // Try to get summary with timeout
        try {
          const summaryResponse = await Promise.race([
            codeEditorApi.getAnalysisSummary(workingDir, currentProjectId || undefined),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Summary timeout')), 2000))
          ]) as any
          
          if (summaryResponse && summaryResponse.success && summaryResponse.summary) {
            analysisSummary = summaryResponse.summary
          }
        } catch (err) {
          // Silently fail summary - not critical (404 is expected if no analysis exists yet)
          console.log('Analysis summary not available (this is normal if analysis has not been run yet):', err)
        }
      } catch (err) {
        // Silently fail - analysis is optional
        console.warn('Codebase analysis skipped:', err)
      }
    })()
    
    // Load referenced files content if provided
    let referencedFilesContext: any[] = []
    if (referencedFiles && referencedFiles.length > 0) {
      try {
        const { codeEditorApi } = await import('../services/api')
        const workingDir = localDirectory || undefined
        
        // Load content for each referenced file
        const referencedFilesPromises = referencedFiles.map(async (refFile) => {
          try {
            // Try to find file in codebase context first
            let fileData = codebaseContext.find(f => f.path === refFile.path || f.name === refFile.name)
            
            if (!fileData) {
              // Try to read from API
              const readResult = await codeEditorApi.readFile(refFile.path, workingDir, currentProjectId || undefined)
              if (readResult.success && readResult.content !== undefined) {
                fileData = {
                  path: refFile.path,
                  name: refFile.name,
                  content: readResult.content,
                  language: detectLanguageFromPath(refFile.path)
                }
              }
            }
            
            return fileData
          } catch (err) {
            console.warn(`Failed to load referenced file ${refFile.path}:`, err)
            return null
          }
        })
        
        referencedFilesContext = (await Promise.all(referencedFilesPromises)).filter(Boolean) as any[]
      } catch (err) {
        console.warn('Failed to load referenced files:', err)
      }
    }
    
    // Intelligently select codebase context - prioritize referenced files, then related files
    let limitedCodebaseContext = codebaseContext
    if (analysisSummary && analysisSummary.all_files && analysisSummary.all_files.length > 0) {
      // Use all files from analysis (already includes content)
      const allFiles = analysisSummary.all_files.map((file: any) => ({
        path: file.path,
        name: file.name,
        content: file.content || '',
        language: file.language,
        functions: file.functions || [],
        classes: file.classes || [],
        imports: file.imports || []
      }))
      
      // Get related files based on imports
      const relatedFiles = getRelatedFiles(currentFile, allFiles)
      
      // Prioritize: referenced files, current file, related files, open files, then others
      const currentFileData = allFiles.find((f: any) => f.path === currentFile)
      const openFilesData = openFilesContext.map(openFile => 
        allFiles.find((f: any) => f.path === openFile.path)
      ).filter(Boolean)
      
      // Build prioritized context (max 30 files to avoid token limits)
      const prioritizedContext: any[] = []
      
      // 1. Referenced files (highest priority - user explicitly requested these)
      referencedFilesContext.forEach(refFile => {
        // Try to get full data from analysis if available
        const fullRefFile = allFiles.find((f: any) => f.path === refFile.path || f.name === refFile.name)
        if (fullRefFile && !prioritizedContext.find(p => p.path === fullRefFile.path)) {
          prioritizedContext.push(fullRefFile)
        } else if (refFile && !prioritizedContext.find(p => p.path === refFile.path)) {
          prioritizedContext.push(refFile)
        }
      })
      
      // 2. Current file (if exists and not already added)
      if (currentFileData && !prioritizedContext.find(p => p.path === currentFileData.path)) {
        prioritizedContext.push(currentFileData)
      }
      
      // 3. Related files (up to 10)
      relatedFiles.slice(0, 10).forEach(f => {
        if (f && !prioritizedContext.find(p => p.path === f.path)) {
          prioritizedContext.push(f)
        }
      })
      
      // 4. Open files (up to 5)
      openFilesData.slice(0, 5).forEach(f => {
        if (f && !prioritizedContext.find(p => p.path === f.path)) {
          prioritizedContext.push(f)
        }
      })
      
      // 5. Fill remaining slots with other files (up to 30 total)
      allFiles.forEach((f: any) => {
        if (prioritizedContext.length < 30 && !prioritizedContext.find((p: any) => p.path === f.path)) {
          prioritizedContext.push(f)
        }
      })
      
      limitedCodebaseContext = prioritizedContext
    } else {
      // Fallback: limit to 30 files, max 1000 lines per file for context
      // Still prioritize related files if possible
      const relatedFiles = getRelatedFiles(currentFile, codebaseContext)
      const prioritizedContext: any[] = []
      
      // 1. Add referenced files first (highest priority)
      referencedFilesContext.forEach(refFile => {
        const existingFile = codebaseContext.find(f => f.path === refFile.path || f.name === refFile.name)
        if (existingFile && !prioritizedContext.find(p => p.path === existingFile.path)) {
          prioritizedContext.push({
            ...existingFile,
            content: existingFile.content ? existingFile.content.split('\n').slice(0, 1000).join('\n') : ''
          })
        } else if (refFile && !prioritizedContext.find(p => p.path === refFile.path)) {
          prioritizedContext.push({
            ...refFile,
            content: refFile.content ? refFile.content.split('\n').slice(0, 1000).join('\n') : ''
          })
        }
      })
      
      // 2. Add current file
      const currentFileData = codebaseContext.find(f => f.path === currentFile)
      if (currentFileData && !prioritizedContext.find(p => p.path === currentFileData.path)) {
        prioritizedContext.push({
          ...currentFileData,
          content: currentFileData.content ? currentFileData.content.split('\n').slice(0, 1000).join('\n') : ''
        })
      }
      
      // 3. Add related files
      relatedFiles.slice(0, 10).forEach((f: any) => {
        if (f && !prioritizedContext.find((p: any) => p.path === f.path)) {
          prioritizedContext.push({
            ...f,
            content: f.content ? f.content.split('\n').slice(0, 1000).join('\n') : ''
          })
        }
      })
      
      // 4. Fill remaining slots
      codebaseContext.forEach(f => {
        if (prioritizedContext.length < 30 && !prioritizedContext.find(p => p.path === f.path)) {
          prioritizedContext.push({
            ...f,
            content: f.content ? f.content.split('\n').slice(0, 1000).join('\n') : ''
          })
        }
      })
      
      limitedCodebaseContext = prioritizedContext
    }
    
    setAiStatus('Preparing request...')

    // Wait for analysis to complete (with timeout) before building prompt - don't block too long
    try {
      await Promise.race([
        analysisPromise,
        new Promise(resolve => setTimeout(resolve, 2000)) // Max 2 seconds wait
      ])
    } catch (err) {
      // Analysis failed or timed out - continue without it
    }

    // Build enhanced system prompt with structured response instructions
    const diagnosticsInfo = diagnostics.length > 0 
      ? `\n\nCURRENT FILE DIAGNOSTICS (${currentFile}):
- ${diagnostics.filter(d => d.severity === 'error').length} error(s)
- ${diagnostics.filter(d => d.severity === 'warning').length} warning(s)
${diagnostics.filter(d => d.severity === 'error').length > 0 ? `\nErrors:\n${diagnostics.filter(d => d.severity === 'error').map(e => `  Line ${e.line}: ${e.message}${e.code ? ` (${e.code})` : ''}`).join('\n')}` : ''}
${diagnostics.filter(d => d.severity === 'warning').length > 0 ? `\nWarnings:\n${diagnostics.filter(d => d.severity === 'warning').map(w => `  Line ${w.line}: ${w.message}${w.code ? ` (${w.code})` : ''}`).join('\n')}` : ''}
\nPlease address these issues in your response.`
      : ''
    
    // Analyze code patterns for consistency
    const codePatterns = analyzeCodePatterns(limitedCodebaseContext, language)
    
    const indentInfo = codePatterns.indentation === 'spaces' ? ` (${codePatterns.indentSize} spaces)` : ''
    const codeStyleInfo = `\n\nCODE STYLE GUIDELINES (based on existing codebase patterns):
- Indentation: ${codePatterns.indentation}${indentInfo}
- Quote style: ${codePatterns.quoteStyle}
- Line endings: ${codePatterns.lineEnding}
- Naming convention: ${codePatterns.namingConvention}
- Max line length: ${codePatterns.maxLineLength} characters
\nIMPORTANT: Match the existing code style exactly. Use the same indentation, quotes, naming conventions, and formatting as the rest of the codebase.`
    
    // Build mode-specific system prompt (Cursor-style)
    let modeSpecificInstructions = ''
    switch (promptMode) {
      case 'agent':
        modeSpecificInstructions = `\n\nMODE: AGENT
You are an autonomous coding agent. Your role is to:
- Take action and make changes to the codebase proactively
- Implement features, fix bugs, and improve code quality
- Make decisions about code structure and implementation details
- Create and modify files as needed to accomplish the task
- Work independently with minimal guidance
- Provide clear explanations of what you're doing and why
Focus on execution and results. Be proactive in suggesting and implementing improvements.`
        break
      case 'plan':
        modeSpecificInstructions = `\n\nMODE: PLAN
You are a planning assistant. Your role is to:
- Create detailed, step-by-step plans for implementing features or changes
- Break down complex tasks into manageable steps
- Identify dependencies and prerequisites
- Suggest file structure and organization
- Provide implementation strategies and approaches
- Consider edge cases and potential issues
DO NOT implement the code yet - focus on creating a comprehensive plan. Use structured formats like numbered lists, stages, or phases.`
        break
      case 'debug':
        modeSpecificInstructions = `\n\nMODE: DEBUG
You are a debugging specialist. Your role is to:
- Analyze errors, bugs, and unexpected behavior
- Identify root causes of issues
- Examine error messages, stack traces, and diagnostics
- Trace through code execution paths
- Suggest fixes and explain why the issue occurred
- Help prevent similar issues in the future
Focus on understanding the problem first, then provide clear solutions. Include explanations of what went wrong and how to fix it.`
        break
      case 'ask':
      default:
        modeSpecificInstructions = `\n\nMODE: ASK
You are a helpful coding assistant. Your role is to:
- Answer questions about the codebase
- Explain code functionality and patterns
- Provide guidance and suggestions
- Help understand existing code
- Offer best practices and recommendations
Focus on being informative and educational. You can suggest changes but prioritize explanation over implementation.`
        break
    }
    
    const systemPrompt = `You are a helpful AI coding assistant with access to the codebase context.${modeSpecificInstructions}${diagnosticsInfo}${codeStyleInfo}

CRITICAL RULES:
1. ALWAYS update the actual files - your changes will be automatically applied to the codebase
2. ONLY modify code files (programming languages, config files, markdown, etc.) - do NOT modify binary files, images, or non-code files
3. When editing an existing file, provide the COMPLETE updated file content, not just the changes
4. You can create new files when needed for the task
5. Focus on the current file being edited unless the task requires multiple files
6. CRITICAL: Match code language to file extension - Python code ONLY goes in .py files, JavaScript ONLY in .js/.jsx files, TypeScript ONLY in .ts/.tsx files, etc.
   - Use the correct language tag in code blocks: \`\`\`python for .py files, \`\`\`javascript for .js files, etc.
   - Do NOT put Python code in .js files or JavaScript in .py files
   - Treat code files as code, not text files - respect the file type and language
7. CRITICAL: The "content" field in file operations MUST contain ONLY the actual code/content for the file. DO NOT include:
   - Your thinking process or reasoning
   - Channel tags or metadata (<|channel|>, <|constrain|>, etc.)
   - JSON structure or descriptions
   - Explanatory text
   - Only include the pure code/content that should be written to the file

CRITICAL: When creating or editing files, you MUST use one of these formats. DO NOT show code blocks without file paths.

Format 1 - Structured (preferred):
\`\`\`file_operations
{
  "operations": [
    {
      "type": "create|edit|delete",
      "path": "/path/to/file",
      "content": "ONLY THE ACTUAL CODE/CONTENT - NO THINKING, NO METADATA, NO EXPLANATIONS",
      "description": "what this change does"
    }
  ]
}
\`\`\`

CRITICAL CODE QUALITY RULES:
- All code MUST be syntactically correct and valid
- Python: Use correct main guard: if __name__ == '__main__': (with double underscores)
- JavaScript/TypeScript: Use correct syntax for all statements
- All code must be production-ready and follow best practices
- Test your code mentally before including it - ensure it would compile/run

Format 2 - Inline file operations:
For creating files:
\`\`\`create_file:/path/to/file.py
ONLY THE ACTUAL CODE - NO THINKING OR METADATA
\`\`\`

For editing files:
\`\`\`edit_file:/path/to/file.py
ONLY THE COMPLETE UPDATED FILE CONTENT - NO THINKING OR METADATA
\`\`\`

For deleting files:
\`\`\`delete_file:/path/to/file.py
\`\`\`

Format 3 - Code block with file path:
\`\`\`python:/path/to/file.py
ONLY THE ACTUAL CODE - NO THINKING, NO METADATA, NO EXPLANATIONS
\`\`\`

NEVER show code blocks like \`\`\`python\`\`\` without a file path when creating or editing files. Always include the file path in the format above.

When editing the current file (${currentFile}), make sure to include ALL the code, not just the new additions. Your changes will be written directly to the file.

${currentContext.type ? `\nCURRENT CODE CONTEXT:
- Cursor is in ${currentContext.type === 'function' ? 'function' : currentContext.type === 'method' ? 'method' : 'class'}: ${currentContext.name}
- Starting at line ${currentContext.startLine}
- This context helps you understand the scope and structure of the code you're working with` : ''}

${surroundingCode ? `\nSURROUNDING CODE (lines ${Math.max(1, cursorLine - 15)}-${Math.min(fullCode.split('\\n').length, cursorLine + 15)}):
\`\`\`${language}
${surroundingCode}
\`\`\`
This shows the code context around your cursor position. Use this to understand the current code structure and maintain consistency.` : ''}

${referencedFilesContext.length > 0 ? `\n\nREFERENCED FILES (User explicitly requested these files - HIGH PRIORITY):
The user has specifically referenced these files using @ mentions. Pay special attention to these files and use them as the primary context for your response.

${referencedFilesContext.map((file: any) => {
  const fullContent = file.content || ''
  return `\n---\nFile: ${file.path}
Language: ${file.language || detectLanguageFromPath(file.path)}
${file.functions && file.functions.length > 0 ? `Functions: ${file.functions.map((f: any) => f.name).join(', ')}` : ''}
${file.classes && file.classes.length > 0 ? `Classes: ${file.classes.map((c: any) => c.name).join(', ')}` : ''}
${file.imports && file.imports.length > 0 ? `Imports: ${file.imports.map((i: any) => i.module || i).join(', ')}` : ''}
Full Content:
\`\`\`${file.language || detectLanguageFromPath(file.path)}
${fullContent}
\`\`\`
`
}).join('\n---\n')}

IMPORTANT: These referenced files are the primary focus. When the user mentions these files or asks questions about them, use the full content provided above.` : ''}

IMPORTANT: The "content" field must be pure code only. Do not include your reasoning, thinking process, or any metadata in the content field.

${analysisSummary ? `Codebase Analysis (Full Codebase Context):
${analysisSummary.structure || ''}
${analysisSummary.languages ? `Languages: ${Object.entries(analysisSummary.languages).map(([lang, count]) => `${lang} (${count} files)`).join(', ')}` : ''}
Total Files: ${analysisSummary.file_count || 0}
Total Directories: ${analysisSummary.total_dirs || 0}

${analysisSummary.all_files && analysisSummary.all_files.length > 0 ? `\nCOMPLETE CODEBASE FILES (${analysisSummary.all_files.length} files with full content):\n` : ''}
${analysisSummary.all_files ? analysisSummary.all_files.map((file: any) => {
  const contentPreview = file.content ? (file.content.length > 500 ? file.content.substring(0, 500) + '...' : file.content) : '[No content]'
  return `\nFile: ${file.path}
Language: ${file.language || 'N/A'}
Functions: ${file.functions?.map((f: any) => f.name).join(', ') || 'None'}
Classes: ${file.classes?.map((c: any) => c.name).join(', ') || 'None'}
Imports: ${file.imports?.map((i: any) => i.module).join(', ') || 'None'}
Content:
\`\`\`${file.language || 'text'}
${contentPreview}
\`\`\`
`
}).join('\n---\n') : ''}

${analysisSummary.functions && analysisSummary.functions.length > 0 ? `\nAll Functions (${analysisSummary.functions.length}): ${analysisSummary.functions.slice(0, 50).map((f: any) => `${f.name}(${f.file.split('/').pop()}:${f.line})`).join(', ')}${analysisSummary.functions.length > 50 ? '...' : ''}` : ''}
${analysisSummary.classes && analysisSummary.classes.length > 0 ? `\nAll Classes (${analysisSummary.classes.length}): ${analysisSummary.classes.slice(0, 50).map((c: any) => `${c.name}(${c.file.split('/').pop()}:${c.line})`).join(', ')}${analysisSummary.classes.length > 50 ? '...' : ''}` : ''}
${analysisSummary.key_dependencies && analysisSummary.key_dependencies.length > 0 ? `\nDependencies: ${analysisSummary.key_dependencies.join(', ')}` : ''}
` : ''}

${designDocsContext.length > 0 ? `\n\nDESIGN DOCUMENTS (Project Requirements and Specifications):
The following design documents describe the project requirements, architecture, and specifications. Use these to guide your implementation and ensure code aligns with the design:

${designDocsContext.map((doc: any) => `\n---\nDocument: ${doc.title}
Tags: ${doc.tags.join(', ') || 'None'}
Content:
${doc.content}
`).join('\n---\n')}

IMPORTANT: When implementing features or making changes, refer to these design documents to ensure your code matches the intended design and requirements.` : ''}

Always explain what you're doing and organize your response clearly.

FORMATTING REQUIREMENTS:
- Use proper Markdown formatting for all responses:
  - Use headings (# ## ###) to organize sections
  - Use **bold** for emphasis and important terms
  - Use *italic* for subtle emphasis
  - Use \`inline code\` for code snippets, file names, and technical terms
  - Use code blocks (\`\`\`language) for multi-line code examples
  - Use bullet lists (- or *) or numbered lists (1. 2. 3.) for lists
  - Use > blockquotes for important notes or quotes
  - Use --- or *** for horizontal rules to separate major sections
  - Use [link text](url) for links
  - Use tables (| col1 | col2 |) for structured data
- Structure your response with clear sections using headings
- Use proper spacing between sections
- Make your response easy to read and scan

IMPORTANT: 
- When editing the current file (${currentFile}), provide the COMPLETE updated file content
- Only modify code files - do not edit binary files, images, or other non-code files
- Your changes will be automatically applied to the actual files in the codebase
- Focus on fixing and improving the code, adding necessary functionality
- Create new files only when they are needed for the task`

    // Build user message content - support images
    const userMessageContent: any[] = []
    
    // Add text content if present
    if (userPrompt) {
      userMessageContent.push({
        type: 'text',
        text: userPrompt
      })
    }
    
    // Add images if present
    if (images && images.length > 0) {
      images.forEach(img => {
        // Extract base64 data (remove data:image/...;base64, prefix)
        const base64Data = img.dataUrl.split(',')[1]
        userMessageContent.push({
          type: 'image_url',
          image_url: {
            url: img.dataUrl // Use full data URL for compatibility
          }
        })
      })
    }
    
    // Build Cursor-style request payload
    const requestPayload = {
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userMessageContent.length === 1 && userMessageContent[0].type === 'text' 
            ? userPrompt // Simple text format for backward compatibility
            : userMessageContent // Array format for multimodal (text + images)
        }
      ],
      context: {
        currentFile: {
          path: currentFile,
          name: fileName,
          content: fullCode,
          language: language,
          cursor: {
            line: cursorLine,
            column: cursorColumn
          },
          selection: selectedText ? {
            text: selectedText,
            startLine: selection?.startLineNumber,
            startColumn: selection?.startColumn,
            endLine: selection?.endLineNumber,
            endColumn: selection?.endColumn
          } : null,
          surroundingCode: surroundingCode, // Code around cursor for better context
          context: currentContext.type ? {
            type: currentContext.type,
            name: currentContext.name,
            startLine: currentContext.startLine
          } : null, // Current function/class context
          diagnostics: diagnostics.length > 0 ? {
            errors: diagnostics.filter(d => d.severity === 'error').length,
            warnings: diagnostics.filter(d => d.severity === 'warning').length,
            issues: diagnostics.map(d => ({
              severity: d.severity,
              message: d.message,
              line: d.line,
              column: d.column,
              code: d.code
            }))
          } : null
        },
        openFiles: openFilesContext,
        codebase: limitedCodebaseContext, // Limited to 10 files, 500 lines each to avoid token limits
        designDocs: designDocsContext, // Design documents for project requirements
        language: language
      },
      model: modelSettings.defaultModel,
      temperature: modelSettings.temperature,
      max_tokens: modelSettings.maxTokens
    }

    // Add user message to chat
    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userPrompt,
      timestamp: new Date(),
      images: images || undefined
    }
    setAiMessages(prev => [...prev, userMessage])

    // Add to queue
    const queueItem = {
      id: userMessage.id,
      prompt: userPrompt,
      status: 'pending',
      timestamp: new Date()
    }
    setQueuedRequests(prev => [...prev, queueItem])

    // Store userMessage.id for use in error handlers
    const userMessageId = userMessage.id

    try {
      // Update queue status
      setQueuedRequests(prev => prev.map(q => 
        q.id === userMessageId ? { ...q, status: 'processing' } : q
      ))

      // Handle multiple agents in parallel
      if (agentIdsToUse.length > 1) {
        setAiStatus(`Running ${agentIdsToUse.length} agents in parallel...`)
        setIsAIThinking(false)
        setIsAIAssisting(true)
        
        // Get agent names
        const agentNames = agentIdsToUse.map(id => {
          const agent = agents.find(a => a.id === id)
          return agent ? agent.name : `Agent ${id}`
        })
        
        // Initialize agent statuses
        const initialStatuses: Record<number, { status: string; agentName: string }> = {}
        agentIdsToUse.forEach((id, idx) => {
          initialStatuses[id] = { status: 'pending', agentName: agentNames[idx] }
        })
        setActiveAgentRequests(initialStatuses)
        
        // Execute all agents in parallel
        setAiStatus('Executing agents in parallel...')
        const agentPromises = agentIdsToUse.map((agentId, idx) => 
          executeSingleAgent(agentId, requestPayload, agentNames[idx])
        )
        
        const results = await Promise.all(agentPromises)
        const successfulResults = results.filter((r): r is { content: string; parsed: ParsedAIResponse; agentId: number; agentName: string } => r !== null)
        
        if (successfulResults.length === 0) {
          setIsAIAssisting(false)
          setAiStatus('')
          setCurrentPromptGoal('')
          setQueuedRequests(prev => prev.filter(q => q.id !== userMessageId))
          const errorMessage: AIMessage = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: '❌ All agents failed to generate a response. Please try again or check agent configurations.',
            timestamp: new Date()
          }
          setAiMessages(prev => [...prev, errorMessage])
          scrollToBottom()
          return
        }
        
        // Merge all responses
        setAiStatus('Merging responses from multiple agents...')
        const mergedResponse = mergeAIResponses(successfulResults)
        
        // Create merged message
        const mergedContent = successfulResults.length > 1
          ? `**Merged response from ${successfulResults.length} agents:**\n\n${mergedResponse.text}\n\n---\n\n*Contributions from: ${successfulResults.map(r => r.agentName).join(', ')}*`
          : mergedResponse.text
        
        const assistantMessage: AIMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: mergedContent,
          parsed: mergedResponse,
          timestamp: new Date()
        }
        setAiMessages(prev => [...prev, assistantMessage])
        setAiSuggestion(mergedResponse.text || mergedContent)
        
        // Auto-apply file operations if enabled
        if (modelSettings.autoApply && mergedResponse.hasOperations && mergedResponse.fileOperations.length > 0) {
          setAiStatus('Applying merged changes to files...')
          try {
            await applyFileOperations(mergedResponse.fileOperations)
            setAiStatus('Changes applied successfully!')
            await loadFilesFromBackend()
          } catch (err: any) {
            console.error('Failed to apply file operations:', err)
            setAiStatus('')
          }
        } else if (mergedResponse.hasOperations && mergedResponse.fileOperations.length > 0) {
          setAiStatus('File operations ready. Review and accept in the message below.')
        }
        
        setIsAIAssisting(false)
        setAiStatus('')
        setCurrentPromptGoal('')
        setQueuedRequests(prev => prev.filter(q => q.id !== userMessageId))
        setActiveAgentRequests({})
        scrollToBottom()
        return
      }
      
      // Single agent or GPU execution (original logic)
      setAiStatus('Sending request to agent...')
      let response: any
      let queryId: string | undefined
      const agentId = agentIdsToUse.length === 1 ? agentIdsToUse[0] : null
      
      if (agentId) {
        // Use agent - send Cursor-style payload
        const { codeEditorApi } = await import('../services/api')
        response = await codeEditorApi.executeWithAgent(agentId, requestPayload)
        
        // For remote/cloud agents, they might return the response directly
        if (response.response) {
          // Remote/cloud agents return the response directly, no polling needed
          setAiStatus('Processing response...')
          setIsAIThinking(false)
          setIsAIAssisting(true)
          
          // Create streaming message
          const streamingMessageId = (Date.now() + 1).toString()
          const streamingMessage: AIMessage = {
            id: streamingMessageId,
            role: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true
          }
          setAiMessages(prev => [...prev, streamingMessage])
          scrollToBottom()
          
          // Simulate streaming by displaying response character by character
          const responseContent = typeof response.response === 'string' 
            ? response.response 
            : response.response.content || JSON.stringify(response.response)
          
          // Stream the response
          const streamResponse = async () => {
            const chars = responseContent.split('')
            let currentContent = ''
            
            for (let i = 0; i < chars.length; i++) {
              currentContent += chars[i]
              setAiMessages(prev => prev.map(msg => 
                msg.id === streamingMessageId 
                  ? { ...msg, content: currentContent, isStreaming: true }
                  : msg
              ))
              scrollToBottom()
              
              // Small delay for streaming effect (optimized for speed - batch updates)
              if (i % 5 === 0) { // Update every 5 characters for better performance
                await new Promise(resolve => setTimeout(resolve, 1))
              }
            }
            
            // Finalize message
            const parsed = handleParseAIResponse(responseContent)
            
            // Show file operations being processed
            if (parsed.hasOperations && parsed.fileOperations.length > 0) {
              const fileOpsInfo = parsed.fileOperations.map(op => {
                const lineCount = op.content ? op.content.split('\n').length : 0
                return `${op.path.split('/').pop()} (${op.type}, ${lineCount} lines)`
              }).join(', ')
              setAiStatus(`Processing ${parsed.fileOperations.length} file operation(s): ${fileOpsInfo}`)
            }
            
            setAiStatus('Formatting results...')
            
            // Update message with final content
            setAiMessages(prev => prev.map(msg => 
              msg.id === streamingMessageId 
                ? { ...msg, content: responseContent, parsed: parsed, isStreaming: false }
                : msg
            ))
            setAiSuggestion(parsed.text || responseContent)
            
            // Auto-apply file operations if enabled
            if (modelSettings.autoApply && parsed.hasOperations && parsed.fileOperations.length > 0) {
              setAiStatus('Applying changes to files...')
              try {
                await applyFileOperations(parsed.fileOperations)
                setAiStatus('Changes applied successfully!')
                // Reload files to reflect changes
                await loadFilesFromBackend()
              } catch (err: any) {
                console.error('Failed to apply file operations:', err)
                setAiStatus('')
              }
            } else if (parsed.hasOperations && parsed.fileOperations.length > 0) {
              setAiStatus('File operations ready. Review and accept in the message below.')
            }
            
            setIsAIAssisting(false)
            setAiStatus('')
            setCurrentPromptGoal('')
            setQueuedRequests(prev => prev.filter(q => q.id !== userMessageId))
            scrollToBottom()
          }
          
          streamResponse()
          return
        }
        
        // Extract query_id from agent response - backend returns { success: true, query_id: "...", query: {...}, task: {...} }
        queryId = response.query_id || response.query?.query_id || (response.query?.id ? response.query.id.toString() : undefined)
      } else {
        // Use direct LLM API with Cursor-style payload
        setAiStatus('Creating query...')
        // Extract prompt from request payload for direct API
        const directPrompt = requestPayload.messages.find((m: any) => m.role === 'user')?.content || userPrompt
        response = await llmApi.createQuery(
          directPrompt,
          requestPayload.model || 'codellama',
          selectedGpu || undefined,
          requestPayload.max_tokens || 2048,
          requestPayload.temperature || 0.3
        )
        queryId = response.query_id || (response.id ? response.id.toString() : undefined)
      }

      if (!queryId) {
        console.error('Response:', response)
        setIsAIThinking(false)
        setIsAIAssisting(false)
        setAiStatus('')
        setCurrentPromptGoal('')
        setQueuedRequests(prev => prev.filter(q => q.id !== userMessageId))
        const errorMessage: AIMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `❌ Failed to get query ID from response. ${response.error ? `Error: ${response.error}` : `Response: ${JSON.stringify(response)}`}`,
          timestamp: new Date()
        }
        setAiMessages(prev => [...prev, errorMessage])
        scrollToBottom()
        return
      }
      
      console.log('Query created with ID:', queryId)

      // Transition from thinking to generating
      setIsAIThinking(false)
      setIsAIAssisting(true)
      setAiStatus('Waiting for response...')

      // Create streaming message immediately
      const streamingMessageId = (Date.now() + 1).toString()
      const streamingMessage: AIMessage = {
        id: streamingMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true
      }
      setAiMessages(prev => [...prev, streamingMessage])
      scrollToBottom()

      // Track previous response length for streaming
      let previousResponseLength = 0

      // Poll for response with timeout
      let pollAttempts = 0
      const maxAttempts = 120 // 2 minutes max (120 * 1 second)
      const statusMessages = [
        'Planning next moves...',
        'Analyzing code structure...',
        'Understanding context...',
        'Generating solution...',
        'Writing code...',
        'Reviewing changes...',
        'Finalizing response...'
      ]
      let statusIndex = 0
      
      const pollResponse = async () => {
        try {
          pollAttempts++
          
          // Update status message periodically
          if (pollAttempts % 3 === 0 && pollAttempts < maxAttempts) {
            statusIndex = (statusIndex + 1) % statusMessages.length
            setAiStatus(statusMessages[statusIndex])
          }
          
          // Check timeout
          if (pollAttempts > maxAttempts) {
            setIsAIThinking(false)
            setIsAIAssisting(false)
            setAiStatus('')
            setQueuedRequests(prev => prev.filter(q => q.id !== userMessageId))
            // Update streaming message with error
            setAiMessages(prev => prev.map(msg => 
              msg.id === streamingMessageId 
                ? { ...msg, content: '⚠️ Request timed out. The query is still processing, but no response was received within the timeout period. Please check if the GPU client is running and processing tasks.', isStreaming: false }
                : msg
            ))
            scrollToBottom()
            return
          }

          const query = await llmApi.getQuery(queryId!)

          // Check for partial response (streaming) - update even if status is 'running'
          if (query.response && query.response.length > previousResponseLength) {
            // Update streaming message with new content
            const newContent = query.response
            
            // Try to parse file operations incrementally during streaming
            // This allows us to show file operations as they're being generated
            let incrementalParsed: ParsedAIResponse | null = null
            try {
              // Only try to parse if we have enough content (at least 100 chars)
              if (newContent.length > 100) {
                incrementalParsed = parseAIResponse(newContent, findFile)
              }
            } catch (e) {
              // Parsing failed, continue with raw content
            }
            
            setAiMessages(prev => prev.map(msg => 
              msg.id === streamingMessageId 
                ? { 
                    ...msg, 
                    content: newContent, 
                    isStreaming: true,
                    parsed: incrementalParsed || msg.parsed // Update parsed data if available
                  }
                : msg
            ))
            previousResponseLength = query.response.length
            scrollToBottom()
            
            // Continue polling for more content even if status is 'running'
            if (query.status === 'running' || query.status === 'pending') {
              setTimeout(pollResponse, 200) // Poll more frequently during streaming (optimized)
              return
            }
          }

          if (query.status === 'completed' && query.response) {
            setAiStatus('Processing response...')
            const responseContent = query.response.trim()
            const parsed = handleParseAIResponse(responseContent)
            
            // Show file operations being processed
            if (parsed.hasOperations && parsed.fileOperations.length > 0) {
              const fileOpsInfo = parsed.fileOperations.map(op => {
                const lineCount = op.content ? op.content.split('\n').length : 0
                return `${op.path.split('/').pop()} (${op.type}, ${lineCount} lines)`
              }).join(', ')
              setAiStatus(`Processing ${parsed.fileOperations.length} file operation(s): ${fileOpsInfo}`)
            }
            
            setAiStatus('Formatting results...')
            
            // Update streaming message with final content and parsed data (stop streaming)
            setAiMessages(prev => prev.map(msg => 
              msg.id === streamingMessageId 
                ? { ...msg, content: responseContent, parsed: parsed, isStreaming: false }
                : msg
            ))
            
            // Only set suggestion if there's text content (not just file operations)
            if (parsed.text && parsed.text.trim()) {
              setAiSuggestion(parsed.text)
            } else {
              setAiSuggestion(null)
            }
            
            // Auto-apply file operations if they exist and auto-apply is enabled
            if (modelSettings.autoApply && parsed.hasOperations && parsed.fileOperations.length > 0) {
              setAiStatus('Applying changes to files...')
              try {
                await applyFileOperations(parsed.fileOperations)
                setAiStatus('Changes applied successfully!')
                // Reload files to reflect changes
                await loadFilesFromBackend()
              } catch (err: any) {
                console.error('Failed to apply file operations:', err)
                setAiStatus('')
              }
            }
            
            setIsAIAssisting(false)
            setAiStatus('')
            setCurrentPromptGoal('')
            
            // Remove from queue
            setQueuedRequests(prev => prev.filter(q => q.id !== userMessageId))
            
            scrollToBottom()
            return // Important: return here to prevent further polling
          } else if (query.status === 'failed' || query.status === 'error') {
            setIsAIThinking(false)
            setIsAIAssisting(false)
            setAiStatus('')
            setCurrentPromptGoal('')
            setQueuedRequests(prev => prev.filter(q => q.id !== userMessageId))
            // Update streaming message with error
            setAiMessages(prev => prev.map(msg => 
              msg.id === streamingMessageId 
                ? { ...msg, content: `❌ Query failed: Unknown error. Please check the GPU client and try again.`, isStreaming: false }
                : msg
            ))
            scrollToBottom()
          } else if (query.status === 'running' || query.status === 'pending') {
            // Update status based on query status
            if (query.status === 'running') {
              setAiStatus('Processing on GPU...')
            } else {
              setAiStatus('Queued for processing...')
            }
            // Continue polling (check for partial responses even when running)
            setTimeout(pollResponse, 500) // Poll more frequently for streaming
          } else {
            // Unknown status
            setIsAIThinking(false)
            setIsAIAssisting(false)
            setAiStatus('')
            setCurrentPromptGoal('')
            setQueuedRequests(prev => prev.filter(q => q.id !== userMessageId))
            // Update streaming message with error
            setAiMessages(prev => prev.map(msg => 
              msg.id === streamingMessageId 
                ? { ...msg, content: `⚠️ Query status: ${query.status}. No response received.`, isStreaming: false }
                : msg
            ))
            scrollToBottom()
          }
        } catch (err: any) {
          // If query not found after a few attempts, it might be a real error
          if (pollAttempts > 5 && err.message?.includes('404')) {
            setIsAIThinking(false)
            setIsAIAssisting(false)
            setAiStatus('')
            setCurrentPromptGoal('')
            setQueuedRequests(prev => prev.filter(q => q.id !== userMessageId))
            // Update streaming message with error
            setAiMessages(prev => prev.map(msg => 
              msg.id === streamingMessageId 
                ? { ...msg, content: `❌ Query not found. The query may have been deleted or the query ID is invalid.`, isStreaming: false }
                : msg
            ))
            scrollToBottom()
          } else if (pollAttempts < maxAttempts) {
            setAiStatus('Retrying...')
            // Retry on error (might be temporary network issue)
            setTimeout(pollResponse, 2000)
          } else {
            setIsAIThinking(false)
            setIsAIAssisting(false)
            setAiStatus('')
            setCurrentPromptGoal('')
            setQueuedRequests(prev => prev.filter(q => q.id !== userMessageId))
            // Update streaming message with error
            setAiMessages(prev => prev.map(msg => 
              msg.id === streamingMessageId 
                ? { ...msg, content: `❌ Error polling for response: ${err.message || 'Unknown error'}`, isStreaming: false }
                : msg
            ))
            scrollToBottom()
          }
        }
      }
      
      pollResponse()
    } catch (err: any) {
      setIsAIThinking(false)
      setIsAIAssisting(false)
      setAiStatus('')
      setCurrentPromptGoal('')
      setQueuedRequests(prev => prev.filter(q => q.id !== userMessageId))
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error: ${err.message || 'Unknown error'}. ${err.response?.data?.error ? `Backend error: ${err.response.data.error}` : ''}`,
        timestamp: new Date()
      }
      setAiMessages(prev => [...prev, errorMessage])
      scrollToBottom()
      console.error('AI assistance error:', err)
    }
  }

  const sendAIMessage = async () => {
    if (!aiInput.trim() || isAIAssisting || isAIThinking) return
    if (selectedAgentIds.length === 0 && !selectedAgentId && !selectedGpu) {
      return
    }
    await requestAIAssistance(aiInput, undefined, undefined, 'ask')
    setAiInput('')
  }

  const handleAcceptSuggestion = (messageId: string) => {
    applyAISuggestion()
    setMessageActions(prev => ({ ...prev, [messageId]: { accepted: true } }))
  }

  const handleRejectSuggestion = (messageId: string) => {
    setAiSuggestion(null)
    setMessageActions(prev => ({ ...prev, [messageId]: { rejected: true } }))
  }

  const handleCopySuggestion = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  const handleApplyToFile = (content: string) => {
    applyAISuggestion()
  }

  const scrollToBottom = () => {
    // Use requestAnimationFrame for better timing
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (messagesEndRef.current) {
          const messagesContainer = messagesEndRef.current.parentElement
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight
          } else {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' })
          }
        }
      }, 50)
    })
  }

  // Format inline markdown (bold, italic, links, code)
  const formatInlineMarkdown = (text: string): string => {
    if (!text) return ''
    
    // First, protect code blocks by replacing them with placeholders
    // Use a unique placeholder that won't conflict with markdown patterns
    const codePlaceholders: string[] = []
    let placeholderIndex = 0
    let formatted = text.replace(/`([^`]+)`/g, (match, code) => {
      const placeholder = `\u0001CODE_PLACEHOLDER_${placeholderIndex}\u0001`
      codePlaceholders[placeholderIndex] = code
      placeholderIndex++
      return placeholder
    })
    
    // Escape HTML (but preserve placeholders)
    formatted = formatted
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
      // Bold: **text** or __text__
    formatted = formatted
      .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(?!_)([^_]+?)(?<!_)__/g, '<strong>$1</strong>')
    
    // Italic: *text* or _text_ (but avoid conflicts with bold)
    formatted = formatted
      .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>')
      .replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>')
    
      // Links: [text](url)
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="ai-message-link">$1</a>')
    
    // Strikethrough: ~~text~~
    formatted = formatted.replace(/~~([^~]+?)~~/g, '<del>$1</del>')
    
    // Restore code blocks (HTML-escape the code content)
    codePlaceholders.forEach((code, index) => {
      // HTML-escape the code content
      const escapedCode = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      formatted = formatted.replace(
        `\u0001CODE_PLACEHOLDER_${index}\u0001`,
        `<code class="inline-code">${escapedCode}</code>`
      )
    })
    
    return formatted
  }

  useEffect(() => {
    // Scroll to bottom whenever messages change
    scrollToBottom()
  }, [aiMessages.length])

  // Close agent selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showAgentSelector && !target.closest('.agent-selector-wrapper')) {
        setShowAgentSelector(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAgentSelector])

  // Parse AI response to extract file operations
  const handleParseAIResponse = (content: string): ParsedAIResponse => {
    return parseAIResponse(content, findFile)
  }

  // Execute a single agent request and return the response
  const executeSingleAgent = async (
    agentId: number,
    requestPayload: any,
    agentName: string
  ): Promise<{ content: string; parsed: ParsedAIResponse; agentId: number; agentName: string } | null> => {
    try {
      // Update agent status
      setActiveAgentRequests(prev => ({ ...prev, [agentId]: { status: 'sending', agentName } }))
      
      const { codeEditorApi } = await import('../services/api')
      const response = await codeEditorApi.executeWithAgent(agentId, requestPayload)
      
      // For remote/cloud agents, they might return the response directly
      if (response && typeof response === 'object' && 'response' in response && response.response) {
        setActiveAgentRequests(prev => ({ ...prev, [agentId]: { status: 'completed', agentName } }))
        const responseData = response.response as any
        const responseContent = typeof responseData === 'string' 
          ? responseData 
          : (responseData.content || JSON.stringify(responseData))
        const parsed = handleParseAIResponse(responseContent)
        return { content: responseContent, parsed, agentId, agentName }
      }
      
      // Extract query_id for polling
      const queryId = response.query_id || response.query?.query_id || (response.query?.id ? response.query.id.toString() : undefined)
      if (!queryId) {
        setActiveAgentRequests(prev => ({ ...prev, [agentId]: { status: 'error', agentName } }))
        return null
      }
      
      setActiveAgentRequests(prev => ({ ...prev, [agentId]: { status: 'polling', agentName } }))
      
      // Poll for response
      let pollAttempts = 0
      const maxAttempts = 120
      
      const pollResponse = async (): Promise<{ content: string; parsed: ParsedAIResponse; agentId: number; agentName: string } | null> => {
        try {
          pollAttempts++
          
          if (pollAttempts > maxAttempts) {
            setActiveAgentRequests(prev => ({ ...prev, [agentId]: { status: 'timeout', agentName } }))
            return null
          }
          
          const query = await llmApi.getQuery(queryId)
          
          if (query.status === 'completed' && query.response) {
            setActiveAgentRequests(prev => ({ ...prev, [agentId]: { status: 'completed', agentName } }))
            const responseContent = query.response.trim()
            const parsed = handleParseAIResponse(responseContent)
            
            // Update status to show file operations
            if (parsed.hasOperations && parsed.fileOperations.length > 0) {
              const fileOpsInfo = parsed.fileOperations.map(op => {
                const lineCount = op.content ? op.content.split('\n').length : 0
                return `${op.path.split('/').pop()} (${lineCount} lines)`
              }).join(', ')
              setAiStatus(`Agent ${agentName}: Processed ${parsed.fileOperations.length} file(s) - ${fileOpsInfo}`)
            }
            
            return { content: responseContent, parsed, agentId, agentName }
          } else if (query.status === 'failed' || query.status === 'error') {
            setActiveAgentRequests(prev => ({ ...prev, [agentId]: { status: 'error', agentName } }))
            return null
          } else if (query.status === 'running' || query.status === 'pending') {
            // Continue polling
            await new Promise(resolve => setTimeout(resolve, 1000))
            return pollResponse()
          } else {
            setActiveAgentRequests(prev => ({ ...prev, [agentId]: { status: 'error', agentName } }))
            return null
          }
        } catch (err: any) {
          if (pollAttempts > 5 && err.message?.includes('404')) {
            setActiveAgentRequests(prev => ({ ...prev, [agentId]: { status: 'error', agentName } }))
            return null
          } else if (pollAttempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 2000))
            return pollResponse()
          } else {
            setActiveAgentRequests(prev => ({ ...prev, [agentId]: { status: 'error', agentName } }))
            return null
          }
        }
      }
      
      return pollResponse()
    } catch (err: any) {
      setActiveAgentRequests(prev => ({ ...prev, [agentId]: { status: 'error', agentName } }))
      console.error(`Agent ${agentId} error:`, err)
      return null
    }
  }


  // Apply file operations from AI response
  const applyFileOperations = async (operations: FileOperation[]) => {
    const { codeEditorApi } = await import('../services/api')
    const { isCodeFile, validateLanguageMatchesFile, detectLanguageFromPath } = await import('./CodeEditor/utils')
    const workingDir = localDirectory || undefined

    // Validate all operations before applying any
    const validationResults = operations.map(op => ({
      operation: op,
      validation: validateFileOperation(op, findFile)
    }))
    
    // Collect all warnings and errors
    const allWarnings: string[] = []
    const allErrors: string[] = []
    
    validationResults.forEach(({ operation, validation }) => {
      if (validation.errors.length > 0) {
        allErrors.push(`${operation.path}: ${validation.errors.join(', ')}`)
      }
      if (validation.warnings.length > 0) {
        allWarnings.push(`${operation.path}: ${validation.warnings.join(', ')}`)
      }
    })
    
    // Show summary of changes before applying
    const summary = {
      total: operations.length,
      creates: operations.filter(op => op.type === 'create').length,
      edits: operations.filter(op => op.type === 'edit').length,
      deletes: operations.filter(op => op.type === 'delete').length,
      totalLines: operations.reduce((sum, op) => sum + (op.content ? op.content.split('\n').length : 0), 0),
      errors: allErrors.length,
      warnings: allWarnings.length
    }
    
    // Show warnings and errors to user
    if (allErrors.length > 0) {
      console.error('File operation validation errors:', allErrors)
      setAiStatus(`⚠️ Validation errors: ${allErrors.length} operation(s) have errors. Check console for details.`)
      // Still continue with valid operations
    }
    if (allWarnings.length > 0) {
      // Validation warnings are informational - no need to log to console
      // console.warn('File operation validation warnings:', allWarnings)
    }
    
    // Show summary
    if (summary.total > 0) {
      const summaryMsg = `Applying ${summary.total} file operation(s): ${summary.creates} create, ${summary.edits} edit, ${summary.deletes} delete (${summary.totalLines} total lines)`
      setAiStatus(summaryMsg)
      // Summary already shown in UI via setAiStatus - no need to log to console
      // console.log('File operations summary:', summary)
    }

    for (const op of operations) {
      // Skip invalid operations
      const validation = validationResults.find(v => v.operation === op)?.validation
      if (validation && validation.errors.length > 0) {
        // Invalid operations are skipped silently - errors are already logged during validation
        // console.warn(`Skipping invalid operation: ${op.path}`, validation.errors)
        continue
      }
      
      // Automatically get oldContent for edit operations if missing
      if (op.type === 'edit' && !op.oldContent) {
        const existingFile = findFile(op.path)
        if (existingFile && existingFile.content !== undefined) {
          op.oldContent = existingFile.content
        } else {
          // Try to get from open tabs
          const existingTab = openTabs.find(tab => tab.path === op.path)
          if (existingTab) {
            op.oldContent = existingTab.content
          } else {
            // Try to read from backend
            try {
              const fullPath = getProjectPath(op.path)
              const fileContentResult = await codeEditorApi.readFile(fullPath, workingDir)
              op.oldContent = (fileContentResult && typeof fileContentResult === 'object' && 'content' in fileContentResult) 
                ? (fileContentResult as any).content || '' 
                : (typeof fileContentResult === 'string' ? fileContentResult : '')
            } catch (e) {
              op.oldContent = ''
            }
          }
        }
      }
      
      // Show file operation status
      const lineCount = op.content ? op.content.split('\n').length : 0
      setAiStatus(`${op.type === 'create' ? 'Creating' : op.type === 'edit' ? 'Updating' : 'Deleting'} ${op.path} (${lineCount} lines)`)
      try {
        // Only allow edits to code files (unless it's a create operation)
        if (op.type === 'edit' && !isCodeFile(op.path)) {
          console.warn(`Skipping edit to non-code file: ${op.path}`)
          continue
        }
        
        // Validate language matches file extension for code files
        if (op.type === 'create' || op.type === 'edit') {
          if (isCodeFile(op.path) && op.language) {
            const expectedLang = detectLanguageFromPath(op.path)
            
            // Skip validation for special markers like 'edit_file', 'create_file', 'delete_file'
            // These are not actual languages - use the detected language from file path instead
            if (['edit_file', 'create_file', 'delete_file'].includes(op.language.toLowerCase())) {
              // Fix the language to use the detected language from path
              op.language = expectedLang
            } else if (!validateLanguageMatchesFile(op.path, op.language)) {
              // Only warn for real mismatches, not special markers
              // console.warn(`Language mismatch: Code is ${op.language} but file ${op.path} expects ${expectedLang}. Skipping.`)
              // Don't skip - just use the expected language
              op.language = expectedLang
            }
          } else if (isCodeFile(op.path) && !op.language) {
            // If no language specified, detect it from path
            op.language = detectLanguageFromPath(op.path)
          }
        }
        
        if (op.type === 'create' || op.type === 'edit') {
          if (op.content !== undefined) {
            // Get full path with project name
            const fullPath = getProjectPath(op.path)
            // Get current project ID (UUID) to use for project directory
            const currentProject = projects.find(p => p.id === currentProjectId)
            const projectId = currentProject?.id || undefined
            await codeEditorApi.writeFile(fullPath, op.content, workingDir, projectId)
            
            // Always open newly created files in a tab, update existing tabs for edits
            const existingTab = openTabs.find(tab => tab.path === op.path)
            const fileName = op.path.split('/').pop() || op.path
            
            // Update file in tree (handle both updates and new files)
            setFiles(prev => {
              // First check if file exists
              const fileExists = (nodes: FileNode[]): boolean => {
                for (const node of nodes) {
                  if (node.path === op.path) return true
                  if (node.children && fileExists(node.children)) return true
                }
                return false
              }
              
              const updateFileInTree = (nodes: FileNode[]): FileNode[] => {
                return nodes.map(node => {
                  if (node.path === op.path) {
                    return { ...node, content: op.content || '' }
                  }
                  if (node.children) {
                    return { ...node, children: updateFileInTree(node.children) }
                  }
                  return node
                })
              }
              
              // If file doesn't exist and it's a create operation, we need to add it
              // But for now, just update existing files - new files will be added when files are reloaded
              const updated = updateFileInTree(prev)
              
              // After applying operations, reload files to ensure consistency
              // This will be done at the end of applyFileOperations
              return updated
            })
            
            // Check if file is open in any pane
            const allPanes = splitUtils.getAllPanes(editorRoot)
            const paneWithFile = allPanes.find(pane => pane.tabs.some(tab => tab.path === op.path))
            const targetPaneId = paneWithFile?.id || activePaneId
            
            if (!existingTab) {
              // New file - always open it in the active pane
              // Set oldContent to empty string for new files so all lines show as added (green)
              const newTab = {
                path: op.path,
                name: fileName,
                content: op.content || '',
                modified: false,
                oldContent: op.type === 'create' ? '' : (op.oldContent || '')
              }
              
              // Update pane code
              const newPaneCode = new Map(paneCode)
              newPaneCode.set(targetPaneId, op.content || '')
              setPaneCode(newPaneCode)
              
              // Update language
              const detectedLang = detectLanguage(op.path)
              const newPaneLanguages = new Map(paneLanguages)
              newPaneLanguages.set(targetPaneId, detectedLang)
              setPaneLanguages(newPaneLanguages)
              
              // Update editor root to add tab (check for duplicates)
              setEditorRoot(prev => splitUtils.updatePaneInTree(prev, targetPaneId, p => {
                // Check if tab already exists in this pane
                const existingTabIndex = p.tabs.findIndex(tab => tab.path === op.path)
                if (existingTabIndex >= 0) {
                  // Update existing tab
                  return {
                    ...p,
                    tabs: p.tabs.map((tab, idx) => idx === existingTabIndex ? newTab : tab),
                    activeTab: op.path
                  }
                }
                // Add new tab
                return {
                  ...p,
                  tabs: [...p.tabs, newTab],
                  activeTab: op.path
                }
              }))
              
              // Update global tabs with oldContent for diff highlighting (check for duplicates)
              setOpenTabs(prev => {
                // Remove any existing tabs with this path first, then add the new one
                const filtered = prev.filter(tab => tab.path !== op.path)
                return [...filtered, newTab]
              })
              
              // If it's a new file (create operation), make it the active tab
              if (op.type === 'create') {
                setActivePaneId(targetPaneId)
                setActiveTab(op.path)
                setSelectedFile(op.path)
                setCode(op.content || '')
                handleDetectLanguage(fileName)
              }
            } else {
              // Update existing tab in all panes that have it open
              // Store old content for diff visualization
              const oldContent = op.oldContent || existingTab.content || ''
              const newContent = op.content || ''
              
              setEditorRoot(prev => {
                const updatePanes = (node: EditorPaneNode): EditorPaneNode => {
                  if (splitUtils.isPane(node)) {
                    return {
                      ...node,
                      tabs: node.tabs.map(tab =>
                        tab.path === op.path
                          ? { ...tab, content: newContent, modified: false, oldContent: oldContent }
                          : tab
                      )
                    }
                  } else {
                    return {
                      ...node,
                      children: node.children.map(updatePanes)
                    }
                  }
                }
                return updatePanes(prev)
              })
              
              // Update global tabs
              setOpenTabs(prev => prev.map(tab =>
                tab.path === op.path
                  ? { ...tab, content: op.content || '', modified: false, oldContent: oldContent }
                  : tab
              ))
              
              // Update paneCode for all panes that have this file as active tab
              const newPaneCode = new Map(paneCode)
              const updatedPanes = splitUtils.getAllPanes(editorRoot)
              updatedPanes.forEach(pane => {
                if (pane.activeTab === op.path) {
                  newPaneCode.set(pane.id, op.content || '')
                  
                  // If this is the active pane, also update global state
                  if (pane.id === activePaneId) {
                    setCode(op.content || '')
                  }
                }
              })
              setPaneCode(newPaneCode)
              
              // If file is not open in any pane but was edited, open it in active pane
              if (!paneWithFile && op.type === 'edit') {
                const oldContent = op.oldContent || ''
                const newTab = {
                  path: op.path,
                  name: fileName,
                  content: op.content || '',
                  modified: false,
                  oldContent: oldContent
                }
                
                const newPaneCode2 = new Map(paneCode)
                newPaneCode2.set(activePaneId, op.content || '')
                setPaneCode(newPaneCode2)
                
                const detectedLang = detectLanguage(op.path)
                const newPaneLanguages = new Map(paneLanguages)
                newPaneLanguages.set(activePaneId, detectedLang)
                setPaneLanguages(newPaneLanguages)
                
                setEditorRoot(prev => splitUtils.updatePaneInTree(prev, activePaneId, p => {
                  // Check if tab already exists in this pane
                  const existingTabIndex = p.tabs.findIndex(tab => tab.path === op.path)
                  if (existingTabIndex >= 0) {
                    // Update existing tab
                    return {
                      ...p,
                      tabs: p.tabs.map((tab, idx) => idx === existingTabIndex ? newTab : tab),
                      activeTab: op.path
                    }
                  }
                  // Add new tab
                  return {
                    ...p,
                    tabs: [...p.tabs, newTab],
                    activeTab: op.path
                  }
                }))
                
                // Update global tabs (remove duplicates first)
                setOpenTabs(prev => {
                  // Remove any existing tabs with this path first, then add the new one
                  const filtered = prev.filter(tab => tab.path !== op.path)
                  return [...filtered, newTab]
                })
                
                setActiveTab(op.path)
                setSelectedFile(op.path)
                setCode(op.content || '')
              }
            }
          }
        } else if (op.type === 'delete') {
          // Get full path with project name
          const fullPath = getProjectPath(op.path)
          // Get current project ID (UUID) to use for project directory
          const currentProject = projects.find(p => p.id === currentProjectId)
          const projectId = currentProject?.id || undefined
          await codeEditorApi.deleteFile(fullPath, workingDir, projectId)
          
          // Close tab if open
          setOpenTabs(prev => prev.filter(tab => tab.path !== op.path))
          if (activeTab === op.path) {
            const remainingTabs = openTabs.filter(tab => tab.path !== op.path)
            if (remainingTabs.length > 0) {
              setActiveTab(remainingTabs[0].path)
              setSelectedFile(remainingTabs[0].path)
            } else {
              setActiveTab('')
              setSelectedFile('')
              setCode('')
            }
          }
        }
      } catch (err: any) {
        console.error(`Failed to apply ${op.type} operation for ${op.path}:`, err)
        console.error(`Failed to ${op.type} file ${op.path}: ${err.message}`)
      }
    }

    // Reload files from backend
    setAiStatus('Reloading files from backend...')
    await loadFilesFromBackend()
    setAiStatus('Files reloaded successfully')
  }

  const applyAISuggestion = () => {
    if (!aiSuggestion || !editorRef.current) return

    const selection = editorRef.current.getSelection()
    const model = editorRef.current.getModel()
    
    if (selection && !selection.isEmpty()) {
      // Replace selected text
      model.pushEditOperations(
        [],
        [{
          range: selection,
          text: aiSuggestion
        }],
        () => null
      )
    } else {
      // Insert at cursor
      const position = editorRef.current.getPosition()
      model.pushEditOperations(
        [],
        [{
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column
          },
          text: aiSuggestion
        }],
        () => null
      )
    }
    
    setAiSuggestion(null)
  }

  const handleCodeChange = (value: string | undefined) => {
    if (value !== undefined) {
      setCode(value)
      
      // Update active tab content
      if (activeTab) {
        setOpenTabs(prev => prev.map(tab => 
          tab.path === activeTab 
            ? { ...tab, content: value, modified: true }
            : tab
        ))
      }
      
      // Update file content
      const file = findFile(activeTab || selectedFile)
      if (file) {
        file.content = value
        // Auto-save project after a delay
        setTimeout(() => {
          saveCurrentProject()
          // Mark tab as saved after saving
          if (activeTab) {
            setOpenTabs(prev => prev.map(tab => 
              tab.path === activeTab 
                ? { ...tab, modified: false }
                : tab
            ))
          }
          // Save window layout (including updated tab content) to user settings
          if (currentUserId && currentUserId.trim().length > 0 && !isSavingSettingsRef.current) {
            saveUserSettings().catch(() => {
              // Silently handle errors - user might not exist
            })
          }
        }, 1000)
      }
    }
  }

  const handleFileSelect = (path: string) => {
    // Use pane-aware file selection
    handleFileSelectWithPane(path)
  }
  
  // Sync global state with active pane when active pane changes
  useEffect(() => {
    const activePane = splitUtils.findPaneInTree(editorRoot, activePaneId)
    if (activePane) {
      // Update global activeTab and selectedFile to match active pane
      if (activePane.activeTab && activePane.activeTab !== activeTab) {
        setActiveTab(activePane.activeTab)
        setSelectedFile(activePane.activeTab)
        
        // Update language for active pane
        const paneLang = getPaneLanguage(activePaneId)
        if (paneLang) {
          setLanguage(paneLang)
        }
      }
    }
  }, [activePaneId])

  const handleTabClick = (path: string) => {
    setActiveTab(path)
    setSelectedFile(path)
  }

  const handleTabClose = (e: React.MouseEvent, path: string) => {
    e.stopPropagation()
    e.preventDefault()
    
    // Remove ALL tabs with this path (handle duplicates)
    const newTabs = openTabs.filter(t => t.path !== path)
    setOpenTabs(newTabs)
    
    // Also remove from all panes
    setEditorRoot(prev => {
      const allPanes = splitUtils.getAllPanes(prev)
      let updated = prev
      allPanes.forEach(pane => {
        updated = splitUtils.updatePaneInTree(updated, pane.id, p => {
          const filteredTabs = p.tabs.filter(t => t.path !== path)
          const newActiveTab = filteredTabs.length > 0 && p.activeTab === path
            ? filteredTabs[filteredTabs.length - 1].path
            : (p.activeTab === path ? '' : p.activeTab)
          return { ...p, tabs: filteredTabs, activeTab: newActiveTab }
        })
      })
      return updated
    })
    
    // If closing active tab, switch to another tab or clear
    if (activeTab === path) {
      if (newTabs.length > 0) {
        const lastTab = newTabs[newTabs.length - 1]
        setActiveTab(lastTab.path)
        setSelectedFile(lastTab.path)
      } else {
        setActiveTab('')
        setSelectedFile('')
        setCode('')
      }
    }
  }

  const closeAllTabs = () => {
    // Close tabs in all panes
    setEditorRoot(prev => {
      const allPanes = splitUtils.getAllPanes(prev)
      let updated = prev
      allPanes.forEach(pane => {
        updated = splitUtils.updatePaneInTree(updated, pane.id, p => ({
          ...p,
          tabs: [],
          activeTab: ''
        }))
      })
      return updated
    })
    
    setOpenTabs([])
    setActiveTab('')
    setSelectedFile('')
    setCode('')
  }

  // Initialize pane refs on mount and when panes change
  useEffect(() => {
    const allPanes = splitUtils.getAllPanes(editorRoot)
    const newEditorRefs = new Map(paneEditorRefs)
    const newMonacoRefs = new Map(paneMonacoRefs)
    let hasChanges = false
    
    allPanes.forEach(pane => {
      if (!newEditorRefs.has(pane.id)) {
        newEditorRefs.set(pane.id, React.createRef())
        hasChanges = true
      }
      if (!newMonacoRefs.has(pane.id)) {
        newMonacoRefs.set(pane.id, React.createRef())
        hasChanges = true
      }
    })
    
    // Remove refs for panes that no longer exist
    const paneIds = new Set(allPanes.map(p => p.id))
    for (const [id] of newEditorRefs) {
      if (!paneIds.has(id)) {
        newEditorRefs.delete(id)
        hasChanges = true
      }
    }
    for (const [id] of newMonacoRefs) {
      if (!paneIds.has(id)) {
        newMonacoRefs.delete(id)
        hasChanges = true
      }
    }
    
    if (hasChanges) {
      setPaneEditorRefs(newEditorRefs)
      setPaneMonacoRefs(newMonacoRefs)
    }
  }, [editorRoot])
  
  // Deduplicate openTabs whenever they change
  useEffect(() => {
    if (openTabs.length > 0) {
      // Remove duplicates by path (keep the last occurrence)
      const uniqueTabs = openTabs.filter((tab, index, self) => 
        index === self.findIndex(t => t.path === tab.path)
      )
      
      // Only update if there were duplicates
      if (uniqueTabs.length !== openTabs.length) {
        setOpenTabs(uniqueTabs)
      }
    }
  }, [openTabs])
  
  // Initialize first pane with current tabs on mount
  useEffect(() => {
    const allPanes = splitUtils.getAllPanes(editorRoot)
    if (allPanes.length === 1 && allPanes[0].tabs.length === 0 && openTabs.length > 0) {
      setEditorRoot(prev => splitUtils.updatePaneInTree(prev, allPanes[0].id, pane => ({
        ...pane,
        tabs: openTabs,
        activeTab: activeTab || openTabs[0]?.path || ''
      })))
      if (activeTab) {
        const file = findFile(activeTab)
        if (file) {
          const newPaneCode = new Map(paneCode)
          newPaneCode.set(allPanes[0].id, file.content || '')
          setPaneCode(newPaneCode)
          
          const detectedLang = detectLanguage(activeTab)
          const newPaneLanguages = new Map(paneLanguages)
          newPaneLanguages.set(allPanes[0].id, detectedLang)
          setPaneLanguages(newPaneLanguages)
        }
      }
    }
  }, [])

  // Pane management functions
  const handlePaneTabClick = (paneId: string, path: string) => {
    const pane = splitUtils.findPaneInTree(editorRoot, paneId)
    if (!pane) return
    
    // Find the tab to get its content
    const tab = pane.tabs.find(t => t.path === path)
    const tabContent = tab?.content || ''
    
    // Update paneCode with the tab's content
    const newPaneCode = new Map(paneCode)
    newPaneCode.set(paneId, tabContent)
    setPaneCode(newPaneCode)
    
    // Update language
    const detectedLang = detectLanguage(path)
    const newPaneLanguages = new Map(paneLanguages)
    newPaneLanguages.set(paneId, detectedLang)
    setPaneLanguages(newPaneLanguages)
    
    setEditorRoot(prev => splitUtils.updatePaneInTree(prev, paneId, pane => ({
      ...pane,
      activeTab: path
    })))
    
    // Make this pane active when clicking its tab
    setActivePaneId(paneId)
    
    // Update global state to match the active pane
    setActiveTab(path)
    setSelectedFile(path)
    
    // Load code for the tab if not already in tab
    if (!tabContent) {
      const file = findFile(path)
      if (file) {
        const newPaneCode = new Map(paneCode)
        newPaneCode.set(paneId, file.content || '')
        setPaneCode(newPaneCode)
        
        const detectedLang = detectLanguage(path)
        const newPaneLanguages = new Map(paneLanguages)
        newPaneLanguages.set(paneId, detectedLang)
        setPaneLanguages(newPaneLanguages)
        setLanguage(detectedLang)
      }
    }
  }

  const handlePaneTabClose = (paneId: string, e: React.MouseEvent, path: string) => {
    e.stopPropagation()
    e.preventDefault()
    
    setEditorRoot(prev => {
      const updated = splitUtils.updatePaneInTree(prev, paneId, pane => {
        // Remove ALL tabs with this path (handle duplicates)
        const newTabs = pane.tabs.filter(t => t.path !== path)
        // Set new active tab - if we're closing the active tab, switch to the last remaining tab
        let newActiveTab = pane.activeTab
        if (pane.activeTab === path) {
          newActiveTab = newTabs.length > 0 ? newTabs[newTabs.length - 1].path : ''
        } else if (newTabs.length > 0 && !newTabs.some(t => t.path === pane.activeTab)) {
          // If active tab was removed but wasn't the one we're closing, switch to last tab
          newActiveTab = newTabs[newTabs.length - 1].path
        }
        return { ...pane, tabs: newTabs, activeTab: newActiveTab }
      })
      
      // Update global state after editorRoot is updated
      const updatedPane = splitUtils.findPaneInTree(updated, paneId)
      if (updatedPane) {
        // Update global openTabs - deduplicate by path (keep last occurrence)
        const uniqueTabs = updatedPane.tabs.filter((tab, index, self) => 
          index === self.findIndex(t => t.path === tab.path)
        )
        
        if (paneId === activePaneId) {
          setOpenTabs(uniqueTabs)
          
          if (activeTab === path) {
            if (updatedPane.tabs.length > 0) {
              const nextTab = updatedPane.tabs[updatedPane.tabs.length - 1]
              // Use setTimeout to ensure state is updated
              setTimeout(() => {
                handlePaneTabClick(paneId, nextTab.path)
              }, 0)
            } else {
              setActiveTab('')
              setSelectedFile('')
              const newPaneCode = new Map(paneCode)
              newPaneCode.set(paneId, '')
              setPaneCode(newPaneCode)
            }
          }
        }
      }
      
      return updated
    })
  }

  const handlePaneCloseAllTabs = (paneId: string) => {
    setEditorRoot(prev => splitUtils.updatePaneInTree(prev, paneId, pane => ({
      ...pane,
      tabs: [],
      activeTab: ''
    })))
    
    if (activePaneId === paneId) {
      setActiveTab('')
      setSelectedFile('')
      const newPaneCode = new Map(paneCode)
      newPaneCode.set(paneId, '')
      setPaneCode(newPaneCode)
    }
  }

  const handlePaneCodeChange = (paneId: string, value: string | undefined, clearOldContent?: boolean) => {
    if (value !== undefined) {
      const newPaneCode = new Map(paneCode)
      newPaneCode.set(paneId, value)
      setPaneCode(newPaneCode)
      
      const pane = splitUtils.findPaneInTree(editorRoot, paneId)
      if (pane && pane.activeTab) {
        // Update pane tabs
        setEditorRoot(prev => splitUtils.updatePaneInTree(prev, paneId, p => ({
          ...p,
          tabs: p.tabs.map(tab => 
            tab.path === pane.activeTab 
              ? { ...tab, content: value, modified: !clearOldContent, oldContent: clearOldContent ? undefined : tab.oldContent }
              : tab
          )
        })))
        
        // Update global tabs
        setOpenTabs(prev => prev.map(tab => 
          tab.path === pane.activeTab 
            ? { ...tab, content: value, modified: !clearOldContent, oldContent: clearOldContent ? undefined : tab.oldContent }
            : tab
        ))
        
        // Update file content
        const file = findFile(pane.activeTab)
        if (file) {
          file.content = value
          
          // Update Monaco's registered file for import resolution
          if (monacoRef.current) {
            const normalizedPath = normalizeFilePath(file.path)
            const uri = monacoRef.current.Uri.parse(`file://${normalizedPath}`)
            const model = monacoRef.current.editor.getModel(uri)
            
            if (model) {
              // Update model content
              if (model.getValue() !== value) {
                model.setValue(value)
              }
              
              // Update extra lib for TypeScript/JavaScript
              const language = detectLanguage(file.path)
              if (language === 'typescript' || language === 'javascript') {
                // Update just this file - this will rebuild all extra libs
                registerProjectFilesWithMonaco(monacoRef.current, file.path)
              }
            }
          }
        }
      }
    }
  }

  // Save current file in a pane
  const saveCurrentFileInPane = async (paneId: string) => {
    const pane = splitUtils.findPaneInTree(editorRoot, paneId)
    if (!pane || !pane.activeTab) return
    
    const activeTab = pane.tabs.find(t => t.path === pane.activeTab)
    if (!activeTab) return
    
    const editor = paneEditorRefs.get(paneId)?.current
    if (!editor) return
    
    const currentContent = editor.getValue()
    
    try {
      if (useFileSystem) {
        const { codeEditorApi } = await import('../services/api')
        const workingDir = localDirectory || undefined
        const filePath = getProjectPath(activeTab.path)
        // Get current project ID (UUID) to use for project directory
        const currentProject = projects.find(p => p.id === currentProjectId)
        const projectId = currentProject?.id || undefined
        await codeEditorApi.writeFile(filePath, currentContent, workingDir, projectId)
        
        // Update tab content and mark as saved
        setEditorRoot(prev => splitUtils.updatePaneInTree(prev, paneId, p => ({
          ...p,
          tabs: p.tabs.map(t => 
            t.path === activeTab.path 
              ? { ...t, content: currentContent, modified: false }
              : t
          )
        })))
        
        // Update paneCode
        const newPaneCode = new Map(paneCode)
        newPaneCode.set(paneId, currentContent)
        setPaneCode(newPaneCode)
      } else {
        // Update file in tree
        setFiles(prev => {
          const updateFileInTree = (nodes: FileNode[]): FileNode[] => {
            return nodes.map(node => {
              if (node.path === activeTab.path) {
                return { ...node, content: currentContent }
              }
              if (node.children) {
                return { ...node, children: updateFileInTree(node.children) }
              }
              return node
            })
          }
          return updateFileInTree(prev)
        })
        
        // Update tab
        setEditorRoot(prev => splitUtils.updatePaneInTree(prev, paneId, p => ({
          ...p,
          tabs: p.tabs.map(t => 
            t.path === activeTab.path 
              ? { ...t, content: currentContent, modified: false }
              : t
          )
        })))
        
        saveCurrentProject()
      }
    } catch (err: any) {
      console.error(`Failed to save file ${activeTab.path}:`, err)
      alert(`Failed to save file: ${err.message}`)
    }
  }

  const handlePaneEditorMount = (editor: any, monaco: any, paneId: string) => {
    const editorRef = paneEditorRefs.get(paneId)
    const monacoRef = paneMonacoRefs.get(paneId)
    
    if (editorRef) {
      (editorRef as React.MutableRefObject<any>).current = editor
    }
    if (monacoRef) {
      (monacoRef as React.MutableRefObject<any>).current = monaco
    }
    
    // Register VSCode-style keyboard shortcuts
    if (editor && monaco) {
      // File Operations - Ctrl+S to save
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, (e) => {
        e?.preventDefault?.()
        saveCurrentFileInPane(paneId)
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () => {
        saveFileAs()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyN, () => {
        startCreatingFile()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyO, () => {
        openFileFromProject()
      })
      
      // Edit Operations
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {
        editor.getAction('undo').run()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () => {
        editor.getAction('redo').run()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyY, () => {
        editor.getAction('redo').run()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {
        editor.getAction('editor.action.clipboardCutAction').run()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
        editor.getAction('editor.action.clipboardCopyAction').run()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
        editor.getAction('editor.action.clipboardPasteAction').run()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyA, () => {
        editor.getAction('editor.action.selectAll').run()
      })
      
      // Search & Replace
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, () => {
        editor.getAction('actions.find').run()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyH, () => {
        editor.getAction('editor.action.startFindReplaceAction').run()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
        editor.getAction('editor.action.startFindReplaceAction').run()
      })
      
      // Navigation
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG, () => {
        editor.getAction('editor.action.gotoLine').run()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyO, () => {
        editor.getAction('workbench.action.gotoSymbol').run()
      })
      
      editor.addCommand(monaco.KeyCode.F12, () => {
        editor.getAction('editor.action.revealDefinition').run()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.F12, () => {
        editor.getAction('editor.action.revealDefinition').run()
      })
      
      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.F12, () => {
        editor.getAction('editor.action.peekDefinition').run()
      })
      
      // View Operations
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, () => {
        setShowCommandPalette(true)
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
        setSidebarCollapsed(!sidebarCollapsed)
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyE, () => {
        setSidebarCollapsed(false)
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyA, () => {
        setAiPanelVisible(!aiPanelVisible)
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backquote, () => {
        setShowTerminal(!showTerminal)
      })
      
      // Code Operations
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
        requestAIAssistance(undefined, undefined, undefined, 'ask')
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyK, () => {
        editor.getAction('editor.action.deleteLines').run()
      })
      
      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.ArrowUp, () => {
        editor.getAction('editor.action.moveLinesUpAction').run()
      })
      
      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.ArrowDown, () => {
        editor.getAction('editor.action.moveLinesDownAction').run()
      })
      
      editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.ArrowUp, () => {
        editor.getAction('editor.action.copyLinesUpAction').run()
      })
      
      editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.ArrowDown, () => {
        editor.getAction('editor.action.copyLinesDownAction').run()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyK, () => {
        editor.getAction('editor.action.deleteLines').run()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        editor.getAction('editor.action.insertLineAfter').run()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Enter, () => {
        editor.getAction('editor.action.insertLineBefore').run()
      })
      
      // Comment Toggle
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Slash, () => {
        editor.getAction('editor.action.commentLine').run()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.Slash, () => {
        editor.getAction('editor.action.blockComment').run()
      })
      
      // Format
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyI, () => {
        editor.getAction('editor.action.formatDocument').run()
      })
      
      editor.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
        editor.getAction('editor.action.formatDocument').run()
      })
      
      // Settings
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Comma, () => {
        setShowSettings(true)
      })
      
      // Run/Debug
      editor.addCommand(monaco.KeyCode.F5, () => {
        runCode()
      })
      
      editor.addCommand(monaco.KeyMod.Shift | monaco.KeyCode.F5, () => {
        stopExecution()
      })
      
      // Indentation
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.BracketLeft, () => {
        editor.getAction('editor.action.outdentLines').run()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.BracketRight, () => {
        editor.getAction('editor.action.indentLines').run()
      })
      
      // Word Operations
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyD, () => {
        editor.getAction('editor.action.addSelectionToNextFindMatch').run()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL, () => {
        editor.getAction('editor.action.selectHighlights').run()
      })
      
      // Multi-cursor
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.ArrowUp, () => {
        editor.getAction('editor.action.insertCursorAbove').run()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.ArrowDown, () => {
        editor.getAction('editor.action.insertCursorBelow').run()
      })
      
      // Folding
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.BracketLeft, () => {
        editor.getAction('editor.fold').run()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.BracketRight, () => {
        editor.getAction('editor.unfold').run()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK | monaco.KeyMod.CtrlCmd | monaco.KeyCode.Key0, () => {
        editor.getAction('editor.unfoldAll').run()
      })
      
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ, () => {
        editor.getAction('editor.foldAll').run()
      })
    }
    
    // Configure Monaco for this pane
    if (monaco) {
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.Latest,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        reactNamespace: 'React',
        allowJs: true,
        typeRoots: ['node_modules/@types'],
        skipLibCheck: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        baseUrl: '.',
        paths: {
          '*': ['*', 'node_modules/*', 'src/*', 'lib/*', 'dist/*']
        }
      })
      
      monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.Latest,
        allowNonTsExtensions: true,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        noEmit: true,
        esModuleInterop: true,
        jsx: monaco.languages.typescript.JsxEmit.React,
        allowJs: true,
        skipLibCheck: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true
      })
    }
    
    // Set editor ref for active pane
    if (paneId === activePaneId && editorRef && monacoRef) {
      editorRef.current = editor
      monacoRef.current = monaco
    }
  }

  const handleSplitPane = (paneId: string, orientation: 'horizontal' | 'vertical') => {
    const newRoot = splitUtils.splitPane(editorRoot, paneId, orientation)
    if (newRoot) {
      setEditorRoot(newRoot)
      
      // Find the new pane ID (the second child of the newly created group)
      if (splitUtils.isSplitGroup(newRoot)) {
        const allPanes = splitUtils.getAllPanes(newRoot)
        const newPane = allPanes.find(p => p.id !== paneId && p.tabs.length === 0)
        if (newPane) {
          setActivePaneId(newPane.id)
          
          // Initialize refs for new pane
          const newEditorRefs = new Map(paneEditorRefs)
          const newMonacoRefs = new Map(paneMonacoRefs)
          newEditorRefs.set(newPane.id, React.createRef())
          newMonacoRefs.set(newPane.id, React.createRef())
          setPaneEditorRefs(newEditorRefs)
          setPaneMonacoRefs(newMonacoRefs)
        }
      }
    }
  }

  const handleClosePane = (paneId: string) => {
    const allPanes = splitUtils.getAllPanes(editorRoot)
    if (allPanes.length <= 1) return // Don't close the last pane
    
    const newRoot = splitUtils.closePane(editorRoot, paneId)
    if (newRoot) {
      setEditorRoot(newRoot)
      
      if (activePaneId === paneId) {
        const remainingPanes = splitUtils.getAllPanes(newRoot)
        if (remainingPanes.length > 0) {
          setActivePaneId(remainingPanes[0].id)
          const firstPane = remainingPanes[0]
          if (firstPane.activeTab) {
            setActiveTab(firstPane.activeTab)
            setSelectedFile(firstPane.activeTab)
          }
        }
      }
      
      // Clean up refs
      const newEditorRefs = new Map(paneEditorRefs)
      const newMonacoRefs = new Map(paneMonacoRefs)
      newEditorRefs.delete(paneId)
      newMonacoRefs.delete(paneId)
      setPaneEditorRefs(newEditorRefs)
      setPaneMonacoRefs(newMonacoRefs)
    }
  }
  
  const handleGroupSizesChange = (groupId: string, sizes: number[]) => {
    setEditorRoot(prev => splitUtils.updateGroupSizes(prev, groupId, sizes))
  }
  
  const handlePaneAIAction = (paneId: string, action: string) => {
    const pane = splitUtils.findPaneInTree(editorRoot, paneId)
    if (!pane || !pane.activeTab) return
    
    const filePath = pane.activeTab
    const code = getPaneCode(paneId)
    const language = getPaneLanguage(paneId)
    
    let prompt = ''
    switch (action) {
      case 'fix-errors':
        prompt = `Fix all errors in ${filePath}. Analyze the code and fix any syntax errors, type errors, logical errors, or other issues.`
        break
      case 'refactor':
        prompt = `Refactor the code in ${filePath} to improve readability, maintainability, and follow best practices. Keep the functionality the same.`
        break
      case 'optimize':
        prompt = `Optimize the performance of the code in ${filePath}. Identify bottlenecks and improve efficiency without changing functionality.`
        break
      case 'add-docs':
        prompt = `Add comprehensive documentation to ${filePath}. Include docstrings for functions and classes, and add inline comments where helpful.`
        break
      case 'explain':
        prompt = `Explain how the code in ${filePath} works. Break down the logic and explain each part.`
        break
      case 'suggest-improvements':
        prompt = `Analyze ${filePath} and suggest improvements. Consider code quality, performance, security, and best practices.`
        break
      default:
        prompt = `Help me with ${filePath}`
    }
    
    // Set the active pane and trigger AI assistance
    setActivePaneId(paneId)
    setActiveTab(filePath)
    setSelectedFile(filePath)
    requestAIAssistance(prompt, undefined, undefined, 'plan')
  }

  const getPaneCode = (paneId: string): string => {
    // First try to get code from paneCode Map (most reliable, updated synchronously)
    const mapCode = paneCode.get(paneId)
    if (mapCode !== undefined && mapCode !== null && mapCode.length > 0) {
      return mapCode
    }
    
    // Fallback to active tab content in the pane
    const pane = splitUtils.findPaneInTree(editorRoot, paneId)
    if (pane && pane.activeTab) {
      const activeTab = pane.tabs.find(t => t.path === pane.activeTab)
      if (activeTab && activeTab.content !== undefined && activeTab.content !== null && activeTab.content.length > 0) {
        // Also update paneCode so it's available next time
        const newPaneCode = new Map(paneCode)
        newPaneCode.set(paneId, activeTab.content)
        setPaneCode(newPaneCode)
        return activeTab.content
      }
    }
    
    return ''
  }

  const getPaneLanguage = (paneId: string): string => {
    return paneLanguages.get(paneId) || 'plaintext'
  }

  // Update handleFileSelect to work with panes
  const handleFileSelectWithPane = async (path: string, targetPaneId?: string) => {
    const paneId = targetPaneId || activePaneId
    const pane = splitUtils.findPaneInTree(editorRoot, paneId)
    if (!pane) return
    
    // Check if file is already open in this pane
    const existingTab = pane.tabs.find(tab => tab.path === path)
    if (existingTab) {
      handlePaneTabClick(paneId, path)
      return
    }
    
    // Find file in tree
    let file = findFile(path)
    let fileContent = file?.content
    
    // If file doesn't exist in tree or has no content (undefined or empty), try to load it from backend
    if (!file || (file.type === 'file' && (fileContent === undefined || fileContent === ''))) {
      try {
        console.log(`[handleFileSelectWithPane] Loading file from backend: ${path}`)
        const { codeEditorApi } = await import('../services/api')
        const workingDir = localDirectory || undefined
        // Use full path with project name for file system, or relative path for non-file-system
        const filePath = useFileSystem ? getProjectPath(path) : path
        console.log(`[handleFileSelectWithPane] Reading file: ${filePath}, workingDir: ${workingDir}`)
        const result = await codeEditorApi.readFile(filePath, workingDir)
        console.log(`[handleFileSelectWithPane] File read result:`, {
          success: result?.success,
          contentLength: result?.content?.length || 0,
          contentPreview: result?.content?.substring(0, 100) || 'empty'
        })
        if (result && result.success && result.content !== undefined && result.content !== null) {
          fileContent = result.content
          console.log(`[handleFileSelectWithPane] File content loaded, length: ${fileContent.length}`)
          
          // Update file in tree if it exists
          if (file) {
            file.content = fileContent
            // Update files state to trigger re-render
            setFiles(prev => {
              const updateFileInTree = (nodes: FileNode[]): FileNode[] => {
                return nodes.map(node => {
                  if (node.path === path) {
                    return { ...node, content: fileContent || '' }
                  }
                  if (node.children) {
                    return { ...node, children: updateFileInTree(node.children) }
                  }
                  return node
                })
              }
              return updateFileInTree(prev)
            })
          } else {
            // File not in tree, create it
            const fileName = path.split('/').pop() || path
            const newFile: FileNode = {
              name: fileName,
              type: 'file',
              path: path,
              content: fileContent || ''
            }
            setFiles(prev => [...prev, newFile])
            file = newFile
          }
        }
      } catch (err: any) {
        console.warn(`Failed to load file ${path}:`, err)
        // Continue with empty content if file can't be loaded
      }
    }
    
    // Ensure fileContent has a value (default to empty string)
    if (fileContent === undefined || fileContent === null) {
      fileContent = ''
    }
    
    // Open file in pane (even if content is empty, file should still open)
    const fileName = path.split('/').pop() || path
    const newTab = {
      path: path,
      name: fileName,
      content: fileContent,
      modified: false
    }
    
    // Set code for pane FIRST (before updating editorRoot) - CRITICAL: This must be set
    // This ensures paneCode is available immediately when getPaneCode is called during render
    console.log(`[handleFileSelectWithPane] Setting paneCode for ${paneId}, content length: ${fileContent.length}`)
    const newPaneCode = new Map(paneCode)
    newPaneCode.set(paneId, fileContent)
    setPaneCode(newPaneCode)
    console.log(`[handleFileSelectWithPane] paneCode set, new map size: ${newPaneCode.size}`)
    
    const detectedLang = detectLanguage(path)
    const newPaneLanguages = new Map(paneLanguages)
    newPaneLanguages.set(paneId, detectedLang)
    setPaneLanguages(newPaneLanguages)
    
    // Now update editorRoot to add the tab
    setEditorRoot(prev => splitUtils.updatePaneInTree(prev, paneId, p => ({
      ...p,
      tabs: [...p.tabs, newTab],
      activeTab: path
    })))
    
    // Only update global state if this is the active pane
    if (paneId === activePaneId) {
      // Update global tabs if not already there (for tracking purposes only)
      if (!openTabs.find(t => t.path === path)) {
        setOpenTabs(prev => [...prev, newTab])
      }
      
      setActiveTab(path)
      setSelectedFile(path)
      setLanguage(detectLanguage(path))
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files
    if (!uploadedFiles || uploadedFiles.length === 0) return

    const filesArray = Array.from(uploadedFiles)
    await uploadFiles(filesArray, '/')
    
    // Reset file input
    e.target.value = ''
  }

  const uploadFiles = async (files: File[], targetPath: string = '/') => {
    if (!files || files.length === 0) {
      console.warn('uploadFiles: No files provided')
      return
    }

    console.log('uploadFiles called with', files.length, 'files, targetPath:', targetPath)

    if (!currentProjectId) {
      console.warn('No project selected, cannot upload files')
      return
    }

    try {
      const { codeEditorApi } = await import('../services/api')
      const currentProject = projects.find(p => p.id === currentProjectId)
      const projectId = currentProject?.id || undefined
      
      if (!projectId) {
        console.warn('No project selected, cannot upload files')
        return
      }
      
      console.log('Uploading to project:', projectId, 'project name:', currentProject?.name)

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileName = file.name
        
        // Check if file has webkitRelativePath (indicates it's from a folder drag)
        // webkitRelativePath includes the folder structure, e.g., "folder/subfolder/file.txt"
        const relativePath = (file as any).webkitRelativePath || fileName
        
        // Build file path based on target path
        // The targetPath from FileExplorer might be a folder path like "/projectname/folder" or just "/"
        // We need to extract the relative path within the project
        let cleanTargetPath = targetPath === '/' ? '' : targetPath.replace(/^\/+/, '')
        
        // Remove project name prefix if it exists (FileExplorer paths include project name)
        const projectName = currentProject?.name || 'default'
        if (cleanTargetPath.startsWith(projectName + '/')) {
          cleanTargetPath = cleanTargetPath.substring(projectName.length + 1)
        } else if (cleanTargetPath === projectName) {
          cleanTargetPath = ''
        }
        
        // Build final file path (relative to project root, no leading slash for backend)
        let filePath: string
        
        // If file has webkitRelativePath, preserve the folder structure
        if (relativePath !== fileName && relativePath.includes('/')) {
          // File is from a folder drag - preserve the folder structure
          // Remove the root folder name if it matches the dragged folder name
          const pathParts = relativePath.split('/')
          // If we're dropping into a specific folder, prepend that folder path
          if (cleanTargetPath && cleanTargetPath !== '') {
            const finalTargetPath = cleanTargetPath.endsWith('/') ? cleanTargetPath.slice(0, -1) : cleanTargetPath
            filePath = `${finalTargetPath}/${relativePath}`
          } else {
            filePath = relativePath
          }
        } else {
          // Single file or file without folder structure
          if (!cleanTargetPath || cleanTargetPath === '') {
            filePath = fileName
          } else {
            // Ensure target path doesn't end with /
            const finalTargetPath = cleanTargetPath.endsWith('/') ? cleanTargetPath.slice(0, -1) : cleanTargetPath
            filePath = `${finalTargetPath}/${fileName}`
          }
        }
        
        // Remove any leading slashes - backend expects relative paths
        filePath = filePath.replace(/^\/+/, '')
        
        // Normalize path separators (handle both / and \)
        filePath = filePath.replace(/\\/g, '/')
        
        console.log(`Uploading file ${i + 1}/${files.length}: ${fileName} to path: ${filePath}`)
        
        // Read file content - handle both text and binary files
        let content: string
        const isTextFile = file.type.startsWith('text/') || 
                         file.type === 'application/json' ||
                         file.type === 'application/javascript' ||
                         file.type === 'application/xml' ||
                         file.name.match(/\.(txt|md|json|js|jsx|ts|tsx|py|java|cpp|c|h|hpp|css|html|xml|yaml|yml|sh|bash|zsh|sql|vue|svelte|rs|go|rb|php|swift|kt|dart|r|m|mm)$/i)
        
        if (isTextFile) {
          // Read as text for text files
          content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => resolve(e.target?.result as string)
            reader.onerror = reject
            reader.readAsText(file)
          })
        } else {
          // Read as base64 for binary files
          content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              const result = e.target?.result as string
              // Remove data URL prefix if present
              const base64 = result.includes(',') ? result.split(',')[1] : result
              resolve(base64)
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
          })
        }

        if (useFileSystem) {
          // Use backend file system
          console.log(`Writing file to backend: ${filePath}, encoding: ${isTextFile ? 'text' : 'base64'}, size: ${content.length}`)
          const result = await codeEditorApi.writeFile(filePath, content, undefined, projectId, isTextFile ? 'text' : 'base64')
          console.log(`File written successfully:`, result)
        } else {
          // Use localStorage (legacy mode)
          // Check if file already exists
          if (findFile(filePath)) {
            // File will be overwritten if it exists
          }

          const newFile: FileNode = {
            name: fileName,
            type: 'file',
            path: filePath,
            content: content
          }

          // Update or add file
          setFiles(prev => {
            const existingFileIndex = prev.findIndex((f: FileNode) => f.path === filePath)
            if (existingFileIndex >= 0) {
              return prev.map((f, idx) => idx === existingFileIndex ? newFile : f)
            } else {
              return [...prev, newFile]
            }
          })
        }
        
        // Only open text files in tabs
        if (isTextFile) {
          // Open uploaded file in a tab
          const existingTab = openTabs.find(tab => tab.path === filePath)
          if (!existingTab) {
            setOpenTabs(prev => [...prev, {
              path: filePath,
              name: fileName,
              content: content,
              modified: false
            }])
          }
          
          // Set as active if it's the first file
          if (i === 0) {
            setActiveTab(filePath)
            setSelectedFile(filePath)
            setCode(content)
            handleDetectLanguage(fileName)
          }
        }
      }
      
      // Always reload files from backend after upload to refresh explorer
      if (useFileSystem) {
        console.log('Reloading files from backend...')
        await loadFilesFromBackend()
        console.log('Files reloaded successfully')
      } else {
        saveCurrentProject()
      }
      console.log('Upload completed successfully for all files')
    } catch (err: any) {
      console.error(`Failed to upload files: ${err.message}`, err)
      setAiStatus(`Failed to upload files: ${err.message}`)
    }
  }

  const startCreatingFile = (parentPath: string = '/') => {
    setEditingFileName({ path: '', parentPath })
    setEditingFileNameValue('')
    setEditingFolderName(null)
    setEditingFolderNameValue('')
  }

  const startCreatingFolder = (parentPath: string = '/') => {
    setEditingFolderName({ path: '', parentPath })
    setEditingFolderNameValue('')
    setEditingFileName(null)
    setEditingFileNameValue('')
  }

  const finishCreatingFile = async (fileName: string) => {
    if (!fileName.trim()) {
      setEditingFileName(null)
      setEditingFileNameValue('')
      return
    }

    const trimmedName = fileName.trim()
    
    // Build path relative to project root (parentPath is relative to project folder)
    // If parentPath is '/', it means root of project folder, so use project name as parent
    const currentProject = projects.find(p => p.id === currentProjectId)
    const projectName = currentProject?.name || 'default'
    
    let relativePath: string
    if (editingFileName?.parentPath === '/' || editingFileName?.parentPath === `/${projectName}`) {
      // Root of project folder
      relativePath = `/${projectName}/${trimmedName}`
    } else {
      // Parent path already includes project name, just append filename
      relativePath = `${editingFileName?.parentPath}/${trimmedName}`
    }
    
    // Full path for backend (same as relativePath since it already includes project name)
    const filePath = relativePath
    
    try {
      if (useFileSystem) {
        // Use backend file system
        const { codeEditorApi } = await import('../services/api')
        const workingDir = localDirectory || undefined
        const currentProject = projects.find(p => p.id === currentProjectId)
        const projectId = currentProject?.id || undefined
        
        if (!projectId) {
          console.warn('No project selected, cannot create file')
          setEditingFileName(null)
          setEditingFileNameValue('')
          return
        }
        
        await codeEditorApi.writeFile(filePath, '', workingDir, projectId)
        
        // Reload files from backend
        await loadFilesFromBackend()
      } else {
        // Use localStorage (legacy mode)
        if (!currentProjectId) {
          // Skip if no project
          setEditingFileName(null)
          setEditingFileNameValue('')
          return
        }
        
        // If file exists, it will be overwritten

        const newFile: FileNode = {
          name: trimmedName,
          type: 'file',
          path: relativePath,
          content: ''
        }

        setFiles(prev => [...prev, newFile])
        saveCurrentProject()
      }
      
      // Open new file in a tab (use full path with project name for display)
      setOpenTabs(prev => [...prev, {
        path: relativePath,
        name: trimmedName,
        content: '',
        modified: false
      }])
      setActiveTab(relativePath)
      setSelectedFile(relativePath)
      setCode('')
      handleDetectLanguage(trimmedName)
      
      setEditingFileName(null)
      setEditingFileNameValue('')
    } catch (err: any) {
      console.error(`Failed to create file: ${err.message}`)
      setEditingFileName(null)
      setEditingFileNameValue('')
    }
  }

  const finishCreatingFolder = async (folderName: string) => {
    if (!folderName.trim()) {
      setEditingFolderName(null)
      setEditingFolderNameValue('')
      return
    }

    const trimmedName = folderName.trim()
    
    // Build path relative to project root (parentPath is relative to project folder)
    // If parentPath is '/', it means root of project folder, so use project name as parent
    const currentProject = projects.find(p => p.id === currentProjectId)
    const projectName = currentProject?.name || 'default'
    
    let relativePath: string
    if (editingFolderName?.parentPath === '/' || editingFolderName?.parentPath === `/${projectName}`) {
      // Root of project folder
      relativePath = `/${projectName}/${trimmedName}`
    } else {
      // Parent path already includes project name, just append folder name
      relativePath = `${editingFolderName?.parentPath}/${trimmedName}`
    }
    
    // Full path for backend (same as relativePath since it already includes project name)
    const folderPath = relativePath
    
    try {
      if (useFileSystem) {
        const { codeEditorApi } = await import('../services/api')
        const workingDir = localDirectory || undefined
        const projectId = currentProject?.id || undefined
        if (!projectId) {
          console.warn('No project selected, cannot create folder')
          setEditingFolderName(null)
          setEditingFolderNameValue('')
          return
        }
        await codeEditorApi.writeFile(folderPath, '', workingDir, projectId, 'text', { isDirectory: true })
        
        // Immediately add folder to the file tree for instant feedback (use relative path)
        const newFolder: FileNode = {
          name: trimmedName,
          type: 'folder',
          path: relativePath,
          children: []
        }
        
        // Add folder to the appropriate parent in the file tree
        const addFolderToTree = (nodes: FileNode[], parentPath: string, folder: FileNode): FileNode[] => {
          return nodes.map(node => {
            if (node.path === parentPath && node.type === 'folder') {
              return {
                ...node,
                children: [...(node.children || []), folder]
              }
            } else if (node.children) {
              return {
                ...node,
                children: addFolderToTree(node.children, parentPath, folder)
              }
            }
            return node
          })
        }
        
        if (editingFolderName?.parentPath === '/') {
          // Add to root
          setFiles(prev => [...prev, newFolder])
        } else {
          // Add to parent folder
          setFiles(prev => addFolderToTree(prev, editingFolderName!.parentPath, newFolder))
        }
        
        // Reload files from backend to ensure sync (with a small delay to ensure file system is updated)
        setTimeout(async () => {
          await loadFilesFromBackend()
        }, 100)
      } else {
        // Use localStorage (legacy mode)
        if (!currentProjectId) {
          // Skip if no project
          setEditingFolderName(null)
          setEditingFolderNameValue('')
          return
        }
        
        // Check if folder already exists
        if (findFile(folderPath)) {
          // Skip if folder exists
          setEditingFolderName(null)
          setEditingFolderNameValue('')
          return
        }

        const newFolder: FileNode = {
          name: trimmedName,
          type: 'folder',
          path: folderPath,
          children: []
        }

        setFiles(prev => [...prev, newFolder])
        saveCurrentProject()
      }
      
      setEditingFolderName(null)
      setEditingFolderNameValue('')
    } catch (err: any) {
      console.error(`Failed to create folder: ${err.message}`)
      setEditingFolderName(null)
      setEditingFolderNameValue('')
    }
  }

  const analyzeCodebase = async (forceRefresh: boolean = false) => {
    setIsAnalyzing(true)
    setAiStatus('Analyzing codebase structure...')
    try {
      const workingDir = localDirectory || undefined
      const response = await codeEditorApi.analyzeCodebase(workingDir, 500, forceRefresh)
      if (response.success) {
        setCodebaseAnalysis(response.analysis)
        setAnalysisCacheStatus(response.cached ? 'cached' : 'fresh')
        setAiStatus(`Analysis complete: ${response.analysis.total_files} files analyzed`)
        setTimeout(() => setAiStatus(''), 3000)
      }
    } catch (err: any) {
      console.error('Failed to analyze codebase:', err)
      setAiStatus(`Analysis failed: ${err.message}`)
      setTimeout(() => setAiStatus(''), 5000)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const loadFilesFromBackend = async () => {
    try {
      const { codeEditorApi } = await import('../services/api')
      
      // Get current project ID (UUID) to use for project directory
      const currentProject = projects.find(p => p.id === currentProjectId)
      const projectId = currentProject?.id || undefined
      const projectName = currentProject?.name || 'default'
      
      if (!projectId) {
        console.warn('No project selected, cannot load files')
        return
      }
      
      // CRITICAL: When a project is selected, DO NOT send workingDir
      // This ensures the backend uses the project directory (code/{project_uuid}/)
      // and files are properly isolated per project
      const workingDir = undefined
      
      // List all files from backend (will use project directory: code/{project_uuid}/)
      const response = await codeEditorApi.listFiles(undefined, workingDir, projectId)
      
      if (response.success) {
        // Files are already in the project directory (code/{user_uuid}/{project_name}/)
        // So we just use all files returned - they're already scoped to the current project
        // Paths are relative to the project directory, so no need to filter or modify
        const projectFiles = response.files
        console.log('loadFilesFromBackend: Received files from backend:', projectFiles.length, 'files')
        console.log('loadFilesFromBackend: Sample files:', projectFiles.slice(0, 5).map(f => ({ name: f.name, path: f.path, type: f.type })))
        
        // Load content for text files only (skip binary files, venv files, etc.)
        const fileContentPromises = projectFiles
          .filter(file => {
            // Only load content for files that should be readable
            if (file.type !== 'file') return false
            // Skip binary files and files that shouldn't be read
            if (shouldSkipReadingFile(file.path, file.name)) {
              return false
            }
            // Skip venv directories entirely
            if (file.path.toLowerCase().includes('/venv/') || file.path.toLowerCase().includes('/.venv/')) {
              return false
            }
            return true
          })
          .map(async (file) => {
            try {
              const filePath = useFileSystem ? getProjectPath(file.path) : file.path
              const readResult = await codeEditorApi.readFile(filePath, workingDir, projectId)
              if (readResult.success && readResult.content !== undefined) {
                return { path: file.path, content: readResult.content }
              }
            } catch (err: any) {
              // Silently skip files that can't be read (404s, binary files, etc.)
              // Don't log 404 errors or NOT FOUND errors - they're expected for binary files
              const errorMessage = err?.message || err?.toString() || ''
              const isExpectedError = 
                errorMessage.includes('404') || 
                errorMessage.includes('NOT FOUND') ||
                errorMessage.includes('File does not exist') ||
                errorMessage.includes('binary') ||
                errorMessage.includes('cannot be decoded')
              
              if (!isExpectedError) {
                console.warn(`Failed to load content for ${file.path}:`, err)
              }
            }
            return { path: file.path, content: '' }
          })
        
        const fileContents = await Promise.all(fileContentPromises)
        const contentMap = new Map(fileContents.map(fc => [fc.path, fc.content]))
        
        // Convert flat file list to tree structure with project folder as root
        // Capture projectName in closure to ensure it's available
        const buildFileTree = (files: Array<{ name: string; path: string; type: 'file' | 'folder'; size: number }>): FileNode[] => {
          // Use the projectName from outer scope
          const currentProjectName = projectName || 'default'
          
          // Create root project folder node
          const projectRoot: FileNode = {
            name: currentProjectName,
            type: 'folder',
            path: `/${currentProjectName}`,
            children: []
          }
          
          const pathMap = new Map<string, FileNode>()
          pathMap.set(`/${currentProjectName}`, projectRoot)
          
          // Filter out files that should be skipped (binary/cache files)
          const filteredFiles = files.filter(file => {
            if (file.type === 'file') {
              return !shouldSkipFile(file.path, file.name)
            }
            // For folders, check if the folder name itself should be skipped
            return !shouldSkipFile(file.path, file.name)
          })
          
          // Sort files so directories come first
          const sortedFiles = [...filteredFiles].sort((a, b) => {
            if (a.type === 'folder' && b.type === 'file') return -1
            if (a.type === 'file' && b.type === 'folder') return 1
            return a.name.localeCompare(b.name)
          })
          
          for (const file of sortedFiles) {
            const parts = file.path.split('/').filter(p => p)
            console.log(`buildFileTree: Processing file ${file.name}, path: ${file.path}, parts:`, parts)
            
            // Check if path starts with project name
            let projectParts: string[]
            if (parts.length > 0 && parts[0] === currentProjectName) {
              // Path includes project name, skip it
              projectParts = parts.slice(1)
            } else {
              // Path doesn't include project name (relative to project root), use all parts
              projectParts = parts
            }
            
            let currentPath = `/${currentProjectName}`
            let parent: FileNode = projectRoot
            
            for (let i = 0; i < projectParts.length; i++) {
              const part = projectParts[i]
              currentPath = `${currentPath}/${part}`
              
              if (!pathMap.has(currentPath)) {
                const isLast = i === projectParts.length - 1
                const node: FileNode = {
                  name: part,
                  type: isLast ? file.type : 'folder',
                  path: currentPath,
                  children: isLast && file.type === 'file' ? undefined : [],
                  content: isLast && file.type === 'file' ? '' : undefined
                }
                
                if (file.type === 'file' && isLast) {
                  // Skip reading binary/cache files (but still show them in explorer)
                  if (shouldSkipReadingFile(file.path, file.name)) {
                    // For binary files, set content to empty string so they show in explorer but aren't read
                    node.content = ''
                  } else {
                    // Use preloaded content from contentMap
                    const preloadedContent = contentMap.get(file.path)
                    node.content = preloadedContent !== undefined ? preloadedContent : ''
                  }
                }
                
                pathMap.set(currentPath, node)
                
                if (!parent.children) parent.children = []
                parent.children.push(node)
                parent = node
              } else {
                parent = pathMap.get(currentPath) || projectRoot
              }
            }
          }
          
          return [projectRoot]
        }
        
        const fileTree = buildFileTree(projectFiles)
        console.log('loadFilesFromBackend: Built file tree:', fileTree)
        // Count files recursively
        const countFiles = (nodes: FileNode[]): number => {
          let count = 0
          for (const node of nodes) {
            if (node.type === 'file') count++
            if (node.children) count += countFiles(node.children)
          }
          return count
        }
        console.log('loadFilesFromBackend: Total files in tree:', countFiles(fileTree))
        setFiles(fileTree)
      }
    } catch (err: any) {
      console.error('Failed to load files from backend:', err)
    }
  }

  const openFileFromProject = () => {
    setShowOpenFileDialog(true)
  }

  const selectFileToOpen = (path: string) => {
    setSelectedFile(path)
    setShowOpenFileDialog(false)
  }

  const saveFileAs = () => {
    const newName = prompt('Enter new file name:', selectedFile.split('/').pop() || 'untitled')
    if (!newName || !currentProjectId) return

    const file = findFile(selectedFile)
    if (!file) return

    const newPath = `/${newName}`
    
    // Check if file already exists
    if (findFile(newPath)) {
      alert('File already exists!')
      return
    }

    // Create new file with same content
    const newFile: FileNode = {
      name: newName,
      type: 'file',
      path: newPath,
      content: file.content || code
    }

    setFiles(prev => [...prev, newFile])
    setSelectedFile(newPath)
    saveCurrentProject()
  }

  // Context menu handlers
  const handleCopyFile = async () => {
    if (!contextMenu) return
    
    const file = findFile(contextMenu.filePath)
    if (file && file.content) {
      setCopiedFilePath(contextMenu.filePath)
      setCutFilePath(null) // Clear cut when copying
      await navigator.clipboard.writeText(file.content)
      setContextMenu(null)
    }
  }

  const handleCutFile = async () => {
    if (!contextMenu) return
    
    const file = findFile(contextMenu.filePath)
    if (file) {
      setCutFilePath(contextMenu.filePath)
      setCopiedFilePath(null) // Clear copy when cutting
      if (file.content) {
        await navigator.clipboard.writeText(file.content)
      }
      setContextMenu(null)
    }
  }

  const handleMoveFile = async (targetPath: string) => {
    if (!cutFilePath) return
    
    const file = findFile(cutFilePath)
    if (!file) {
      setCutFilePath(null)
      return
    }

    const fileName = cutFilePath.split('/').pop() || file.name
    // Build relative path (targetPath is already relative, cutFilePath is relative)
    const newRelativePath = targetPath === '/' 
      ? `/${fileName}` 
      : `${targetPath}/${fileName}`

    try {
      if (useFileSystem) {
        const { codeEditorApi } = await import('../services/api')
        const workingDir = localDirectory || undefined
        // Read old file content - need to load from backend if not in memory
        let oldContent = file.content || ''
        if (!oldContent) {
          const oldFullPath = getProjectPath(cutFilePath)
          const readResult = await codeEditorApi.readFile(oldFullPath, workingDir)
          if (readResult.success) {
            oldContent = readResult.content
          }
        }
        // Write to new path (with project name)
        const newFullPath = getProjectPath(newRelativePath)
        const currentProject = projects.find(p => p.id === currentProjectId)
        const projectName = currentProject?.name || undefined
                      await codeEditorApi.writeFile(newFullPath, oldContent, workingDir, projectId)
        // Delete old file (with project name)
        const oldFullPath = getProjectPath(cutFilePath)
        await codeEditorApi.deleteFile(oldFullPath, workingDir, projectId)
        await loadFilesFromBackend()
      } else {
        // Update file path
        setFiles(prev => prev.map(f => 
          f.path === cutFilePath 
            ? { ...f, path: newRelativePath, name: fileName }
            : f
        ))
        // Update tabs
        setOpenTabs(prev => prev.map(tab => 
          tab.path === cutFilePath
            ? { ...tab, path: newRelativePath, name: fileName }
            : tab
        ))
        if (activeTab === cutFilePath) {
          setActiveTab(newRelativePath)
        }
        if (selectedFile === cutFilePath) {
          setSelectedFile(newRelativePath)
        }
        saveCurrentProject()
      }
      setCutFilePath(null)
    } catch (err: any) {
      console.error(`Failed to move file: ${err.message}`)
      setCutFilePath(null)
    }
  }

  const handleDragDropFile = async (sourcePath: string, targetPath: string) => {
    const file = findFile(sourcePath)
    if (!file || file.type !== 'file') {
      return
    }

    // Don't allow dropping a file into itself or its parent
    if (sourcePath === targetPath || sourcePath.startsWith(targetPath + '/')) {
      return
    }

    const fileName = sourcePath.split('/').pop() || file.name
    // Build relative path
    const newRelativePath = targetPath === '/' 
      ? `/${fileName}` 
      : `${targetPath}/${fileName}`

    // Check if file already exists at target
    if (findFile(newRelativePath)) {
      console.warn(`File already exists at ${newRelativePath}`)
      return
    }

    try {
      if (useFileSystem) {
        const { codeEditorApi } = await import('../services/api')
        const workingDir = localDirectory || undefined
        // Read old file content - need to load from backend if not in memory
        let oldContent = file.content || ''
        if (!oldContent) {
          const oldFullPath = getProjectPath(sourcePath)
          const readResult = await codeEditorApi.readFile(oldFullPath, workingDir)
          if (readResult.success) {
            oldContent = readResult.content
          }
        }
        // Write to new path (with project name)
        const newFullPath = getProjectPath(newRelativePath)
        const currentProject = projects.find(p => p.id === currentProjectId)
        const projectName = currentProject?.name || undefined
                      await codeEditorApi.writeFile(newFullPath, oldContent, workingDir, projectId)
        // Delete old file (with project name)
        const oldFullPath = getProjectPath(sourcePath)
        await codeEditorApi.deleteFile(oldFullPath, workingDir, projectId)
        await loadFilesFromBackend()
      } else {
        // Update file path
        setFiles(prev => prev.map(f => 
          f.path === sourcePath 
            ? { ...f, path: newRelativePath, name: fileName }
            : f
        ))
        // Update tabs
        setOpenTabs(prev => prev.map(tab => 
          tab.path === sourcePath
            ? { ...tab, path: newRelativePath, name: fileName }
            : tab
        ))
        if (activeTab === sourcePath) {
          setActiveTab(newRelativePath)
        }
        if (selectedFile === sourcePath) {
          setSelectedFile(newRelativePath)
        }
        saveCurrentProject()
      }
    } catch (err: any) {
      console.error(`Failed to move file via drag and drop: ${err.message}`)
    }
  }

  const handleDuplicateFile = async () => {
    if (!contextMenu) return
    
    const file = findFile(contextMenu.filePath)
    if (!file) return

    const fileName = contextMenu.fileName
    const ext = fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : ''
    const baseName = fileName.includes('.') ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName
    const newName = `${baseName}.copy${ext}`
    const parentPath = contextMenu.filePath.substring(0, contextMenu.filePath.lastIndexOf('/')) || '/'
    const newRelativePath = `${parentPath}/${newName}`

    try {
      if (useFileSystem) {
        const { codeEditorApi } = await import('../services/api')
        const workingDir = localDirectory || undefined
        // Load file content from backend if not in memory
        let fileContent = file.content || ''
        if (!fileContent) {
          const oldFullPath = getProjectPath(contextMenu.filePath)
          const readResult = await codeEditorApi.readFile(oldFullPath, workingDir)
          if (readResult.success) {
            fileContent = readResult.content
          }
        }
        // Write to new path (with project name)
        const newFullPath = getProjectPath(newRelativePath)
        const currentProject = projects.find(p => p.id === currentProjectId)
        const projectName = currentProject?.name || undefined
                      await codeEditorApi.writeFile(newFullPath, fileContent, workingDir, projectId)
        await loadFilesFromBackend()
      } else {
        if (findFile(newRelativePath)) {
          // If file exists, overwrite it
          const existingFile = findFile(newRelativePath)
          if (existingFile) {
            setFiles(prev => prev.map(f => 
              f.path === newRelativePath ? { ...f, content: file.content || '' } : f
            ))
            saveCurrentProject()
            setContextMenu(null)
            return
          }
        }
        const newFile: FileNode = {
          name: newName,
          type: 'file',
          path: newRelativePath,
          content: file.content || ''
        }
        setFiles(prev => [...prev, newFile])
        saveCurrentProject()
      }
      
      setOpenTabs(prev => [...prev, {
        path: newRelativePath,
        name: newName,
        content: file.content || '',
        modified: false
      }])
      setActiveTab(newRelativePath)
      setSelectedFile(newRelativePath)
      setCode(file.content || '')
      handleDetectLanguage(newName)
      setContextMenu(null)
    } catch (err: any) {
      console.error(`Failed to duplicate file: ${err.message}`)
    }
  }

  const handleRenameFile = () => {
    if (!contextMenu) return
    
    setRenamingFile({ path: contextMenu.filePath, name: contextMenu.fileName })
    setRenamingFileNameValue(contextMenu.fileName)
    setContextMenu(null)
  }

  const finishRenamingFile = async (newName: string) => {
    if (!renamingFile || !newName.trim() || newName.trim() === renamingFile.name) {
      setRenamingFile(null)
      setRenamingFileNameValue('')
      return
    }

    const file = findFile(renamingFile.path)
    if (!file) {
      setRenamingFile(null)
      setRenamingFileNameValue('')
      return
    }

    const parentPath = renamingFile.path.substring(0, renamingFile.path.lastIndexOf('/')) || '/'
    const newRelativePath = `${parentPath}/${newName.trim()}`

    try {
      if (useFileSystem) {
        const { codeEditorApi } = await import('../services/api')
        const workingDir = localDirectory || undefined
        // Read old file content - need to load from backend if not in memory
        let oldContent = file.content || ''
        if (!oldContent) {
          const oldFullPath = getProjectPath(renamingFile.path)
          const readResult = await codeEditorApi.readFile(oldFullPath, workingDir)
          if (readResult.success) {
            oldContent = readResult.content
          }
        }
        // Write to new path (with project name)
        const newFullPath = getProjectPath(newRelativePath)
        const currentProject = projects.find(p => p.id === currentProjectId)
        const projectName = currentProject?.name || undefined
                      await codeEditorApi.writeFile(newFullPath, oldContent, workingDir, projectId)
        // Delete old file (with project name)
        const oldFullPath = getProjectPath(renamingFile.path)
        await codeEditorApi.deleteFile(oldFullPath, workingDir, projectId)
        await loadFilesFromBackend()
      } else {
        // Update file
        setFiles(prev => prev.map(f => 
          f.path === renamingFile.path 
            ? { ...f, name: newName.trim(), path: newRelativePath }
            : f
        ))
        // Update tabs
        setOpenTabs(prev => prev.map(tab => 
          tab.path === renamingFile.path
            ? { ...tab, path: newRelativePath, name: newName.trim() }
            : tab
        ))
        if (activeTab === renamingFile.path) {
          setActiveTab(newRelativePath)
        }
        if (selectedFile === renamingFile.path) {
          setSelectedFile(newRelativePath)
        }
        saveCurrentProject()
      }
      setRenamingFile(null)
      setRenamingFileNameValue('')
    } catch (err: any) {
      console.error(`Failed to rename file: ${err.message}`)
      setRenamingFile(null)
      setRenamingFileNameValue('')
    }
  }

  const handleDeleteFile = async () => {
    if (!contextMenu) return
    
    try {
      if (useFileSystem) {
        const { codeEditorApi } = await import('../services/api')
        const workingDir = localDirectory || undefined
        // Get current project ID (UUID) to use for project directory
        const currentProject = projects.find(p => p.id === currentProjectId)
        const projectId = currentProject?.id || undefined
        // Delete file (with project name)
        const fullPath = getProjectPath(contextMenu.filePath)
        await codeEditorApi.deleteFile(fullPath, workingDir, projectId)
        await loadFilesFromBackend()
      } else {
        setFiles(prev => prev.filter(f => f.path !== contextMenu!.filePath))
        setOpenTabs(prev => prev.filter(tab => tab.path !== contextMenu!.filePath))
        if (activeTab === contextMenu.filePath) {
          const remainingTabs = openTabs.filter(tab => tab.path !== contextMenu!.filePath)
          if (remainingTabs.length > 0) {
            setActiveTab(remainingTabs[0].path)
            setSelectedFile(remainingTabs[0].path)
          } else {
            setActiveTab('')
            setSelectedFile('')
            setCode('')
          }
        }
        saveCurrentProject()
      }
      setContextMenu(null)
    } catch (err: any) {
      console.error(`Failed to delete file: ${err.message}`)
      setContextMenu(null)
    }
  }

  const handleRevealInExplorer = () => {
    if (!contextMenu) return
    setSelectedFile(contextMenu.filePath)
    setContextMenu(null)
  }

  const runCode = async () => {
    if (isRunning) return
    
    setIsRunning(true)
    setShowTerminal(true)
    setTerminalPanelTab('terminal')
    
    const activeTerm = terminals.find(t => t.id === activeTerminalId)
    if (activeTerm) {
      setTerminals(prev => prev.map(t => 
        t.id === activeTerminalId
          ? { ...t, output: [...t.output, `$ Running ${selectedFile.split('/').pop()}...`] }
          : t
      ))
    }
    
    try {
      // Simulate code execution
      // In a real implementation, this would execute on the backend
      const output = `[Execution started]\n${code}\n[Execution completed]`
      
      if (activeTerm) {
        setTerminals(prev => prev.map(t => 
          t.id === activeTerminalId
            ? { ...t, output: [...t.output, output] }
            : t
        ))
      }
      
      // For JavaScript, we could use eval (not recommended for production)
      if (language === 'javascript') {
        try {
          // Create a safe execution context
          const result = eval(code)
          if (activeTerm) {
            setTerminals(prev => prev.map(t => 
              t.id === activeTerminalId
                ? { 
                    ...t, 
                    output: [
                      ...t.output,
                      ...(result !== undefined ? [`Result: ${result}`] : [])
                    ]
                  }
                : t
            ))
          }
        } catch (err: any) {
          if (activeTerm) {
            setTerminals(prev => prev.map(t => 
              t.id === activeTerminalId
                ? { ...t, output: [...t.output, `Error: ${err.message}`] }
                : t
            ))
          }
        }
      } else {
        if (activeTerm) {
          setTerminals(prev => prev.map(t => 
            t.id === activeTerminalId
              ? { ...t, output: [...t.output, `[Note: ${language} execution would run here]`] }
              : t
          ))
        }
      }
    } catch (err: any) {
      if (activeTerm) {
        setTerminals(prev => prev.map(t => 
          t.id === activeTerminalId
            ? { ...t, output: [...t.output, `Error: ${err.message}`] }
            : t
        ))
      }
    } finally {
      setIsRunning(false)
      setTimeout(() => {
        terminalRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }

  const stopExecution = () => {
    setIsRunning(false)
    const activeTerm = terminals.find(t => t.id === activeTerminalId)
    if (activeTerm) {
      setTerminals(prev => prev.map(t => 
        t.id === activeTerminalId
          ? { ...t, output: [...t.output, '[Execution stopped]'] }
          : t
      ))
    }
  }

  const executeTerminalCommand = (command: string, terminalId?: string) => {
    if (!command.trim()) return

    const targetId = terminalId || activeTerminalId
    const activeTerm = terminals.find(t => t.id === targetId)
    if (!activeTerm) return

    // Auto-activate venv for Python commands if venv is detected
    let commandToExecute = command
    if (venvInfo && venvInfo.python_path && (
      command.startsWith('python ') || 
      command.startsWith('python3 ') ||
      command === 'python' ||
      command === 'python3' ||
      command.startsWith('pip ') ||
      command === 'pip'
    )) {
      // Replace python/python3 with venv python path
      commandToExecute = command.replace(/^python3?/, venvInfo.python_path)
      // Replace pip with venv pip
      if (command.startsWith('pip')) {
        const pipPath = venvInfo.python_path.replace(/python(\.exe)?$/, 'pip$1')
        commandToExecute = command.replace(/^pip/, pipPath)
      }
    }

    setTerminals(prev => prev.map(t => 
      t.id === targetId 
        ? { ...t, output: [...t.output, `$ ${command}`], input: '' }
        : t
    ))
    
    // Simulate command execution
    if (command.startsWith('cd ')) {
      setTerminals(prev => prev.map(t => 
        t.id === targetId 
          ? { ...t, output: [...t.output, '[Directory change not implemented in browser]'] }
          : t
      ))
    } else if (command === 'clear' || command === 'cls') {
      setTerminals(prev => prev.map(t => 
        t.id === targetId ? { ...t, output: [] } : t
      ))
    } else if (command === 'ls' || command === 'dir') {
      const fileList = getAllFiles(files).map(f => f.name).join('  ')
      setTerminals(prev => prev.map(t => 
        t.id === targetId 
          ? { ...t, output: [...t.output, fileList || '(no files)'] }
          : t
      ))
    } else if (command.startsWith('cat ') || command.startsWith('type ')) {
      const fileName = command.split(' ')[1]
      const file = getAllFiles(files).find(f => f.name === fileName)
      if (file && file.content) {
        setTerminals(prev => prev.map(t => 
          t.id === targetId 
            ? { ...t, output: [...t.output, file.content || ''] }
            : t
        ))
      } else {
        setTerminals(prev => prev.map(t => 
          t.id === targetId 
            ? { ...t, output: [...t.output, `File not found: ${fileName}`] }
            : t
        ))
      }
    } else {
      setTerminals(prev => prev.map(t => 
        t.id === targetId 
          ? { ...t, output: [...t.output, `[Command: ${command}]\n[Note: Terminal commands would execute here]`] }
          : t
      ))
    }
    
    setTimeout(() => {
      terminalRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const commandPaletteCommands = [
    { label: 'New File', action: () => { setShowCommandPalette(false); startCreatingFile(); } },
    { label: 'Open File', action: () => { setShowCommandPalette(false); openFileFromProject(); } },
    { label: 'Save', action: () => { setShowCommandPalette(false); saveCurrentProject(); } },
    { label: 'New Project', action: () => { setShowCommandPalette(false); setShowNewProjectDialog(true); } },
    { label: 'Open Project', action: () => { setShowCommandPalette(false); setShowProjectSwitcher(true); } },
    { label: 'Toggle Sidebar', action: () => { setShowCommandPalette(false); setSidebarCollapsed(!sidebarCollapsed); } },
    { label: 'Toggle AI Panel', action: () => { setShowCommandPalette(false); setAiPanelVisible(!aiPanelVisible); } },
    { label: 'Toggle Terminal', action: () => { setShowCommandPalette(false); setShowTerminal(!showTerminal); } },
    { label: 'Execute Program', action: () => { 
      setShowCommandPalette(false);
      setExecuteConfig({
        file: activeTab || selectedFile,
        arguments: '',
        workingDirectory: '',
        environment: 'local',
        interpreter: 'auto',
        timeout: 30
      });
      setShowExecuteDialog(true);
    }},
    { label: 'Run Code', action: () => { setShowCommandPalette(false); runCode(); } },
    { label: 'Go to Line', action: () => { setShowCommandPalette(false); editorRef.current?.getAction('editor.action.gotoLine').run(); } },
    { label: 'Change Theme', action: () => { setShowCommandPalette(false); setTheme(theme === 'vs-dark' ? 'light' : 'vs-dark'); } },
  ]

  const filteredCommands = commandPaletteCommands.filter(cmd => 
    cmd.label.toLowerCase().includes(commandPaletteInput.toLowerCase())
  );

  const currentProject = projects.find(p => p.id === currentProjectId);

  // Global keyboard shortcuts - must be called after all function definitions
  useKeyboardShortcuts({
    activePaneId,
    activeTab,
    editorRoot,
    saveCurrentFileInPane,
    saveCurrentProject,
    setShowCommandPalette,
    setShowKeyboardShortcuts,
    setSidebarCollapsed,
    sidebarCollapsed,
    setAiPanelVisible,
    aiPanelVisible,
    setShowTerminal,
    showTerminal,
    setShowFindInFiles,
    setShowGoToSymbol,
  })

  return (
    <div className="code-editor-container">
      <MenuBar
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        editorRef={editorRef}
        setShowNewProjectDialog={setShowNewProjectDialog}
        setShowProjectSwitcher={setShowProjectSwitcher}
        startCreatingFile={startCreatingFile}
        openFileFromProject={openFileFromProject}
        saveCurrentProject={saveCurrentProject}
        saveFileAs={saveFileAs}
        onClose={onClose}
        setSidebarCollapsed={setSidebarCollapsed}
        sidebarCollapsed={sidebarCollapsed}
        setAiPanelVisible={setAiPanelVisible}
        aiPanelVisible={aiPanelVisible}
        setShowTerminal={setShowTerminal}
        showTerminal={showTerminal}
        setAiPanelPosition={setAiPanelPosition}
        aiPanelPosition={aiPanelPosition}
        setTheme={setTheme}
        theme={theme}
        applyTheme={applyTheme}
        setAppearanceSettings={setAppearanceSettings}
        saveUserSettings={saveUserSettings}
        setShowCommandPalette={setShowCommandPalette}
        setShowSettings={setShowSettings}
        setShowKeyboardShortcuts={setShowKeyboardShortcuts}
        runCode={runCode}
        stopExecution={stopExecution}
        setShowExecuteDialog={setShowExecuteDialog}
        activeTab={activeTab}
        selectedFile={selectedFile}
        setTerminals={setTerminals}
        activeTerminalId={activeTerminalId}
        setActiveTerminalId={setActiveTerminalId}
        setShowProjectSettings={setShowProjectSettings}
        setShowPaymentDialog={setShowPaymentDialog}
        setShowGitDialog={setShowGitDialog}
      />

      <EditorHeader
        isSidebarAlwaysVisible={isSidebarAlwaysVisible}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        currentProject={currentProject}
        currentProjectId={currentProjectId}
        showProjectSwitcher={showProjectSwitcher}
        setShowProjectSwitcher={setShowProjectSwitcher}
        setShowNewProjectDialog={setShowNewProjectDialog}
        projects={projects}
        openProject={openProject}
        deleteProject={deleteProject}
        activeTab={activeTab}
        selectedFile={selectedFile}
        openTabs={openTabs}
        setShowSettings={setShowSettings}
        aiPanelVisible={aiPanelVisible}
        setAiPanelVisible={setAiPanelVisible}
        autoAppPanelVisible={autoAppPanelVisible}
        setAutoAppPanelVisible={setAutoAppPanelVisible}
        analyzeCodebase={analyzeCodebase}
        isAnalyzing={isAnalyzing}
        analysisCacheStatus={analysisCacheStatus}
        codebaseAnalysis={codebaseAnalysis}
        localDirectory={localDirectory}
        minimapEnabled={editorSettings.minimap}
        toggleMinimap={() => {
          setEditorSettings(prev => ({ ...prev, minimap: !prev.minimap }))
        }}
        onOpenProjectManagement={() => setShowProjectManagement(true)}
      />

      <div className="editor-content">
        {/* AI Panel on Left */}
        {aiPanelVisible && aiPanelPosition === 'left' && (
          <AIPanel
            position="left"
            width={aiPanelWidth}
            selectedAgentId={selectedAgentId}
            selectedAgentIds={selectedAgentIds}
            selectedGpu={selectedGpu}
            agents={agents}
            gpus={gpus}
            queuedRequests={queuedRequests}
            activeAgentRequests={activeAgentRequests}
            currentPromptGoal={currentPromptGoal}
            activeTab={activeTab}
            language={language}
            isAIThinking={isAIThinking}
            isAIAssisting={isAIAssisting}
            aiStatus={aiStatus}
            aiMessages={aiMessages}
            setAiMessages={setAiMessages}
            aiInput={aiInput}
            messageActions={messageActions}
            formatInlineMarkdown={formatInlineMarkdown}
            setAiPanelPosition={setAiPanelPosition}
            setAiPanelVisible={setAiPanelVisible}
            setSelectedAgentId={setSelectedAgentId}
            setSelectedAgentIds={setSelectedAgentIds}
            setSelectedGpu={setSelectedGpu}
            setQueuedRequests={setQueuedRequests}
            setIsAIThinking={setIsAIThinking}
            setIsAIAssisting={setIsAIAssisting}
            setAiStatus={setAiStatus}
            setCurrentPromptGoal={setCurrentPromptGoal}
            setAiInput={setAiInput}
            sendAIMessage={sendAIMessage}
            requestAIAssistance={requestAIAssistance}
            handleAcceptSuggestion={handleAcceptSuggestion}
            handleRejectSuggestion={handleRejectSuggestion}
            handleCopySuggestion={handleCopySuggestion}
            handleApplyToFile={handleApplyToFile}
            applyFileOperations={applyFileOperations}
            setMessageActions={setMessageActions}
            onResizeStart={(e) => handleResizeStart('ai-panel', e)}
            showAgentSelector={showAgentSelector}
            setShowAgentSelector={setShowAgentSelector}
            autoApply={modelSettings.autoApply}
            setAutoApply={(enabled) => {
              setModelSettings(prev => ({ ...prev, autoApply: enabled }))
              saveUserSettings()
            }}
            files={files}
            currentProjectId={currentProjectId}
            workingDir={localDirectory}
            onFilesChanged={loadFilesFromBackend}
          />
        )}
        {/* AI Panel Resize Handle (right side - after left panel) */}
        {aiPanelVisible && aiPanelPosition === 'left' && (
          <div 
            className="resize-handle resize-handle-vertical"
            onMouseDown={(e) => handleResizeStart('ai-panel', e)}
            style={{ cursor: 'col-resize' }}
          />
        )}

        {/* File Explorer Sidebar */}
        <FileExplorer
          files={files}
          selectedFile={selectedFile}
          setSelectedFile={setSelectedFile}
          handleFileSelect={handleFileSelect}
          setContextMenu={setContextMenu}
          startCreatingFile={startCreatingFile}
          startCreatingFolder={startCreatingFolder}
          handleFileUpload={handleFileUpload}
          editingFileName={editingFileName}
          editingFileNameValue={editingFileNameValue}
          setEditingFileNameValue={setEditingFileNameValue}
          finishCreatingFile={finishCreatingFile}
          finishCreatingFolder={finishCreatingFolder}
          editingFolderName={editingFolderName}
          editingFolderNameValue={editingFolderNameValue}
          setEditingFolderNameValue={setEditingFolderNameValue}
          setEditingFolderName={setEditingFolderName}
          setEditingFileName={setEditingFileName}
          renamingFile={renamingFile}
          renamingFileNameValue={renamingFileNameValue}
          setRenamingFileNameValue={setRenamingFileNameValue}
          setRenamingFile={setRenamingFile}
          finishRenamingFile={finishRenamingFile}
          handleDragDropFile={async (sourcePath: string, targetPath: string) => {
            await handleDragDropFile(sourcePath, targetPath)
            // After moving file, ensure target folder is expanded so the file is visible
            // The auto-expand logic should handle this, but we'll trigger it explicitly
          }}
          sidebarWidth={sidebarWidth}
          isSidebarAlwaysVisible={isSidebarAlwaysVisible}
          sidebarCollapsed={sidebarCollapsed}
          handleResizeStart={handleResizeStart}
          projects={projects}
          currentProjectId={currentProjectId}
          openTabs={openTabs}
          onRefresh={loadFilesFromBackend}
          onUploadFiles={uploadFiles}
          currentUserId={currentUserId}
          onExpandedFoldersChange={(folders, projectId) => {
            setExpandedFolders(folders)
            // Save will be handled by saveUserSettings
            if (currentUserId && currentUserId.trim().length > 0 && !isSavingSettingsRef.current) {
              // Debounce save
              setTimeout(() => {
                if (currentUserId && !isSavingSettingsRef.current) {
                  saveUserSettings().catch(() => {
                    // Silently handle errors - user might not exist
                  })
                }
              }, 500)
            }
          }}
          savedExpandedFolders={expandedFolders}
          onShowVenvManager={() => setShowVenvManager(true)}
          venvInfo={venvInfo}
        />

        {/* Main Editor Area */}
        <div className="editor-main">
          <SplitEditor
            root={editorRoot}
            activePaneId={activePaneId}
            setActivePaneId={setActivePaneId}
            onPaneTabClick={handlePaneTabClick}
            onPaneTabClose={handlePaneTabClose}
            onPaneCloseAllTabs={handlePaneCloseAllTabs}
            onPaneCodeChange={handlePaneCodeChange}
            onPaneEditorMount={handlePaneEditorMount}
            getPaneCode={getPaneCode}
            getPaneLanguage={getPaneLanguage}
            theme={theme}
            editorSettings={editorSettings}
            showMarkdownPreview={showMarkdownPreview}
            setShowMarkdownPreview={setShowMarkdownPreview}
            showTerminal={showTerminal}
            terminalHeight={terminalHeight}
            onSplitPane={handleSplitPane}
            onClosePane={handleClosePane}
            onGroupSizesChange={handleGroupSizesChange}
            onAIAction={handlePaneAIAction}
            editorRefs={paneEditorRefs}
            monacoRefs={paneMonacoRefs}
          />
          
          {/* Legacy single editor view - hidden, kept for compatibility */}
          <div className="monaco-wrapper" style={{ display: 'none' }}>
            {activeTab ? (
              language === 'markdown' && showMarkdownPreview ? (
                <div className="markdown-preview-container" style={{ height: showTerminal ? `calc(100% - ${terminalHeight}px - 4px)` : "100%", overflow: 'auto', padding: '20px' }}>
                  <div className="markdown-preview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--theme-border, #3e3e42)' }}>
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
                    <div className="markdown-editor-header" style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 12px', borderBottom: '1px solid var(--theme-border, #3e3e42)', background: 'var(--theme-editor-bg, #1e1e1e)' }}>
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
                    key={`editor-${activeTab || 'empty'}-${language || 'plaintext'}`}
                    height={showTerminal ? `calc(100% - ${terminalHeight}px - ${language === 'markdown' ? '44px' : '4px'})` : language === 'markdown' ? "calc(100% - 40px)" : "100%"}
                    language={language || detectLanguage(activeTab || '') || 'plaintext'}
                    theme={theme}
                    value={code}
                    onChange={handleCodeChange}
                    onMount={handleEditorDidMount}
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
                      // Show error squiggles
                      renderValidationDecorations: 'on',
                      // Enable code lens and other language features
                      codeLens: true,
                      // Enable hover information
                      hover: { enabled: true },
                      // Enable parameter hints
                      parameterHints: { enabled: true }
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


          {/* Terminal Panel - VS Code Style */}
          {showTerminal && (
            <TerminalPanel
              height={terminalHeight}
              terminalPanelTab={terminalPanelTab}
              setTerminalPanelTab={setTerminalPanelTab}
              problems={problems}
              output={output}
              debugOutput={debugOutput}
              ports={ports}
              terminals={terminals}
              activeTerminalId={activeTerminalId}
              isRunning={isRunning}
              setShowTerminal={setShowTerminal}
              setTerminals={setTerminals}
              setActiveTerminalId={setActiveTerminalId}
              executeTerminalCommand={executeTerminalCommand}
              onResizeStart={(e) => handleResizeStart('terminal', e)}
              onProblemClick={(problem) => {
                handleFileSelect(problem.file)
                setTimeout(() => {
                  const activePane = splitUtils.findPaneInTree(editorRoot, activePaneId)
                  if (activePane?.monacoRef) {
                    activePane.monacoRef.setPosition({ lineNumber: problem.line, column: problem.column || 1 })
                    activePane.monacoRef.revealLineInCenter(problem.line)
                  }
                }, 100)
              }}
            />
          )}
        </div>

        {/* AI Panel Resize Handle (left side - before right panel) */}
        {aiPanelVisible && aiPanelPosition === 'right' && (
          <div 
            className="resize-handle resize-handle-vertical"
            onMouseDown={(e) => handleResizeStart('ai-panel', e)}
            style={{ cursor: 'col-resize' }}
          />
        )}

        {/* AI Panel on Right */}
        {aiPanelVisible && aiPanelPosition === 'right' && (
          <AIPanel
            position="right"
            width={aiPanelWidth}
            selectedAgentId={selectedAgentId}
            selectedAgentIds={selectedAgentIds}
            selectedGpu={selectedGpu}
            agents={agents}
            gpus={gpus}
            queuedRequests={queuedRequests}
            activeAgentRequests={activeAgentRequests}
            currentPromptGoal={currentPromptGoal}
            activeTab={activeTab}
            language={language}
            isAIThinking={isAIThinking}
            isAIAssisting={isAIAssisting}
            aiStatus={aiStatus}
            aiMessages={aiMessages}
            setAiMessages={setAiMessages}
            aiInput={aiInput}
            messageActions={messageActions}
            formatInlineMarkdown={formatInlineMarkdown}
            setAiPanelPosition={setAiPanelPosition}
            setAiPanelVisible={setAiPanelVisible}
            setSelectedAgentId={setSelectedAgentId}
            setSelectedAgentIds={setSelectedAgentIds}
            setSelectedGpu={setSelectedGpu}
            setQueuedRequests={setQueuedRequests}
            setIsAIThinking={setIsAIThinking}
            setIsAIAssisting={setIsAIAssisting}
            setAiStatus={setAiStatus}
            setCurrentPromptGoal={setCurrentPromptGoal}
            setAiInput={setAiInput}
            sendAIMessage={sendAIMessage}
            requestAIAssistance={requestAIAssistance}
            handleAcceptSuggestion={handleAcceptSuggestion}
            handleRejectSuggestion={handleRejectSuggestion}
            handleCopySuggestion={handleCopySuggestion}
            handleApplyToFile={handleApplyToFile}
            applyFileOperations={applyFileOperations}
            setMessageActions={setMessageActions}
            onResizeStart={(e) => handleResizeStart('ai-panel', e)}
            showAgentSelector={showAgentSelector}
            setShowAgentSelector={setShowAgentSelector}
            autoApply={modelSettings.autoApply}
            setAutoApply={(enabled) => {
              setModelSettings(prev => ({ ...prev, autoApply: enabled }))
              saveUserSettings()
            }}
            files={files}
            currentProjectId={currentProjectId}
            workingDir={localDirectory}
            onFilesChanged={loadFilesFromBackend}
          />
        )}

        {/* Auto App Panel on Left */}
        {autoAppPanelVisible && autoAppPanelPosition === 'left' && (
          <AutoAppPanel
            position="left"
            width={autoAppPanelWidth}
            workingDir={localDirectory}
            currentProjectId={currentProjectId}
            currentProjectName={currentProject?.name}
            onFilesChanged={loadFilesFromBackend}
            setAutoAppPanelVisible={setAutoAppPanelVisible}
            setAutoAppPanelPosition={setAutoAppPanelPosition}
            onResizeStart={(e) => handleResizeStart('auto-app-panel', e)}
            selectedAgentId={selectedAgentId}
            selectedAgentIds={selectedAgentIds}
            selectedGpu={selectedGpu}
            agents={agents}
            setSelectedAgentId={setSelectedAgentId}
            setSelectedAgentIds={setSelectedAgentIds}
            requestAIAssistance={requestAIAssistance}
            applyFileOperations={applyFileOperations}
            isAIAssisting={isAIAssisting}
            isAIThinking={isAIThinking}
            aiStatus={aiStatus}
            aiMessages={aiMessages}
          />
        )}
        {/* Auto App Panel Resize Handle (right side - after left panel) */}
        {autoAppPanelVisible && autoAppPanelPosition === 'left' && (
          <div 
            className="resize-handle resize-handle-vertical"
            onMouseDown={(e) => handleResizeStart('auto-app-panel', e)}
            style={{ cursor: 'col-resize' }}
          />
        )}

        {/* Auto App Panel on Right */}
        {autoAppPanelVisible && autoAppPanelPosition === 'right' && (
          <AutoAppPanel
            position="right"
            width={autoAppPanelWidth}
            workingDir={localDirectory}
            currentProjectId={currentProjectId}
            currentProjectName={currentProject?.name}
            onFilesChanged={loadFilesFromBackend}
            setAutoAppPanelVisible={setAutoAppPanelVisible}
            setAutoAppPanelPosition={setAutoAppPanelPosition}
            onResizeStart={(e) => handleResizeStart('auto-app-panel', e)}
            selectedAgentId={selectedAgentId}
            selectedAgentIds={selectedAgentIds}
            selectedGpu={selectedGpu}
            agents={agents}
            setSelectedAgentId={setSelectedAgentId}
            setSelectedAgentIds={setSelectedAgentIds}
            requestAIAssistance={requestAIAssistance}
            applyFileOperations={applyFileOperations}
            isAIAssisting={isAIAssisting}
            isAIThinking={isAIThinking}
            aiStatus={aiStatus}
            aiMessages={aiMessages}
          />
        )}
      </div>

      <StatusBar
        language={getPaneLanguage(activePaneId)}
        editorRef={paneEditorRefs.get(activePaneId) || editorRef}
        activeTab={activeTab}
        openTabs={openTabs}
        currentProject={currentProject}
        isAIAssisting={isAIAssisting}
        venvInfo={venvInfo}
        onSelectPythonInterpreter={() => setShowVenvManager(true)}
        onShowVenvManager={() => setShowVenvManager(true)}
      />

      {/* New Project Dialog */}
      {showNewProjectDialog && (
        <div className="modal-overlay" onClick={() => setShowNewProjectDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>New Project</h2>
              <button className="modal-close" onClick={() => setShowNewProjectDialog(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Project Name *</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="My Awesome Project"
                  autoFocus
                  onKeyPress={(e) => e.key === 'Enter' && createNewProject()}
                />
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Project description..."
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowNewProjectDialog(false)}>Cancel</button>
              <button 
                className="btn-primary" 
                onClick={async () => {
                  try {
                    await createNewProject()
                  } catch (err: any) {
                    setAiStatus(`Failed to create project: ${err.message || 'Please log in to create projects'}`)
                    setTimeout(() => setAiStatus(''), 5000)
                  }
                }} 
                disabled={!newProjectName.trim() || !currentUserId}
              >
                Create Project
              </button>
              {!currentUserId && (
                <div style={{ color: 'var(--theme-error, #f48771)', fontSize: '12px', marginTop: '8px' }}>
                  Please log in to create projects
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Open File Dialog */}
      {showOpenFileDialog && (
        <div className="modal-overlay" onClick={() => setShowOpenFileDialog(false)}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Open File</h2>
              <button className="modal-close" onClick={() => setShowOpenFileDialog(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="file-list-modal">
                {getAllFiles(files).map((file) => (
                  <div
                    key={file.path}
                    className="file-list-item"
                    onClick={() => selectFileToOpen(file.path)}
                  >
                    <img 
                      src={getFileIconUrl(file.name)} 
                      alt="" 
                      className="file-icon-img"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                        const parent = target.parentElement
                        if (parent) {
                          parent.innerHTML = `<span class="file-icon codicon codicon-file"></span>`
                        }
                      }}
                    />
                    <span className="file-path">{file.path}</span>
                  </div>
                ))}
                {getAllFiles(files).length === 0 && (
                  <div className="file-list-empty">No files in project</div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowOpenFileDialog(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Command Palette */}
      {showCommandPalette && (
        <div className="modal-overlay" onClick={() => setShowCommandPalette(false)}>
          <div className="command-palette" onClick={(e) => e.stopPropagation()}>
            <div className="command-palette-header">
              <span>Command Palette</span>
              <button className="modal-close" onClick={() => setShowCommandPalette(false)}>×</button>
            </div>
            <input
              type="text"
              className="command-palette-input"
              value={commandPaletteInput}
              onChange={(e) => setCommandPaletteInput(e.target.value)}
              placeholder="Type command name..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setShowCommandPalette(false)
                } else if (e.key === 'Enter' && filteredCommands.length > 0) {
                  filteredCommands[0].action()
                }
              }}
            />
            <div className="command-palette-list">
              {filteredCommands.map((cmd, idx) => (
                <div
                  key={idx}
                  className="command-palette-item"
                  onClick={() => cmd.action()}
                >
                  {cmd.label}
                </div>
              ))}
              {filteredCommands.length === 0 && (
                <div className="command-palette-empty">No commands found</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Dialog */}
      {showKeyboardShortcuts && (
        <div className="modal-overlay" onClick={() => setShowKeyboardShortcuts(false)}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Keyboard Shortcuts</h2>
              <button className="modal-close" onClick={() => setShowKeyboardShortcuts(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="shortcuts-list">
                <div className="shortcuts-section">
                  <h3>File</h3>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+Shift+N</span>
                    <span className="shortcut-desc">New Project</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+Shift+O</span>
                    <span className="shortcut-desc">Open Project</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+N</span>
                    <span className="shortcut-desc">New File</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+O</span>
                    <span className="shortcut-desc">Open File</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+S</span>
                    <span className="shortcut-desc">Save</span>
                  </div>
                </div>
                <div className="shortcuts-section">
                  <h3>Edit</h3>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+Z</span>
                    <span className="shortcut-desc">Undo</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+Y</span>
                    <span className="shortcut-desc">Redo</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+F</span>
                    <span className="shortcut-desc">Find</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+H</span>
                    <span className="shortcut-desc">Replace</span>
                  </div>
                </div>
                <div className="shortcuts-section">
                  <h3>View</h3>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+Shift+P</span>
                    <span className="shortcut-desc">Command Palette</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+B</span>
                    <span className="shortcut-desc">Toggle Sidebar</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+Shift+A</span>
                    <span className="shortcut-desc">Toggle AI Panel</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+`</span>
                    <span className="shortcut-desc">Toggle Terminal</span>
                  </div>
                </div>
                <div className="shortcuts-section">
                  <h3>Go</h3>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+G</span>
                    <span className="shortcut-desc">Go to Line</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+Shift+O</span>
                    <span className="shortcut-desc">Go to Symbol</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">F12</span>
                    <span className="shortcut-desc">Go to Definition</span>
                  </div>
                </div>
                <div className="shortcuts-section">
                  <h3>Run</h3>
                  <div className="shortcut-item">
                    <span className="shortcut-key">F5</span>
                    <span className="shortcut-desc">Run Code</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Shift+F5</span>
                    <span className="shortcut-desc">Stop</span>
                  </div>
                </div>
                <div className="shortcuts-section">
                  <h3>AI</h3>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Ctrl+Space</span>
                    <span className="shortcut-desc">AI Assistance</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowKeyboardShortcuts(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Dialog */}
      <ProjectManagementPanel
        isOpen={showProjectManagement}
        onClose={() => setShowProjectManagement(false)}
        projects={projects}
        currentProjectId={currentProjectId}
        currentUserId={currentUserId}
        onProjectUpdated={() => {
          loadProjects(currentUserId)
        }}
        onProjectSelected={(projectId) => {
          openProject(projectId)
        }}
      />

      {/* Project Settings Dialog */}
      <ProjectSettingsDialog
        isOpen={showProjectSettings}
        onClose={() => setShowProjectSettings(false)}
        currentProject={projects.find(p => p.id === currentProjectId)}
        currentProjectId={currentProjectId}
        currentUserId={currentUserId}
        onProjectUpdated={() => {
          loadProjects(currentUserId)
        }}
      />

      {/* Payment Dialog */}
      <PaymentDialog
        isOpen={showPaymentDialog}
        onClose={() => setShowPaymentDialog(false)}
        currentUserId={currentUserId}
      />
      
      {/* Git Dialog */}
      <GitDialog
        isOpen={showGitDialog}
        onClose={() => setShowGitDialog(false)}
        currentProjectId={currentProjectId}
        currentProjectName={projects.find(p => p.id === currentProjectId)?.name || null}
        onCloneSuccess={() => {
          loadFilesFromBackend()
        }}
      />

      <SettingsDialog
        show={showSettings}
        onClose={() => setShowSettings(false)}
        settingsTab={settingsTab}
        setSettingsTab={setSettingsTab}
        modelSettings={modelSettings}
        setModelSettings={(settings) => setModelSettings(settings)}
        editorSettings={editorSettings}
        setEditorSettings={setEditorSettings}
        appearanceSettings={appearanceSettings}
        setAppearanceSettings={setAppearanceSettings}
        gitSettings={gitSettings}
        setGitSettings={setGitSettings}
        terminalSettings={terminalSettings}
        setTerminalSettings={setTerminalSettings}
        fileSettings={fileSettings}
        setFileSettings={setFileSettings}
        searchSettings={searchSettings}
        setSearchSettings={setSearchSettings}
        workspaceSettings={workspaceSettings}
        setWorkspaceSettings={setWorkspaceSettings}
        performanceSettings={performanceSettings}
        setPerformanceSettings={setPerformanceSettings}
        securitySettings={securitySettings}
        setSecuritySettings={setSecuritySettings}
        localDirectory={localDirectory}
        setLocalDirectory={setLocalDirectory}
        gitStatus={gitStatus}
        setGitStatus={setGitStatus}
        agents={agents}
        loadAgents={loadAgents}
        setShowAgentDialog={setShowAgentDialog}
        setNewAgent={setNewAgent}
        setEditingAgent={setEditingAgent}
        gpus={gpus}
        setTheme={setTheme}
        saveSettings={saveSettings}
        saveUserSettings={saveUserSettings}
        loadFilesFromBackend={loadFilesFromBackend}
      />

      {/* Execute Dialog */}
      {showExecuteDialog && (
        <div className="modal-overlay" onClick={() => setShowExecuteDialog(false)}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Execute Program</h2>
              <button className="modal-close" onClick={() => setShowExecuteDialog(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>File to Execute *</label>
                <select
                  value={executeConfig.file}
                  onChange={(e) => setExecuteConfig({ ...executeConfig, file: e.target.value })}
                >
                  <option value="">Select a file...</option>
                  {getAllFiles(files).map((file) => (
                    <option key={file.path} value={file.path}>
                      {file.path}
                    </option>
                  ))}
                  {activeTab && (
                    <option value={activeTab}>{activeTab} (Current)</option>
                  )}
                </select>
                <small>Select the file you want to execute</small>
              </div>

              <div className="form-group">
                <label>Environment</label>
                <select
                  value={executeConfig.environment}
                  onChange={(e) => setExecuteConfig({ ...executeConfig, environment: e.target.value as any })}
                >
                  <option value="local">Local (Browser)</option>
                  <option value="gpu">GPU Client</option>
                  <option value="docker">Docker Container</option>
                </select>
                <small>Choose where to execute the program</small>
              </div>

              {executeConfig.environment === 'gpu' && (
                <div className="form-group">
                  <label>GPU</label>
                  <select
                    value={selectedGpu || ''}
                    onChange={(e) => setSelectedGpu(e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">Auto Select</option>
                    {gpus.filter(g => g.is_available).map((gpu) => (
                      <option key={gpu.id} value={gpu.id}>
                        {gpu.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Interpreter/Runtime</label>
                <select
                  value={executeConfig.interpreter}
                  onChange={(e) => setExecuteConfig({ ...executeConfig, interpreter: e.target.value })}
                >
                  <option value="auto">Auto-detect</option>
                  <option value="node">Node.js</option>
                  <option value="python">Python</option>
                  <option value="bash">Bash/Shell</option>
                  <option value="docker">Docker</option>
                </select>
                <small>Runtime environment for execution</small>
              </div>

              <div className="form-group">
                <label>Command Line Arguments</label>
                <input
                  type="text"
                  value={executeConfig.arguments}
                  onChange={(e) => setExecuteConfig({ ...executeConfig, arguments: e.target.value })}
                  placeholder="--arg1 value1 --arg2 value2"
                />
                <small>Optional command line arguments</small>
              </div>

              <div className="form-group">
                <label>Working Directory</label>
                <input
                  type="text"
                  value={executeConfig.workingDirectory}
                  onChange={(e) => setExecuteConfig({ ...executeConfig, workingDirectory: e.target.value })}
                  placeholder="/project (leave empty for project root)"
                />
                <small>Working directory for execution</small>
              </div>

              <div className="form-group">
                <label>Timeout (seconds)</label>
                <input
                  type="number"
                  min="1"
                  max="3600"
                  value={executeConfig.timeout}
                  onChange={(e) => setExecuteConfig({ ...executeConfig, timeout: parseInt(e.target.value) || 30 })}
                />
                <small>Maximum execution time in seconds</small>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowExecuteDialog(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={async () => {
                  if (!executeConfig.file) {
                    return
                  }

                  const file = findFile(executeConfig.file)
                  if (!file) {
                    return
                  }

                  setShowExecuteDialog(false)
                  setShowTerminal(true)
                  setTerminalPanelTab('terminal')
                  setIsRunning(true)

                  // Build execution command
                  const fileContent = file.content || code
                  const fileName = executeConfig.file.split('/').pop() || 'program'
                  const args = executeConfig.arguments ? ` ${executeConfig.arguments}` : ''
                  const workDir = executeConfig.workingDirectory || '/project'

                  const activeTerm = terminals.find(t => t.id === activeTerminalId)
                  if (activeTerm) {
                    setTerminals(prev => prev.map(t => 
                      t.id === activeTerminalId
                        ? { 
                            ...t, 
                            output: [
                              ...t.output,
                              `$ Executing ${fileName}...`,
                              `Environment: ${executeConfig.environment}`,
                              `Interpreter: ${executeConfig.interpreter === 'auto' ? 'auto-detect' : executeConfig.interpreter}`,
                              `Working Directory: ${workDir}`,
                              `Timeout: ${executeConfig.timeout}s`,
                              `Arguments: ${args || '(none)'}`,
                              '---',
                              ''
                            ]
                          }
                        : t
                    ))
                  }

                  try {
                    // Simulate execution based on environment
                    if (executeConfig.environment === 'gpu' && selectedGpu) {
                      setTerminals(prev => prev.map(t => 
                        t.id === activeTerminalId
                          ? { ...t, output: [...t.output, `[GPU ${selectedGpu} execution would run here]`] }
                          : t
                      ))
                      // In real implementation, this would call the GPU client API
                    } else if (executeConfig.environment === 'docker') {
                      setTerminals(prev => prev.map(t => 
                        t.id === activeTerminalId
                          ? { ...t, output: [...t.output, `[Docker container execution would run here]`] }
                          : t
                      ))
                    } else {
                      // Local execution simulation
                      if (language === 'javascript' || executeConfig.interpreter === 'node') {
                        try {
                          // Create a safe execution context
                          const result = eval(fileContent)
                          setTerminals(prev => prev.map(t => 
                            t.id === activeTerminalId
                              ? { 
                                  ...t, 
                                  output: [
                                    ...t.output,
                                    ...(result !== undefined ? [`Result: ${result}`] : []),
                                    '[Execution completed successfully]'
                                  ]
                                }
                              : t
                          ))
                        } catch (err: any) {
                          setTerminals(prev => prev.map(t => 
                            t.id === activeTerminalId
                              ? { ...t, output: [...t.output, `Error: ${err.message}`] }
                              : t
                          ))
                        }
                      } else {
                        setTerminals(prev => prev.map(t => 
                          t.id === activeTerminalId
                            ? { ...t, output: [...t.output, `[Note: ${language} execution would run here]`] }
                            : t
                        ))
                      }
                    }
                  } catch (err: any) {
                    setTerminals(prev => prev.map(t => 
                      t.id === activeTerminalId
                        ? { ...t, output: [...t.output, `Execution Error: ${err.message}`] }
                        : t
                    ))
                  } finally {
                    setIsRunning(false)
                    setTimeout(() => {
                      terminalRef.current?.scrollIntoView({ behavior: 'smooth' })
                    }, 100)
                  }
                }}
                disabled={!executeConfig.file || isRunning}
              >
                {isRunning ? 'Executing...' : 'Execute'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Dialog */}
      {showAgentDialog && (
        <div className="modal-overlay" onClick={() => setShowAgentDialog(false)}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingAgent ? 'Edit Agent' : 'New Agent'}</h2>
              <button className="modal-close" onClick={() => setShowAgentDialog(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Agent Name *</label>
                <input
                  type="text"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  placeholder="My Agent"
                />
              </div>
              <div className="form-group">
                <label>Agent Type *</label>
                <select
                  value={newAgent.agent_type}
                  onChange={(e) => setNewAgent({ ...newAgent, agent_type: e.target.value as any })}
                >
                  <option value="local">Local</option>
                  <option value="client">Client GPU</option>
                  <option value="remote">Remote</option>
                  <option value="cloud">Cloud</option>
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newAgent.description}
                  onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                  placeholder="Agent description..."
                  rows={2}
                />
              </div>
              {(newAgent.agent_type === 'local' || newAgent.agent_type === 'client') && (
                <div className="form-group">
                  <label>GPU {newAgent.agent_type === 'local' ? '(Optional)' : ''}</label>
                  <select
                    value={newAgent.gpu_id || ''}
                    onChange={(e) => setNewAgent({ ...newAgent, gpu_id: e.target.value ? parseInt(e.target.value) : null })}
                  >
                    <option value="">{newAgent.agent_type === 'local' ? 'No GPU (will use default)' : 'Select GPU...'}</option>
                    {gpus.filter(g => g.is_available).map((gpu) => (
                      <option key={gpu.id} value={gpu.id}>
                        {gpu.name}
                      </option>
                    ))}
                  </select>
                  {newAgent.agent_type === 'local' && (
                    <small>Local agents can work without a GPU initially, but will need one assigned to execute queries</small>
                  )}
                </div>
              )}
              {(newAgent.agent_type === 'remote') && (
                <>
                  <div className="form-group">
                    <label>Host</label>
                    <input
                      type="text"
                      value={newAgent.host}
                      onChange={(e) => setNewAgent({ ...newAgent, host: e.target.value })}
                      placeholder="localhost"
                    />
                  </div>
                  <div className="form-group">
                    <label>Port</label>
                    <input
                      type="number"
                      value={newAgent.port}
                      onChange={(e) => setNewAgent({ ...newAgent, port: parseInt(e.target.value) })}
                      placeholder="8080"
                    />
                  </div>
                </>
              )}
              {newAgent.agent_type === 'cloud' && (
                <>
                  <div className="form-group">
                    <label>Endpoint URL</label>
                    <input
                      type="text"
                      value={newAgent.endpoint}
                      onChange={(e) => setNewAgent({ ...newAgent, endpoint: e.target.value })}
                      placeholder="https://api.example.com/v1/chat"
                    />
                  </div>
                  <div className="form-group">
                    <label>API Key</label>
                    <input
                      type="password"
                      value={newAgent.api_key}
                      onChange={(e) => setNewAgent({ ...newAgent, api_key: e.target.value })}
                      placeholder="Your API key"
                      autoComplete="off"
                    />
                  </div>
                </>
              )}
              <div className="form-group">
                <label>Model</label>
                <select
                  value={newAgent.model}
                  onChange={(e) => setNewAgent({ ...newAgent, model: e.target.value })}
                >
                  <option value="codellama">CodeLlama</option>
                  <option value="llama2">Llama 2</option>
                  <option value="mistral">Mistral</option>
                  <option value="phi">Phi</option>
                  <option value="deepseek-coder">DeepSeek Coder</option>
                </select>
              </div>
              <div className="form-group">
                <label>Temperature: {newAgent.temperature}</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={newAgent.temperature}
                  onChange={(e) => setNewAgent({ ...newAgent, temperature: parseFloat(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>Max Tokens</label>
                <input
                  type="number"
                  min="256"
                  max="8192"
                  step="256"
                  value={newAgent.max_tokens}
                  onChange={(e) => setNewAgent({ ...newAgent, max_tokens: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAgentDialog(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={async () => {
                  if (!newAgent.name.trim()) {
                    return
                  }
                  try {
                    const { codeEditorApi } = await import('../services/api')
                    // Prepare agent data - only include gpu_id if it's set
                    const agentData: any = {
                      name: newAgent.name,
                      agent_type: newAgent.agent_type,
                      description: newAgent.description,
                      model: newAgent.model,
                      max_tokens: newAgent.max_tokens,
                      temperature: newAgent.temperature
                    }
                    
                    // Add type-specific fields
                    if (newAgent.agent_type === 'local' || newAgent.agent_type === 'client') {
                      if (newAgent.gpu_id) {
                        agentData.gpu_id = newAgent.gpu_id
                      }
                    } else if (newAgent.agent_type === 'remote') {
                      agentData.host = newAgent.host
                      agentData.port = newAgent.port
                    } else if (newAgent.agent_type === 'cloud') {
                      agentData.endpoint = newAgent.endpoint
                      if (newAgent.api_key) {
                        agentData.api_key = newAgent.api_key
                      }
                    }
                    
                    if (editingAgent) {
                      await codeEditorApi.updateAgent(editingAgent.id, agentData)
                    } else {
                      await codeEditorApi.createAgent(agentData)
                    }
                    loadAgents()
                    setShowAgentDialog(false)
                  } catch (err: any) {
                    console.error(`Failed to save agent: ${err.message}`)
                  }
                }}
                disabled={!newAgent.name.trim()}
              >
                {editingAgent ? 'Update' : 'Create'} Agent
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="file-context-menu"
          style={{
            position: 'fixed',
            left: `${contextMenu!.x}px`,
            top: `${contextMenu!.y}px`,
            zIndex: 10000
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Empty space context menu (right-click on file tree background) */}
          {!contextMenu!.isFolder && contextMenu!.filePath === '/' && contextMenu!.fileName === '' && (
            <>
              <div className="context-menu-item" onClick={() => { startCreatingFile('/'); setContextMenu(null); }}>
                <span className="context-menu-icon">📄</span>
                <span>New File</span>
              </div>
              <div className="context-menu-item" onClick={() => { startCreatingFolder('/'); setContextMenu(null); }}>
                <span className="context-menu-icon">📁</span>
                <span>New Folder</span>
              </div>
              <div className="context-menu-divider"></div>
              {cutFilePath && (
                <div className="context-menu-item" onClick={async () => {
                  await handleMoveFile('/')
                  setContextMenu(null)
                }}>
                  <span className="context-menu-icon">📥</span>
                  <span>Paste (Move)</span>
                  <span className="context-menu-shortcut">Ctrl+V</span>
                </div>
              )}
              {copiedFilePath && (
                <div className="context-menu-item" onClick={async () => {
                  if (!copiedFilePath || !contextMenu) return
                  const copiedFile = findFile(copiedFilePath)
                  if (!copiedFile) return
                  
                  const newPath = `/${copiedFile.name}`
                  
                  try {
                    if (useFileSystem) {
                      const { codeEditorApi } = await import('../services/api')
                      const workingDir = localDirectory || undefined
                      const currentProject = projects.find(p => p.id === currentProjectId)
                      const projectName = currentProject?.name || undefined
                      await codeEditorApi.writeFile(newPath, copiedFile.content || '', workingDir, projectId)
                      await loadFilesFromBackend()
                    } else {
                      const existingFile = findFile(newPath)
                      if (existingFile) {
                        setFiles(prev => prev.map(f => 
                          f.path === newPath ? { ...f, content: copiedFile.content || '' } : f
                        ))
                      } else {
                        const newFile: FileNode = {
                          name: copiedFile.name,
                          type: 'file',
                          path: newPath,
                          content: copiedFile.content || ''
                        }
                        setFiles(prev => [...prev, newFile])
                      }
                      saveCurrentProject()
                    }
                    setContextMenu(null)
                  } catch (err: any) {
                    console.error(`Failed to paste file: ${err.message}`)
                  }
                }}>
                  <span className="context-menu-icon">📥</span>
                  <span>Paste (Copy)</span>
                  <span className="context-menu-shortcut">Ctrl+V</span>
                </div>
              )}
              {(cutFilePath || copiedFilePath) && <div className="context-menu-divider"></div>}
              <div className="context-menu-item" onClick={() => {
                document.getElementById('file-upload-input')?.click()
                setContextMenu(null)
              }}>
                <span className="context-menu-icon">📤</span>
                <span>Upload Files</span>
              </div>
            </>
          )}
          {/* Folder context menu */}
          {contextMenu!.isFolder && contextMenu!.fileName !== '' && (
            <>
              <div className="context-menu-item" onClick={() => { startCreatingFile(contextMenu!.filePath); setContextMenu(null); }}>
                <span className="context-menu-icon">📄</span>
                <span>New File</span>
              </div>
              <div className="context-menu-item" onClick={() => { startCreatingFolder(contextMenu!.filePath); setContextMenu(null); }}>
                <span className="context-menu-icon">📁</span>
                <span>New Folder</span>
              </div>
              <div className="context-menu-divider"></div>
              {cutFilePath && (
                <div className="context-menu-item" onClick={async () => {
                  await handleMoveFile(contextMenu!.filePath)
                  setContextMenu(null)
                }}>
                  <span className="context-menu-icon">📥</span>
                  <span>Paste (Move)</span>
                  <span className="context-menu-shortcut">Ctrl+V</span>
                </div>
              )}
              {copiedFilePath && (
                <div className="context-menu-item" onClick={async () => {
                  if (!copiedFilePath || !contextMenu) return
                  const copiedFile = findFile(copiedFilePath)
                  if (!copiedFile) return
                  
                  const newPath = contextMenu!.filePath === '/' 
                    ? `/${copiedFile.name}` 
                    : `${contextMenu!.filePath}/${copiedFile.name}`
                  
                  try {
                    if (useFileSystem) {
                      const { codeEditorApi } = await import('../services/api')
                      const workingDir = localDirectory || undefined
                      const currentProject = projects.find(p => p.id === currentProjectId)
                      const projectName = currentProject?.name || undefined
                      await codeEditorApi.writeFile(newPath, copiedFile.content || '', workingDir, projectId)
                      await loadFilesFromBackend()
                    } else {
                      const existingFile = findFile(newPath)
                      if (existingFile) {
                        setFiles(prev => prev.map(f => 
                          f.path === newPath ? { ...f, content: copiedFile.content || '' } : f
                        ))
                      } else {
                        const newFile: FileNode = {
                          name: copiedFile.name,
                          type: 'file',
                          path: newPath,
                          content: copiedFile.content || ''
                        }
                        setFiles(prev => [...prev, newFile])
                      }
                      saveCurrentProject()
                    }
                    setContextMenu(null)
                  } catch (err: any) {
                    console.error(`Failed to paste file: ${err.message}`)
                  }
                }}>
                  <span className="context-menu-icon">📥</span>
                  <span>Paste (Copy)</span>
                  <span className="context-menu-shortcut">Ctrl+V</span>
                </div>
              )}
              {(cutFilePath || copiedFilePath) && <div className="context-menu-divider"></div>}
              <div className="context-menu-item" onClick={() => {
                document.getElementById('file-upload-input')?.click()
                setContextMenu(null)
              }}>
                <span className="context-menu-icon">📤</span>
                <span>Upload Files</span>
              </div>
              <div className="context-menu-divider"></div>
              <div className="context-menu-item" onClick={handleRevealInExplorer}>
                <span className="context-menu-icon">👁️</span>
                <span>Reveal in Explorer</span>
              </div>
            </>
          )}
          {/* File context menu */}
          {!contextMenu!.isFolder && contextMenu!.fileName !== '' && (
            <>
              <div className="context-menu-item" onClick={() => { handleFileSelect(contextMenu!.filePath); setContextMenu(null); }}>
                <span className="context-menu-icon">📂</span>
                <span>Open</span>
              </div>
              <div className="context-menu-item" onClick={handleRevealInExplorer}>
                <span className="context-menu-icon">👁️</span>
                <span>Reveal in Explorer</span>
              </div>
              <div className="context-menu-divider"></div>
              <div className="context-menu-item" onClick={handleCopyFile}>
                <span className="context-menu-icon">📋</span>
                <span>Copy</span>
                <span className="context-menu-shortcut">Ctrl+C</span>
              </div>
              <div className="context-menu-item" onClick={handleCutFile}>
                <span className="context-menu-icon">✂️</span>
                <span>Cut</span>
                <span className="context-menu-shortcut">Ctrl+X</span>
              </div>
              {copiedFilePath && (
                <div className="context-menu-item" onClick={async () => {
                  if (!copiedFilePath || !contextMenu) return
                  const copiedFile = findFile(copiedFilePath)
                  if (!copiedFile) return
                  
                  const parentPath = contextMenu!.filePath.substring(0, contextMenu!.filePath.lastIndexOf('/')) || '/'
                  const newPath = `${parentPath}/${copiedFile.name}`
                  
                  try {
                    if (useFileSystem) {
                      const { codeEditorApi } = await import('../services/api')
                      const workingDir = localDirectory || undefined
                      const currentProject = projects.find(p => p.id === currentProjectId)
                      const projectName = currentProject?.name || undefined
                      await codeEditorApi.writeFile(newPath, copiedFile.content || '', workingDir, projectId)
                      await loadFilesFromBackend()
                    } else {
                      const existingFile = findFile(newPath)
                      if (existingFile) {
                        setFiles(prev => prev.map(f => 
                          f.path === newPath ? { ...f, content: copiedFile.content || '' } : f
                        ))
                      } else {
                        const newFile: FileNode = {
                          name: copiedFile.name,
                          type: 'file',
                          path: newPath,
                          content: copiedFile.content || ''
                        }
                        setFiles(prev => [...prev, newFile])
                      }
                      saveCurrentProject()
                    }
                    setContextMenu(null)
                  } catch (err: any) {
                    console.error(`Failed to paste file: ${err.message}`)
                  }
                }}>
                  <span className="context-menu-icon">📥</span>
                  <span>Paste (Copy)</span>
                  <span className="context-menu-shortcut">Ctrl+V</span>
                </div>
              )}
              <div className="context-menu-item" onClick={handleDuplicateFile}>
                <span className="context-menu-icon">📄</span>
                <span>Duplicate</span>
              </div>
              <div className="context-menu-divider"></div>
              <div className="context-menu-item" onClick={handleRenameFile}>
                <span className="context-menu-icon">✏️</span>
                <span>Rename</span>
                <span className="context-menu-shortcut">F2</span>
              </div>
              <div className="context-menu-divider"></div>
              <div className="context-menu-item delete-item" onClick={handleDeleteFile}>
                <span className="context-menu-icon">🗑️</span>
                <span>Delete</span>
                <span className="context-menu-shortcut">Del</span>
              </div>
            </>
          )}
        </div>
      )}

      {showVenvManager && (
        <div className="venv-manager-overlay" onClick={() => setShowVenvManager(false)}>
          <div className="venv-manager-modal" onClick={(e) => e.stopPropagation()}>
            <VenvManager
              workingDir={localDirectory}
              onVenvChange={(venvPath) => {
                if (venvPath) {
                  // Reload venv info
                  const detectVenv = async () => {
                    try {
                      const { codeEditorApi } = await import('../services/api')
                      const response = await codeEditorApi.detectVenv(localDirectory || '')
                      if (response.success && response.venv) {
                        setVenvInfo({
                          path: response.venv.path,
                          python_path: response.venv.python_path
                        })
                      }
                    } catch (err) {
                      console.warn('Failed to detect virtual environment:', err)
                    }
                  }
                  detectVenv()
                } else {
                  setVenvInfo(null)
                }
              }}
              onClose={() => setShowVenvManager(false)}
            />
          </div>
        </div>
      )}

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        commands={[
          // Python/Venv Commands
          {
            id: 'python.select-interpreter',
            label: 'Python: Select Interpreter',
            category: 'Python',
            shortcut: 'Ctrl+Shift+P',
            keywords: ['python', 'interpreter', 'venv', 'virtual', 'environment'],
            action: () => {
              setShowCommandPalette(false)
              setShowVenvManager(true)
            }
          },
          {
            id: 'python.create-venv',
            label: 'Python: Create Virtual Environment',
            category: 'Python',
            keywords: ['python', 'create', 'venv', 'virtual', 'environment', 'new'],
            action: () => {
              setShowCommandPalette(false)
              setShowVenvManager(true)
            }
          },
          {
            id: 'python.install-package',
            label: 'Python: Install Package',
            category: 'Python',
            keywords: ['python', 'install', 'package', 'pip'],
            action: () => {
              setShowCommandPalette(false)
              setShowVenvManager(true)
            }
          },
          {
            id: 'python.install-requirements',
            label: 'Python: Install Requirements',
            category: 'Python',
            keywords: ['python', 'install', 'requirements', 'txt'],
            action: () => {
              setShowCommandPalette(false)
              setShowVenvManager(true)
            }
          },
          // File Commands
          {
            id: 'file.new',
            label: 'File: New File',
            category: 'File',
            shortcut: 'Ctrl+N',
            keywords: ['file', 'new', 'create'],
            action: () => {
              setShowCommandPalette(false)
              startCreatingFile()
            }
          },
          {
            id: 'file.open',
            label: 'File: Open File',
            category: 'File',
            shortcut: 'Ctrl+O',
            keywords: ['file', 'open'],
            action: () => {
              setShowCommandPalette(false)
              openFileFromProject()
            }
          },
          {
            id: 'file.save',
            label: 'File: Save',
            category: 'File',
            shortcut: 'Ctrl+S',
            keywords: ['file', 'save'],
            action: () => {
              setShowCommandPalette(false)
              saveCurrentProject()
            }
          },
          // View Commands
          {
            id: 'view.command-palette',
            label: 'View: Command Palette',
            category: 'View',
            shortcut: 'Ctrl+Shift+P',
            keywords: ['command', 'palette', 'view'],
            action: () => {
              // Already open
            }
          },
          {
            id: 'view.explorer',
            label: 'View: Show Explorer',
            category: 'View',
            shortcut: 'Ctrl+Shift+E',
            keywords: ['view', 'explorer', 'sidebar'],
            action: () => {
              setShowCommandPalette(false)
              setSidebarCollapsed(false)
            }
          },
          {
            id: 'view.terminal',
            label: 'View: Toggle Terminal',
            category: 'View',
            shortcut: 'Ctrl+`',
            keywords: ['view', 'terminal', 'toggle'],
            action: () => {
              setShowCommandPalette(false)
              setShowTerminal(!showTerminal)
            }
          },
          {
            id: 'view.settings',
            label: 'Preferences: Open Settings',
            category: 'Preferences',
            shortcut: 'Ctrl+,',
            keywords: ['settings', 'preferences', 'config'],
            action: () => {
              setShowCommandPalette(false)
              setShowSettings(true)
            }
          }
        ]}
      />
      
      {/* Find in Files Dialog */}
      <FindInFiles
        isOpen={showFindInFiles}
        onClose={() => setShowFindInFiles(false)}
        files={files.map(f => ({ path: f.path, content: f.content || '' }))}
        onFileSelect={(path, line) => {
          handleFileSelect(path)
          if (line) {
            setTimeout(() => {
              const activePane = splitUtils.findPaneInTree(editorRoot, activePaneId)
              if (activePane?.monacoRef) {
                activePane.monacoRef.setPosition({ lineNumber: line, column: 1 })
                activePane.monacoRef.revealLineInCenter(line)
              }
            }, 100)
          }
        }}
      />
      
      {/* Go to Symbol Dialog */}
      {(() => {
        const activePane = splitUtils.findPaneInTree(editorRoot, activePaneId)
        const activeTabData = activePane?.tabs.find(t => t.path === activePane.activeTab)
        return (
          <GoToSymbol
            isOpen={showGoToSymbol}
            onClose={() => setShowGoToSymbol(false)}
            code={activeTabData?.content || code}
            language={activeTabData?.language || language}
            onGoToLine={(line, column) => {
              if (activePane?.monacoRef) {
                activePane.monacoRef.setPosition({ 
                  lineNumber: line, 
                  column: column || 1 
                })
                activePane.monacoRef.revealLineInCenter(line)
              }
            }}
          />
        )
      })()}
    </div>
  )
}
