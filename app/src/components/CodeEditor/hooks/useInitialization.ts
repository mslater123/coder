import { useEffect, useCallback } from 'react'
import { applyTheme } from '../themes'
import { codeEditorApi } from '../../../services/api'

interface UseInitializationProps {
  theme: string
  localDirectory: string
  currentProjectId: string | null
  setGpus: React.Dispatch<React.SetStateAction<any[]>>
  setAgents: React.Dispatch<React.SetStateAction<any[]>>
  setCurrentUserId: React.Dispatch<React.SetStateAction<string | null>>
  setVenvInfo: React.Dispatch<React.SetStateAction<{ path: string; python_path: string } | null>>
  setSidebarWidth: React.Dispatch<React.SetStateAction<number>>
  setAiPanelWidth: React.Dispatch<React.SetStateAction<number>>
  setTerminalHeight: React.Dispatch<React.SetStateAction<number>>
  loadProjects: (userId?: string | null) => void | Promise<void>
  loadUserSettings: (userId: string) => Promise<void>
  loadSettings: () => void
}

export function useInitialization({
  theme,
  localDirectory,
  currentProjectId,
  setGpus,
  setAgents,
  setCurrentUserId,
  setVenvInfo,
  setSidebarWidth,
  setAiPanelWidth,
  setTerminalHeight,
  loadProjects,
  loadUserSettings,
  loadSettings,
}: UseInitializationProps) {
  
  const loadGPUs = useCallback(async () => {
    try {
      const response = await codeEditorApi.getGPUs()
      if (response.success) {
        setGpus(response.gpus || [])
      }
    } catch (err) {
      console.error('Failed to load GPUs:', err)
    }
  }, [setGpus])

  const loadAgents = useCallback(async () => {
    try {
      const response = await codeEditorApi.getAgents()
      if (response.success) {
        setAgents(response.agents || [])
      }
    } catch (err) {
      console.error('Failed to load agents:', err)
    }
  }, [setAgents])

  const loadUserFromStorage = useCallback(async () => {
    try {
      const saved = localStorage.getItem('currentUserId')
      if (saved) {
        setCurrentUserId(saved)
        await loadUserSettings(saved)
      } else {
        // Try to get from currentUser object
        const currentUser = localStorage.getItem('currentUser')
        if (currentUser) {
          try {
            const user = JSON.parse(currentUser)
            if (user && user.id) {
              setCurrentUserId(user.id)
              localStorage.setItem('currentUserId', user.id)
              await loadUserSettings(user.id)
            }
          } catch (e) {
            console.error('Failed to parse currentUser:', e)
          }
        }
      }
    } catch (err) {
      console.error('Failed to load user from storage:', err)
    }
  }, [setCurrentUserId, loadUserSettings])

  const loadPanelSizes = useCallback(() => {
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
  }, [setSidebarWidth, setAiPanelWidth, setTerminalHeight])

  useEffect(() => {
    loadGPUs()
    loadProjects()
    loadAgents()
    loadUserFromStorage()
    loadSettings()
    loadPanelSizes()
    applyTheme(theme)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const detectVenv = async () => {
      if (localDirectory) {
        try {
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
  }, [localDirectory, currentProjectId, setVenvInfo])

  return {
    loadGPUs,
    loadAgents,
    loadUserFromStorage,
    loadPanelSizes,
  }
}
