import { useState, useRef } from 'react'
import type { FileNode, Project, AIMessage, EditorPaneNode, GPU } from '../types'

export function useCodeEditorState() {
  // Editor state
  const [code, setCode] = useState('// Welcome to AI Code Editor\n// Start typing and use Ctrl+Space for AI assistance\n\nfunction hello() {\n  console.log("Hello, World!");\n}')
  const [language, setLanguage] = useState('javascript')
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false)
  const [files, setFiles] = useState<FileNode[]>([])
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [openTabs, setOpenTabs] = useState<Array<{ path: string; name: string; content: string; modified: boolean }>>([])
  const [activeTab, setActiveTab] = useState<string>('')
  
  // Split editor state
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
  
  // AI state
  const [isAIAssisting, setIsAIAssisting] = useState(false)
  const [isAIThinking, setIsAIThinking] = useState(false)
  const [aiStatus, setAiStatus] = useState<string>('')
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null)
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([])
  const [aiInput, setAiInput] = useState('')
  const [currentPromptGoal, setCurrentPromptGoal] = useState<string>('')
  const [gpus, setGpus] = useState<GPU[]>([])
  const [selectedGpu, setSelectedGpu] = useState<number | null>(null)
  const [agents, setAgents] = useState<any[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null)
  const [selectedAgentIds, setSelectedAgentIds] = useState<number[]>([])
  const [queuedRequests, setQueuedRequests] = useState<any[]>([])
  const [activeAgentRequests, setActiveAgentRequests] = useState<Record<number, { status: string; agentName: string }>>({})
  const [messageActions, setMessageActions] = useState<Record<string, { accepted?: boolean; rejected?: boolean }>>({})
  
  // UI state
  const [theme, setTheme] = useState<string>('vs-dark')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [aiPanelVisible, setAiPanelVisible] = useState(false)
  const [aiPanelPosition, setAiPanelPosition] = useState<'left' | 'right'>('right')
  const [autoAppPanelVisible, setAutoAppPanelVisible] = useState(false)
  const [autoAppPanelPosition, setAutoAppPanelPosition] = useState<'left' | 'right'>('right')
  const [sidebarWidth, setSidebarWidth] = useState(250)
  const [aiPanelWidth, setAiPanelWidth] = useState(400)
  const [autoAppPanelWidth, setAutoAppPanelWidth] = useState(400)
  const [terminalHeight, setTerminalHeight] = useState(300)
  const [isResizing, setIsResizing] = useState<{ type: 'sidebar' | 'ai-panel' | 'terminal' | null; startPos: number; startSize: number }>({ type: null, startPos: 0, startSize: 0 })
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false)
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false)
  const [showOpenFileDialog, setShowOpenFileDialog] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showVenvManager, setShowVenvManager] = useState(false)
  const [showExecuteDialog, setShowExecuteDialog] = useState(false)
  const [showAgentSelector, setShowAgentSelector] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; filePath: string; fileName: string; isFolder?: boolean } | null>(null)
  
  // Project state
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [localDirectory, setLocalDirectory] = useState('')
  const [useFileSystem, setUseFileSystem] = useState(true)
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])
  
  // File operations state
  const [editingFileName, setEditingFileName] = useState<{ path: string; parentPath: string } | null>(null)
  const [editingFileNameValue, setEditingFileNameValue] = useState('')
  const [editingFolderName, setEditingFolderName] = useState<{ path: string; parentPath: string } | null>(null)
  const [editingFolderNameValue, setEditingFolderNameValue] = useState('')
  const [renamingFile, setRenamingFile] = useState<{ path: string; name: string } | null>(null)
  const [renamingFileNameValue, setRenamingFileNameValue] = useState('')
  const [copiedFilePath, setCopiedFilePath] = useState<string | null>(null)
  const [cutFilePath, setCutFilePath] = useState<string | null>(null)
  
  // Terminal state
  const [terminalPanelTab, setTerminalPanelTab] = useState<'problems' | 'output' | 'debug' | 'terminal' | 'ports'>('terminal')
  const [isRunning, setIsRunning] = useState(false)
  const [terminals, setTerminals] = useState<Array<{ id: string; name: string; output: string[]; input: string }>>([
    { id: '1', name: 'Terminal', output: [], input: '' }
  ])
  const [activeTerminalId, setActiveTerminalId] = useState<string>('1')
  const [problems, setProblems] = useState<Array<{ file: string; line: number; severity: 'error' | 'warning' | 'info'; message: string }>>([])
  const [output, setOutput] = useState<string[]>([])
  const [debugOutput, setDebugOutput] = useState<string[]>([])
  const [ports, setPorts] = useState<Array<{ port: number; name: string; process?: string }>>([])
  
  // Settings state
  const [settingsTab, setSettingsTab] = useState<'model' | 'agents' | 'editor' | 'appearance' | 'git' | 'terminal' | 'files' | 'search' | 'workspace' | 'performance' | 'security' | 'keyboard'>('model')
  const [commandPaletteInput, setCommandPaletteInput] = useState('')
  const [executeConfig, setExecuteConfig] = useState({
    file: '',
    arguments: '',
    workingDirectory: '',
    environment: 'local' as 'local' | 'gpu' | 'docker',
    interpreter: 'auto',
    timeout: 30
  })
  
  // Other state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [venvInfo, setVenvInfo] = useState<{ path: string; python_path: string } | null>(null)
  const [codebaseAnalysis, setCodebaseAnalysis] = useState<any>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisCacheStatus, setAnalysisCacheStatus] = useState<'none' | 'cached' | 'fresh'>('none')
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
  
  // Refs
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)
  const savedAgentIdRef = useRef<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  
  return {
    // Editor
    code, setCode,
    language, setLanguage,
    showMarkdownPreview, setShowMarkdownPreview,
    files, setFiles,
    selectedFile, setSelectedFile,
    openTabs, setOpenTabs,
    activeTab, setActiveTab,
    editorRoot, setEditorRoot,
    activePaneId, setActivePaneId,
    paneCode, setPaneCode,
    paneLanguages, setPaneLanguages,
    paneEditorRefs, setPaneEditorRefs,
    paneMonacoRefs, setPaneMonacoRefs,
    editorRef, monacoRef,
    
    // AI
    isAIAssisting, setIsAIAssisting,
    isAIThinking, setIsAIThinking,
    aiStatus, setAiStatus,
    aiSuggestion, setAiSuggestion,
    aiMessages, setAiMessages,
    aiInput, setAiInput,
    currentPromptGoal, setCurrentPromptGoal,
    gpus, setGpus,
    selectedGpu, setSelectedGpu,
    agents, setAgents,
    selectedAgentId, setSelectedAgentId,
    selectedAgentIds, setSelectedAgentIds,
    queuedRequests, setQueuedRequests,
    activeAgentRequests, setActiveAgentRequests,
    messageActions, setMessageActions,
    savedAgentIdRef,
    
    // UI
    theme, setTheme,
    sidebarCollapsed, setSidebarCollapsed,
    aiPanelVisible, setAiPanelVisible,
    aiPanelPosition, setAiPanelPosition,
    autoAppPanelVisible, setAutoAppPanelVisible,
    autoAppPanelPosition, setAutoAppPanelPosition,
    sidebarWidth, setSidebarWidth,
    aiPanelWidth, setAiPanelWidth,
    autoAppPanelWidth, setAutoAppPanelWidth,
    terminalHeight, setTerminalHeight,
    isResizing, setIsResizing,
    menuOpen, setMenuOpen,
    showNewProjectDialog, setShowNewProjectDialog,
    showProjectSwitcher, setShowProjectSwitcher,
    showOpenFileDialog, setShowOpenFileDialog,
    showCommandPalette, setShowCommandPalette,
    showKeyboardShortcuts, setShowKeyboardShortcuts,
    showTerminal, setShowTerminal,
    showSettings, setShowSettings,
    showVenvManager, setShowVenvManager,
    showExecuteDialog, setShowExecuteDialog,
    showAgentSelector, setShowAgentSelector,
    contextMenu, setContextMenu,
    contextMenuRef,
    
    // Project
    projects, setProjects,
    currentProjectId, setCurrentProjectId,
    newProjectName, setNewProjectName,
    newProjectDescription, setNewProjectDescription,
    localDirectory, setLocalDirectory,
    useFileSystem, setUseFileSystem,
    expandedFolders, setExpandedFolders,
    
    // File operations
    editingFileName, setEditingFileName,
    editingFileNameValue, setEditingFileNameValue,
    editingFolderName, setEditingFolderName,
    editingFolderNameValue, setEditingFolderNameValue,
    renamingFile, setRenamingFile,
    renamingFileNameValue, setRenamingFileNameValue,
    copiedFilePath, setCopiedFilePath,
    cutFilePath, setCutFilePath,
    
    // Terminal
    terminalPanelTab, setTerminalPanelTab,
    isRunning, setIsRunning,
    terminals, setTerminals,
    activeTerminalId, setActiveTerminalId,
    problems, setProblems,
    output, setOutput,
    debugOutput, setDebugOutput,
    ports, setPorts,
    terminalRef,
    
    // Settings
    settingsTab, setSettingsTab,
    commandPaletteInput, setCommandPaletteInput,
    executeConfig, setExecuteConfig,
    
    // Other
    currentUserId, setCurrentUserId,
    venvInfo, setVenvInfo,
    codebaseAnalysis, setCodebaseAnalysis,
    isAnalyzing, setIsAnalyzing,
    analysisCacheStatus, setAnalysisCacheStatus,
    gitStatus, setGitStatus,
    editingAgent, setEditingAgent,
    showAgentDialog, setShowAgentDialog,
    newAgent, setNewAgent,
    messagesEndRef,
  }
}
