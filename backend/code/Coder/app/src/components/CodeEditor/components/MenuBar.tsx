import React from 'react'
import { AVAILABLE_THEMES } from '../themes'
import type { EditorSettings, AppearanceSettings, ModelSettings } from '../types'

interface MenuBarProps {
  menuOpen: string | null
  setMenuOpen: (menu: string | null) => void
  editorRef: React.RefObject<any>
  setShowNewProjectDialog: (show: boolean) => void
  setShowProjectSwitcher: (show: boolean) => void
  startCreatingFile: () => void
  openFileFromProject: () => void
  saveCurrentProject: () => void
  saveFileAs: () => void
  onClose?: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  sidebarCollapsed: boolean
  setAiPanelVisible: (visible: boolean) => void
  aiPanelVisible: boolean
  setShowTerminal: (show: boolean) => void
  showTerminal: boolean
  setAiPanelPosition: (position: 'left' | 'right') => void
  aiPanelPosition: 'left' | 'right'
  setTheme: (theme: string) => void
  theme: string
  applyTheme: (themeId: string) => void
  setAppearanceSettings: React.Dispatch<React.SetStateAction<AppearanceSettings>>
  saveUserSettings: () => void
  setShowCommandPalette: (show: boolean) => void
  setShowSettings: (show: boolean) => void
  setShowKeyboardShortcuts: (show: boolean) => void
  runCode: () => void
  stopExecution: () => void
  setShowExecuteDialog: (show: boolean) => void
  activeTab: string
  selectedFile: string
  setTerminals: React.Dispatch<React.SetStateAction<any[]>>
  activeTerminalId: string
  setActiveTerminalId: (id: string) => void
}

