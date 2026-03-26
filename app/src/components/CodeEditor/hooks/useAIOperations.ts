import { useCallback, useRef } from 'react'
import type { AIMessage, ParsedAIResponse, FileOperation, Project } from '../types'
import { parseAIResponse, mergeAIResponses, validateFileOperation, findFileInArray } from '../utils'
import { codeEditorApi } from '../../../services/api'

interface UseAIOperationsProps {
  // State
  isAIAssisting: boolean
  isAIThinking: boolean
  setIsAIAssisting: React.Dispatch<React.SetStateAction<boolean>>
  setIsAIThinking: React.Dispatch<React.SetStateAction<boolean>>
  setAiStatus: React.Dispatch<React.SetStateAction<string>>
  setCurrentPromptGoal: React.Dispatch<React.SetStateAction<string>>
  aiMessages: AIMessage[]
  setAiMessages: React.Dispatch<React.SetStateAction<AIMessage[]>>
  aiSuggestion: string | null
  setAiSuggestion: React.Dispatch<React.SetStateAction<string | null>>
  queuedRequests: Array<{ id: string; prompt: string; status: string; timestamp: Date }>
  setQueuedRequests: React.Dispatch<React.SetStateAction<Array<{ id: string; prompt: string; status: string; timestamp: Date }>>>
  activeAgentRequests: Record<number, { status: string; agentName: string }>
  setActiveAgentRequests: React.Dispatch<React.SetStateAction<Record<number, { status: string; agentName: string }>>>
  
  // Agents
  agents: Array<{ id: number; name: string; [key: string]: any }>
  selectedAgentId: number | null
  selectedAgentIds: number[]
  
  // Editor state
  code: string
  activeTab: string
  selectedFile: string
  openTabs: Array<{ path: string; name: string; content: string; modified: boolean; oldContent?: string }>
  language: string
  files: Array<{ path: string; name: string; content?: string; [key: string]: any }>
  
  // Projects
  projects: Project[]
  currentProjectId: string | null
  
  // File operations
  findFile: (path: string) => { path: string; name: string; content?: string } | null
  getProjectPath: (path: string) => string
  loadFilesFromBackend: () => Promise<void>
  
  // Editor refs
  editorRef: React.RefObject<any>
  monacoRef: React.RefObject<any>
  messagesEndRef: React.RefObject<HTMLDivElement>
  
  // Callbacks
  scrollToBottom: () => void
  getEditorDiagnostics: () => Array<{ severity: string; message: string; line: number; column: number; code?: string }>
  getRelatedFiles: (currentFilePath: string, codebaseContext: any[]) => any[]
  detectTaskType: (prompt: string) => 'refactor' | 'debug' | 'add-feature' | 'fix-errors' | 'document' | 'test' | 'general'
  buildTaskSpecificPrompt: (taskType: string, basePrompt: string, diagnostics: any[], currentFile: string, language: string) => string
  analyzeCodePatterns: (codebaseContext: any[], language: string) => any
  
  // File operation handlers
  applyFileOperations: (operations: FileOperation[]) => Promise<void>
  
  // Local directory
  localDirectory: string
}

export function useAIOperations({
  isAIAssisting,
  isAIThinking,
  setIsAIAssisting,
  setIsAIThinking,
  setAiStatus,
  setCurrentPromptGoal,
  aiMessages,
  setAiMessages,
  aiSuggestion,
  setAiSuggestion,
  queuedRequests,
  setQueuedRequests,
  activeAgentRequests,
  setActiveAgentRequests,
  agents,
  selectedAgentId,
  selectedAgentIds,
  code,
  activeTab,
  selectedFile,
  openTabs,
  language,
  files,
  projects,
  currentProjectId,
  findFile,
  getProjectPath,
  loadFilesFromBackend,
  editorRef,
  monacoRef,
  messagesEndRef,
  scrollToBottom,
  getEditorDiagnostics,
  getRelatedFiles,
  detectTaskType,
  buildTaskSpecificPrompt,
  analyzeCodePatterns,
  applyFileOperations,
  localDirectory,
}: UseAIOperationsProps) {
  
  const handleParseAIResponse = useCallback((content: string): ParsedAIResponse => {
    return parseAIResponse(content, findFile)
  }, [findFile])

  return {
    handleParseAIResponse,
  }
}
