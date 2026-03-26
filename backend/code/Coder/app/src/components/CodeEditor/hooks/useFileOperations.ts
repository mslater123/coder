import { useCallback } from 'react'
import type { FileNode, FileOperation } from '../types'
import { shouldSkipFile, shouldSkipReadingFile, findFileInArray, detectLanguage, detectLanguageFromPath } from '../utils'

interface UseFileOperationsProps {
  files: FileNode[]
  setFiles: React.Dispatch<React.SetStateAction<FileNode[]>>
  openTabs: Array<{ path: string; name: string; content: string; modified: boolean }>
  setOpenTabs: React.Dispatch<React.SetStateAction<Array<{ path: string; name: string; content: string; modified: boolean }>>>
  activeTab: string
  setActiveTab: React.Dispatch<React.SetStateAction<string>>
  selectedFile: string
  setSelectedFile: React.Dispatch<React.SetStateAction<string>>
  setCode: React.Dispatch<React.SetStateAction<string>>
  setLanguage: React.Dispatch<React.SetStateAction<string>>
  projects: any[]
  currentProjectId: string | null
  localDirectory: string
  useFileSystem: boolean
  editingFileName: { path: string; parentPath: string } | null
  setEditingFileName: React.Dispatch<React.SetStateAction<{ path: string; parentPath: string } | null>>
  editingFileNameValue: string
  setEditingFileNameValue: React.Dispatch<React.SetStateAction<string>>
  editingFolderName: { path: string; parentPath: string } | null
  setEditingFolderName: React.Dispatch<React.SetStateAction<{ path: string; parentPath: string } | null>>
  editingFolderNameValue: string
  setEditingFolderNameValue: React.Dispatch<React.SetStateAction<string>>
  renamingFile: { path: string; name: string } | null
  setRenamingFile: React.Dispatch<React.SetStateAction<{ path: string; name: string } | null>>
  renamingFileNameValue: string
  setRenamingFileNameValue: React.Dispatch<React.SetStateAction<string>>
  copiedFilePath: string | null
  setCopiedFilePath: React.Dispatch<React.SetStateAction<string | null>>
  cutFilePath: string | null
  setCutFilePath: React.Dispatch<React.SetStateAction<string | null>>
  contextMenu: { x: number; y: number; filePath: string; fileName: string; isFolder?: boolean } | null
  setContextMenu: React.Dispatch<React.SetStateAction<{ x: number; y: number; filePath: string; fileName: string; isFolder?: boolean } | null>>
  getProjectPath: (path: string) => string
  findFile: (path: string) => FileNode | null
  saveCurrentProject: () => void
  loadFilesFromBackend: () => Promise<void>
  handleDetectLanguage: (filename: string) => void
}

