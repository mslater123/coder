import { useCallback, useRef } from 'react'
import type { ParsedAIResponse, AIMessage } from '../types'
import { parseAIResponse, analyzeCodePatterns } from '../utils'

interface UseAIHelpersProps {
  monacoRef: React.RefObject<any>
  editorRef: React.RefObject<any>
  code: string
  activeTab: string
  selectedFile: string
  openTabs: Array<{ path: string; name: string; content: string; modified: boolean }>
  language: string
  codebaseContext: any[]
  messagesEndRef: React.RefObject<HTMLDivElement>
  aiMessages: AIMessage[]
  setAiMessages: React.Dispatch<React.SetStateAction<AIMessage[]>>
  findFile: (path: string) => any
}

export function useAIHelpers({
  monacoRef,
  editorRef,
  code,
  activeTab,
  selectedFile,
  openTabs,
  language,
  codebaseContext,
  messagesEndRef,
  aiMessages,
  setAiMessages,
  findFile,
}: UseAIHelpersProps) {
  
  const getEditorDiagnostics = useCallback((): Array<{ severity: string; message: string; line: number; column: number; code?: string }> => {
    if (!monacoRef.current || !editorRef.current) return []
    
    try {
      const model = editorRef.current.getModel()
      if (!model) return []
      
      const markers = monacoRef.current.editor.getModelMarkers({ resource: model.uri })
      return markers.map(marker => ({
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
  }, [monacoRef, editorRef])

  const getRelatedFiles = useCallback((currentFilePath: string, codebaseContext: any[]): any[] => {
    const currentFile = codebaseContext.find(f => f.path === currentFilePath)
    if (!currentFile || !currentFile.content) return []
    
    const relatedFiles: Set<string> = new Set()
    const imports: string[] = []
    
    const importPatterns = [
      /^import\s+.*?\s+from\s+['"](.+?)['"]/gm,
      /^import\s+['"](.+?)['"]/gm,
      /^const\s+.*?=\s+require\(['"](.+?)['"]\)/gm,
      /^from\s+['"](.+?)['"]\s+import/gm,
      /^import\s+(.+?)$/gm
    ]
    
    for (const pattern of importPatterns) {
      const matches = currentFile.content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          imports.push(match[1])
        }
      }
    }
    
    for (const importPath of imports) {
      const resolvedFiles = codebaseContext.filter(f => {
        const filePath = f.path.toLowerCase()
        const fileName = f.name.toLowerCase()
        const importLower = importPath.toLowerCase()
        
        return filePath.includes(importLower.replace(/[./]/g, '/')) ||
               fileName === importLower.split('/').pop() ||
               fileName === importLower.split('.').pop() ||
               filePath.endsWith(importLower.replace(/\./g, '/') + '.py') ||
               filePath.endsWith(importLower.replace(/\./g, '/') + '.js') ||
               filePath.endsWith(importLower.replace(/\./g, '/') + '.ts')
      })
      
      resolvedFiles.forEach(f => relatedFiles.add(f.path))
    }
    
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
  }, [])

  const detectTaskType = useCallback((prompt: string): 'refactor' | 'debug' | 'add-feature' | 'fix-errors' | 'document' | 'test' | 'general' => {
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
  }, [])

  const buildTaskSpecificPrompt = useCallback((taskType: string, basePrompt: string, diagnostics: any[], currentFile: string, language: string): string => {
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
  }, [])

  const handleParseAIResponse = useCallback((content: string): ParsedAIResponse => {
    return parseAIResponse(content, findFile)
  }, [findFile])

  const scrollToBottom = useCallback(() => {
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
  }, [messagesEndRef])

  const formatInlineMarkdown = useCallback((text: string): string => {
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
    
    formatted = formatted
      .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(?!_)([^_]+?)(?<!_)__/g, '<strong>$1</strong>')
    
    formatted = formatted
      .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>')
      .replace(/(?<!_)_([^_]+?)_(?!_)/g, '<em>$1</em>')
    
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="ai-message-link">$1</a>')
    
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
  }, [])

  const getCodePatterns = useCallback(() => {
    return analyzeCodePatterns(codebaseContext, language)
  }, [codebaseContext, language])

  return {
    getEditorDiagnostics,
    getRelatedFiles,
    detectTaskType,
    buildTaskSpecificPrompt,
    handleParseAIResponse,
    scrollToBottom,
    formatInlineMarkdown,
    getCodePatterns,
  }
}
