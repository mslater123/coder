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
  
  const loadProjects = useCallback(() => {
    try {
      const saved = localStorage.getItem('codeEditorProjects')
      if (saved) {
        const parsed = JSON.parse(saved)
        const projectsWithDates = parsed.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          updatedAt: new Date(p.updatedAt)
        }))
        setProjects(projectsWithDates)
        if (projectsWithDates.length > 0 && !currentProjectId) {
          setCurrentProjectId(projectsWithDates[0].id)
        }
      } else {
        const defaultProject: Project = {
          id: 'default-' + Date.now(),
          name: 'My First Project',
          description: 'Default project',
          files: [
            { name: 'main.js', type: 'file', path: '/main.js', content: '// Welcome to AI Code Editor\n// Start typing and use Ctrl+Space for AI assistance\n\nfunction hello() {\n  console.log("Hello, World!");\n}' },
            { name: 'src', type: 'folder', path: '/src', children: [
              { name: 'app.js', type: 'file', path: '/src/app.js', content: '// Application code\n' },
              { name: 'utils.js', type: 'file', path: '/src/utils.js', content: '// Utility functions\n' }
            ]},
            { name: 'package.json', type: 'file', path: '/package.json', content: '{\n  "name": "my-project",\n  "version": "1.0.0"\n}' }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        }
        setProjects([defaultProject])
        setCurrentProjectId(defaultProject.id)
        saveProjects([defaultProject])
      }
    } catch (err) {
      console.error('Failed to load projects:', err)
    }
  }, [setProjects, currentProjectId, setCurrentProjectId])

  const saveProjects = useCallback((projectsToSave: Project[]) => {
    try {
      const projectsToStore = projectsToSave.map(p => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString()
      }))
      localStorage.setItem('codeEditorProjects', JSON.stringify(projectsToStore))
    } catch (err) {
      console.error('Failed to save projects:', err)
    }
  }, [])

  const saveCurrentProject = useCallback(() => {
    if (!currentProjectId) return
    
    const updatedFiles = [...files]
    openTabs.forEach(tab => {
      const file = findFileInArray(updatedFiles, tab.path)
      if (file) {
        file.content = tab.content
      }
    })
    
    const updatedProjects = projects.map(p => {
      if (p.id === currentProjectId) {
        return {
          ...p,
          files: updatedFiles,
          updatedAt: new Date()
        }
      }
      return p
    })
    setProjects(updatedProjects)
    setFiles(updatedFiles)
    saveProjects(updatedProjects)
    
    setOpenTabs(prev => prev.map(tab => ({ ...tab, modified: false })))
  }, [currentProjectId, files, openTabs, projects, setProjects, setFiles, setOpenTabs, saveProjects])

  const createNewProject = useCallback(() => {
    if (!newProjectName.trim()) return

    const newProject: Project = {
      id: 'project-' + Date.now(),
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || undefined,
      files: [
        { name: 'main.js', type: 'file', path: '/main.js', content: '// New Project\n\n' },
        { name: 'README.md', type: 'file', path: '/README.md', content: `# ${newProjectName.trim()}\n\n${newProjectDescription.trim() || 'Project description'}\n` }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const updatedProjects = [...projects, newProject]
    setProjects(updatedProjects)
    setCurrentProjectId(newProject.id)
    saveProjects(updatedProjects)
    setShowNewProjectDialog(false)
    setNewProjectName('')
    setNewProjectDescription('')
  }, [newProjectName, newProjectDescription, projects, setProjects, setCurrentProjectId, setShowNewProjectDialog, setNewProjectName, setNewProjectDescription, saveProjects])

  const openProject = useCallback((projectId: string) => {
    setCurrentProjectId(projectId)
    setShowProjectSwitcher(false)
  }, [setCurrentProjectId, setShowProjectSwitcher])

  const deleteProject = useCallback((projectId: string) => {
    if (projects.length <= 1) {
      return
    }

    const updatedProjects = projects.filter(p => p.id !== projectId)
    setProjects(updatedProjects)
    saveProjects(updatedProjects)
    
    if (currentProjectId === projectId) {
      setCurrentProjectId(updatedProjects[0].id)
    }
  }, [projects, currentProjectId, setProjects, setCurrentProjectId, saveProjects])

  const getProjectPath = useCallback((relativePath: string, projects: Project[], currentProjectId: string | null): string => {
    const currentProject = projects.find(p => p.id === currentProjectId)
    const projectName = currentProject?.name || 'default'
    
    const cleanPath = relativePath.replace(/^\/+/, '')
    
    if (cleanPath.startsWith(projectName + '/')) {
      return '/' + cleanPath
    }
    
    if (!cleanPath || cleanPath === projectName) {
      return `/${projectName}`
    }
    
    return `/${projectName}/${cleanPath}`
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
