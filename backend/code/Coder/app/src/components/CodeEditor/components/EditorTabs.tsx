import React from 'react'
import { getFileIconUrl, detectLanguage } from '../utils'

interface EditorTabsProps {
  openTabs: Array<{ path: string; name: string; content: string; modified: boolean }>
  activeTab: string
  handleTabClick: (path: string) => void
  handleTabClose: (e: React.MouseEvent, path: string) => void
  closeAllTabs: () => void
}

export const EditorTabs: React.FC<EditorTabsProps> = ({
  openTabs,
  activeTab,
  handleTabClick,
  handleTabClose,
  closeAllTabs
}) => {
  const getFileExtension = (filename: string): string => {
    const parts = filename.split('.')
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
  }

  const getTabColorClass = (filename: string): string => {
    const ext = getFileExtension(filename)
    const lang = detectLanguage(filename)
    
    // Color scheme based on file type
    if (['js', 'jsx', 'mjs', 'cjs'].includes(ext)) return 'tab-color-js'
    if (['ts', 'tsx', 'mts', 'cts'].includes(ext)) return 'tab-color-ts'
    if (['py', 'pyw', 'pyi'].includes(ext)) return 'tab-color-python'
    if (['java', 'class'].includes(ext)) return 'tab-color-java'
    if (['cpp', 'cc', 'cxx', 'c++', 'hpp', 'hxx'].includes(ext)) return 'tab-color-cpp'
    if (['c', 'h'].includes(ext)) return 'tab-color-c'
    if (['html', 'htm'].includes(ext)) return 'tab-color-html'
    if (['css', 'scss', 'sass', 'less'].includes(ext)) return 'tab-color-css'
    if (['json', 'jsonc'].includes(ext)) return 'tab-color-json'
    if (['yaml', 'yml'].includes(ext)) return 'tab-color-yaml'
    if (['xml', 'xsd', 'xsl'].includes(ext)) return 'tab-color-xml'
    if (['md', 'markdown'].includes(ext)) return 'tab-color-markdown'
    if (['sh', 'bash', 'zsh', 'fish'].includes(ext)) return 'tab-color-shell'
    if (['dockerfile'].includes(filename.toLowerCase())) return 'tab-color-docker'
    if (['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'].includes(filename.toLowerCase()) || filename.toLowerCase().startsWith('docker-compose.')) return 'tab-color-docker-compose'
    if (['go'].includes(ext)) return 'tab-color-go'
    if (['rs'].includes(ext)) return 'tab-color-rust'
    if (['php'].includes(ext)) return 'tab-color-php'
    if (['rb', 'rake'].includes(ext)) return 'tab-color-ruby'
    if (['swift'].includes(ext)) return 'tab-color-swift'
    if (['kt', 'kts'].includes(ext)) return 'tab-color-kotlin'
    if (['vue'].includes(ext)) return 'tab-color-vue'
    if (['svelte'].includes(ext)) return 'tab-color-svelte'
    if (['sql'].includes(ext)) return 'tab-color-sql'
    if (['r'].includes(ext)) return 'tab-color-r'
    if (['lua'].includes(ext)) return 'tab-color-lua'
    if (['pl', 'pm'].includes(ext)) return 'tab-color-perl'
    if (['ex', 'exs'].includes(ext)) return 'tab-color-elixir'
    if (['jl'].includes(ext)) return 'tab-color-julia'
    if (['zig'].includes(ext)) return 'tab-color-zig'
    if (['nim', 'nims'].includes(ext)) return 'tab-color-nim'
    if (['cr'].includes(ext)) return 'tab-color-crystal'
    if (['toml'].includes(ext)) return 'tab-color-toml'
    if (['ini', 'cfg', 'conf'].includes(ext)) return 'tab-color-config'
    if (['txt', 'log'].includes(ext)) return 'tab-color-text'
    if (['lock'].includes(ext)) return 'tab-color-lock'
    
    return 'tab-color-default'
  }

  return (
    <div className="editor-tabs">
      {openTabs.length > 0 ? (
        <>
          {openTabs.map((tab) => {
            const iconUrl = getFileIconUrl(tab.path)
            const colorClass = getTabColorClass(tab.name)
            const isActive = activeTab === tab.path
            
            return (
              <div
                key={tab.path}
                className={`tab ${isActive ? 'active' : ''} ${colorClass}`}
                onClick={() => handleTabClick(tab.path)}
              >
                <img
                  src={iconUrl}
                  alt=""
                  className="tab-icon"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    // Fallback to codicon
                    const parent = target.parentElement
                    if (parent) {
                      const span = document.createElement('span')
                      span.className = 'tab-icon codicon codicon-file'
                      span.setAttribute('aria-label', tab.name)
                      parent.replaceChild(span, target)
                    }
                  }}
                />
                <span className="tab-name">
                  {tab.name}
                </span>
                {tab.modified && <span className="tab-modified">●</span>}
                <button
                  className="tab-close"
                  onClick={(e) => handleTabClose(e, tab.path)}
                  title="Close tab"
                >
                  ×
                </button>
              </div>
            )
          })}
          {openTabs.length > 1 && (
            <button
              className="tab-close-all"
              onClick={closeAllTabs}
              title="Close all tabs"
            >
              × All
            </button>
          )}
        </>
      ) : (
        <div className="tab-placeholder">
          <span>No files open</span>
        </div>
      )}
    </div>
  )
}
