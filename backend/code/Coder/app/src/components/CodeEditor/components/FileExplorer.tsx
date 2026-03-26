import React, { useState, useEffect, useRef } from 'react'
import type { FileNode, ContextMenu } from '../types'
import { getFileIcon, getFolderIcon, getFileIconUrl, getFolderIconUrl, getFileIconClass } from '../utils'
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
  expandFolder,
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
  const menuRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Load saved expanded folders when component mounts or project changes
  useEffect(() => {
    // Always use saved expanded folders (empty array if none saved = all collapsed)
    setExpandedFolders(new Set(savedExpandedFolders || []))
  }, [currentProjectId, savedExpandedFolders?.join(',')])

  // Save expanded folders when they change (debounced)
  useEffect(() => {
    if (currentUserId && onExpandedFoldersChange) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      // Debounce save by 500ms
      saveTimeoutRef.current = setTimeout(() => {
        onExpandedFoldersChange(Array.from(expandedFolders), currentProjectId || null)
      }, 500)
      
      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
      }
    }
  }, [expandedFolders, currentUserId, currentProjectId, onExpandedFoldersChange])

  const toggleFolder = (folderPath: string) => {
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
  }

  const expandFolderPath = (folderPath: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      newSet.add(folderPath)
      return newSet
    })
  }

  const isFolderExpanded = (folderPath: string) => {
    return expandedFolders.has(folderPath)
  }

  // Recursively collect all nested folder paths starting from a given folder
  const getAllNestedFolderPaths = (startPath: string, nodes: FileNode[]): string[] => {
    const paths: string[] = []
    
    const findFolder = (searchPath: string, searchNodes: FileNode[]): FileNode | null => {
      for (const node of searchNodes) {
        if (node.path === searchPath && node.type === 'folder') {
          return node
        }
        if (node.children) {
          const found = findFolder(searchPath, node.children)
          if (found) return found
        }
      }
      return null
    }
    
    // Recursively collect all folder paths within a folder's children
    const collectPaths = (folderNodes: FileNode[]) => {
      for (const node of folderNodes) {
        if (node.type === 'folder') {
          paths.push(node.path)
          if (node.children && node.children.length > 0) {
            collectPaths(node.children)
          }
        }
      }
    }
    
    const startFolder = findFolder(startPath, nodes)
    if (startFolder && startFolder.children) {
      collectPaths(startFolder.children)
    }
    
    return paths
  }

  // Recursively expand all nested folders
  const expandFolderRecursive = (folderPath: string) => {
    const nestedPaths = getAllNestedFolderPaths(folderPath, files)
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      newSet.add(folderPath) // Add the clicked folder
      nestedPaths.forEach(path => newSet.add(path)) // Add all nested folders
      return newSet
    })
  }

  // Recursively collapse all nested folders
  const collapseFolderRecursive = (folderPath: string) => {
    const nestedPaths = getAllNestedFolderPaths(folderPath, files)
    setExpandedFolders(prev => {
      const newSet = new Set(prev)
      newSet.delete(folderPath) // Remove the clicked folder
      nestedPaths.forEach(path => newSet.delete(path)) // Remove all nested folders
      return newSet
    })
  }

  // Expose expand function to parent
  useEffect(() => {
    if (expandFolder) {
      // Store the function reference (this is a workaround since we can't pass functions directly)
      // Instead, we'll use a callback pattern
    }
  }, [expandFolder])

  // Folders are collapsed by default - only expand based on saved state
  // No auto-expansion - user must manually expand folders
  const renderFileTree = (nodes: FileNode[], level = 0, parentPath: string = '/') => {
    const result: React.ReactElement[] = []
    
    nodes.forEach((node) => {
      result.push(
        <div key={node.path}>
          <div
            className={`file-tree-item ${selectedFile === node.path ? 'selected' : ''} ${dragOverPath === node.path ? 'drag-over' : ''} ${draggedFilePath === node.path ? 'dragging' : ''} ${dragOverTarget === node.path && isDraggingFiles ? 'drag-over-files' : ''} ${node.name === '__pycache__' || node.path.includes('/__pycache__') ? 'pycache-item' : ''}`}
            style={{ paddingLeft: `${level * 8 + 4}px` }}
            draggable={node.type === 'file'}
            data-path={node.path}
            data-type={node.type}
            onDragStart={(e) => {
              if (node.type === 'file') {
                setDraggedFilePath(node.path)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', node.path)
              }
            }}
            onDragEnd={() => {
              setDraggedFilePath(null)
              setDragOverPath(null)
              setIsDraggingFiles(false)
              setDragOverTarget(null)
            }}
            onDragOver={(e) => {
              // Handle internal file moves (when dragging existing files)
              if (node.type === 'folder' && draggedFilePath && draggedFilePath !== node.path) {
                e.preventDefault()
                e.stopPropagation()
                setDragOverPath(node.path)
                e.dataTransfer.dropEffect = 'move'
              }
              // Handle external file drops (when dragging files from outside)
              else if (e.dataTransfer.types.includes('Files') && !draggedFilePath) {
                e.preventDefault()
                e.stopPropagation()
                if (node.type === 'folder') {
                  setDragOverTarget(node.path)
                  setIsDraggingFiles(true)
                } else {
                  setDragOverTarget('/')
                }
                e.dataTransfer.dropEffect = 'copy'
              }
            }}
            onDragLeave={(e) => {
              // Only clear drag over if we're actually leaving the element
              const relatedTarget = e.relatedTarget as HTMLElement
              if (!e.currentTarget.contains(relatedTarget)) {
                if (draggedFilePath) {
                  setDragOverPath(null)
                } else {
                  setDragOverTarget(null)
                  setIsDraggingFiles(false)
                }
              }
            }}
            onDrop={async (e) => {
              e.preventDefault()
              e.stopPropagation()
              
              // Handle internal file moves
              if (node.type === 'folder' && draggedFilePath) {
                const targetFolderPath = node.path
                await handleDragDropFile(draggedFilePath, targetFolderPath)
                // Expand the target folder after moving the file so it's visible
                expandFolderPath(targetFolderPath)
                setDraggedFilePath(null)
                setDragOverPath(null)
              }
              // Handle external file drops
              else if (e.dataTransfer.types.includes('Files') && !draggedFilePath && onUploadFiles) {
                const droppedFiles = Array.from(e.dataTransfer.files)
                if (droppedFiles.length > 0) {
                  const targetPath = node.type === 'folder' ? node.path : '/'
                  try {
                    await onUploadFiles(droppedFiles, targetPath)
                    if (onRefresh) {
                      await onRefresh()
                    }
                    if (node.type === 'folder') {
                      expandFolderPath(node.path)
                    }
                  } catch (err: any) {
                    console.error(`Failed to upload dropped files: ${err.message}`)
                  }
                }
                setIsDraggingFiles(false)
                setDragOverTarget(null)
              }
            }}
            onClick={(e) => {
              // Single click: select and open the file, or toggle folder
              if (node.type === 'file') {
                setSelectedFile(node.path)
                handleFileSelect(node.path)
              } else if (node.type === 'folder') {
                // Toggle folder expansion when clicking on folder
                const target = e.target as HTMLElement
                // Don't toggle if clicking on the arrow (it has its own handler)
                if (!target.classList.contains('folder-arrow')) {
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
                }
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setContextMenu({
                x: e.clientX,
                y: e.clientY,
                filePath: node.path,
                fileName: node.name,
                isFolder: node.type === 'folder'
              })
            }}
            onDoubleClick={(e) => {
              // Double click: rename the file
              e.stopPropagation()
              if (node.type === 'file') {
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
                alt=""
                className="file-icon-img"
                loading="lazy"
                onError={(e) => {
                  // Fallback to alternative CDN if image fails to load
                  const target = e.target as HTMLImageElement
                  const iconUrl = target.src
                  const iconName = isFolderExpanded(node.path) 
                    ? getIconForOpenFolder(node.name) || 'default_folder_opened.svg'
                    : getIconForFolder(node.name) || 'default_folder.svg'
                  
                  // Try alternative CDN if first one fails
                  if (!iconUrl.includes('raw.githubusercontent.com')) {
                    const altUrl = `https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/${iconName}?v=4`
                    target.src = altUrl
                    target.onerror = () => {
                      // Final fallback to codicon
                      const parent = target.parentElement
                      if (parent) {
                        const iconClass = isFolderExpanded(node.path) ? 'codicon-folder-opened' : 'codicon-folder'
                        const span = document.createElement('span')
                        span.className = `file-icon codicon ${iconClass}`
                        span.setAttribute('aria-label', node.name)
                        parent.replaceChild(span, target)
                      }
                    }
                    return
                  }
                  
                  // Final fallback to codicon
                  const parent = target.parentElement
                  if (parent) {
                    const iconClass = isFolderExpanded(node.path) ? 'codicon-folder-opened' : 'codicon-folder'
                    const span = document.createElement('span')
                    span.className = `file-icon codicon ${iconClass}`
                    span.setAttribute('aria-label', node.name)
                    parent.replaceChild(span, target)
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
                alt=""
                className="file-icon-img"
                loading="lazy"
                onError={(e) => {
                  // Fallback to alternative CDN if image fails to load
                  const target = e.target as HTMLImageElement
                  const iconUrl = target.src
                  const iconName = getFileIcon(node.name)
                  
                  // Try alternative CDN if first one fails
                  if (!iconUrl.includes('raw.githubusercontent.com')) {
                    const altUrl = `https://raw.githubusercontent.com/vscode-icons/vscode-icons/master/icons/${iconName}?v=4`
                    target.src = altUrl
                    target.onerror = () => {
                      // Try another CDN option
                      const altUrl2 = `https://rawcdn.githack.com/vscode-icons/vscode-icons/master/icons/${iconName}?v=4`
                      target.src = altUrl2
                      target.onerror = () => {
                        // Final fallback to codicon
                        const fallbackIcon = getFileIconClass(node.name)
                        const parent = target.parentElement
                        if (parent) {
                          const span = document.createElement('span')
                          span.className = `file-icon codicon ${fallbackIcon}`
                          span.setAttribute('aria-label', node.name)
                          parent.replaceChild(span, target)
                        }
                      }
                    }
                    return
                  }
                  
                  // Debug: log failed icon loads (only in dev)
                  if (process.env.NODE_ENV === 'development') {
                    console.warn(`Icon failed to load for ${node.name} from ${iconUrl}, icon name: ${iconName}`)
                  }
                  
                  // Final fallback to codicon
                  const fallbackIcon = getFileIconClass(node.name)
                  const parent = target.parentElement
                  if (parent) {
                    const span = document.createElement('span')
                    span.className = `file-icon codicon ${fallbackIcon}`
                    span.setAttribute('aria-label', node.name)
                    parent.replaceChild(span, target)
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
                  if (e.key === 'Enter') {
                    finishRenamingFile(renamingFileNameValue)
                  } else if (e.key === 'Escape') {
                    setRenamingFile(null)
                    setRenamingFileNameValue('')
                  }
                }}
                onBlur={() => {
                  if (renamingFileNameValue.trim() && renamingFileNameValue.trim() !== renamingFile.name) {
                    finishRenamingFile(renamingFileNameValue)
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
                {node.type === 'file' && openTabs.find(tab => tab.path === node.path)?.modified && (
                  <span className="file-modified-dot">●</span>
                )}
              </span>
            )}
          </div>
          {node.type === 'folder' && node.children && node.children.length > 0 && (
            isFolderExpanded(node.path) ? (
              <div className="file-tree-children">
                {renderFileTree(node.children, level + 1, node.path)}
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
                        finishCreatingFile(editingFileNameValue)
                      } else if (e.key === 'Escape') {
                        setEditingFileName(null)
                        setEditingFileNameValue('')
                      }
                    }}
                    onBlur={() => {
                      if (editingFileNameValue.trim()) {
                        finishCreatingFile(editingFileNameValue)
                      } else {
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
                        finishCreatingFolder(editingFolderNameValue)
                      } else if (e.key === 'Escape') {
                        setEditingFolderName(null)
                        setEditingFolderNameValue('')
                      }
                    }}
                    onBlur={() => {
                      if (editingFolderNameValue.trim()) {
                        finishCreatingFolder(editingFolderNameValue)
                      } else {
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
            ) : null
          )}
        </div>
      )
    })
    
    // Show inline input at root level if editing at root (project folder)
    const currentProject = projects?.find(p => p.id === currentProjectId)
    const projectName = currentProject?.name || 'default'
    const projectRootPath = `/${projectName}`
    if (level === 0 && editingFileName && (editingFileName.parentPath === '/' || editingFileName.parentPath === projectRootPath)) {
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
                finishCreatingFile(editingFileNameValue)
              } else if (e.key === 'Escape') {
                setEditingFileName(null)
                setEditingFileNameValue('')
              }
            }}
            onBlur={() => {
              if (editingFileNameValue.trim()) {
                finishCreatingFile(editingFileNameValue)
              } else {
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
    if (level === 0 && editingFolderName && (editingFolderName.parentPath === '/' || editingFolderName.parentPath === projectRootPath)) {
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
                finishCreatingFolder(editingFolderNameValue)
              } else if (e.key === 'Escape') {
                setEditingFolderName(null)
                setEditingFolderNameValue('')
              }
            }}
            onBlur={() => {
              if (editingFolderNameValue.trim()) {
                finishCreatingFolder(editingFolderNameValue)
              } else {
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

  // Handle drag and drop for file uploads from outside
  const handleDragOver = (e: React.DragEvent) => {
    // Only handle if dragging files (not internal file moves)
    if (e.dataTransfer.types.includes('Files') && !draggedFilePath) {
      e.preventDefault()
      e.stopPropagation()
      setIsDraggingFiles(true)
      e.dataTransfer.dropEffect = 'copy'
      
      // Determine drop target (folder or root)
      const target = e.target as HTMLElement
      const folderItem = target.closest('.file-tree-item')
      if (folderItem && folderItem.getAttribute('data-type') === 'folder') {
        const folderPath = folderItem.getAttribute('data-path')
        if (folderPath) {
          setDragOverTarget(folderPath)
        }
      } else {
        setDragOverTarget('/')
      }
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    // Only handle if dragging files (not internal file moves)
    if (e.dataTransfer.types.includes('Files') && !draggedFilePath) {
      e.preventDefault()
      e.stopPropagation()
      
      // Only clear if we're actually leaving the explorer area
      const relatedTarget = e.relatedTarget as HTMLElement
      const currentTarget = e.currentTarget as HTMLElement
      if (!currentTarget.contains(relatedTarget)) {
        setIsDraggingFiles(false)
        setDragOverTarget(null)
      }
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    // Only handle if dropping files (not internal file moves)
    if (e.dataTransfer.types.includes('Files') && !draggedFilePath) {
      e.preventDefault()
      e.stopPropagation()
      
      setIsDraggingFiles(false)
      const targetPath = dragOverTarget || '/'
      setDragOverTarget(null)
      
      // Get dropped files
      const droppedFiles = Array.from(e.dataTransfer.files)
      if (!droppedFiles || droppedFiles.length === 0) return
      
      // Use the upload handler if provided, otherwise fall back to default behavior
      if (onUploadFiles) {
        try {
          await onUploadFiles(droppedFiles, targetPath)
          // Refresh file list
          if (onRefresh) {
            await onRefresh()
          }
          // Expand target folder if it was a folder
          if (targetPath !== '/' && targetPath) {
            expandFolderPath(targetPath)
          }
        } catch (err: any) {
          console.error(`Failed to upload dropped files: ${err.message}`)
        }
      }
    }
  }

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
            className={`file-tree ${dragOverPath === '/' ? 'drag-over-root' : ''}`}
            onDragOver={(e) => {
            if (draggedFilePath) {
              e.preventDefault()
              e.stopPropagation()
              setDragOverPath('/')
              e.dataTransfer.dropEffect = 'move'
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setDragOverPath(null)
            }
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (draggedFilePath) {
              handleDragDropFile(draggedFilePath, '/')
              setDraggedFilePath(null)
              setDragOverPath(null)
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
            // If files has a single root node that matches the project name, render its children instead
            const currentProject = projects?.find(p => p.id === currentProjectId)
            const projectName = currentProject?.name || 'default'
            const projectRootPath = `/${projectName}`
            
            // Check if the first file is the project root folder
            if (files.length === 1 && files[0].path === projectRootPath && files[0].type === 'folder' && files[0].children) {
              // Render the project folder's children directly, skipping the project folder itself
              return renderFileTree(files[0].children || [], 0, projectRootPath)
            }
            // Otherwise render files normally
            return renderFileTree(files)
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
