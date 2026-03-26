import React, { useState, useRef, useCallback, useEffect } from 'react'
import type { EditorPaneNode, EditorSplitGroup } from '../types'
import * as splitUtils from '../utils/splitEditorUtils'
import { EditorPane } from './EditorPane'

interface SplitGroupProps {
  group: EditorSplitGroup
  depth: number
  activePaneId: string
  setActivePaneId: (id: string) => void
  onPaneTabClick: (paneId: string, path: string) => void
  onPaneTabClose: (paneId: string, e: React.MouseEvent, path: string) => void
  onPaneCloseAllTabs: (paneId: string) => void
  onPaneCodeChange: (paneId: string, value: string | undefined) => void
  onPaneEditorMount: (editor: any, monaco: any, paneId: string) => void
  getPaneCode: (paneId: string) => string
  getPaneLanguage: (paneId: string) => string
  theme: string
  editorSettings: any
  showMarkdownPreview: boolean
  setShowMarkdownPreview: (show: boolean) => void
  showTerminal: boolean
  terminalHeight: number
  onSplitPane: (paneId: string, orientation: 'horizontal' | 'vertical') => void
  onClosePane: (paneId: string) => void
  onGroupSizesChange: (groupId: string, sizes: number[]) => void
  onAIAction: (paneId: string, action: string) => void
  editorRefs: Map<string, React.RefObject<any>>
  monacoRefs: Map<string, React.RefObject<any>>
  renderPaneNode: (node: EditorPaneNode, depth: number) => React.ReactNode
}

export const SplitGroup: React.FC<SplitGroupProps> = ({
  group,
  depth,
  activePaneId,
  setActivePaneId,
  onPaneTabClick,
  onPaneTabClose,
  onPaneCloseAllTabs,
  onPaneCodeChange,
  onPaneEditorMount,
  getPaneCode,
  getPaneLanguage,
  theme,
  editorSettings,
  showMarkdownPreview,
  setShowMarkdownPreview,
  showTerminal,
  terminalHeight,
  onSplitPane,
  onClosePane,
  onGroupSizesChange,
  onAIAction,
  editorRefs,
  monacoRefs,
  renderPaneNode
}) => {
  const [isResizing, setIsResizing] = useState<{ childIndex: number; startPos: number; startSizes: number[] } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const handleMouseDown = useCallback((e: React.MouseEvent, childIndex: number) => {
    e.preventDefault()
    setIsResizing({ 
      childIndex, 
      startPos: group.orientation === 'horizontal' ? e.clientX : e.clientY, 
      startSizes: [...group.sizes] 
    })
  }, [group.orientation, group.sizes])
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return
    
    const container = containerRef.current
    const containerSize = group.orientation === 'horizontal' ? container.offsetWidth : container.offsetHeight
    const delta = group.orientation === 'horizontal' 
      ? (e.clientX - isResizing.startPos) / containerSize * 100
      : (e.clientY - isResizing.startPos) / containerSize * 100
    
    const newSizes = [...isResizing.startSizes]
    const childSize = newSizes[isResizing.childIndex]
    const nextChildSize = newSizes[isResizing.childIndex + 1]
    
    if (childSize + delta > 10 && nextChildSize - delta > 10) {
      newSizes[isResizing.childIndex] = childSize + delta
      newSizes[isResizing.childIndex + 1] = nextChildSize - delta
      onGroupSizesChange(group.id, newSizes)
    }
  }, [isResizing, group.orientation, group.id, onGroupSizesChange])
  
  const handleMouseUp = useCallback(() => {
    setIsResizing(null)
  }, [])
  
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing, handleMouseMove, handleMouseUp])
  
  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: group.orientation === 'horizontal' ? 'row' : 'column',
        position: 'relative'
      }}
    >
      {group.children.map((child, index) => (
        <React.Fragment key={splitUtils.isPane(child) ? child.id : child.id}>
          <div
            style={{
              width: group.orientation === 'horizontal' ? `${group.sizes[index]}%` : '100%',
              height: group.orientation === 'vertical' ? `${group.sizes[index]}%` : '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRight: group.orientation === 'horizontal' && index < group.children.length - 1 
                ? '1px solid var(--theme-border, #3e3e42)' 
                : 'none',
              borderBottom: group.orientation === 'vertical' && index < group.children.length - 1 
                ? '1px solid var(--theme-border, #3e3e42)' 
                : 'none',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {renderPaneNode(child, depth + 1)}
          </div>
          {index < group.children.length - 1 && (
            <div
              className="split-resizer"
              style={{
                width: group.orientation === 'horizontal' ? '4px' : '100%',
                height: group.orientation === 'vertical' ? '4px' : '100%',
                background: 'var(--theme-border, #3e3e42)',
                cursor: group.orientation === 'horizontal' ? 'col-resize' : 'row-resize',
                position: 'relative',
                zIndex: 10
              }}
              onMouseDown={(e) => handleMouseDown(e, index)}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
