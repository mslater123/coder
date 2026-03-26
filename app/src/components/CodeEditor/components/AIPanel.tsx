import React, { useRef, useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import type { AIMessage, FileOperation, FileNode } from '../types'
import { parseMessageContent, computeDiff, type DiffLine } from '../utils'

type PromptMode = 'agent' | 'plan' | 'debug' | 'ask'

// Helper function to normalize language names for syntax highlighting
const normalizeLanguage = (lang: string | undefined): string => {
  if (!lang) return 'text'
  const normalized = lang.toLowerCase().trim()
  // Map common aliases to standard language names
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'rb': 'ruby',
    'sh': 'bash',
    'yml': 'yaml',
    'md': 'markdown',
    'json': 'json',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'xml': 'xml',
    'sql': 'sql',
    'go': 'go',
    'rs': 'rust',
    'php': 'php',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cxx': 'cpp',
    'cc': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'cs': 'csharp',
    'swift': 'swift',
    'kt': 'kotlin',
    'dart': 'dart',
    'vue': 'vue',
    'jsx': 'jsx',
    'tsx': 'tsx',
  }
  return languageMap[normalized] || normalized
}

// Shared ReactMarkdown components configuration for consistent HTML formatting
const markdownComponents = {
  h1: ({node, ...props}: any) => <h1 className="ai-markdown-h1" {...props} />,
  h2: ({node, ...props}: any) => <h2 className="ai-markdown-h2" {...props} />,
  h3: ({node, ...props}: any) => <h3 className="ai-markdown-h3" {...props} />,
  h4: ({node, ...props}: any) => <h4 className="ai-markdown-h4" {...props} />,
  h5: ({node, ...props}: any) => <h5 className="ai-markdown-h5" {...props} />,
  h6: ({node, ...props}: any) => <h6 className="ai-markdown-h6" {...props} />,
  p: ({node, ...props}: any) => <p className="ai-markdown-p" {...props} />,
  code: ({node, inline, ...props}: any) => 
    inline ? (
      <code className="inline-code" {...props} />
    ) : (
      <code {...props} />
    ),
  pre: ({node, ...props}: any) => <pre className="ai-markdown-pre" {...props} />,
  ul: ({node, ...props}: any) => <ul className="ai-markdown-ul" {...props} />,
  ol: ({node, ...props}: any) => <ol className="ai-markdown-ol" {...props} />,
  li: ({node, ...props}: any) => <li className="ai-markdown-li" {...props} />,
  blockquote: ({node, ...props}: any) => <blockquote className="ai-markdown-blockquote" {...props} />,
  a: ({node, ...props}: any) => <a className="ai-message-link" target="_blank" rel="noopener noreferrer" {...props} />,
  strong: ({node, ...props}: any) => <strong className="ai-markdown-strong" {...props} />,
  em: ({node, ...props}: any) => <em className="ai-markdown-em" {...props} />,
  table: ({node, ...props}: any) => <table className="ai-message-table" {...props} />,
  thead: ({node, ...props}: any) => <thead {...props} />,
  tbody: ({node, ...props}: any) => <tbody {...props} />,
  tr: ({node, ...props}: any) => <tr {...props} />,
  th: ({node, ...props}: any) => <th {...props} />,
  td: ({node, ...props}: any) => <td {...props} />,
  hr: ({node, ...props}: any) => <hr className="ai-message-hr" {...props} />,
  del: ({node, ...props}: any) => <del {...props} />,
  mark: ({node, ...props}: any) => <mark {...props} />,
  img: ({node, ...props}: any) => <img className="ai-message-image" {...props} style={{ maxWidth: '100%', height: 'auto', borderRadius: '6px', margin: '16px 0', border: '1px solid var(--theme-border, #3e3e42)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }} />,
  input: ({node, ...props}: any) => <input {...props} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--theme-border, #3e3e42)', background: 'var(--theme-menu-bar-bg, #2d2d30)', color: 'var(--theme-fg, #cccccc)', fontFamily: 'inherit' }} />,
  textarea: ({node, ...props}: any) => <textarea {...props} style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--theme-border, #3e3e42)', background: 'var(--theme-menu-bar-bg, #2d2d30)', color: 'var(--theme-fg, #cccccc)', fontFamily: 'inherit' }} />,
  button: ({node, ...props}: any) => <button {...props} style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--theme-accent, #007acc)', background: 'var(--theme-accent, #007acc)', color: 'white', cursor: 'pointer', fontSize: '14px' }} />,
  details: ({node, ...props}: any) => <details {...props} />,
  summary: ({node, ...props}: any) => <summary {...props} />,
  dl: ({node, ...props}: any) => <dl {...props} />,
  dt: ({node, ...props}: any) => <dt {...props} />,
  dd: ({node, ...props}: any) => <dd {...props} />,
  figure: ({node, ...props}: any) => <figure {...props} />,
  figcaption: ({node, ...props}: any) => <figcaption {...props} />,
  time: ({node, ...props}: any) => <time {...props} />,
  small: ({node, ...props}: any) => <small {...props} />,
  big: ({node, ...props}: any) => <big {...props} />,
  cite: ({node, ...props}: any) => <cite {...props} />,
  q: ({node, ...props}: any) => <q {...props} />,
  abbr: ({node, ...props}: any) => <abbr {...props} />,
  sub: ({node, ...props}: any) => <sub {...props} />,
  sup: ({node, ...props}: any) => <sup {...props} />,
  kbd: ({node, ...props}: any) => <kbd {...props} />,
  s: ({node, ...props}: any) => <s {...props} />,
  u: ({node, ...props}: any) => <u {...props} />,
  ins: ({node, ...props}: any) => <ins {...props} />,
  address: ({node, ...props}: any) => <address {...props} />,
  video: ({node, ...props}: any) => <video className="ai-message-video" {...props} style={{ maxWidth: '100%', height: 'auto', borderRadius: '6px', margin: '16px 0', border: '1px solid var(--theme-border, #3e3e42)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }} />,
  iframe: ({node, ...props}: any) => <iframe className="ai-message-iframe" {...props} style={{ maxWidth: '100%', borderRadius: '6px', margin: '16px 0', border: '1px solid var(--theme-border, #3e3e42)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)' }} />,
  select: ({node, ...props}: any) => <select {...props} style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--theme-border, #3e3e42)', background: 'var(--theme-menu-bar-bg, #2d2d30)', color: 'var(--theme-fg, #cccccc)', fontFamily: 'inherit' }} />,
  fieldset: ({node, ...props}: any) => <fieldset {...props} style={{ border: '1px solid var(--theme-border, #3e3e42)', borderRadius: '4px', padding: '12px', margin: '16px 0' }} />,
  legend: ({node, ...props}: any) => <legend {...props} style={{ padding: '0 8px', color: 'var(--theme-fg, #cccccc)', fontWeight: '600' }} />,
  b: ({node, ...props}: any) => <strong className="ai-markdown-strong" {...props} />,
  i: ({node, ...props}: any) => <em className="ai-markdown-em" {...props} />,
  center: ({node, ...props}: any) => <div style={{ textAlign: 'center' }} {...props} />,
  ruby: ({node, ...props}: any) => <ruby {...props} />,
  rt: ({node, ...props}: any) => <rt {...props} />,
  rp: ({node, ...props}: any) => <rp {...props} />,
  wbr: ({node, ...props}: any) => <wbr {...props} />,
  samp: ({node, ...props}: any) => <samp {...props} style={{ fontFamily: 'Consolas, Monaco, monospace', background: 'rgba(0, 122, 204, 0.15)', padding: '2px 6px', borderRadius: '3px' }} />,
  var: ({node, ...props}: any) => <var {...props} style={{ fontStyle: 'italic', color: 'var(--theme-accent, #4ec9b0)' }} />,
  dfn: ({node, ...props}: any) => <dfn {...props} style={{ fontStyle: 'italic', fontWeight: '600' }} />,
  data: ({node, ...props}: any) => <data {...props} />,
  meter: ({node, ...props}: any) => <meter {...props} style={{ width: '100%', height: '20px' }} />,
  progress: ({node, ...props}: any) => <progress {...props} style={{ width: '100%', height: '20px' }} />,
  output: ({node, ...props}: any) => <output {...props} style={{ fontFamily: 'Consolas, Monaco, monospace', background: 'rgba(0, 122, 204, 0.1)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--theme-border, #3e3e42)' }} />,
  template: ({node, ...props}: any) => <template {...props} />,
  slot: ({node, ...props}: any) => <slot {...props} />,
  main: ({node, ...props}: any) => <main {...props} />,
  section: ({node, ...props}: any) => <section {...props} />,
  article: ({node, ...props}: any) => <article {...props} />,
  aside: ({node, ...props}: any) => <aside {...props} />,
  nav: ({node, ...props}: any) => <nav {...props} />,
  header: ({node, ...props}: any) => <header {...props} />,
  footer: ({node, ...props}: any) => <footer {...props} />,
  audio: ({node, ...props}: any) => <audio className="ai-message-audio" {...props} style={{ width: '100%', margin: '16px 0', borderRadius: '6px' }} />,
  source: ({node, ...props}: any) => <source {...props} />,
  track: ({node, ...props}: any) => <track {...props} />,
  canvas: ({node, ...props}: any) => <canvas className="ai-message-canvas" {...props} style={{ maxWidth: '100%', border: '1px solid var(--theme-border, #3e3e42)', borderRadius: '6px', margin: '16px 0' }} />,
  svg: ({node, ...props}: any) => <svg className="ai-message-svg" {...props} style={{ maxWidth: '100%', height: 'auto', margin: '16px 0' }} />,
  object: ({node, ...props}: any) => <object className="ai-message-object" {...props} style={{ maxWidth: '100%', border: '1px solid var(--theme-border, #3e3e42)', borderRadius: '6px', margin: '16px 0' }} />,
  embed: ({node, ...props}: any) => <embed className="ai-message-embed" {...props} style={{ maxWidth: '100%', border: '1px solid var(--theme-border, #3e3e42)', borderRadius: '6px', margin: '16px 0' }} />,
  param: ({node, ...props}: any) => <param {...props} />,
  map: ({node, ...props}: any) => <map {...props} />,
  area: ({node, ...props}: any) => <area {...props} />,
  optgroup: ({node, ...props}: any) => <optgroup {...props} style={{ color: 'var(--theme-fg, #cccccc)' }} />,
  option: ({node, ...props}: any) => <option {...props} style={{ background: 'var(--theme-menu-bar-bg, #2d2d30)', color: 'var(--theme-fg, #cccccc)' }} />,
  label: ({node, ...props}: any) => <label {...props} style={{ color: 'var(--theme-fg, #cccccc)', cursor: 'pointer' }} />,
  datalist: ({node, ...props}: any) => <datalist {...props} />,
  dialog: ({node, ...props}: any) => <dialog {...props} style={{ background: 'var(--theme-menu-dropdown-bg, #252526)', color: 'var(--theme-fg, #cccccc)', border: '1px solid var(--theme-border, #3e3e42)', borderRadius: '8px', padding: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)' }} />,
  menu: ({node, ...props}: any) => <menu {...props} style={{ listStyle: 'none', padding: '8px 0', margin: '8px 0' }} />,
  menuitem: ({node, ...props}: any) => <menuitem {...props} style={{ display: 'block', padding: '6px 12px', cursor: 'pointer', borderRadius: '4px' }} />,
}

// CodeBlock component with syntax highlighting
const CodeBlock: React.FC<{ language?: string; content: string; isStreaming?: boolean }> = ({ language, content, isStreaming }) => {
  if (!content || content.trim() === '') {
    return (
      <pre className="code-block">
        <code>{'\u00A0'}</code>
      </pre>
    )
  }
  
  const normalizedLang = normalizeLanguage(language)
  
  try {
    return (
      <SyntaxHighlighter
        language={normalizedLang}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: '12px',
          borderRadius: 0,
          background: 'var(--theme-bg, #1e1e1e)',
          fontSize: '12px',
          lineHeight: '1.5',
        }}
        PreTag="div"
        codeTagProps={{
          style: {
            fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
          }
        }}
        showLineNumbers={false}
        wrapLines={true}
        wrapLongLines={true}
      >
        {content}
      </SyntaxHighlighter>
    )
  } catch (error) {
    // Fallback to plain code if syntax highlighting fails
    console.warn('Syntax highlighting failed:', error)
    return (
      <pre className="code-block">
        <code>{content}</code>
      </pre>
    )
  }
}

interface AIPanelProps {
  position: 'left' | 'right'
  width: number
  selectedAgentId: number | null
  selectedAgentIds: number[]
  selectedGpu: number | null
  agents: any[]
  queuedRequests: Array<{ id: string; prompt: string; status: string }>
  activeAgentRequests: Record<number, { status: string; agentName: string }>
  currentPromptGoal: string
  activeTab: string
  language: string
  isAIThinking: boolean
  isAIAssisting: boolean
  aiStatus: string
  aiMessages: AIMessage[]
  aiInput: string
  messageActions: Record<string, { accepted?: boolean; rejected?: boolean }>
  formatInlineMarkdown: (text: string) => string
  setAiPanelPosition: (position: 'left' | 'right') => void
  setAiPanelVisible: (visible: boolean) => void
  setSelectedAgentId: (id: number | null) => void
  setQueuedRequests: React.Dispatch<React.SetStateAction<Array<{ id: string; prompt: string; status: string }>>>
  setIsAIThinking: (thinking: boolean) => void
  setIsAIAssisting: (assisting: boolean) => void
  setAiStatus: (status: string) => void
  setCurrentPromptGoal: (goal: string) => void
  setAiInput: (input: string) => void
  sendAIMessage: () => void
  requestAIAssistance: (prompt?: string, images?: Array<{ dataUrl: string; type: string; name: string }>) => void
  handleAcceptSuggestion: (messageId: string) => void
  handleRejectSuggestion: (messageId: string) => void
  handleCopySuggestion: (content: string) => void
  handleApplyToFile: (content: string) => void
  applyFileOperations: (operations: FileOperation[]) => Promise<void>
  setMessageActions: React.Dispatch<React.SetStateAction<Record<string, { accepted?: boolean; rejected?: boolean }>>>
  onResizeStart: (e: React.MouseEvent) => void
  showAgentSelector: boolean
  setShowAgentSelector: (show: boolean) => void
  setSelectedAgentIds: (ids: number[]) => void
  setSelectedGpu: (gpu: number | null) => void
  gpus: any[]
  autoApply: boolean
  setAutoApply: (enabled: boolean) => void
  files?: FileNode[]
  currentProjectId?: string | null
  workingDir?: string
  onFilesChanged?: () => void
}

export const AIPanel: React.FC<AIPanelProps> = ({
  position,
  width,
  selectedAgentId,
  selectedAgentIds,
  selectedGpu,
  agents,
  gpus,
  queuedRequests,
  activeAgentRequests,
  currentPromptGoal,
  activeTab,
  language,
  isAIThinking,
  isAIAssisting,
  aiStatus,
  aiMessages,
  setAiMessages,
  aiInput,
  messageActions,
  formatInlineMarkdown,
  setAiPanelPosition,
  setAiPanelVisible,
  setSelectedAgentId,
  setSelectedAgentIds,
  setSelectedGpu,
  setQueuedRequests,
  setIsAIThinking,
  setIsAIAssisting,
  setAiStatus,
  setCurrentPromptGoal,
  setAiInput,
  sendAIMessage,
  requestAIAssistance,
  handleAcceptSuggestion,
  handleRejectSuggestion,
  handleCopySuggestion,
  handleApplyToFile,
  applyFileOperations,
  setMessageActions,
  onResizeStart,
  showAgentSelector,
  setShowAgentSelector,
  workingDir,
  onFilesChanged,
  autoApply,
  setAutoApply,
  files = [],
  currentProjectId
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const agentSelectorRef = useRef<HTMLDivElement>(null)
  const agentMenuRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const filePickerRef = useRef<HTMLDivElement>(null)
  const [promptMode, setPromptMode] = useState<PromptMode>('ask')
  const [showAgentMenu, setShowAgentMenu] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<Array<{ file: File; preview: string; dataUrl: string }>>([])
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [filePickerQuery, setFilePickerQuery] = useState('')
  const [filePickerPosition, setFilePickerPosition] = useState({ top: 0, left: 0 })
  const [referencedFiles, setReferencedFiles] = useState<Array<{ path: string; name: string }>>([])
  const [availableFiles, setAvailableFiles] = useState<Array<{ path: string; name: string }>>([])
  const [contextMenuType, setContextMenuType] = useState<'files' | 'folders' | 'all'>('all')
  const [selectedMenuIndex, setSelectedMenuIndex] = useState(0)
  const [isDragOverPrompt, setIsDragOverPrompt] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState(false)
  const chatMenuRef = useRef<HTMLDivElement>(null)

  // Flatten file tree to get all files
  const getAllFiles = (fileNodes: FileNode[]): Array<{ path: string; name: string }> => {
    const result: Array<{ path: string; name: string }> = []
    const traverse = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.type === 'file') {
          result.push({ path: node.path, name: node.name })
        }
        if (node.children) {
          traverse(node.children)
        }
      }
    }
    traverse(fileNodes)
    return result
  }

  // Get all folders from file tree
  const getAllFolders = (fileNodes: FileNode[]): Array<{ path: string; name: string }> => {
    const result: Array<{ path: string; name: string }> = []
    const traverse = (nodes: FileNode[], parentPath: string = '') => {
      for (const node of nodes) {
        if (node.type === 'directory' && node.children && node.children.length > 0) {
          const folderPath = parentPath ? `${parentPath}/${node.name}` : node.name
          result.push({ path: folderPath, name: node.name })
          traverse(node.children, folderPath)
        }
      }
    }
    traverse(fileNodes)
    return result
  }

  const availableFolders = files && files.length > 0 ? getAllFolders(files) : []

  // Get context menu items based on type and query
  const getContextMenuItems = (): Array<{ type: 'file' | 'folder' | 'section'; path: string; name: string; icon: string }> => {
    const query = filePickerQuery.replace(/^(file:|folder:|dir:|f:|d:)/, '').toLowerCase()
    const items: Array<{ type: 'file' | 'folder' | 'section'; path: string; name: string; icon: string }> = []

    if (contextMenuType === 'all' || contextMenuType === 'files') {
      const filteredFiles = availableFiles
        .filter(file => 
          file.name.toLowerCase().includes(query) || 
          file.path.toLowerCase().includes(query)
        )
        .slice(0, 8)
        .map(file => ({ type: 'file' as const, path: file.path, name: file.name, icon: '📄' }))
      items.push(...filteredFiles)
    }

    if (contextMenuType === 'all' || contextMenuType === 'folders') {
      const filteredFolders = availableFolders
        .filter(folder => 
          folder.name.toLowerCase().includes(query) || 
          folder.path.toLowerCase().includes(query)
        )
        .slice(0, 8)
        .map(folder => ({ type: 'folder' as const, path: folder.path, name: folder.name, icon: '📁' }))
      items.push(...filteredFolders)
    }

    return items
  }

  // Handle context menu item selection
  const handleContextMenuItemSelect = (item: { type: 'file' | 'folder' | 'section'; path: string; name: string }) => {
    const cursorPos = textareaRef.current?.selectionStart || 0
    const textBeforeCursor = aiInput.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const textAfter = aiInput.substring(cursorPos)
      const newText = 
        aiInput.substring(0, lastAtIndex) + 
        `@${item.name} ` + 
        textAfter
      
      setAiInput(newText)
      setShowFilePicker(false)
      setFilePickerQuery('')
      setContextMenuType('all')
      setSelectedMenuIndex(0)
      
      // Add to referenced files if it's a file
      if (item.type === 'file' && !referencedFiles.find(f => f.path === item.path)) {
        setReferencedFiles(prev => [...prev, { path: item.path, name: item.name }])
      }
      
      // Focus textarea and set cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = lastAtIndex + item.name.length + 2
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
        }
      }, 0)
    }
  }

  // Load available files when component mounts or files change
  useEffect(() => {
    if (files && files.length > 0) {
      const allFiles = getAllFiles(files)
      setAvailableFiles(allFiles)
    } else {
      // Try to load files from API if not provided
      const loadFiles = async () => {
        // Only load files if we have a project selected
        if (!currentProjectId) {
          return
        }
        
        try {
          const { codeEditorApi } = await import('../../../services/api')
          const response = await codeEditorApi.listFiles(undefined, workingDir, currentProjectId)
          if (response.success) {
            const fileList = response.files
              .filter(f => f.type === 'file')
              .map(f => ({ path: f.path, name: f.name }))
            setAvailableFiles(fileList)
          }
        } catch (err) {
          // Silently handle errors - this is expected when no project is selected
          // Only log if it's not a "project required" error
          if (err instanceof Error && !err.message.includes('Project ID is required')) {
            console.warn('Failed to load files for @ mention:', err)
          }
        }
      }
      
      // Only load files if project is selected
      if (currentProjectId) {
        loadFiles()
      }
    }
  }, [files, workingDir, currentProjectId])

  // Close agent selector and file picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (agentSelectorRef.current && !agentSelectorRef.current.contains(event.target as Node)) {
        setShowAgentSelector(false)
      }
      if (agentMenuRef.current && !agentMenuRef.current.contains(event.target as Node)) {
        setShowAgentMenu(false)
      }
      if (chatMenuRef.current && !chatMenuRef.current.contains(event.target as Node)) {
        setShowChatMenu(false)
      }
      if (filePickerRef.current && !filePickerRef.current.contains(event.target as Node)) {
        setShowFilePicker(false)
        setFilePickerQuery('')
        setContextMenuType('all')
        setSelectedMenuIndex(0)
      }
    }

    if (showAgentSelector || showAgentMenu || showFilePicker || showChatMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showAgentSelector, showAgentMenu, showFilePicker, showChatMenu, setShowAgentSelector])

  // Auto-scroll to selected menu item
  useEffect(() => {
    if (showFilePicker && filePickerRef.current) {
      const selectedItem = filePickerRef.current.querySelector(`.ai-context-menu-item.selected`)
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedMenuIndex, showFilePicker])

  const scrollToBottom = React.useCallback(() => {
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
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [aiMessages.length, scrollToBottom])

  // Calculate content length and streaming state for change detection
  const totalContentLength = aiMessages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0)
  const hasStreaming = aiMessages.some(msg => msg.isStreaming)
  const streamingCount = aiMessages.filter(msg => msg.isStreaming).length

  // Auto-scroll when message content changes (for streaming messages)
  const contentCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastContentLengthRef = useRef(0)
  const lastStreamingCountRef = useRef(0)
  
  useEffect(() => {
    // Clear any pending check
    if (contentCheckRef.current) {
      clearTimeout(contentCheckRef.current)
    }
    
    // Debounce content checks to avoid excessive scrolling
    contentCheckRef.current = setTimeout(() => {
      // Check if content length changed or if streaming
      if (totalContentLength !== lastContentLengthRef.current || streamingCount !== lastStreamingCountRef.current || hasStreaming) {
        scrollToBottom()
        lastContentLengthRef.current = totalContentLength
        lastStreamingCountRef.current = streamingCount
      }
    }, 100) // Check every 100ms for content changes

    return () => {
      if (contentCheckRef.current) {
        clearTimeout(contentCheckRef.current)
      }
    }
  }, [aiMessages.length, totalContentLength, streamingCount, hasStreaming, scrollToBottom])

  // Scroll when AI starts/stops thinking or assisting
  useEffect(() => {
    if (isAIAssisting || isAIThinking) {
      scrollToBottom()
    }
  }, [isAIAssisting, isAIThinking, scrollToBottom])

  // Continuous auto-scroll during streaming for smooth updates
  useEffect(() => {
    if (hasStreaming) {
      const scrollInterval = setInterval(() => {
        scrollToBottom()
      }, 300) // Scroll every 300ms during streaming
      
      return () => clearInterval(scrollInterval)
    }
  }, [hasStreaming, scrollToBottom])

  // Auto-apply file operations when autoApply is enabled
  // NOTE: Skip auto-apply if operations are being handled by AutoImprovementPanel (build process)
  useEffect(() => {
    if (!autoApply) return

    // Find messages with file operations that haven't been applied yet
    aiMessages.forEach(msg => {
      if (msg.role === 'assistant' && 
          msg.parsed?.hasOperations && 
          msg.parsed.fileOperations.length > 0 &&
          !messageActions[msg.id]?.accepted && 
          !messageActions[msg.id]?.rejected) {
        // Check if this message is from a build process (AutoImprovementPanel handles these)
        // We can detect this by checking if the message content mentions build stages
        const isBuildProcess = msg.content?.includes('Build Stage') || 
                               msg.content?.includes('stage-') ||
                               msg.content?.includes('Building stage')
        
        if (isBuildProcess) {
          // Skip auto-apply for build process messages - AutoImprovementPanel handles these
          return
        }
        
        // Small delay to ensure message is fully processed
        const timer = setTimeout(async () => {
          try {
            await applyFileOperations(msg.parsed.fileOperations)
            setMessageActions(prev => ({ ...prev, [msg.id]: { accepted: true } }))
          } catch (err) {
            console.error('Failed to auto-apply file operations:', err)
          }
        }, 500)
        return () => clearTimeout(timer)
      }
    })
  }, [aiMessages, autoApply, messageActions, applyFileOperations])

  return (
    <>
      {position === 'left' && (
        <div 
          className="resize-handle resize-handle-vertical"
          onMouseDown={onResizeStart}
          style={{ cursor: 'col-resize' }}
        />
      )}
      <div className="ai-panel cursor-style" style={{ width: width + 'px' }}>
        <div className="ai-panel-header">
          <div className="ai-panel-header-left">
            {queuedRequests.length > 0 && (
              <div className="queue-badge">
                {queuedRequests.length} in queue
              </div>
            )}
            <div className="auto-apply-toggle-container">
              <label className="auto-apply-toggle">
                <input
                  type="checkbox"
                  checked={autoApply}
                  onChange={(e) => setAutoApply(e.target.checked)}
                  title={autoApply ? 'Auto-apply enabled: Changes will be applied automatically' : 'Auto-apply disabled: You will need to accept changes manually'}
                />
                <span className="auto-apply-label">
                  {autoApply ? '✓ Auto-Apply' : 'Auto-Apply'}
                </span>
              </label>
            </div>
          </div>
          <div className="ai-panel-controls">
            {/* Chat Menu - Cursor Style */}
            {aiMessages.length > 0 && (
              <div className="chat-menu-container" ref={chatMenuRef}>
                <button
                  className="chat-menu-btn"
                  onClick={() => setShowChatMenu(!showChatMenu)}
                  title="Chat options"
                >
                  ⋮
                </button>
                {showChatMenu && (
                  <div className="chat-menu-dropdown">
                    <button
                      className="chat-menu-item"
                      onClick={() => {
                        // Clear chat messages
                        setAiMessages([])
                        setMessageActions({})
                        setReferencedFiles([])
                        setShowChatMenu(false)
                      }}
                    >
                      🗑️ Clear Chat
                    </button>
                    <button
                      className="chat-menu-item"
                      onClick={() => {
                        // Export chat as markdown
                        const chatMarkdown = aiMessages.map(msg => {
                          if (msg.role === 'user') {
                            return `## User\n\n${msg.content}\n\n`
                          } else {
                            return `## Assistant\n\n${msg.content}\n\n`
                          }
                        }).join('---\n\n')
                        const blob = new Blob([chatMarkdown], { type: 'text/markdown' })
                        const url = URL.createObjectURL(blob)
                        const a = document.createElement('a')
                        a.href = url
                        a.download = `chat-${new Date().toISOString().split('T')[0]}.md`
                        a.click()
                        URL.revokeObjectURL(url)
                        setShowChatMenu(false)
                      }}
                    >
                      📥 Export Chat
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              className="panel-position-btn"
              onClick={() => setAiPanelPosition(position === 'left' ? 'right' : 'left')}
              title={`Move to ${position === 'left' ? 'Right' : 'Left'}`}
            >
              {position === 'left' ? '→' : '←'}
            </button>
            <button
              className="panel-hide-btn"
              onClick={() => setAiPanelVisible(false)}
              title="Hide Panel"
            >
              Hide
            </button>
            <button
              className="panel-close-btn"
              onClick={() => setAiPanelVisible(false)}
              title="Close Panel"
            >
              ×
            </button>
          </div>
        </div>
        
        {/* Processing Information - Moved to top for better visibility */}
        {/* Thinking Indicator */}
        {isAIThinking && (
          <div className="ai-thinking-panel">
            <div className="thinking-indicator">
              <div className="thinking-spinner"></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span>{aiStatus || 'Thinking...'}</span>
                {aiStatus && aiStatus.includes('Reading') && (
                  <span style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                    📖 Analyzing file contents and structure
                  </span>
                )}
                {aiStatus && aiStatus.includes('Processing') && aiStatus.includes('file') && (
                  <span style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                    ✏️ Applying changes to files
                  </span>
                )}
              </div>
            </div>
            <button 
              className="stop-thinking-btn"
              onClick={() => {
                setIsAIThinking(false)
                setIsAIAssisting(false)
                setAiStatus('')
                setCurrentPromptGoal('')
                setQueuedRequests(prev => prev.filter(q => q.status !== 'processing'))
              }}
              title="Stop thinking"
            >
              ⏹ Stop
            </button>
          </div>
        )}

        {/* Generating Indicator */}
        {isAIAssisting && !isAIThinking && (
          <div className="ai-generating">
            <div className="generating-indicator">
              <div className="generating-spinner"></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span>{aiStatus || 'Generating...'}</span>
                {aiStatus && aiStatus.includes('Reading') && (
                  <span style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                    📖 Analyzing file contents and structure
                  </span>
                )}
                {aiStatus && aiStatus.includes('Processing') && aiStatus.includes('file') && (
                  <span style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                    ✏️ Applying changes to files
                  </span>
                )}
                {aiStatus && (aiStatus.includes('Creating') || aiStatus.includes('Updating') || aiStatus.includes('Deleting')) && (
                  <span style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                    💾 Writing file changes to disk
                  </span>
                )}
              </div>
            </div>
            <button 
              className="stop-generating-btn"
              onClick={() => {
                setIsAIAssisting(false)
                setAiStatus('')
                setCurrentPromptGoal('')
                setQueuedRequests(prev => prev.filter(q => q.status !== 'processing'))
              }}
              title="Stop generating"
            >
              ⏹ Stop
            </button>
          </div>
        )}

        {/* Active Agent Requests Display */}
        {Object.keys(activeAgentRequests).length > 0 && (
          <div className="queue-panel">
            <div className="queue-header">
              <span>Active Agents ({Object.keys(activeAgentRequests).length})</span>
            </div>
            {Object.entries(activeAgentRequests).map(([agentId, info]) => (
              <div key={agentId} className="queue-item">
                <div className="queue-status-icon">
                  {info.status === 'pending' ? '⏳' : 
                   info.status === 'sending' ? '📤' :
                   info.status === 'polling' ? '🔄' :
                   info.status === 'completed' ? '✓' :
                   info.status === 'error' ? '❌' :
                   info.status === 'timeout' ? '⏱️' : '⏳'}
                </div>
                <div className="queue-prompt">
                  {info.agentName} - {info.status}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Queue Display */}
        {queuedRequests.length > 0 && (
          <div className="queue-panel">
            <div className="queue-header">
              <span>Queue ({queuedRequests.length})</span>
            </div>
            {queuedRequests.map((req) => (
              <div key={req.id} className="queue-item">
                <div className="queue-status-icon">
                  {req.status === 'pending' ? '⏳' : '🔄'}
                </div>
                <div className="queue-prompt">{req.prompt.substring(0, 60)}{req.prompt.length > 60 ? '...' : ''}</div>
                <button 
                  className="queue-cancel" 
                  onClick={() => setQueuedRequests(prev => prev.filter(q => q.id !== req.id))}
                  title="Cancel"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Prompt Goal Display - Cursor Style */}
        {currentPromptGoal ? (
          <div className="ai-context-bar">
            <span className="context-file-icon">🎯</span>
            <span className="context-file" title={currentPromptGoal}>{currentPromptGoal}</span>
            {promptMode !== 'ask' && (
              <span className="context-language" style={{ 
                background: promptMode === 'agent' ? 'rgba(0, 122, 204, 0.2)' :
                           promptMode === 'plan' ? 'rgba(33, 150, 243, 0.2)' :
                           promptMode === 'debug' ? 'rgba(255, 193, 7, 0.2)' : 'transparent',
                color: promptMode === 'agent' ? '#007acc' :
                       promptMode === 'plan' ? '#2196f3' :
                       promptMode === 'debug' ? '#ffc107' : '#858585'
              }}>
                {promptMode.toUpperCase()}
              </span>
            )}
          </div>
        ) : activeTab ? (
          <div className="ai-context-bar">
            <span className="context-file-icon">📄</span>
            <span className="context-file">{activeTab.split('/').pop()}</span>
            <span className="context-language">{language}</span>
          </div>
        ) : null}

        <div className="ai-panel-messages">
          {aiMessages.length === 0 && !isAIAssisting && !isAIThinking ? (
            <div className="ai-panel-empty">
              <div className="empty-icon">✨</div>
              <p className="empty-title">AI Assistant</p>
              <p className="empty-hint">Ask questions, get code suggestions, or use Ctrl+Space for quick assistance. Select a mode above to customize the AI's behavior.</p>
              <div className="quick-actions">
                <button className="quick-action-btn" onClick={() => requestAIAssistance('Analyze the current codebase and suggest improvements.', undefined, undefined, promptMode)}>
                  <span style={{ fontSize: '18px' }}>🔍</span>
                  <span>Analyze Codebase</span>
                </button>
                <button className="quick-action-btn" onClick={() => requestAIAssistance('Find bugs in the current file.', undefined, undefined, 'debug')}>
                  <span style={{ fontSize: '18px' }}>🐛</span>
                  <span>Find Bugs</span>
                </button>
                <button className="quick-action-btn" onClick={() => requestAIAssistance('Refactor the selected code.', undefined, undefined, 'agent')}>
                  <span style={{ fontSize: '18px' }}>♻️</span>
                  <span>Refactor Code</span>
                </button>
                <button className="quick-action-btn" onClick={() => requestAIAssistance('Add unit tests for the current file.', undefined, undefined, 'agent')}>
                  <span style={{ fontSize: '18px' }}>🧪</span>
                  <span>Add Tests</span>
                </button>
              </div>
            </div>
          ) : (() => {
            // Show all messages (both user and assistant)
            const seenIds = new Set<string>()
            const uniqueMessages = aiMessages.filter(msg => {
              if (seenIds.has(msg.id)) return false
              seenIds.add(msg.id)
              return true
            })
            
            return uniqueMessages.map((msg, msgIndex) => {
              // Handle user messages
              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="ai-message ai-message-user">
                    <div className="ai-message-content">
                      {msg.images && msg.images.length > 0 && (
                        <div className="ai-message-images">
                          {msg.images.map((img, imgIdx) => (
                            <img 
                              key={imgIdx} 
                              src={img.dataUrl} 
                              alt={img.name || `Image ${imgIdx + 1}`}
                              className="ai-message-image"
                            />
                          ))}
                        </div>
                      )}
                      {msg.content && (
                        <div className="ai-message-text">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }
              
              // For streaming messages, show content as it arrives with code detection
              // For completed messages, parse and format properly
              const isStreaming = msg.isStreaming || false
              const contentToParse = msg.parsed?.text || msg.content
              const isLastAssistantMessage = msgIndex === uniqueMessages.length - 1 && msg.role === 'assistant'
              
              // If streaming, try to detect and format code blocks in real-time
              if (isStreaming) {
                // Try to parse what we have so far (may be incomplete)
                const partialParts = parseMessageContent(contentToParse)
                const hasIncompleteCodeBlock = contentToParse.includes('```') && !contentToParse.match(/```[\s\S]*?```/g)?.length
                
                // Organize streaming content into sections (same as completed messages)
                const textParts = partialParts.filter(p => p.type === 'text' || p.type === 'blockquote' || p.type === 'hr')
                const codeParts = partialParts.filter(p => p.type === 'code')
                const hasTextContent = textParts.length > 0 && textParts.some(p => p.content.trim().length > 0)
                const hasCodeContent = codeParts.length > 0
                
                return (
                  <React.Fragment key={msg.id}>
                    <div className={`ai-message streaming`}>
                      <div className="ai-message-content">
                      {partialParts.length > 0 ? (
                        // Show parsed parts if we have complete blocks
                        <>
                          {/* Text Content Section */}
                          {hasTextContent && (
                            <div className="ai-message-section ai-message-text-section">
                              {textParts.map((part, idx) => {
                                if (part.type === 'blockquote') {
                                  return (
                                    <div key={idx} className="ai-message-blockquote">
                                      <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={markdownComponents}
                                      >
                                        {part.content}
                                      </ReactMarkdown>
                                    </div>
                                  )
                                } else if (part.type === 'hr') {
                                  return (
                                    <hr key={idx} className="ai-message-hr" />
                                  )
                            } else {
                                  return (
                                    <div key={idx} className="ai-message-text streaming-text">
                                      <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={markdownComponents}
                                      >
                                        {part.content}
                                      </ReactMarkdown>
                                    </div>
                                  )
                            }
                              })}
                              {/* Show streaming cursor on last text part if it's the last message */}
                              {isLastAssistantMessage && textParts.length > 0 && (
                                <span className="streaming-indicator">▋</span>
                              )}
                            </div>
                          )}
                          
                          {/* Code Blocks Section */}
                          {hasCodeContent && (
                            <div className="ai-message-section ai-message-code-section">
                              {codeParts.map((part, idx) => (
                                <div key={idx} className="code-block-container">
                                  {part.language && (
                                    <div className="code-block-header">
                                      <span className="code-block-language">{part.language}</span>
                                    </div>
                                  )}
                                  <CodeBlock language={part.language} content={part.content} isStreaming={isStreaming} />
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Show remaining unparsed content if there's an incomplete code block */}
                          {hasIncompleteCodeBlock && (() => {
                            const lastCompleteIndex = contentToParse.lastIndexOf('```')
                            const remainingContent = contentToParse.substring(lastCompleteIndex)
                            // Check if we're in a code block
                            const codeBlockMatches = contentToParse.match(/```/g)
                            const isInCodeBlock = codeBlockMatches && codeBlockMatches.length % 2 === 1
                            
                            if (isInCodeBlock) {
                              // Extract language if present
                              const langMatch = remainingContent.match(/```(\w+)?\n?/)
                              const language = langMatch ? langMatch[1] : ''
                              const codeContent = remainingContent.replace(/```\w*\n?/, '')
                              
                              return (
                                <div className="ai-message-section ai-message-code-section">
                                  <div className="code-block-container">
                                    {language && (
                                      <div className="code-block-header">
                                        <span className="code-block-language">{language}</span>
                                      </div>
                                    )}
                                    <div className="streaming-code-wrapper">
                                      <CodeBlock language={language} content={codeContent} isStreaming={true} />
                                      <span className="streaming-indicator">▋</span>
                                    </div>
                                  </div>
                                </div>
                              )
                            } else {
                              return (
                                <div className="ai-message-section ai-message-text-section">
                                  <div className="ai-message-text">
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      components={markdownComponents}
                                    >
                                      {remainingContent}
                                    </ReactMarkdown>
                                  </div>
                                  <span className="streaming-indicator">▋</span>
                                </div>
                              )
                            }
                          })()}
                          
                          {/* Show streaming cursor if no incomplete block and no content sections */}
                          {!hasIncompleteCodeBlock && !hasTextContent && !hasCodeContent && (
                            <span className="streaming-indicator">▋</span>
                          )}
                        </>
                      ) : (
                        // No complete blocks yet, show formatted content with ReactMarkdown
                        <div className="ai-message-section ai-message-text-section">
                          <div className="ai-message-text streaming-text">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={markdownComponents}
                            >
                              {contentToParse}
                            </ReactMarkdown>
                            <span className="streaming-indicator">▋</span>
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                    {/* Inline input removed - using fixed input at bottom instead */}
                  </React.Fragment>
                )
              }
              
              // For completed messages, parse and format normally
              const messageParts = parseMessageContent(contentToParse)
              const hasFileOperations = msg.parsed?.hasOperations && msg.parsed.fileOperations.length > 0
              
              // Filter out code blocks that match file operations to avoid duplication
              const filteredParts = hasFileOperations 
                ? messageParts.filter(part => {
                    if (part.type === 'code') {
                      const fileOps = msg.parsed?.fileOperations || []
                      // Check if this code block matches any file operation content
                      const normalizedPartContent = part.content.trim()
                      const matchesFileOp = fileOps.some(op => {
                        if (!op.content) return false
                        const normalizedOpContent = op.content.trim()
                        // Check for exact match or if the code block contains the file operation content
                        return normalizedOpContent === normalizedPartContent || 
                               normalizedPartContent.includes(normalizedOpContent) ||
                               normalizedOpContent.includes(normalizedPartContent)
                      })
                      // Filter out code blocks that match file operations
                      return !matchesFileOp
                    }
                    return true
                  })
                : messageParts
              
              // Organize content into sections
              const textParts = filteredParts.filter(p => p.type === 'text' || p.type === 'blockquote' || p.type === 'hr')
              const codeParts = filteredParts.filter(p => p.type === 'code')
              const hasTextContent = textParts.length > 0 && textParts.some(p => p.content.trim().length > 0)
              const hasCodeContent = codeParts.length > 0
              
              return (
                <React.Fragment key={msg.id}>
                  <div className={`ai-message ${messageActions[msg.id]?.accepted ? 'accepted' : ''} ${messageActions[msg.id]?.rejected ? 'rejected' : ''}`}>
                    <div className="ai-message-content">
                    {/* File Operations Section - Show first if present */}
                    {hasFileOperations && msg.parsed && (
                      <div className={`file-operations-panel ${messageActions[msg.id]?.accepted ? 'accepted' : ''} ${autoApply ? 'auto-applied' : ''}`}>
                        <div className="file-operations-header">
                          <h3 className="file-operations-title">
                            📁 File Operations
                            {msg.parsed.fileOperations.length > 0 && (
                              <span className="file-ops-count">
                                ({msg.parsed.fileOperations.length} file{msg.parsed.fileOperations.length !== 1 ? 's' : ''})
                              </span>
                            )}
                            {autoApply && messageActions[msg.id]?.accepted && (
                              <span className="auto-applied-badge">✓ Auto-applied</span>
                            )}
                          </h3>
                          {!autoApply && !messageActions[msg.id]?.accepted && (
                            <div className="file-operations-actions">
                              <button
                                className="file-op-action-btn accept-all cursor-accept-all"
                                onClick={async () => {
                                  if (msg.parsed?.fileOperations) {
                                    await applyFileOperations(msg.parsed.fileOperations)
                                    setMessageActions(prev => ({ ...prev, [msg.id]: { accepted: true } }))
                                  }
                                }}
                                title="Accept All Changes"
                              >
                                <span className="accept-all-icon">✓</span>
                                <span className="accept-all-text">Accept All</span>
                              </button>
                              <button
                                className="file-op-action-btn reject-all"
                                onClick={() => {
                                  setMessageActions(prev => ({ ...prev, [msg.id]: { rejected: true } }))
                                }}
                                title="Reject All"
                              >
                                ✗ Reject All
                              </button>
                            </div>
                          )}
                        </div>
                        
                        {/* Summary Section */}
                        {(() => {
                          const summary = {
                            create: msg.parsed.fileOperations.filter(op => op.type === 'create').length,
                            edit: msg.parsed.fileOperations.filter(op => op.type === 'edit').length,
                            delete: msg.parsed.fileOperations.filter(op => op.type === 'delete').length
                          }
                          return (
                            <div className="file-operations-summary">
                              <h4 className="file-ops-summary-title">Summary</h4>
                              <div className="file-ops-summary-stats">
                                {summary.create > 0 && <span className="summary-stat create">✨ {summary.create} new file{summary.create !== 1 ? 's' : ''}</span>}
                                {summary.edit > 0 && <span className="summary-stat edit">✏️ {summary.edit} file{summary.edit !== 1 ? 's' : ''} modified</span>}
                                {summary.delete > 0 && <span className="summary-stat delete">🗑️ {summary.delete} file{summary.delete !== 1 ? 's' : ''} deleted</span>}
                              </div>
                            </div>
                          )
                        })()}
                        
                        {/* Group operations by type */}
                        {(() => {
                          const operations = msg.parsed.fileOperations
                          const creates = operations.filter(op => op.type === 'create')
                          const edits = operations.filter(op => op.type === 'edit')
                          const deletes = operations.filter(op => op.type === 'delete')
                          
                          return (
                            <div className="file-operations-list">
                              {creates.length > 0 && (
                                <div className="file-ops-group">
                                  <h4 className="file-ops-group-title">✨ New Files</h4>
                                  {creates.map((op, opIdx) => {
                                    const lineCount = op.content ? op.content.split('\n').length : 0
                                    const charCount = op.content ? op.content.length : 0
                                    
                                    return (
                                      <div key={opIdx} className={`file-operation-item file-operation-${op.type}`}>
                                        <div className="file-operation-header">
                                          <span className="file-operation-icon">✨</span>
                                          <span className="file-operation-path" title={op.path}>{op.path}</span>
                                          <span className="file-operation-type-badge">{op.type}</span>
                                          {op.language && (
                                            <span className="file-operation-language-badge" title={`Language: ${op.language}`}>
                                              {op.language}
                                            </span>
                                          )}
                                          {lineCount > 0 && (
                                            <span className="file-operation-stats" title={`${lineCount} lines, ${charCount} characters`}>
                                              {lineCount} lines
                                            </span>
                                          )}
                                        </div>
                                        {op.description && (
                                          <div className="file-operation-description">
                                            <ReactMarkdown
                                              remarkPlugins={[remarkGfm]}
                                              components={markdownComponents}
                                            >
                                              {op.description}
                                            </ReactMarkdown>
                                          </div>
                                        )}
                                        {op.content && (
                                          <div className="file-operation-content">
                                            <div className="file-operation-content-header">
                                              <span>New file content</span>
                                            </div>
                                            <div className="file-operation-code-wrapper">
                                              <CodeBlock language={op.language} content={op.content} />
                                            </div>
                                          </div>
                                        )}
                                        <div className="file-operation-item-actions">
                                          <button
                                            className="file-op-item-btn accept"
                                            onClick={async () => {
                                              await applyFileOperations([op])
                                            }}
                                            title="Accept"
                                          >
                                            ✓ Accept
                                          </button>
                                          <button
                                            className="file-op-item-btn reject"
                                            onClick={() => {}}
                                            title="Reject"
                                          >
                                            ✗ Reject
                                          </button>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                              
                              {edits.length > 0 && (
                                <div className="file-ops-group">
                                  <h4 className="file-ops-group-title">✏️ Modified Files</h4>
                                  {edits.map((op, opIdx) => {
                                    const lineCount = op.content ? op.content.split('\n').length : 0
                                    const charCount = op.content ? op.content.length : 0
                                    const hasChanges = op.oldContent && op.content && op.oldContent !== op.content
                                    const changeStats = hasChanges && op.oldContent ? (() => {
                                      const oldLines = op.oldContent.split('\n').length
                                      const newLines = op.content.split('\n').length
                                      const added = Math.max(0, newLines - oldLines)
                                      const removed = Math.max(0, oldLines - newLines)
                                      return { added, removed, total: oldLines }
                                    })() : null
                                    
                                    return (
                                      <div key={opIdx} className={`file-operation-item file-operation-${op.type}`}>
                                        <div className="file-operation-header">
                                          <span className="file-operation-icon">✏️</span>
                                          <span className="file-operation-path" title={op.path}>{op.path}</span>
                                          <span className="file-operation-type-badge">{op.type}</span>
                                          {op.language && (
                                            <span className="file-operation-language-badge" title={`Language: ${op.language}`}>
                                              {op.language}
                                            </span>
                                          )}
                                          {lineCount > 0 && (
                                            <span className="file-operation-stats" title={`${lineCount} lines, ${charCount} characters`}>
                                              {lineCount} lines
                                              {changeStats && changeStats.added + changeStats.removed > 0 && (
                                                <span className="change-stats">
                                                  {' '}(<span className="added">+{changeStats.added}</span>/<span className="removed">-{changeStats.removed}</span>)
                                                </span>
                                              )}
                                            </span>
                                          )}
                                        </div>
                                        {op.description && (
                                          <div className="file-operation-description">
                                            <ReactMarkdown
                                              remarkPlugins={[remarkGfm]}
                                              components={markdownComponents}
                                            >
                                              {op.description}
                                            </ReactMarkdown>
                                          </div>
                                        )}
                                        {hasChanges && (
                                          <div className="file-operation-preview-note">
                                            ⚠️ This will modify existing content. Review changes below.
                                          </div>
                                        )}
                                        {op.oldContent && op.content && (() => {
                                          const diffLines = computeDiff(op.oldContent, op.content)
                                          const addedCount = diffLines.filter(l => l.type === 'added').length
                                          const removedCount = diffLines.filter(l => l.type === 'removed').length
                                          
                                          return (
                                            <div className="file-operation-diff">
                                              <div className="file-diff-header">
                                                <span className="diff-label">Line-by-line changes</span>
                                                <span className="diff-stats">
                                                  <span className="diff-stat added">+{addedCount}</span>
                                                  <span className="diff-stat removed">-{removedCount}</span>
                                                </span>
                                              </div>
                                              <div className="file-diff-content unified-diff">
                                                <pre className="diff-code">
                                                  <code>
                                                    {diffLines.map((line, idx) => {
                                                      if (line.type === 'unchanged') {
                                                        return (
                                                          <React.Fragment key={idx}>
                                                            <span className="diff-line unchanged">
                                                              <span className="diff-line-number">{line.newLineNumber}</span>
                                                              {line.content}
                                                            </span>
                                                            {'\n'}
                                                          </React.Fragment>
                                                        )
                                                      } else if (line.type === 'removed') {
                                                        return (
                                                          <React.Fragment key={idx}>
                                                            <span className="diff-line removed">
                                                              <span className="diff-line-number">{line.oldLineNumber}</span>
                                                              <span className="diff-line-prefix">-</span>
                                                              {line.content}
                                                            </span>
                                                            {'\n'}
                                                          </React.Fragment>
                                                        )
                                                      } else if (line.type === 'added') {
                                                        return (
                                                          <React.Fragment key={idx}>
                                                            <span className="diff-line added">
                                                              <span className="diff-line-number">{line.newLineNumber}</span>
                                                              <span className="diff-line-prefix">+</span>
                                                              {line.content}
                                                            </span>
                                                            {'\n'}
                                                          </React.Fragment>
                                                        )
                                                      }
                                                      return null
                                                    })}
                                                  </code>
                                                </pre>
                                              </div>
                                            </div>
                                          )
                                        })()}
                                        {!op.oldContent && op.content && (
                                          <div className="file-operation-content">
                                            <div className="file-operation-content-header">
                                              <span>Updated content</span>
                                            </div>
                                            <div className="file-operation-code-wrapper">
                                              <CodeBlock language={op.language} content={op.content} />
                                            </div>
                                          </div>
                                        )}
                                        <div className="file-operation-item-actions">
                                          <button
                                            className="file-op-item-btn accept"
                                            onClick={async () => {
                                              await applyFileOperations([op])
                                            }}
                                            title="Accept"
                                          >
                                            ✓ Accept
                                          </button>
                                          <button
                                            className="file-op-item-btn reject"
                                            onClick={() => {}}
                                            title="Reject"
                                          >
                                            ✗ Reject
                                          </button>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                              
                              {deletes.length > 0 && (
                                <div className="file-ops-group">
                                  <h4 className="file-ops-group-title">🗑️ Deleted Files</h4>
                                  {deletes.map((op, opIdx) => {
                                    return (
                                      <div key={opIdx} className={`file-operation-item file-operation-${op.type}`}>
                                        <div className="file-operation-header">
                                          <span className="file-operation-icon">🗑️</span>
                                          <span className="file-operation-path" title={op.path}>{op.path}</span>
                                          <span className="file-operation-type-badge">{op.type}</span>
                                        </div>
                                        {op.description && (
                                          <div className="file-operation-description">
                                            <ReactMarkdown
                                              remarkPlugins={[remarkGfm]}
                                              components={markdownComponents}
                                            >
                                              {op.description}
                                            </ReactMarkdown>
                                          </div>
                                        )}
                                        <div className="file-operation-delete-notice">
                                          This file will be deleted.
                                        </div>
                                        <div className="file-operation-item-actions">
                                          <button
                                            className="file-op-item-btn accept"
                                            onClick={async () => {
                                              await applyFileOperations([op])
                                            }}
                                            title="Accept"
                                          >
                                            ✓ Accept
                                          </button>
                                          <button
                                            className="file-op-item-btn reject"
                                            onClick={() => {}}
                                            title="Reject"
                                          >
                                            ✗ Reject
                                          </button>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    )}
                    
                    {/* Text Content Section */}
                    {hasTextContent && (
                      <div className="ai-message-section ai-message-text-section">
                        {textParts.map((part, idx) => {
                          if (part.type === 'blockquote') {
                            return (
                              <div key={idx} className="ai-message-blockquote">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={markdownComponents}
                                >
                                  {part.content}
                                </ReactMarkdown>
                              </div>
                            )
                          } else if (part.type === 'hr') {
                            return (
                              <hr key={idx} className="ai-message-hr" />
                            )
                          } else {
                            // Regular text content - use ReactMarkdown for better formatting
                            return (
                              <div key={idx} className="ai-message-text">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={markdownComponents}
                                >
                                  {part.content}
                                </ReactMarkdown>
                              </div>
                            )
                          }
                        })}
                      </div>
                    )}
                    
                    {/* Code Blocks Section */}
                    {hasCodeContent && (
                      <div className="ai-message-section ai-message-code-section">
                        {codeParts.map((part, idx) => (
                          <div key={idx} className="code-block-container">
                            {part.language && (
                              <div className="code-block-header">
                                <span className="code-block-language">{part.language}</span>
                              </div>
                            )}
                            <CodeBlock language={part.language} content={part.content} />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Other content types (tables, lists, headers) */}
                    {filteredParts.filter(p => p.type !== 'text' && p.type !== 'code' && p.type !== 'blockquote' && p.type !== 'hr').map((part, idx) => {
                      if (part.type === 'table' && part.tableData) {
                        return (
                          <div key={idx} className="ai-message-table-container">
                            <table className="ai-message-table">
                              <thead>
                                <tr>
                                  {part.tableData[0]?.map((cell, cellIdx) => (
                                    <th key={cellIdx}>
                                      <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                          ...markdownComponents,
                                          p: ({node, ...props}: any) => <span {...props} />,
                                        }}
                                      >
                                        {cell}
                                      </ReactMarkdown>
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {part.tableData.slice(1).map((row, rowIdx) => (
                                  <tr key={rowIdx}>
                                    {row.map((cell, cellIdx) => (
                                      <td key={cellIdx}>
                                        <ReactMarkdown
                                          remarkPlugins={[remarkGfm]}
                                          components={{
                                            ...markdownComponents,
                                            p: ({node, ...props}: any) => <span {...props} />,
                                          }}
                                        >
                                          {cell}
                                        </ReactMarkdown>
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      } else if (part.type === 'list') {
                        const items = part.content.split('\n').filter(item => item.trim())
                        return (
                          <div key={idx} className={`ai-message-list ${part.listType === 'numbered' ? 'numbered-list' : 'bullet-list'}`}>
                            {part.listType === 'numbered' ? (
                              <ol>
                                {items.map((item, itemIdx) => (
                                  <li key={itemIdx}>
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      components={{
                                        ...markdownComponents,
                                        p: ({node, ...props}: any) => <span {...props} />,
                                      }}
                                    >
                                      {item}
                                    </ReactMarkdown>
                                  </li>
                                ))}
                              </ol>
                            ) : (
                              <ul>
                                {items.map((item, itemIdx) => (
                                  <li key={itemIdx}>
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      components={{
                                        ...markdownComponents,
                                        p: ({node, ...props}: any) => <span {...props} />,
                                      }}
                                    >
                                      {item}
                                    </ReactMarkdown>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )
                      } else if (part.type === 'header') {
                        const headerLevel = Math.min(part.headerLevel || 3, 6)
                        return (
                          <div key={idx} className={`ai-message-header ai-message-header-h${headerLevel} ai-header-enhanced`}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                ...markdownComponents,
                                h1: ({node, ...props}: any) => <h1 className="ai-header-h1-enhanced" {...props} />,
                                h2: ({node, ...props}: any) => <h2 className="ai-header-h2-enhanced" {...props} />,
                                h3: ({node, ...props}: any) => <h3 className="ai-header-h3-enhanced" {...props} />,
                                h4: ({node, ...props}: any) => <h4 className="ai-header-h4-enhanced" {...props} />,
                                h5: ({node, ...props}: any) => <h5 className="ai-header-h5-enhanced" {...props} />,
                                h6: ({node, ...props}: any) => <h6 className="ai-header-h6-enhanced" {...props} />,
                                p: ({node, ...props}: any) => <span {...props} />,
                              }}
                            >
                              {part.content}
                            </ReactMarkdown>
                          </div>
                        )
                      } else {
                        return null
                      }
                    })}
                    {!messageActions[msg.id]?.accepted && !messageActions[msg.id]?.rejected && (
                      <div className="message-actions">
                        <button 
                          className="action-btn accept-btn"
                          onClick={() => handleAcceptSuggestion(msg.id)}
                          title="Accept suggestion"
                        >
                          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                          <span style={{ marginLeft: '4px', fontSize: '12px' }}>Accept</span>
                        </button>
                        <button 
                          className="action-btn apply-btn"
                          onClick={() => handleApplyToFile(msg.content)}
                          title="Apply to file"
                        >
                          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>✓✓</span>
                          <span style={{ marginLeft: '4px', fontSize: '12px' }}>Apply</span>
                        </button>
                        <button 
                          className="action-btn copy-btn"
                          onClick={() => handleCopySuggestion(msg.content)}
                          title="Copy to clipboard"
                        >
                          <span style={{ fontSize: '14px' }}>📋</span>
                          <span style={{ marginLeft: '4px', fontSize: '12px' }}>Copy</span>
                        </button>
                        <button 
                          className="action-btn reject-btn"
                          onClick={() => handleRejectSuggestion(msg.id)}
                          title="Reject suggestion"
                        >
                          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>✗</span>
                          <span style={{ marginLeft: '4px', fontSize: '12px' }}>Reject</span>
                        </button>
                      </div>
                    )}
                    {messageActions[msg.id]?.accepted && (
                      <div className="action-status accepted-status">✓ Accepted</div>
                    )}
                    {messageActions[msg.id]?.rejected && (
                      <div className="action-status rejected-status">✗ Rejected</div>
                    )}
                    </div>
                  </div>
                  {/* Inline input removed - using fixed input at bottom instead */}
                </React.Fragment>
              )
            })
          })()}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Floating Accept All button - appears when there are pending file operations */}
        {(() => {
          // Find all messages with unaccepted file operations
          const pendingOperations = aiMessages.filter(msg => 
            msg.role === 'assistant' &&
            msg.parsed?.hasOperations &&
            msg.parsed.fileOperations.length > 0 &&
            !messageActions[msg.id]?.accepted &&
            !messageActions[msg.id]?.rejected &&
            !autoApply
          )
          
          if (pendingOperations.length === 0) return null
          
          // Collect all pending operations
          const allPendingOps: FileOperation[] = []
          pendingOperations.forEach(msg => {
            if (msg.parsed?.fileOperations) {
              allPendingOps.push(...msg.parsed.fileOperations)
            }
          })
          
          const totalFiles = allPendingOps.length
          const creates = allPendingOps.filter(op => op.type === 'create').length
          const edits = allPendingOps.filter(op => op.type === 'edit').length
          const deletes = allPendingOps.filter(op => op.type === 'delete').length
          
          return (
            <div className="ai-accept-all-floating">
              <div className="ai-accept-all-content">
                <div className="ai-accept-all-info">
                  <span className="ai-accept-all-title">Pending Changes</span>
                  <span className="ai-accept-all-stats">
                    {totalFiles} file{totalFiles !== 1 ? 's' : ''}
                    {creates > 0 && ` • ${creates} new`}
                    {edits > 0 && ` • ${edits} modified`}
                    {deletes > 0 && ` • ${deletes} deleted`}
                  </span>
                </div>
                <button
                  className="ai-accept-all-btn cursor-accept-all-btn"
                  onClick={async () => {
                    // Apply all pending operations
                    for (const msg of pendingOperations) {
                      if (msg.parsed?.fileOperations) {
                        await applyFileOperations(msg.parsed.fileOperations)
                        setMessageActions(prev => ({ ...prev, [msg.id]: { accepted: true } }))
                      }
                    }
                  }}
                  title="Accept all pending file operations"
                >
                  <span className="accept-all-icon">✓</span>
                  <span className="accept-all-text">Accept All</span>
                </button>
              </div>
            </div>
          )
        })()}
        
        {/* Fixed input at bottom - always visible (Cursor-style) */}
        <div className="ai-panel-input-fixed cursor-prompt-style">
          <div 
            className={`ai-input-wrapper cursor-input-wrapper ${isDragOverPrompt ? 'drag-over' : ''}`}
            onDragEnter={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // Check if this is a file drag from the explorer
              if (e.dataTransfer.types.includes('text/plain')) {
                setIsDragOverPrompt(true)
              }
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // Check if this is a file drag from the explorer
              if (e.dataTransfer.types.includes('text/plain')) {
                e.dataTransfer.dropEffect = 'copy'
                setIsDragOverPrompt(true)
              }
            }}
            onDragLeave={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // Check if we're actually leaving the wrapper (not just moving to a child)
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX
              const y = e.clientY
              if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                setIsDragOverPrompt(false)
              }
            }}
            onDrop={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDragOverPrompt(false)
              
              // Get file path from dataTransfer
              const filePath = e.dataTransfer.getData('text/plain')
              
              if (filePath) {
                // Find the file in available files
                const file = availableFiles.find(f => f.path === filePath)
                
                if (file) {
                  // Check if file is already referenced
                  if (!referencedFiles.find(f => f.path === file.path)) {
                    // Add to referenced files
                    setReferencedFiles(prev => [...prev, file])
                    
                    // Insert @ mention in the prompt at cursor position
                    if (textareaRef.current) {
                      const cursorPos = textareaRef.current.selectionStart || aiInput.length
                      const textBefore = aiInput.substring(0, cursorPos)
                      const textAfter = aiInput.substring(cursorPos)
                      const newText = textBefore + `@${file.name} ` + textAfter
                      
                      setAiInput(newText)
                      
                      // Set cursor position after the inserted mention
                      setTimeout(() => {
                        if (textareaRef.current) {
                          const newCursorPos = cursorPos + file.name.length + 2
                          textareaRef.current.focus()
                          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
                        }
                      }, 0)
                    } else {
                      // If no cursor position, just append
                      setAiInput(prev => prev + `@${file.name} `)
                    }
                  }
                } else {
                  // File not found in available files, try to add it anyway
                  const fileName = filePath.split('/').pop() || filePath
                  const newFile = { path: filePath, name: fileName }
                  
                  if (!referencedFiles.find(f => f.path === filePath)) {
                    setReferencedFiles(prev => [...prev, newFile])
                    
                    if (textareaRef.current) {
                      const cursorPos = textareaRef.current.selectionStart || aiInput.length
                      const textBefore = aiInput.substring(0, cursorPos)
                      const textAfter = aiInput.substring(cursorPos)
                      const newText = textBefore + `@${fileName} ` + textAfter
                      
                      setAiInput(newText)
                      
                      setTimeout(() => {
                        if (textareaRef.current) {
                          const newCursorPos = cursorPos + fileName.length + 2
                          textareaRef.current.focus()
                          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
                        }
                      }, 0)
                    } else {
                      setAiInput(prev => prev + `@${fileName} `)
                    }
                  }
                }
              }
            }}
          >
            {/* Image previews */}
            {uploadedImages.length > 0 && (
              <div className="ai-uploaded-images">
                {uploadedImages.map((img, index) => (
                  <div key={index} className="ai-uploaded-image-item">
                    <img src={img.preview} alt={`Upload ${index + 1}`} className="ai-uploaded-image-preview" />
                    <button
                      className="ai-uploaded-image-remove"
                      onClick={() => {
                        URL.revokeObjectURL(img.preview)
                        setUploadedImages(prev => prev.filter((_, i) => i !== index))
                      }}
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Prompt textarea */}
            <textarea
              ref={textareaRef}
              className="ai-input-textarea cursor-prompt-input"
              value={aiInput}
              onChange={(e) => {
                const value = e.target.value
                setAiInput(value)
                
                // Detect @ mention
                const cursorPos = e.target.selectionStart
                const textBeforeCursor = value.substring(0, cursorPos)
                const lastAtIndex = textBeforeCursor.lastIndexOf('@')
                
                if (lastAtIndex !== -1) {
                  const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
                  // Check if there's a space or newline after @ (meaning @ mention is complete)
                  if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
                    setShowFilePicker(false)
                    setFilePickerQuery('')
                    setContextMenuType('all')
                    setSelectedMenuIndex(0)
                  } else {
                    // Show context menu
                    const query = textAfterAt.toLowerCase()
                    setFilePickerQuery(query)
                    setShowFilePicker(true)
                    setSelectedMenuIndex(0)
                    
                    // Determine context type based on query
                    if (query.startsWith('file:') || query.startsWith('f:')) {
                      setContextMenuType('files')
                    } else if (query.startsWith('folder:') || query.startsWith('dir:') || query.startsWith('d:')) {
                      setContextMenuType('folders')
                    } else {
                      setContextMenuType('all')
                    }
                    
                    // Calculate position for context menu
                    if (textareaRef.current) {
                      const rect = textareaRef.current.getBoundingClientRect()
                      const lineHeight = 20
                      const lines = textBeforeCursor.split('\n')
                      const currentLine = lines.length - 1
                      setFilePickerPosition({
                        top: rect.top + (currentLine * lineHeight) + lineHeight + 5,
                        left: rect.left + 10
                      })
                    }
                  }
                } else {
                  setShowFilePicker(false)
                  setFilePickerQuery('')
                  setContextMenuType('all')
                  setSelectedMenuIndex(0)
                }
              }}
              onKeyDown={(e) => {
                // Handle context menu navigation
                if (showFilePicker) {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Escape' || e.key === 'Tab') {
                    e.preventDefault()
                    if (e.key === 'Escape') {
                      setShowFilePicker(false)
                      setFilePickerQuery('')
                      setContextMenuType('all')
                      setSelectedMenuIndex(0)
                    } else if (e.key === 'ArrowDown') {
                      setSelectedMenuIndex(prev => {
                        const menuItems = getContextMenuItems()
                        return prev < menuItems.length - 1 ? prev + 1 : 0
                      })
                    } else if (e.key === 'ArrowUp') {
                      setSelectedMenuIndex(prev => {
                        const menuItems = getContextMenuItems()
                        return prev > 0 ? prev - 1 : menuItems.length - 1
                      })
                    } else if (e.key === 'Enter' || e.key === 'Tab') {
                      const menuItems = getContextMenuItems()
                      if (menuItems[selectedMenuIndex]) {
                        handleContextMenuItemSelect(menuItems[selectedMenuIndex])
                      }
                    }
                    return
                  }
                }
                
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if ((aiInput.trim() || uploadedImages.length > 0) && !isAIAssisting && !isAIThinking && (selectedAgentId || selectedGpu || selectedAgentIds.length > 0)) {
                    const imageData = uploadedImages.map(img => ({
                      dataUrl: img.dataUrl,
                      type: img.file.type,
                      name: img.file.name
                    }))
                    requestAIAssistance(aiInput, imageData, referencedFiles, promptMode)
                    setAiInput('')
                    setReferencedFiles([])
                    // Clear images after sending
                    uploadedImages.forEach(img => URL.revokeObjectURL(img.preview))
                    setUploadedImages([])
                  }
                }
              }}
              placeholder={
                promptMode === 'agent' ? 'Tell the agent what to do... (Enter to send, Shift+Enter for new line, @ to add context)' :
                promptMode === 'plan' ? 'Describe what you want to build or accomplish... (Enter to send, Shift+Enter for new line, @ to add context)' :
                promptMode === 'debug' ? 'Describe the issue or error you\'re experiencing... (Enter to send, Shift+Enter for new line, @ to add context)' :
                'Ask a question... (Enter to send, Shift+Enter for new line, @ to add context)'
              }
              disabled={isAIAssisting || isAIThinking || (selectedAgentIds.length === 0 && !selectedAgentId && !selectedGpu)}
              rows={1}
              style={{ 
                minHeight: '60px',
                maxHeight: '200px',
                overflowY: 'auto',
                resize: 'none'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = `${Math.min(target.scrollHeight, 200)}px`
              }}
            />
            
            {/* Context menu dropdown */}
            {showFilePicker && (() => {
              const menuItems = getContextMenuItems()
              const query = filePickerQuery.replace(/^(file:|folder:|dir:|f:|d:)/, '').toLowerCase()
              
              return (
                <div 
                  ref={filePickerRef}
                  className="ai-context-menu"
                  style={{
                    position: 'fixed',
                    top: `${filePickerPosition.top}px`,
                    left: `${filePickerPosition.left}px`,
                    zIndex: 10000
                  }}
                >
                  <div className="ai-context-menu-header">
                    <span>Add context</span>
                    {contextMenuType === 'all' && (
                      <div className="ai-context-menu-hint">
                        Type <kbd>file:</kbd> or <kbd>folder:</kbd> to filter
                      </div>
                    )}
                  </div>
                  {menuItems.length > 0 ? (
                    <div className="ai-context-menu-list">
                      {menuItems.map((item, index) => (
                        <div
                          key={`${item.type}-${item.path}`}
                          className={`ai-context-menu-item ${index === selectedMenuIndex ? 'selected' : ''}`}
                          onClick={() => handleContextMenuItemSelect(item)}
                          onMouseEnter={() => setSelectedMenuIndex(index)}
                        >
                          <span className="ai-context-menu-icon">{item.icon}</span>
                          <div className="ai-context-menu-info">
                            <div className="ai-context-menu-name">{item.name}</div>
                            <div className="ai-context-menu-path">{item.path}</div>
                          </div>
                          <span className="ai-context-menu-type">{item.type === 'file' ? 'File' : 'Folder'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ai-context-menu-empty">
                      <div className="ai-context-menu-empty-icon">🔍</div>
                      <div className="ai-context-menu-empty-text">No {contextMenuType === 'files' ? 'files' : contextMenuType === 'folders' ? 'folders' : 'items'} found</div>
                      {query && (
                        <div className="ai-context-menu-empty-hint">Try a different search term</div>
                      )}
                    </div>
                  )}
                  {contextMenuType === 'all' && menuItems.length > 0 && (
                    <div className="ai-context-menu-footer">
                      <div className="ai-context-menu-shortcuts">
                        <span className="ai-context-menu-shortcut">
                          <kbd>↑</kbd><kbd>↓</kbd> Navigate
                        </span>
                        <span className="ai-context-menu-shortcut">
                          <kbd>Enter</kbd> Select
                        </span>
                        <span className="ai-context-menu-shortcut">
                          <kbd>Esc</kbd> Close
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
            
            {/* Referenced files display */}
            {referencedFiles.length > 0 && (
              <div className="ai-referenced-files">
                {referencedFiles.map((file, index) => (
                  <div key={file.path} className="ai-referenced-file">
                    <span className="ai-referenced-file-icon">📄</span>
                    <span className="ai-referenced-file-name">{file.name}</span>
                    <button
                      className="ai-referenced-file-remove"
                      onClick={() => {
                        setReferencedFiles(prev => prev.filter(f => f.path !== file.path))
                        // Remove @ mention from text
                        const mentionPattern = new RegExp(`@${file.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g')
                        setAiInput(prev => prev.replace(mentionPattern, ''))
                      }}
                      title="Remove file reference"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Agent selector and action buttons - inside the prompt box */}
            <div className="ai-input-actions-row">
              <div className="ai-agent-selector-group" ref={agentSelectorRef}>
                {/* Agent selector button */}
                <button
                  className="ai-agent-selector-btn has-menu"
                  onClick={() => {
                    setShowAgentSelector(!showAgentSelector)
                    setShowAgentMenu(false)
                  }}
                  title="Select AI Agent"
                >
                  <span className="ai-agent-selector-text">
                    {selectedAgentIds.length > 1
                      ? `${selectedAgentIds.length} Agents`
                      : selectedAgentIds.length === 1
                        ? agents.find(a => a.id === selectedAgentIds[0])?.name || 'Agent'
                        : selectedAgentId 
                          ? agents.find(a => a.id === selectedAgentId)?.name || 'Agent'
                          : selectedGpu 
                            ? `GPU ${gpus.find(g => g.id === selectedGpu)?.name || selectedGpu}`
                            : 'Select Agent'}
                  </span>
                  <span className="ai-agent-selector-arrow">▼</span>
                </button>
                
                {/* Mode menu button - always visible */}
                <div className="ai-agent-menu-wrapper" ref={agentMenuRef}>
                  <button
                    className="ai-agent-menu-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowAgentMenu(!showAgentMenu)
                      setShowAgentSelector(false)
                    }}
                    title="Prompt mode options"
                  >
                    <span className="ai-agent-menu-text">
                      {promptMode === 'agent' ? 'Agent' :
                       promptMode === 'plan' ? 'Plan' :
                       promptMode === 'debug' ? 'Debug' :
                       'Ask'}
                    </span>
                    <span className="ai-agent-menu-icon">⋯</span>
                  </button>
                  
                  {/* Mode menu dropdown */}
                  {showAgentMenu && (
                    <div className="ai-agent-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                      <div className="ai-agent-menu-header">Prompt Mode</div>
                      <div
                        className={`ai-agent-menu-item ${promptMode === 'agent' ? 'selected' : ''}`}
                        onClick={() => {
                          setPromptMode('agent')
                          setShowAgentMenu(false)
                        }}
                      >
                        <span className="ai-agent-menu-item-icon">🤖</span>
                        <span>Agent</span>
                        {promptMode === 'agent' && <span className="ai-agent-menu-check">✓</span>}
                      </div>
                      <div
                        className={`ai-agent-menu-item ${promptMode === 'plan' ? 'selected' : ''}`}
                        onClick={() => {
                          setPromptMode('plan')
                          setShowAgentMenu(false)
                        }}
                      >
                        <span className="ai-agent-menu-item-icon">📋</span>
                        <span>Plan</span>
                        {promptMode === 'plan' && <span className="ai-agent-menu-check">✓</span>}
                      </div>
                      <div
                        className={`ai-agent-menu-item ${promptMode === 'debug' ? 'selected' : ''}`}
                        onClick={() => {
                          setPromptMode('debug')
                          setShowAgentMenu(false)
                        }}
                      >
                        <span className="ai-agent-menu-item-icon">🐛</span>
                        <span>Debug</span>
                        {promptMode === 'debug' && <span className="ai-agent-menu-check">✓</span>}
                      </div>
                      <div
                        className={`ai-agent-menu-item ${promptMode === 'ask' ? 'selected' : ''}`}
                        onClick={() => {
                          setPromptMode('ask')
                          setShowAgentMenu(false)
                        }}
                      >
                        <span className="ai-agent-menu-item-icon">💬</span>
                        <span>Ask</span>
                        {promptMode === 'ask' && <span className="ai-agent-menu-check">✓</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Agent selector dropdown */}
              {showAgentSelector && (
                <div className="ai-agent-selector-dropdown" onClick={(e) => e.stopPropagation()}>
                  <div className="ai-agent-dropdown-header">
                    <span>Select AI Agent{selectedAgentIds.length > 1 ? ` (${selectedAgentIds.length} selected)` : ''}</span>
                    <button 
                      className="ai-agent-dropdown-close"
                      onClick={() => setShowAgentSelector(false)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="ai-agent-dropdown-list">
                    <div
                      className={`ai-agent-dropdown-item ${selectedAgentIds.length === 0 && !selectedAgentId && !selectedGpu ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedAgentId(null)
                        setSelectedAgentIds([])
                        setSelectedGpu(null)
                        setShowAgentSelector(false)
                      }}
                    >
                      <div className="ai-agent-item-info">
                        <div className="ai-agent-item-name">Auto (No Agent)</div>
                        <div className="ai-agent-item-desc">Use default GPU selection</div>
                      </div>
                    </div>
                    {agents.map((agent) => {
                      const isSelected = selectedAgentIds.includes(agent.id) || selectedAgentId === agent.id
                      return (
                        <div
                          key={agent.id}
                          className={`ai-agent-dropdown-item ${isSelected ? 'selected' : ''} ${!agent.is_available ? 'unavailable' : ''}`}
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
                          <div className="ai-agent-item-info">
                            <div className="ai-agent-item-name">
                              {agent.name}
                              {!agent.is_available && (
                                <span className="ai-agent-status-text"> (unavailable)</span>
                              )}
                            </div>
                            <div className="ai-agent-item-desc">
                              {agent.agent_type} • {agent.model}
                              {agent.gpu_id && ` • GPU ${agent.gpu_id}`}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {agents.length === 0 && (
                      <div className="ai-agent-dropdown-empty">
                        <div className="empty-text">No agents configured</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Action buttons */}
              <div className="ai-input-actions-group">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    files.forEach(file => {
                      if (file.type.startsWith('image/')) {
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          const dataUrl = event.target?.result as string
                          setUploadedImages(prev => [...prev, {
                            file,
                            preview: URL.createObjectURL(file),
                            dataUrl
                          }])
                        }
                        reader.readAsDataURL(file)
                      }
                    })
                    // Reset input so same file can be selected again
                    if (e.target) {
                      e.target.value = ''
                    }
                  }}
                />
                <button
                  className="ai-image-send-btn"
                  onClick={() => {
                    imageInputRef.current?.click()
                  }}
                  title="Upload image"
                  disabled={isAIAssisting || isAIThinking}
                >
                  <span className="ai-image-send-icon">📷</span>
                </button>
                <button
                  onClick={() => {
                    if (isAIAssisting || isAIThinking) {
                      // Stop generation
                      setIsAIThinking(false)
                      setIsAIAssisting(false)
                      setAiStatus('')
                      setCurrentPromptGoal('')
                      setQueuedRequests(prev => prev.filter(q => q.status !== 'processing'))
                    } else if (uploadedImages.length > 0 || aiInput.trim()) {
                      // Pass images to requestAIAssistance
                      const imageData = uploadedImages.map(img => ({
                        dataUrl: img.dataUrl,
                        type: img.file.type,
                        name: img.file.name
                      }))
                      requestAIAssistance(aiInput, imageData, referencedFiles, promptMode)
                      setAiInput('')
                      setReferencedFiles([])
                      // Clear images after sending
                      uploadedImages.forEach(img => URL.revokeObjectURL(img.preview))
                      setUploadedImages([])
                    }
                  }}
                  disabled={(selectedAgentIds.length === 0 && !selectedAgentId && !selectedGpu) || (!isAIAssisting && !isAIThinking && !aiInput.trim() && uploadedImages.length === 0)}
                  className={`ai-send-btn cursor-send-btn ${isAIAssisting || isAIThinking ? 'stop-state' : ''}`}
                  title={isAIAssisting || isAIThinking ? "Stop generating" : "Send message (Enter)"}
                >
                  {isAIAssisting || isAIThinking ? (
                    <span className="ai-send-stop-icon">■</span>
                  ) : (
                    <span className="ai-send-icon">→</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {position === 'right' && (
        <div 
          className="resize-handle resize-handle-vertical"
          onMouseDown={onResizeStart}
          style={{ cursor: 'col-resize' }}
        />
      )}
    </>
  )
}
