import { useState } from 'react'
import './Sidebar.css'

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
  onCollapseChange?: (collapsed: boolean) => void
}

export function Sidebar({ currentPage, onPageChange, onCollapseChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleToggle = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    onCollapseChange?.(newState)
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'mining', label: 'Mining', icon: '⛏️' },
    { id: 'gpus', label: 'GPU Management', icon: '🎮' },
    { id: 'llm', label: 'LLM Chat', icon: '🤖' },
    { id: 'llm-manager', label: 'LLM Manager', icon: '📦' },
    { id: 'editor', label: 'Code Editor', icon: '💻' },
    { id: 'wallets', label: 'Wallets', icon: '💼' },
    { id: 'transactions', label: 'Transactions', icon: '💸' },
    { id: 'prices', label: 'Price History', icon: '📈' },
    { id: 'sessions', label: 'Mining Sessions', icon: '📋' },
    { id: 'statistics', label: 'Statistics', icon: '📉' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ]

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!isCollapsed && <h3>Menu</h3>}
        <button
          className="sidebar-toggle"
          onClick={handleToggle}
          aria-label="Toggle sidebar"
        >
          {isCollapsed ? '▶' : '◀'}
        </button>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onPageChange(item.id)}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="sidebar-icon">{item.icon}</span>
            {!isCollapsed && <span className="sidebar-label">{item.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  )
}
