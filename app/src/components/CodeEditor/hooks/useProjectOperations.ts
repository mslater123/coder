import { useCallback } from 'react'
import type { Project, FileNode } from '../types'
import { findFileInArray } from '../utils'

interface UseProjectOperationsProps {
  projects: Project[]
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>
  currentProjectId: string | null
  setCurrentProjectId: React.Dispatch<React.SetStateAction<string | null>>
  files: FileNode[]
  setFiles: React.Dispatch<React.SetStateAction<FileNode[]>>
  openTabs: Array<{ path: string; name: string; content: string; modified: boolean }>
  setOpenTabs: React.Dispatch<React.SetStateAction<Array<{ path: string; name: string; content: string; modified: boolean }>>>
  newProjectName: string
  setNewProjectName: React.Dispatch<React.SetStateAction<string>>
  newProjectDescription: string
  setNewProjectDescription: React.Dispatch<React.SetStateAction<string>>
  showNewProjectDialog: boolean
  setShowNewProjectDialog: React.Dispatch<React.SetStateAction<boolean>>
  showProjectSwitcher: boolean
  setShowProjectSwitcher: React.Dispatch<React.SetStateAction<boolean>>
}

export function useProjectOperations({
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
}: UseProjectOperationsProps) {
  
  const loadProjects = useCallback(async (userId?: string | null) => {
    // Only load projects if user is logged in
    if (!userId) {
      // Clear projects if no user
      setProjects([])
      setCurrentProjectId(null)
      return
    }
    
    // Validate user_id is a UUID (not an integer)
    if (userId.length <= 10 && !userId.includes('-')) {
      // Invalid user ID - clear projects
      setProjects([])
      setCurrentProjectId(null)
      return
    }
    
    try {
      const { projectApi } = await import('../../../services/api')
      const response = await projectApi.getProjects()
      if (response.success && response.projects) {
        const projectsWithDates = response.projects.map((p: any) => ({
          ...p,
          createdAt: new Date(p.created_at),
          updatedAt: new Date(p.updated_at)
        }))
        setProjects(projectsWithDates)
        if (projectsWithDates.length > 0 && !currentProjectId) {
          setCurrentProjectId(projectsWithDates[0].id)
        } else if (projectsWithDates.length === 0) {
          // No projects - create a default one
          try {
            const createResponse = await projectApi.createProject({
              name: 'My First Project',
              description: 'Default project'
            })
            if (createResponse.success) {
              const newProject = {
                ...createResponse.project,
                createdAt: new Date(createResponse.project.created_at),
                updatedAt: new Date(createResponse.project.updated_at)
              }
              setProjects([newProject])
              setCurrentProjectId(newProject.id)
            }
          } catch (createErr) {
            console.error('Failed to create default project:', createErr)
          }
        }
      }
    } catch (err) {
      console.error('Failed to load projects:', err)
      // Don't fallback to localStorage when logged out - clear projects instead
      setProjects([])
      setCurrentProjectId(null)
    }
  }, [setProjects, currentProjectId, setCurrentProjectId])

  const saveProjects = useCallback(async (projectsToSave: Project[]) => {
    // Projects are now saved to backend, but we can keep localStorage as backup
    try {
      const projectsToStore = projectsToSave.map(p => ({
        ...p,
        createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
        updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt
      }))
      localStorage.setItem('codeEditorProjects', JSON.stringify(projectsToStore))
    } catch (err) {
      console.error('Failed to save projects to localStorage:', err)
    }
  }, [])

  const saveCurrentProject = useCallback(async () => {
    if (!currentProjectId) return
    
    // Files are now stored in the user's code directory, not in the project
    // So we just update the project's updated_at timestamp
    try {
      const { projectApi } = await import('../../../services/api')
      await projectApi.updateProject(currentProjectId, {
        // Just update the timestamp - files are stored separately
      })
      
      // Update local state
      const updatedProjects = projects.map(p => {
        if (p.id === currentProjectId) {
          return {
            ...p,
            updatedAt: new Date()
          }
        }
        return p
      })
      setProjects(updatedProjects)
      saveProjects(updatedProjects)
    } catch (err) {
      console.error('Failed to save project:', err)
      // Fallback - just update local state
      const updatedProjects = projects.map(p => {
        if (p.id === currentProjectId) {
          return {
            ...p,
            updatedAt: new Date()
          }
        }
        return p
      })
      setProjects(updatedProjects)
      saveProjects(updatedProjects)
    }
    
    setOpenTabs(prev => prev.map(tab => ({ ...tab, modified: false })))
  }, [currentProjectId, projects, setProjects, setOpenTabs, saveProjects])

  const createNewProject = useCallback(async () => {
    if (!newProjectName.trim()) return

    const { projectApi } = await import('../../../services/api')
    const response = await projectApi.createProject({
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || undefined
    })
    
    if (response.success) {
      const newProject = {
        ...response.project,
        createdAt: new Date(response.project.created_at),
        updatedAt: new Date(response.project.updated_at)
      }
      
      const updatedProjects = [...projects, newProject]
      setProjects(updatedProjects)
      setCurrentProjectId(newProject.id)
      saveProjects(updatedProjects)
      setShowNewProjectDialog(false)
      setNewProjectName('')
      setNewProjectDescription('')
    } else {
      throw new Error(response.error || 'Failed to create project')
    }
  }, [newProjectName, newProjectDescription, projects, setProjects, setCurrentProjectId, setShowNewProjectDialog, setNewProjectName, setNewProjectDescription, saveProjects])

  const openProject = useCallback((projectId: string) => {
    setCurrentProjectId(projectId)
    setShowProjectSwitcher(false)
  }, [setCurrentProjectId, setShowProjectSwitcher])

  const deleteProject = useCallback(async (projectId: string) => {
    if (projects.length <= 1) {
      return
    }

    try {
      const { projectApi } = await import('../../../services/api')
      await projectApi.deleteProject(projectId)
      
      const updatedProjects = projects.filter(p => p.id !== projectId)
      setProjects(updatedProjects)
      saveProjects(updatedProjects)
      
      if (currentProjectId === projectId) {
        setCurrentProjectId(updatedProjects[0]?.id || null)
      }
    } catch (err) {
      console.error('Failed to delete project:', err)
      // Fallback to localStorage
      const updatedProjects = projects.filter(p => p.id !== projectId)
      setProjects(updatedProjects)
      saveProjects(updatedProjects)
      
      if (currentProjectId === projectId) {
        setCurrentProjectId(updatedProjects[0]?.id || null)
      }
    }
  }, [projects, currentProjectId, setProjects, setCurrentProjectId, saveProjects])

  const getProjectPath = useCallback((relativePath: string, projects: Project[], currentProjectId: string | null): string => {
    // Paths are now relative to project root, so we don't need to add project name
    // The backend will use project_name parameter to determine the directory
    const cleanPath = relativePath.replace(/^\/+/, '')
    
    // Return path with leading slash (backend will handle project directory)
    return '/' + cleanPath
  }, [])

  const getRelativePath = useCallback((fullPath: string, projects: Project[], currentProjectId: string | null): string => {
    const currentProject = projects.find(p => p.id === currentProjectId)
    const projectName = currentProject?.name || 'default'
    
    const cleanPath = fullPath.replace(/^\/+/, '')
    
    if (cleanPath.startsWith(projectName + '/')) {
      return '/' + cleanPath.substring(projectName.length + 1)
    } else if (cleanPath === projectName) {
      return '/'
    }
    
    return '/' + cleanPath
  }, [])

  return {
    loadProjects,
    saveProjects,
    saveCurrentProject,
    createNewProject,
    openProject,
    deleteProject,
    getProjectPath: (path: string) => getProjectPath(path, projects, currentProjectId),
    getRelativePath: (path: string) => getRelativePath(path, projects, currentProjectId),
  }
}