export function useFileOperations({
  files,
  setFiles,
  openTabs,
  setOpenTabs,
  activeTab,
  setActiveTab,
  selectedFile,
  setSelectedFile,
  setCode,
  setLanguage,
  projects,
  currentProjectId,
  localDirectory,
  useFileSystem,
  editingFileName,
  setEditingFileName,
  editingFileNameValue,
  setEditingFileNameValue,
  editingFolderName,
  setEditingFolderName,
  editingFolderNameValue,
  setEditingFolderNameValue,
  renamingFile,
  setRenamingFile,
  renamingFileNameValue,
  setRenamingFileNameValue,
  copiedFilePath,
  setCopiedFilePath,
  cutFilePath,
  setCutFilePath,
  contextMenu,
  setContextMenu,
  getProjectPath,
  findFile,
  saveCurrentProject,
  loadFilesFromBackend,
  handleDetectLanguage,
}: UseFileOperationsProps) {
  
  const startCreatingFile = useCallback((parentPath: string = '/') => {
    setEditingFileName({ path: '', parentPath })
    setEditingFileNameValue('')
    setEditingFolderName(null)
    setEditingFolderNameValue('')
  }, [setEditingFileName, setEditingFileNameValue, setEditingFolderName, setEditingFolderNameValue])

  const startCreatingFolder = useCallback((parentPath: string = '/') => {
    setEditingFolderName({ path: '', parentPath })
    setEditingFolderNameValue('')
    setEditingFileName(null)
    setEditingFileNameValue('')
  }, [setEditingFolderName, setEditingFolderNameValue, setEditingFileName, setEditingFileNameValue])

  const finishCreatingFile = useCallback(async (fileName: string) => {
    if (!fileName.trim()) {
      setEditingFileName(null)
      setEditingFileNameValue('')
      return
    }

    const trimmedName = fileName.trim()
    const currentProject = projects.find(p => p.id === currentProjectId)
    const projectName = currentProject?.name || 'default'
    
    let relativePath: string
    if (editingFileName?.parentPath === '/' || editingFileName?.parentPath === `/${projectName}`) {
      relativePath = `/${projectName}/${trimmedName}`
    } else {
      relativePath = `${editingFileName?.parentPath}/${trimmedName}`
    }
    
    const filePath = relativePath
    
    try {
      if (useFileSystem) {
        const { codeEditorApi } = await import('../../services/api')
        const workingDir = localDirectory || undefined
        await codeEditorApi.writeFile(filePath, '', workingDir)
        await loadFilesFromBackend()
      } else {
        if (!currentProjectId) {
          setEditingFileName(null)
          setEditingFileNameValue('')
          return
        }
        
        const newFile: FileNode = {
          name: trimmedName,
          type: 'file',
          path: relativePath,
          content: ''
        }

        setFiles(prev => [...prev, newFile])
        saveCurrentProject()
      }
      
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
  }, [editingFileName, projects, currentProjectId, useFileSystem, localDirectory, loadFilesFromBackend, setFiles, saveCurrentProject, setOpenTabs, setActiveTab, setSelectedFile, setCode, handleDetectLanguage, setEditingFileName, setEditingFileNameValue])

  const finishCreatingFolder = useCallback(async (folderName: string) => {
    if (!folderName.trim()) {
      setEditingFolderName(null)
      setEditingFolderNameValue('')
      return
    }

    const trimmedName = folderName.trim()
    const currentProject = projects.find(p => p.id === currentProjectId)
    const projectName = currentProject?.name || 'default'
    
    let relativePath: string
    if (editingFolderName?.parentPath === '/' || editingFolderName?.parentPath === `/${projectName}`) {
      relativePath = `/${projectName}/${trimmedName}`
    } else {
      relativePath = `${editingFolderName?.parentPath}/${trimmedName}`
    }
    
    const folderPath = relativePath
    
    try {
      if (useFileSystem) {
        const { codeEditorApi } = await import('../../services/api')
        const workingDir = localDirectory || undefined
        await codeEditorApi.writeFile(`${folderPath}/.gitkeep`, '', workingDir)
        
        const newFolder: FileNode = {
          name: trimmedName,
          type: 'folder',
          path: relativePath,
          children: []
        }
        
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
          setFiles(prev => [...prev, newFolder])
        } else {
          setFiles(prev => addFolderToTree(prev, editingFolderName!.parentPath, newFolder))
        }
        
        setTimeout(async () => {
          await loadFilesFromBackend()
        }, 100)
      } else {
        if (!currentProjectId) {
          setEditingFolderName(null)
          setEditingFolderNameValue('')
          return
        }
        
        if (findFile(folderPath)) {
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
  }, [editingFolderName, projects, currentProjectId, useFileSystem, localDirectory, loadFilesFromBackend, findFile, setFiles, saveCurrentProject, setEditingFolderName, setEditingFolderNameValue])

  const handleDeleteFile = useCallback(async () => {
    if (!contextMenu) return
    
    try {
      if (useFileSystem) {
        const { codeEditorApi } = await import('../../services/api')
        const workingDir = localDirectory || undefined
        const fullPath = getProjectPath(contextMenu.filePath)
        await codeEditorApi.deleteFile(fullPath, workingDir)
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
  }, [contextMenu, useFileSystem, localDirectory, getProjectPath, loadFilesFromBackend, setFiles, setOpenTabs, activeTab, openTabs, setActiveTab, setSelectedFile, setCode, saveCurrentProject, setContextMenu])

  const handleCopyFile = useCallback(async () => {
    if (!contextMenu) return
    
    const file = findFile(contextMenu.filePath)
    if (file && file.content) {
      setCopiedFilePath(contextMenu.filePath)
      setCutFilePath(null)
      await navigator.clipboard.writeText(file.content)
      setContextMenu(null)
    }
  }, [contextMenu, findFile, setCopiedFilePath, setCutFilePath, setContextMenu])

  const handleCutFile = useCallback(async () => {
    if (!contextMenu) return
    
    const file = findFile(contextMenu.filePath)
    if (file) {
      setCutFilePath(contextMenu.filePath)
      setCopiedFilePath(null)
      if (file.content) {
        await navigator.clipboard.writeText(file.content)
      }
      setContextMenu(null)
    }
  }, [contextMenu, findFile, setCutFilePath, setCopiedFilePath, setContextMenu])

  const handleRenameFile = useCallback(() => {
    if (!contextMenu) return
    setRenamingFile({ path: contextMenu.filePath, name: contextMenu.fileName })
    setRenamingFileNameValue(contextMenu.fileName)
    setContextMenu(null)
  }, [contextMenu, setRenamingFile, setRenamingFileNameValue, setContextMenu])

  const finishRenamingFile = useCallback(async (newName: string) => {
    if (!renamingFile || !newName.trim()) {
      setRenamingFile(null)
      setRenamingFileNameValue('')
      return
    }

    const trimmedName = newName.trim()
    const parentPath = renamingFile.path.substring(0, renamingFile.path.lastIndexOf('/')) || '/'
    const newRelativePath = `${parentPath}/${trimmedName}`

    try {
      if (useFileSystem) {
        const { codeEditorApi } = await import('../../services/api')
        const workingDir = localDirectory || undefined
        const oldFullPath = getProjectPath(renamingFile.path)
        const newFullPath = getProjectPath(newRelativePath)
        
        const oldFile = findFile(renamingFile.path)
        let fileContent = oldFile?.content || ''
        if (!fileContent) {
          const readResult = await codeEditorApi.readFile(oldFullPath, workingDir)
          if (readResult.success) {
            fileContent = readResult.content
          }
        }
        
        await codeEditorApi.writeFile(newFullPath, fileContent, workingDir)
        await codeEditorApi.deleteFile(oldFullPath, workingDir)
        await loadFilesFromBackend()
      } else {
        setFiles(prev => prev.map(f => 
          f.path === renamingFile.path 
            ? { ...f, name: trimmedName, path: newRelativePath }
            : f
        ))
        setOpenTabs(prev => prev.map(tab => 
          tab.path === renamingFile.path
            ? { ...tab, path: newRelativePath, name: trimmedName }
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
  }, [renamingFile, useFileSystem, localDirectory, getProjectPath, findFile, loadFilesFromBackend, setFiles, setOpenTabs, activeTab, setActiveTab, selectedFile, setSelectedFile, saveCurrentProject, setRenamingFile, setRenamingFileNameValue])

  const handleRevealInExplorer = useCallback(() => {
    if (!contextMenu) return
    setSelectedFile(contextMenu.filePath)
    setContextMenu(null)
  }, [contextMenu, setSelectedFile, setContextMenu])

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = e.target.files
    if (!uploadedFiles || uploadedFiles.length === 0) return

    const filesArray = Array.from(uploadedFiles)
    await uploadFiles(filesArray, '/')
    
    e.target.value = ''
  }, [])

  const uploadFiles = useCallback(async (filesToUpload: File[], targetPath: string = '/') => {
    if (!filesToUpload || filesToUpload.length === 0) return

    try {
      const currentProject = projects.find(p => p.id === currentProjectId)
      const projectName = currentProject?.name || 'default'
      
      for (const file of filesToUpload) {
        const fileContent = await file.text()
        const relativePath = targetPath === '/' 
          ? `/${projectName}/${file.name}`
          : `${targetPath}/${file.name}`
        
        if (useFileSystem) {
          const { codeEditorApi } = await import('../../services/api')
          const workingDir = localDirectory || undefined
          const fullPath = getProjectPath(relativePath)
          await codeEditorApi.writeFile(fullPath, fileContent, workingDir)
        } else {
          const newFile: FileNode = {
            name: file.name,
            type: 'file',
            path: relativePath,
            content: fileContent
          }
          setFiles(prev => [...prev, newFile])
        }
      }
      
      if (useFileSystem) {
        await loadFilesFromBackend()
      } else {
        saveCurrentProject()
      }
    } catch (err: any) {
      console.error('Failed to upload files:', err)
    }
  }, [projects, currentProjectId, useFileSystem, localDirectory, getProjectPath, loadFilesFromBackend, setFiles, saveCurrentProject])

  return {
    startCreatingFile,
    startCreatingFolder,
    finishCreatingFile,
    finishCreatingFolder,
    handleDeleteFile,
    handleCopyFile,
    handleCutFile,
    handleRenameFile,
    finishRenamingFile,
    handleRevealInExplorer,
    handleFileUpload,
    uploadFiles,
  }
}
