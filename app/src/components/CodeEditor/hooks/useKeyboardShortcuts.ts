import { useEffect } from 'react'
import type { EditorPaneNode } from '../types'
import * as splitUtils from '../utils/splitEditorUtils'

interface UseKeyboardShortcutsProps {
  activePaneId: string
  activeTab: string
  editorRoot: EditorPaneNode
  saveCurrentFileInPane: (paneId: string) => Promise<void>
  saveCurrentProject: () => void
  setShowCommandPalette: (show: boolean) => void
  setShowKeyboardShortcuts: (show: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  sidebarCollapsed: boolean
  setAiPanelVisible: (visible: boolean) => void
  aiPanelVisible: boolean
  setShowTerminal: (show: boolean) => void
  showTerminal: boolean
  setShowFindInFiles: (show: boolean) => void
  setShowGoToSymbol: (show: boolean) => void
}

export function useKeyboardShortcuts({
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
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        e.stopPropagation()
        
        // Save the active pane's file
        const activePane = splitUtils.findPaneInTree(editorRoot, activePaneId)
        if (activePane && activePane.activeTab) {
          saveCurrentFileInPane(activePaneId)
        } else if (activeTab) {
          // Fallback to legacy save
          saveCurrentProject()
        }
        return false
      }
      
      // Ctrl+K or Cmd+K to open command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        setShowCommandPalette(true)
        return false
      }
      
      // Ctrl+Shift+P or Cmd+Shift+P to open command palette (alternative)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault()
        e.stopPropagation()
        setShowCommandPalette(true)
        return false
      }
      
      // Ctrl+B or Cmd+B to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault()
        e.stopPropagation()
        setSidebarCollapsed(!sidebarCollapsed)
        return false
      }
      
      // Ctrl+Shift+A or Cmd+Shift+A to toggle AI panel
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault()
        e.stopPropagation()
        setAiPanelVisible(!aiPanelVisible)
        return false
      }
      
      // Ctrl+` or Cmd+` to toggle terminal
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault()
        e.stopPropagation()
        setShowTerminal(!showTerminal)
        return false
      }
      
      // Ctrl+/ or Cmd+/ to show keyboard shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        e.stopPropagation()
        setShowKeyboardShortcuts(true)
        return false
      }
      
      // Ctrl+Shift+F or Cmd+Shift+F to find in files
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        e.stopPropagation()
        setShowFindInFiles(true)
        return false
      }
      
      // Ctrl+Shift+O or Cmd+Shift+O to go to symbol
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'O') {
        e.preventDefault()
        e.stopPropagation()
        setShowGoToSymbol(true)
        return false
      }
      
      // Ctrl+G or Cmd+G to go to line
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        // Go to line - will be handled by Monaco editor
        return false
      }
    }
    
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [
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
  ])
}