export const MenuBar: React.FC<MenuBarProps> = ({
  menuOpen,
  setMenuOpen,
  editorRef,
  setShowNewProjectDialog,
  setShowProjectSwitcher,
  startCreatingFile,
  openFileFromProject,
  saveCurrentProject,
  saveFileAs,
  onClose,
  setSidebarCollapsed,
  sidebarCollapsed,
  setAiPanelVisible,
  aiPanelVisible,
  setShowTerminal,
  showTerminal,
  setAiPanelPosition,
  aiPanelPosition,
  setTheme,
  theme,
  applyTheme,
  setAppearanceSettings,
  saveUserSettings,
  setShowCommandPalette,
  setShowSettings,
  setShowKeyboardShortcuts,
  runCode,
  stopExecution,
  setShowExecuteDialog,
  activeTab,
  selectedFile,
  setTerminals,
  activeTerminalId,
  setActiveTerminalId
}) => {
  const menuItems = [
    {
      name: 'File',
      items: [
        { label: 'New Project', shortcut: 'Ctrl+Shift+N', action: () => setShowNewProjectDialog(true) },
        { label: 'Open Project...', shortcut: 'Ctrl+Shift+O', action: () => setShowProjectSwitcher(true) },
        { divider: true },
        { label: 'New File', shortcut: 'Ctrl+N', action: () => startCreatingFile() },
        { label: 'Open File...', shortcut: 'Ctrl+O', action: () => openFileFromProject() },
        { label: 'Save', shortcut: 'Ctrl+S', action: () => saveCurrentProject() },
        { label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: () => saveFileAs() },
        { divider: true },
        { label: 'Exit', action: onClose }
      ]
    },
    {
      name: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: () => editorRef.current?.getAction('undo').run() },
        { label: 'Redo', shortcut: 'Ctrl+Y', action: () => editorRef.current?.getAction('redo').run() },
        { divider: true },
        { label: 'Cut', shortcut: 'Ctrl+X', action: () => editorRef.current?.getAction('editor.action.clipboardCutAction').run() },
        { label: 'Copy', shortcut: 'Ctrl+C', action: () => editorRef.current?.getAction('editor.action.clipboardCopyAction').run() },
        { label: 'Paste', shortcut: 'Ctrl+V', action: () => editorRef.current?.getAction('editor.action.clipboardPasteAction').run() },
        { divider: true },
        { label: 'Find', shortcut: 'Ctrl+F', action: () => editorRef.current?.getAction('actions.find').run() },
        { label: 'Replace', shortcut: 'Ctrl+H', action: () => editorRef.current?.getAction('editor.action.startFindReplaceAction').run() }
      ]
    },
    {
      name: 'View',
      items: [
        { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', action: () => setShowCommandPalette(true) },
        { divider: true },
        { label: 'Explorer', shortcut: 'Ctrl+Shift+E', action: () => setSidebarCollapsed(false) },
        { label: 'AI Assistant', shortcut: 'Ctrl+Shift+A', action: () => setAiPanelVisible(!aiPanelVisible), checked: aiPanelVisible },
        { label: 'Terminal', shortcut: 'Ctrl+`', action: () => setShowTerminal(!showTerminal), checked: showTerminal },
        { divider: true },
        { label: 'Toggle Sidebar', shortcut: 'Ctrl+B', action: () => setSidebarCollapsed(!sidebarCollapsed), checked: !sidebarCollapsed },
        { label: 'Toggle AI Panel', action: () => setAiPanelVisible(!aiPanelVisible), checked: aiPanelVisible },
        { label: 'AI Panel Position', submenu: [
          { label: 'Left', action: () => setAiPanelPosition('left'), checked: aiPanelPosition === 'left' },
          { label: 'Right', action: () => setAiPanelPosition('right'), checked: aiPanelPosition === 'right' }
        ]},
        { divider: true },
        { label: 'Color Theme', submenu: AVAILABLE_THEMES.map(t => ({
          label: t.name,
          action: () => {
            const themeId = t.id
            setTheme(themeId)
            applyTheme(themeId)
            setAppearanceSettings(prev => ({ ...prev, colorTheme: themeId as any }))
            saveUserSettings()
          },
          checked: theme === t.id
        }))}
      ]
    },
    {
      name: 'Go',
      items: [
        { label: 'Go to Line...', shortcut: 'Ctrl+G', action: () => editorRef.current?.getAction('editor.action.gotoLine').run() },
        { label: 'Go to Symbol...', shortcut: 'Ctrl+Shift+O', action: () => editorRef.current?.getAction('workbench.action.gotoSymbol').run() },
        { label: 'Go to Definition', shortcut: 'F12', action: () => editorRef.current?.getAction('editor.action.revealDefinition').run() }
      ]
    },
    {
      name: 'Run',
      items: [
        { label: 'Execute...', shortcut: 'Ctrl+Shift+E', action: () => {
          setShowExecuteDialog(true)
        }},
        { label: 'Run Code', shortcut: 'F5', action: () => runCode() },
        { label: 'Debug', shortcut: 'F9', action: () => { 
          setShowTerminal(true)
        }},
        { label: 'Stop', shortcut: 'Shift+F5', action: () => stopExecution() }
      ]
    },
    {
      name: 'Terminal',
      items: [
        { label: 'New Terminal', shortcut: 'Ctrl+`', action: () => setShowTerminal(!showTerminal) },
        { label: 'Clear Terminal', action: () => {
          setTerminals(prev => prev.map(t => 
            t.id === activeTerminalId ? { ...t, output: [] } : t
          ))
        }}
      ]
    },
    {
      name: 'Settings',
      items: [
        { label: 'Settings...', shortcut: 'Ctrl+,', action: () => setShowSettings(true) }
      ]
    },
    {
      name: 'Help',
      items: [
        { label: 'Documentation', action: () => window.open('https://code.visualstudio.com/docs', '_blank') },
        { label: 'Keyboard Shortcuts', action: () => setShowKeyboardShortcuts(true) },
        { label: 'About', action: () => alert('AI Code Editor v1.0\n\nA powerful code editor with AI assistance powered by GPU infrastructure.') }
      ]
    }
  ]

  return (
    <div className="menu-bar">
      {menuItems.map((menu) => (
        <div
          key={menu.name}
          className="menu-item"
          onMouseEnter={() => setMenuOpen(menu.name)}
          onMouseLeave={() => setMenuOpen(null)}
        >
          <span>{menu.name}</span>
          {menuOpen === menu.name && (
            <div className="menu-dropdown">
              {menu.items.map((item, idx) => (
                <div key={idx}>
                  {item.divider ? (
                    <div className="menu-divider" />
                  ) : (item as any).submenu ? (
                    <div className="menu-item-submenu">
                      <span>{item.label}</span>
                      <span className="submenu-arrow">▶</span>
                      <div className="submenu">
                        {(item as any).submenu.map((subItem: any, subIdx: number) => (
                          <div
                            key={subIdx}
                            className="menu-dropdown-item"
                            onClick={() => {
                              subItem.action()
                              setMenuOpen(null)
                            }}
                          >
                            <span className="menu-check">{subItem.checked ? '✓' : ''}</span>
                            <span>{subItem.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div
                      className="menu-dropdown-item"
                      onClick={() => {
                        if (item.action) {
                          item.action()
                        }
                        setMenuOpen(null)
                      }}
                    >
                      <span className="menu-check">{(item as any).checked ? '✓' : ''}</span>
                      <span>{item.label}</span>
                      {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
