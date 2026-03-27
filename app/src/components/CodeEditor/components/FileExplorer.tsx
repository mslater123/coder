import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import type { FileNode, ContextMenu } from '../types'
import { getFileIcon, getFileIconUrl, getFolderIconUrl, getFileIconClass } from '../utils'
import { getIconForFolder, getIconForOpenFolder } from 'vscode-icons-js'

interface FileExplorerProps {
  files: FileNode[]
  selectedFile: string
  setSelectedFile: (path: string) => void
  handleFileSelect: (path: string) => void
  setContextMenu: (menu: ContextMenu | null) => void
  startCreatingFile: (parentPath?: string) => void
  startCreatingFolder: (parentPath?: string) => void
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  editingFileName: { path: string; parentPath: string } | null
  editingFileNameValue: string
  setEditingFileNameValue: (value: string) => void
  finishCreatingFile: (fileName: string) => void
  finishCreatingFolder: (folderName: string) => void
  editingFolderName: { path: string; parentPath: string } | null
  editingFolderNameValue: string
  setEditingFolderNameValue: (value: string) => void
  setEditingFolderName: (value: { path: string; parentPath: string } | null) => void
  setEditingFileName: (value: { path: string; parentPath: string } | null) => void
  renamingFile: { path: string; name: string } | null
  renamingFileNameValue: string
  setRenamingFileNameValue: (value: string) => void
  setRenamingFile: (file: { path: string; name: string } | null) => void
  finishRenamingFile: (newName: string) => void
  handleDragDropFile: (sourcePath: string, targetPath: string) => Promise<void>
  expandFolder?: (folderPath: string) => void
  sidebarWidth: number
  isSidebarAlwaysVisible: boolean
  sidebarCollapsed: boolean
  handleResizeStart: (type: 'sidebar' | 'ai-panel' | 'terminal', e: React.MouseEvent) => void
  projects?: Array<{ id: string; name: string }>
  currentProjectId?: string | null
  openTabs?: Array<{ path: string; name: string; content: string; modified: boolean }>
  onRefresh?: () => void | Promise<void>
  onUploadFiles?: (files: File[], targetPath?: string) => Promise<void>
  currentUserId?: number | null
  onExpandedFoldersChange?: (expandedFolders: string[], projectId: string | null) => void
  savedExpandedFolders?: string[]
  onShowVenvManager?: () => void
  venvInfo?: { path: string; python_path: string } | null
}

export const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  selectedFile,
  setSelectedFile,
  handleFileSelect,
  setContextMenu,
  startCreatingFile,
  startCreatingFolder,
  handleFileUpload,
  editingFileName,
  editingFileNameValue,
  setEditingFileNameValue,
  finishCreatingFile,
  finishCreatingFolder,
  editingFolderName,
  editingFolderNameValue,
  setEditingFolderNameValue,
  setEditingFolderName,
  setEditingFileName,
  renamingFile,
  renamingFileNameValue,
  setRenamingFileNameValue,
  setRenamingFile,
  finishRenamingFile,
  handleDragDropFile,
  expandFolder: _expandFolder,
  sidebarWidth,
  isSidebarAlwaysVisible,
  sidebarCollapsed,
  handleResizeStart,
  projects,
  currentProjectId,
  openTabs = [],
  onRefresh,
  onUploadFiles,
  currentUserId,
  onExpandedFoldersChange,
  savedExpandedFolders = [],
  onShowVenvManager,
  venvInfo
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const [draggedFilePath, setDraggedFilePath] = useState<string | null>(null)
  const [dragOverPath, setDragOverPath] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(savedExpandedFolders))
  const [explorerExpanded, setExplorerExpanded] = useState(true) // Explorer section expanded by default
  const [isDraggingFiles, setIsDraggingFiles] = useState(false)
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  const [isDraggingExternalFiles, setIsDraggingExternalFiles] = useState(false)
  const [dragOverTargetPath, setDragOverTargetPath] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMountedRef = useRef(true)

  // Memoize saved expanded folders to prevent unnecessary re-renders
  const savedExpandedFoldersKey = useMemo(() => {
    return savedExpandedFolders?.join(',') || ''
  }, [savedExpandedFolders])

  // Create a lookup map for modified files to avoid O(n) lookups on every render
  const modifiedFilesMap = useMemo(() => {
    const map = new Map<string, boolean>()
    openTabs.forEach(tab => {
      if (tab.modified) {
        map.set(tab.path, true)
      }
    })
    return map
  }, [openTabs])

  // Memoize project name and root path to avoid recalculating on every render
  const projectInfo = useMemo(() => {
    const currentProject = projects?.find(p => p.id === currentProjectId)
    const projectName = currentProject?.name || 'default'
    const projectRootPath = `/${projectName}`
    return { projectName, projectRootPath }
  }, [projects, currentProjectId])

  // Track mount status to prevent state updates after unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Creating a file/folder always needs the tree visible (MenuBar / ⌘N / ⋮ / context menu).
  useEffect(() => {
    if (editingFileName || editingFolderName) {
      setExplorerExpanded(true)
    }
  }, [editingFileName, editingFolderName])

  // Load saved expanded folders when component mounts or project changes
  useEffect(() => {
    // Always use saved expanded folders (empty array if none saved = all collapsed)
    setExpandedFolders(new Set(savedExpandedFolders || []))
  }, [currentProjectId, savedExpandedFoldersKey])

  // Save expanded folders when they change (debounced)
  useEffect(() => {
    if (currentUserId && onExpandedFoldersChange) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      // Debounce save by 500ms
      saveTimeoutRef.current = setTimeout(() => {
        // Only save if component is still mounted
        if (isMountedRef.current && onExpandedFoldersChange) {
          onExpandedFoldersChange(Array.from(expandedFolders), currentProjectId || null)
        }
      }, 500)
      
      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
          saveTimeoutRef.current = null
        }
      }
    }
  }, [expandedFolders, currentUserId, currentProjectId, onExpandedFoldersChange])

  const toggleFolder = useCallback((folderPath: string) => {
    if (!folderPath) return
    
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath)
      } else {
        newSet.add(folderPath)
      }
      return newSet
    })
    // Save will be handled by useEffect
  }, [])
  
  // Validate file/folder name for invalid characters
  const isValidFileName = useCallback((name: string): { valid: boolean; error?: string } => {
    const trimmedName = name?.trim()
    if (!trimmedName) {
      return { valid: false, error: 'Name cannot be empty' }
    }
    // Check for invalid characters (Windows and Unix)
    const invalidChars = /[<>:"|?*\x00-\x1f]/
    if (invalidChars.test(trimmedName)) {
      return { valid: false, error: 'Name contains invalid characters: < > : " | ? *' }
    }
    if (trimmedName.endsWith('.') || trimmedName.endsWith(' ')) {
      return { valid: false, error: 'Name cannot end with a period or space' }
    }
    // Check for reserved names (Windows)
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i
    if (reservedNames.test(trimmedName)) {
      return { valid: false, error: 'Name is a reserved system name (CON, PRN, AUX, NUL, COM1-9, LPT1-9)' }
    }
    // Check for path separators
    if (trimmedName.includes('/') || trimmedName.includes('\\')) {
      return { valid: false, error: 'Name cannot contain path separators (/, \\)' }
    }
    // Check for maximum length (Windows has 255 char limit for filenames)
    if (trimmedName.length > 255) {
      return { valid: false, error: 'Name is too long (maximum 255 characters)' }
    }
    return { valid: true }
  }, [])

  const expandFolderPath = useCallback((folderPath: string) => {
    if (!folderPath) return
    
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      newSet.add(folderPath)
      return newSet
    })
  }, [])

  const isFolderExpanded = useCallback((folderPath: string) => {
    return expandedFolders.has(folderPath)
  }, [expandedFolders])

  // Recursively collect all nested folder paths starting from a given folder
  const getAllNestedFolderPaths = useCallback((startPath: string, nodes: FileNode[]): string[] => {
    // Safety check: ensure nodes is an array
    if (!Array.isArray(nodes) || !startPath) {
      return []
    }
    
    const paths: string[] = []
    const visitedPaths = new Set<string>() // Prevent infinite loops from circular references
    
    const findFolder = (searchPath: string, searchNodes: FileNode[]): FileNode | null => {
      if (!Array.isArray(searchNodes)) return null
      
      for (const node of searchNodes) {
        if (!node || !node.path) continue
        if (node.path === searchPath && node.type === 'folder') {
          return node
        }
        if (node.children && Array.isArray(node.children)) {
          const found = findFolder(searchPath, node.children)
          if (found) return found
        }
      }
      return null
    }
    
    // Recursively collect all folder paths within a folder's children
    const collectPaths = (folderNodes: FileNode[]) => {
      if (!Array.isArray(folderNodes)) return
      
      for (const node of folderNodes) {
        if (!node || !node.path) continue
        // Prevent infinite loops from circular references
        if (visitedPaths.has(node.path)) continue
        visitedPaths.add(node.path)
        
        if (node.type === 'folder') {
          paths.push(node.path)
          if (node.children && Array.isArray(node.children) && node.children.length > 0) {
            collectPaths(node.children)
          }
        }
      }
    }
    
    const startFolder = findFolder(startPath, nodes)
    if (startFolder && startFolder.children && Array.isArray(startFolder.children)) {
      visitedPaths.add(startPath) // Mark starting folder as visited
      collectPaths(startFolder.children)
    }
    
    return paths
  }, [])

  // Recursively expand all nested folders
  const expandFolderRecursive = useCallback((folderPath: string) => {
    if (!folderPath || !Array.isArray(files) || files.length === 0) return
    
    const nestedPaths = getAllNestedFolderPaths(folderPath, files)
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      newSet.add(folderPath) // Add the clicked folder
      nestedPaths.forEach((path: string) => newSet.add(path)) // Add all nested folders
      return newSet
    })
  }, [files])

  // Recursively collapse all nested folders
  const collapseFolderRecursive = useCallback((folderPath: string) => {
    if (!folderPath || !Array.isArray(files) || files.length === 0) return
    
    const nestedPaths = getAllNestedFolderPaths(folderPath, files)
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      newSet.delete(folderPath) // Remove the clicked folder
      nestedPaths.forEach((path: string) => newSet.delete(path)) // Remove all nested folders
      return newSet
    })
  }, [files])


  // Folders are collapsed by default - only expand based on saved state
  // No auto-expansion - user must manually expand folders
  const renderFileTree = (nodes: FileNode[], level = 0, index = 0) => {
    // Empty array at root must still render (e.g. new project + ⋮ "New File", or root with no children yet).
    // Only bail on non-arrays.
    if (!Array.isArray(nodes)) {
      return null
    }

    // Prevent excessive nesting (safety check for malformed data)
    if (level > 100) {
      if (import.meta.env.DEV) {
        console.warn('FileExplorer: Maximum nesting level reached, stopping recursion')
      }
      return null
    }
    
    const result: React.ReactElement[] = []
    let currentIndex = index
    
    nodes.forEach((node, nodeIndex) => {
      // Safety check: ensure node has required properties
      if (!node || !node.path || !node.name || !node.type) {
        return
      }
      // Create a unique key by combining path, level, and index to handle duplicates
      const uniqueKey = `${node.path}-${level}-${currentIndex}-${nodeIndex}`
      currentIndex++
      
      result.push(
        <div key={uniqueKey}>
          <div
            className={[
              'file-tree-item',
              selectedFile === node.path && 'selected',
              dragOverPath === node.path && 'drag-over',
              draggedFilePath === node.path && 'dragging',
              dragOverTarget === node.path && (isDraggingFiles || isDraggingExternalFiles) && 'drag-over-files',
              (node.name === '__pycache__' || (node.path?.includes('/__pycache__'))) && 'pycache-item'
            ].filter(Boolean).join(' ')}
            style={{ paddingLeft: `${level * 8 + 4}px` }}
            draggable={node.type === 'file'}
            data-path={node.path}
            data-type={node.type}
            role={node.type === 'folder' ? 'treeitem' : 'treeitem'}
            aria-label={node.type === 'folder' ? `${node.name} folder` : `${node.name} file`}
            aria-expanded={node.type === 'folder' ? isFolderExpanded(node.path) : undefined}
            tabIndex={node.type === 'folder' ? 0 : node.type === 'file' ? 0 : -1}
            onKeyDown={(e) => {
              // Only proceed if component is still mounted
              if (!isMountedRef.current) return
              
              // Keyboard navigation for folders
              if (node.type === 'folder') {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleFolder(node.path)
                } else if (e.key === 'ArrowRight' && !isFolderExpanded(node.path)) {
                  e.preventDefault()
                  e.stopPropagation()
                  expandFolderPath(node.path)
                } else if (e.key === 'ArrowLeft' && isFolderExpanded(node.path)) {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleFolder(node.path)
                }
              } else if (node.type === 'file' && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                e.stopPropagation()
                setSelectedFile(node.path)
                handleFileSelect(node.path)
              }
            }}
            onDragStart={(e) => {
              // Only proceed if component is still mounted
              if (!isMountedRef.current) return
              if (node.type === 'file') {
                setDraggedFilePath(node.path)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', node.path)
              }
            }}
            onDragEnd={() => {
              // Only reset drag state if component is still mounted
              if (!isMountedRef.current) return
              // Reset all drag state
              setDraggedFilePath(null)
              setDragOverPath(null)
              setIsDraggingFiles(false)
              setDragOverTarget(null)
              setDragOverTargetPath(null)
              setIsDraggingExternalFiles(false)
            }}
            onDragOver={(e) => {
              // Handle internal file moves (when dragging existing files)
              if (node.type === 'folder' && draggedFilePath && draggedFilePath !== node.path) {
                e.preventDefault()
                e.stopPropagation()
                // Only update state if it's different to avoid unnecessary re-renders
                if (dragOverPath !== node.path) {
                  setDragOverPath(node.path)
                }
                e.dataTransfer.dropEffect = 'move'
              }
              // Handle external file drops (when dragging files from outside)
              else if (e.dataTransfer.types.includes('Files') && !draggedFilePath) {
                e.preventDefault()
                e.stopPropagation()
                if (node.type === 'folder') {
                  // Only update state if it's different to avoid unnecessary re-renders
                  if (dragOverTarget !== node.path || dragOverTargetPath !== node.path) {
                    setDragOverTarget(node.path)
                    setDragOverTargetPath(node.path)
                  }
                  if (!isDraggingFiles) setIsDraggingFiles(true)
                  if (!isDraggingExternalFiles) setIsDraggingExternalFiles(true)
                } else {
                  // Only update state if it's different
                  if (dragOverTarget !== '/' || dragOverTargetPath !== '/') {
                    setDragOverTarget('/')
                    setDragOverTargetPath('/')
                  }
                }
                e.dataTransfer.dropEffect = 'copy'
              }
            }}
            onDragLeave={(e) => {
              // Only clear drag over if we're actually leaving the element
              // relatedTarget can be null when dragging outside the browser window
              const relatedTarget = e.relatedTarget as HTMLElement | null
              if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
                if (draggedFilePath) {
                  setDragOverPath(null)
                } else {
                  setDragOverTarget(null)
                  setDragOverTargetPath(null)
                  setIsDraggingFiles(false)
                  setIsDraggingExternalFiles(false)
                }
              }
            }}
            onDrop={async (e) => {
              e.preventDefault()
              e.stopPropagation()
              
              // Handle internal file moves
              if (node.type === 'folder' && draggedFilePath) {
                const targetFolderPath = node.path
                try {
                  await handleDragDropFile(draggedFilePath, targetFolderPath)
                  // Only expand if component is still mounted
                  if (isMountedRef.current) {
                    // Expand the target folder after moving the file so it's visible
                    expandFolderPath(targetFolderPath)
                  }
                } catch (err: unknown) {
                  if (import.meta.env.DEV) {
                    console.error('Failed to move file:', err instanceof Error ? err.message : String(err))
                  }
                } finally {
                  // Always reset drag state, even on error (only if mounted)
                  if (isMountedRef.current) {
                    setDraggedFilePath(null)
                    setDragOverPath(null)
                  }
                }
              }
              // Handle external file drops (from OS file system)
              else if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && !draggedFilePath && onUploadFiles) {
                const filesToUpload = Array.from(e.dataTransfer.files)
                const targetPath = node.type === 'folder' ? node.path : '/'
                if (import.meta.env.DEV) {
                  console.log('Dropped files on folder:', filesToUpload.length, 'files to', targetPath)
                }
                try {
                  await onUploadFiles(filesToUpload, targetPath)
                  if (import.meta.env.DEV) {
                    console.log('Upload completed, refreshing file list')
                  }
                  // Refresh file list after upload
                  if (onRefresh && isMountedRef.current) {
                    await onRefresh()
                  }
                  // Expand the target folder after uploading so files are visible
                  if (node.type === 'folder' && isMountedRef.current) {
                    expandFolderPath(node.path)
                  }
                } catch (err: unknown) {
                  if (import.meta.env.DEV) {
                    console.error(`Failed to upload dropped files: ${err instanceof Error ? err.message : String(err)}`, err)
                  }
                } finally {
                  // Always reset drag state, even on error (only if mounted)
                  if (isMountedRef.current) {
                    setDragOverTarget(null)
                    setDragOverTargetPath(null)
                    setIsDraggingFiles(false)
                    setIsDraggingExternalFiles(false)
                  }
                }
              }
            }}
            onClick={(e) => {
              // Clear any pending single-click timeout (prevents single-click from firing on double-click)
              if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current)
                clickTimeoutRef.current = null
              }
              
              // Capture values needed for the timeout callback
              const nodePath = node.path
              const nodeType = node.type
              const target = e.target as HTMLElement
              const shiftKey = e.shiftKey
              
              // Delay single-click handling to allow double-click to register first
              clickTimeoutRef.current = setTimeout(() => {
                // Check if component is still mounted
                if (!isMountedRef.current) return
                
                // Single click: select and open the file, or toggle folder
                if (nodeType === 'file') {
                  setSelectedFile(nodePath)
                  handleFileSelect(nodePath)
                } else if (nodeType === 'folder') {
                  // Toggle folder expansion when clicking on folder
                  // Don't toggle if clicking on the arrow (it has its own handler)
                  // Check if target still exists in DOM before using closest()
                  if (target && target.isConnected) {
                    const folderArrow = target.closest('.folder-arrow')
                    if (!folderArrow) {
                      // Shift+Click: recursively expand/collapse all nested folders
                      if (shiftKey) {
                        const isExpanded = isFolderExpanded(nodePath)
                        if (isExpanded) {
                          collapseFolderRecursive(nodePath)
                        } else {
                          expandFolderRecursive(nodePath)
                        }
                      } else {
                        // Normal click: just toggle this folder
                        toggleFolder(nodePath)
                      }
                    }
                  }
                }
                // Clear the timeout reference after execution
                clickTimeoutRef.current = null
              }, 200) // 200ms delay to detect double-click
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // Only proceed if component is still mounted
              if (!isMountedRef.current) return
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                filePath: node.path,
                fileName: node.name,
                isFolder: node.type === 'folder'
              })
            }}
            onDoubleClick={(e) => {
              // Double click: rename the file or folder
              e.preventDefault()
              e.stopPropagation()
              
              // Cancel any pending single-click handler
              if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current)
                clickTimeoutRef.current = null
              }
              
              // Only proceed if component is still mounted
              if (!isMountedRef.current) return
              
              if (node.type === 'file') {
                setRenamingFile({ path: node.path, name: node.name })
                setRenamingFileNameValue(node.name)
              } else if (node.type === 'folder') {
                // Double-click folder: rename folder (if supported)
                setRenamingFile({ path: node.path, name: node.name })
                setRenamingFileNameValue(node.name)
              }
            }}
          >
            {node.type === 'folder' && (
              <span 
                className="folder-arrow"
                onClick={(e) => {
                  e.stopPropagation()
                  // Only proceed if component is still mounted
                  if (!isMountedRef.current) return
                  // Shift+Click: recursively expand/collapse all nested folders
                  if (e.shiftKey) {
                    const isExpanded = isFolderExpanded(node.path)
                    if (isExpanded) {
                      collapseFolderRecursive(node.path)
                    } else {
                      expandFolderRecursive(node.path)
                    }
                  } else {
                    // Normal click: just toggle this folder
                    toggleFolder(node.path)
                  }
                }}
              >
                {isFolderExpanded(node.path) ? '▼' : '▶'}
              </span>
            )}
            {node.type === 'folder' ? (
              <img 
                src={`${getFolderIconUrl(node.name, isFolderExpanded(node.path))}?v=4`}
                alt={`${node.name} folder`}
                className="file-icon-img"
                loading="lazy"
                aria-hidden="false"
                onError={(e) => {
                  // Fallback to alternative CDN if image fails to load
                  const target = e.target as HTMLImageElement
                  const iconUrl = target.src
                  const iconName = isFolderExpanded(node.path) 
                    ? getIconForOpenFolder(node.name) || 'default_folder_opened.svg'
                    : getIconForFolder(node.name) || 'default_folder.svg'
                  
                  // Try alternative CDN if first one fails
                  if (iconUrl && !iconUrl.includes('raw.githubusercontent.com')) {
                    const altUrl = `https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/${iconName}?v=4`
                    target.src = altUrl
                    target.onerror = () => {
                      // Final fallback to codicon
                      if (!target || !target.isConnected) return
                      const parent = target.parentElement
                      if (parent && parent.contains(target)) {
                        try {
                          const iconClass = isFolderExpanded(node.path) ? 'codicon-folder-opened' : 'codicon-folder'
                          const span = document.createElement('span')
                          span.className = `file-icon codicon ${iconClass}`
                          span.setAttribute('aria-label', node.name)
                          span.setAttribute('aria-hidden', 'false')
                          parent.replaceChild(span, target)
                        } catch (err) {
                          // Silently fail if replaceChild fails (element might have been removed)
                          if (import.meta.env.DEV) {
                            console.warn('Failed to replace icon element:', err)
                          }
                        }
                      }
                    }
                    return
                  }
                  
                  // Final fallback to codicon
                  if (!target || !target.isConnected) return
                  const parent = target.parentElement
                  if (parent && parent.contains(target)) {
                    try {
                      const iconClass = isFolderExpanded(node.path) ? 'codicon-folder-opened' : 'codicon-folder'
                      const span = document.createElement('span')
                      span.className = `file-icon codicon ${iconClass}`
                      span.setAttribute('aria-label', node.name)
                      span.setAttribute('aria-hidden', 'false')
                      parent.replaceChild(span, target)
                    } catch (err) {
                      // Silently fail if replaceChild fails (element might have been removed)
                      if (import.meta.env.DEV) {
                        console.warn('Failed to replace icon element:', err)
                      }
                    }
                  }
                }}
                onLoad={(e) => {
                  // Ensure image is visible when loaded and properly sized
                  const target = e.target as HTMLImageElement
                  target.style.display = 'inline-block'
                  target.style.width = '14px'
                  target.style.height = '14px'
                  target.style.objectFit = 'contain'
                  target.style.verticalAlign = 'middle'
                }}
              />
            ) : (
              <img 
                key={`file-icon-${node.path}-${node.name}`}
                src={`${getFileIconUrl(node.name)}?v=4`}
                alt={`${node.name} file`}
                className="file-icon-img"
                loading="lazy"
                aria-hidden="false"
                onError={(e) => {
                  // Fallback to alternative CDN if image fails to load
                  const target = e.target as HTMLImageElement
                  const iconUrl = target.src
                  const iconName = getFileIcon(node.name)
                  
                  // Try alternative CDN if first one fails
                  if (iconUrl && !iconUrl.includes('raw.githubusercontent.com')) {
                    const altUrl = `https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/${iconName}?v=4`
                    target.src = altUrl
                    target.onerror = () => {
                      // Try another CDN option
                      const altUrl2 = `https://rawcdn.githack.com/vscode-icons/vscode-icons/master/icons/${iconName}?v=4`
                      target.src = altUrl2
                      target.onerror = () => {
                        // Final fallback to codicon
                        if (!target || !target.isConnected) return
                        const fallbackIcon = getFileIconClass(node.name)
                        const parent = target.parentElement
                        if (parent && parent.contains(target)) {
                          try {
                            const span = document.createElement('span')
                            span.className = `file-icon codicon ${fallbackIcon}`
                            span.setAttribute('aria-label', node.name)
                            span.setAttribute('aria-hidden', 'false')
                            parent.replaceChild(span, target)
                          } catch (err) {
                            // Silently fail if replaceChild fails (element might have been removed)
                            if (import.meta.env.DEV) {
                              console.warn('Failed to replace icon element:', err)
                            }
                          }
                        }
                      }
                    }
                    return
                  }
                  
                  // Debug: log failed icon loads (only in dev)
                  if (import.meta.env.DEV) {
                    console.warn(`Icon failed to load for ${node.name} from ${iconUrl}, icon name: ${iconName}`)
                  }
                  
                  // Final fallback to codicon
                  if (!target || !target.isConnected) return
                  const fallbackIcon = getFileIconClass(node.name)
                  const parent = target.parentElement
                  if (parent && parent.contains(target)) {
                    try {
                      const span = document.createElement('span')
                      span.className = `file-icon codicon ${fallbackIcon}`
                      span.setAttribute('aria-label', node.name)
                      span.setAttribute('aria-hidden', 'false')
                      parent.replaceChild(span, target)
                    } catch (err) {
                      // Silently fail if replaceChild fails (element might have been removed)
                      if (import.meta.env.DEV) {
                        console.warn('Failed to replace icon element:', err)
                      }
                    }
                  }
                }}
                onLoad={(e) => {
                  // Ensure image is visible when loaded and properly sized
                  const target = e.target as HTMLImageElement
                  target.style.display = 'inline-block'
                  target.style.width = '14px'
                  target.style.height = '14px'
                  target.style.objectFit = 'contain'
                  target.style.verticalAlign = 'middle'
                }}
              />
            )}
            {renamingFile && renamingFile.path === node.path ? (
              <input
                type="text"
                className="file-name-input"
                value={renamingFileNameValue}
                onChange={(e) => setRenamingFileNameValue(e.target.value)}
                onKeyDown={(e) => {
                  // Defensive check: ensure renamingFile is still valid
                  if (!renamingFile || renamingFile.path !== node.path) return
                  
                  if (e.key === 'Enter') {
                    const trimmedValue = renamingFileNameValue.trim()
                    if (!trimmedValue || trimmedValue === renamingFile.name) {
                      // Empty or unchanged name - cancel rename
                      setRenamingFile(null)
                      setRenamingFileNameValue('')
                      return
                    }
                    const validation = isValidFileName(trimmedValue)
                    if (validation.valid) {
                      finishRenamingFile(trimmedValue)
                    } else {
                      // Invalid name, show error and keep editing
                      if (validation.error && import.meta.env.DEV) {
                        console.warn(validation.error)
                      }
                      // Don't reset - let user fix the name
                    }
                  } else if (e.key === 'Escape') {
                    setRenamingFile(null)
                    setRenamingFileNameValue('')
                  }
                }}
                onBlur={() => {
                  // Defensive check: ensure renamingFile is still valid
                  if (!renamingFile || renamingFile.path !== node.path) return
                  
                  const trimmedValue = renamingFileNameValue.trim()
                  if (trimmedValue && trimmedValue !== renamingFile.name) {
                    const validation = isValidFileName(trimmedValue)
                    if (validation.valid) {
                      finishRenamingFile(trimmedValue)
                    } else {
                      // Invalid name, reset to original
                      if (validation.error && import.meta.env.DEV) {
                        console.warn(validation.error)
                      }
                      setRenamingFile(null)
                      setRenamingFileNameValue('')
                    }
                  } else {
                    setRenamingFile(null)
                    setRenamingFileNameValue('')
                  }
                }}
                autoFocus
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="file-name">
                <span>{node.name}</span>
                {node.type === 'file' && modifiedFilesMap.has(node.path) && (
                  <span className="file-modified-dot" aria-label="File has unsaved changes">●</span>
                )}
              </span>
            )}
          </div>
            {node.type === 'folder' && isFolderExpanded(node.path) && (
              <div className="file-tree-children">
                {renderFileTree(node.children || [], level + 1, 0)}
              {/* Show inline input for new file if editing in this folder */}
              {editingFileName && editingFileName.parentPath === node.path && (
                <div className="file-tree-item file-tree-item-editing" style={{ paddingLeft: `${(level + 1) * 8 + 4}px` }}>
                  <span className="file-icon codicon-file"></span>
                  <input
                    type="text"
                    className="file-name-input"
                    value={editingFileNameValue}
                    onChange={(e) => setEditingFileNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const trimmedValue = editingFileNameValue.trim()
                        const validation = isValidFileName(trimmedValue)
                        if (trimmedValue && validation.valid) {
                          finishCreatingFile(trimmedValue)
                        } else {
                          if (!validation.valid && validation.error && import.meta.env.DEV) {
                            console.warn(validation.error)
                          }
                          setEditingFileName(null)
                          setEditingFileNameValue('')
                        }
                      } else if (e.key === 'Escape') {
                        setEditingFileName(null)
                        setEditingFileNameValue('')
                      }
                    }}
                    onBlur={() => {
                      const trimmedValue = editingFileNameValue.trim()
                      const validation = isValidFileName(trimmedValue)
                      if (trimmedValue && validation.valid) {
                        finishCreatingFile(trimmedValue)
                      } else {
                        if (!validation.valid && validation.error && import.meta.env.DEV) {
                          console.warn(validation.error)
                        }
                        setEditingFileName(null)
                        setEditingFileNameValue('')
                      }
                    }}
                    autoFocus
                    placeholder="File name..."
                  />
                </div>
              )}
              {/* Show inline input for new folder if editing in this folder */}
              {editingFolderName && editingFolderName.parentPath === node.path && (
                <div className="file-tree-item file-tree-item-editing" style={{ paddingLeft: `${(level + 1) * 8 + 4}px` }}>
                  <span className="file-icon codicon-folder"></span>
                  <input
                    type="text"
                    className="file-name-input"
                    value={editingFolderNameValue}
                    onChange={(e) => setEditingFolderNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const trimmedValue = editingFolderNameValue.trim()
                        const validation = isValidFileName(trimmedValue)
                        if (trimmedValue && validation.valid) {
                          finishCreatingFolder(trimmedValue)
                        } else {
                          if (!validation.valid && validation.error && import.meta.env.DEV) {
                            console.warn(validation.error)
                          }
                          setEditingFolderName(null)
                          setEditingFolderNameValue('')
                        }
                      } else if (e.key === 'Escape') {
                        setEditingFolderName(null)
                        setEditingFolderNameValue('')
                      }
                    }}
                    onBlur={() => {
                      const trimmedValue = editingFolderNameValue.trim()
                      const validation = isValidFileName(trimmedValue)
                      if (trimmedValue && validation.valid) {
                        finishCreatingFolder(trimmedValue)
                      } else {
                        if (!validation.valid && validation.error && import.meta.env.DEV) {
                          console.warn(validation.error)
                        }
                        setEditingFolderName(null)
                        setEditingFolderNameValue('')
                      }
                    }}
                    autoFocus
                    placeholder="Folder name..."
                  />
                </div>
              )}
              </div>
          )}
        </div>
      )
    })
    
    // Show inline input at root level if editing at root (project folder)
    if (level === 0 && editingFileName && (editingFileName.parentPath === '/' || editingFileName.parentPath === projectInfo.projectRootPath)) {
      result.push(
        <div key="new-file-root" className="file-tree-item file-tree-item-editing" style={{ paddingLeft: '4px' }}>
          <span className="file-icon">📄</span>
          <input
            type="text"
            className="file-name-input"
            value={editingFileNameValue}
            onChange={(e) => setEditingFileNameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const trimmedValue = editingFileNameValue.trim()
                const validation = isValidFileName(trimmedValue)
                if (trimmedValue && validation.valid) {
                  finishCreatingFile(trimmedValue)
                } else {
                  if (!validation.valid && validation.error && import.meta.env.DEV) {
                    console.warn(validation.error)
                  }
                  setEditingFileName(null)
                  setEditingFileNameValue('')
                }
              } else if (e.key === 'Escape') {
                setEditingFileName(null)
                setEditingFileNameValue('')
              }
            }}
            onBlur={() => {
              const trimmedValue = editingFileNameValue.trim()
              const validation = isValidFileName(trimmedValue)
              if (trimmedValue && validation.valid) {
                finishCreatingFile(trimmedValue)
              } else {
                if (!validation.valid && validation.error && import.meta.env.DEV) {
                  console.warn(validation.error)
                }
                setEditingFileName(null)
                setEditingFileNameValue('')
              }
            }}
            autoFocus
            placeholder="File name..."
          />
        </div>
      )
    }
    
    // Show inline input for new folder at root level if editing at root
    if (level === 0 && editingFolderName && (editingFolderName.parentPath === '/' || editingFolderName.parentPath === projectInfo.projectRootPath)) {
      result.push(
        <div key="new-folder-root" className="file-tree-item file-tree-item-editing" style={{ paddingLeft: '4px' }}>
          <span className="file-icon">📁</span>
          <input
            type="text"
            className="file-name-input"
            value={editingFolderNameValue}
            onChange={(e) => setEditingFolderNameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const trimmedValue = editingFolderNameValue.trim()
                const validation = isValidFileName(trimmedValue)
                if (trimmedValue && validation.valid) {
                  finishCreatingFolder(trimmedValue)
                } else {
                  if (!validation.valid && validation.error && import.meta.env.DEV) {
                    console.warn(validation.error)
                  }
                  setEditingFolderName(null)
                  setEditingFolderNameValue('')
                }
              } else if (e.key === 'Escape') {
                setEditingFolderName(null)
                setEditingFolderNameValue('')
              }
            }}
            onBlur={() => {
              const trimmedValue = editingFolderNameValue.trim()
              const validation = isValidFileName(trimmedValue)
              if (trimmedValue && validation.valid) {
                finishCreatingFolder(trimmedValue)
              } else {
                if (!validation.valid && validation.error && import.meta.env.DEV) {
                  console.warn(validation.error)
                }
                setEditingFolderName(null)
                setEditingFolderNameValue('')
              }
            }}
            autoFocus
            placeholder="Folder name..."
          />
        </div>
      )
    }
    
    return <>{result}</>
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showMenu])

  // Handle global drag end to reset state if drag is cancelled (e.g., dragged outside window)
  useEffect(() => {
    const handleGlobalDragEnd = () => {
      // Only reset state if component is still mounted
      if (!isMountedRef.current) return
      
      // Reset all drag state when drag ends globally
      setDraggedFilePath(null)
      setDragOverPath(null)
      setIsDraggingFiles(false)
      setDragOverTarget(null)
      setDragOverTargetPath(null)
      setIsDraggingExternalFiles(false)
    }

    document.addEventListener('dragend', handleGlobalDragEnd)
    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd)
    }
  }, [])

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current)
        clickTimeoutRef.current = null
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
    }
  }, [])


  return (
    <div 
      style={{ 
        display: (isSidebarAlwaysVisible || !sidebarCollapsed) ? 'flex' : 'none',
        flexDirection: 'row',
        height: '100%',
        width: sidebarWidth + 'px',
        flexShrink: 0
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="file-explorer" style={{ width: '100%', height: '100%', flexShrink: 0 }} onContextMenu={(e) => e.preventDefault()}>
        <div className="explorer-header">
          <div 
            className="explorer-title"
            onClick={() => setExplorerExpanded(!explorerExpanded)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', userSelect: 'none', flex: 1 }}
          >
            <span className="folder-arrow" style={{ fontSize: '10px', width: '12px', display: 'inline-block', textAlign: 'center' }}>
              {explorerExpanded ? '▼' : '▶'}
            </span>
            <span style={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {(() => {
                const currentProject = projects?.find(p => p.id === currentProjectId)
                return currentProject?.name.toUpperCase() || 'EXPLORER'
              })()}
            </span>
          </div>
          <div className="explorer-actions" ref={menuRef}>
            <input
              type="file"
              id="file-upload-input"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            {onShowVenvManager && (
              <button
                className="explorer-venv-btn"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onShowVenvManager()
                }}
                title={venvInfo ? `Virtual Environment: ${venvInfo.path}` : 'Manage Virtual Environment'}
                style={{
                  background: venvInfo ? 'var(--theme-button-background, #0e639c)' : 'none',
                  border: 'none',
                  color: venvInfo ? 'var(--theme-button-text, #ffffff)' : 'var(--theme-fg, #cccccc)',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  borderRadius: '3px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = venvInfo 
                    ? 'var(--theme-button-hover, #1177bb)' 
                    : 'var(--theme-button-hover, rgba(255, 255, 255, 0.1))'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = venvInfo 
                    ? 'var(--theme-button-background, #0e639c)' 
                    : 'transparent'
                }}
              >
                <span className="codicon codicon-package" style={{ fontSize: '16px' }}></span>
              </button>
            )}
            {onRefresh && (
              <button
                className="explorer-refresh-btn"
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  await onRefresh()
                }}
                title="Refresh"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--theme-fg, #cccccc)',
                  cursor: 'pointer',
                  padding: '4px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  borderRadius: '3px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--theme-button-hover, rgba(255, 255, 255, 0.1))'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <span className="codicon codicon-refresh" style={{ fontSize: '16px' }}></span>
              </button>
            )}
            <button
              className="explorer-menu-btn"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              title="Menu"
            >
              ⋮
            </button>
            {showMenu && (
              <div className="explorer-menu-dropdown">
                <div 
                  className="explorer-menu-item"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    startCreatingFile()
                    setShowMenu(false)
                  }}
                >
                  <span className="menu-icon">📄</span>
                  <span>New File</span>
                </div>
                <div 
                  className="explorer-menu-item"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    startCreatingFolder()
                    setShowMenu(false)
                  }}
                >
                  <span className="menu-icon">📁</span>
                  <span>New Folder</span>
                </div>
                <div className="explorer-menu-divider"></div>
                <div 
                  className="explorer-menu-item"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    document.getElementById('file-upload-input')?.click()
                    setShowMenu(false)
                  }}
                >
                  <span className="menu-icon">📤</span>
                  <span>Upload Files</span>
                </div>
              </div>
            )}
          </div>
        </div>
        {explorerExpanded && (
          <div 
            className={`file-tree ${dragOverPath === '/' ? 'drag-over-root' : ''} ${isDraggingExternalFiles && dragOverTargetPath === '/' ? 'drag-over-external' : ''}`}
            onDragEnter={(e) => {
              // Check if this is an external file drag (from OS file system)
              if (e.dataTransfer.types.includes('Files') && !draggedFilePath) {
                e.preventDefault()
                e.stopPropagation()
                // Only update state if it's different to avoid unnecessary re-renders
                if (dragOverTarget !== '/' || dragOverTargetPath !== '/' || dragOverPath !== '/') {
                  setDragOverTarget('/')
                  setDragOverTargetPath('/')
                  setDragOverPath('/')
                }
                if (!isDraggingFiles) setIsDraggingFiles(true)
                if (!isDraggingExternalFiles) setIsDraggingExternalFiles(true)
                e.dataTransfer.dropEffect = 'copy'
              } else if (draggedFilePath) {
                // Internal file move
                e.preventDefault()
                e.stopPropagation()
                // Only update state if it's different
                if (dragOverPath !== '/') {
                  setDragOverPath('/')
                }
                e.dataTransfer.dropEffect = 'move'
              }
            }}
            onDragOver={(e) => {
              // Handle external file drag
              if (e.dataTransfer.types.includes('Files') && !draggedFilePath) {
                e.preventDefault()
                e.stopPropagation()
                // Only update state if it's different to avoid unnecessary re-renders
                if (dragOverTarget !== '/' || dragOverTargetPath !== '/' || dragOverPath !== '/') {
                  setDragOverTarget('/')
                  setDragOverTargetPath('/')
                  setDragOverPath('/')
                }
                if (!isDraggingFiles) setIsDraggingFiles(true)
                if (!isDraggingExternalFiles) setIsDraggingExternalFiles(true)
                e.dataTransfer.dropEffect = 'copy'
              } else if (draggedFilePath) {
                // Handle internal file move
                e.preventDefault()
                e.stopPropagation()
                // Only update state if it's different
                if (dragOverPath !== '/') {
                  setDragOverPath('/')
                }
                e.dataTransfer.dropEffect = 'move'
              }
            }}
            onDragLeave={(e) => {
              // relatedTarget can be null when dragging outside the browser window
              const relatedTarget = e.relatedTarget as Node | null
              if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
                // Reset all drag state when leaving the root drop zone
                if (draggedFilePath) {
                  setDragOverPath(null)
                } else {
                  setDragOverTarget(null)
                  setDragOverTargetPath(null)
                  setIsDraggingFiles(false)
                  setIsDraggingExternalFiles(false)
                }
              }
            }}
            onDrop={async (e) => {
              e.preventDefault()
              e.stopPropagation()
              
              // Handle external file upload
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && !draggedFilePath) {
                const filesToUpload = Array.from(e.dataTransfer.files)
                if (import.meta.env.DEV) {
                  // Only log file names if there are few files to avoid performance issues
                  const fileNames = filesToUpload.length <= 10 
                    ? filesToUpload.map(f => f.name)
                    : filesToUpload.slice(0, 10).map(f => f.name).concat([`... and ${filesToUpload.length - 10} more`])
                  console.log('Dropped files:', filesToUpload.length, 'files', fileNames)
                }
                if (onUploadFiles) {
                  // Determine target path based on drag over target
                  const targetPath = dragOverTargetPath || '/'
                  if (import.meta.env.DEV) {
                    console.log('Uploading to target path:', targetPath)
                  }
                  try {
                    await onUploadFiles(filesToUpload, targetPath)
                    if (import.meta.env.DEV) {
                      console.log('Upload completed, refreshing file list')
                    }
                    // Refresh file list after upload
                    if (onRefresh && isMountedRef.current) {
                      await onRefresh()
                    }
                  } catch (err: unknown) {
                    if (import.meta.env.DEV) {
                      console.error(`Failed to upload dropped files: ${err instanceof Error ? err.message : String(err)}`, err)
                    }
                  } finally {
                    // Always reset drag state, even on error (only if mounted)
                    if (isMountedRef.current) {
                      setDragOverTarget(null)
                      setDragOverTargetPath(null)
                      setIsDraggingFiles(false)
                      setIsDraggingExternalFiles(false)
                    }
                  }
                } else {
                  if (import.meta.env.DEV) {
                    console.error('onUploadFiles is not defined')
                  }
                  if (isMountedRef.current) {
                    setDragOverTarget(null)
                    setDragOverTargetPath(null)
                    setIsDraggingFiles(false)
                    setIsDraggingExternalFiles(false)
                  }
                }
              } else if (draggedFilePath) {
                // Handle internal file move
                try {
                  await handleDragDropFile(draggedFilePath, '/')
                } catch (err: unknown) {
                  if (import.meta.env.DEV) {
                    console.error('Failed to move file:', err instanceof Error ? err.message : String(err))
                  }
                } finally {
                  // Always reset drag state, even on error (only if mounted)
                  if (isMountedRef.current) {
                    setDraggedFilePath(null)
                    setDragOverPath(null)
                  }
                }
              } else {
                if (import.meta.env.DEV) {
                  // Only convert types array if needed (avoid unnecessary work)
                  const types = e.dataTransfer.types ? Array.from(e.dataTransfer.types) : []
                  console.log('No files detected in drop event', {
                    hasFiles: !!e.dataTransfer.files,
                    filesLength: e.dataTransfer.files?.length,
                    draggedFilePath,
                    types
                  })
                }
                // Reset all drag state (only if mounted)
                if (isMountedRef.current) {
                  setDraggedFilePath(null)
                  setDragOverPath(null)
                  setIsDraggingFiles(false)
                  setDragOverTarget(null)
                  setDragOverTargetPath(null)
                  setIsDraggingExternalFiles(false)
                }
              }
            }}
          onContextMenu={(e) => {
            e.preventDefault()
            e.stopPropagation()
            // Right-click on empty space in file tree
            if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('file-tree')) {
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                filePath: '/',
                fileName: '',
                isFolder: false // Empty space, not a folder
              })
            }
          }}
          onDoubleClick={(e) => {
            // Double-click on empty space creates new file
            if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('file-tree')) {
              startCreatingFile()
            }
          }}
        >
          {(() => {
            if (!Array.isArray(files)) {
              return null
            }
            // If files has a single root node that matches the project name, render its children instead
            if (
              files.length === 1 &&
              files[0]?.path === projectInfo.projectRootPath &&
              files[0]?.type === 'folder'
            ) {
              return renderFileTree(files[0].children || [], 0, 0)
            }
            return renderFileTree(files.length === 0 ? [] : files, 0, 0)
          })()}
          </div>
        )}
      </div>
      {/* Sidebar Resize Handle */}
      <div 
        className="resize-handle resize-handle-vertical"
        onMouseDown={(e) => handleResizeStart('sidebar', e)}
        style={{ cursor: 'col-resize', flexShrink: 0, width: '4px' }}
      />
    </div>
  )
}
