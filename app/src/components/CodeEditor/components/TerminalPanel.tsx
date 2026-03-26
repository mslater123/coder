import React, { useRef } from 'react'
import { ProblemsPanel } from './ProblemsPanel'
import type { Problem } from './ProblemsPanel'

interface TerminalPanelProps {
  height: number
  terminalPanelTab: 'problems' | 'output' | 'debug' | 'terminal' | 'ports'
  setTerminalPanelTab: (tab: 'problems' | 'output' | 'debug' | 'terminal' | 'ports') => void
  problems: Problem[]
  onProblemClick?: (problem: Problem) => void
  output: string[]
  debugOutput: string[]
  ports: Array<{ port: number; name: string; process?: string }>
  terminals: Array<{ id: string; name: string; output: string[]; input: string }>
  activeTerminalId: string
  isRunning: boolean
  setShowTerminal: (show: boolean) => void
  setTerminals: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; output: string[]; input: string }>>>
  setActiveTerminalId: (id: string) => void
  executeTerminalCommand: (command: string, terminalId?: string) => void
  onResizeStart: (e: React.MouseEvent) => void
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  height,
  terminalPanelTab,
  setTerminalPanelTab,
  problems,
  output,
  debugOutput,
  ports,
  terminals,
  activeTerminalId,
  isRunning,
  setShowTerminal,
  setTerminals,
  setActiveTerminalId,
  executeTerminalCommand,
  onResizeStart,
  onProblemClick
}) => {
  const terminalRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <div 
        className="resize-handle resize-handle-horizontal"
        onMouseDown={onResizeStart}
        style={{ cursor: 'row-resize' }}
      />
      <div className="terminal-panel" style={{ height: height + 'px' }}>
        <div className="terminal-tabs">
          <div 
            className={`terminal-tab ${terminalPanelTab === 'problems' ? 'active' : ''}`}
            onClick={() => setTerminalPanelTab('problems')}
          >
            <span className="terminal-tab-icon">⚠️</span>
            <span>Problems</span>
            {problems.length > 0 && (
              <span className="terminal-tab-badge">{problems.length}</span>
            )}
          </div>
          <div 
            className={`terminal-tab ${terminalPanelTab === 'output' ? 'active' : ''}`}
            onClick={() => setTerminalPanelTab('output')}
          >
            <span className="terminal-tab-icon">📋</span>
            <span>Output</span>
          </div>
          <div 
            className={`terminal-tab ${terminalPanelTab === 'debug' ? 'active' : ''}`}
            onClick={() => setTerminalPanelTab('debug')}
          >
            <span className="terminal-tab-icon">🐛</span>
            <span>Debug Console</span>
          </div>
          <div 
            className={`terminal-tab ${terminalPanelTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setTerminalPanelTab('terminal')}
          >
            <span className="terminal-tab-icon">▷</span>
            <span>Terminal</span>
          </div>
          <div 
            className={`terminal-tab ${terminalPanelTab === 'ports' ? 'active' : ''}`}
            onClick={() => setTerminalPanelTab('ports')}
          >
            <span className="terminal-tab-icon">🔌</span>
            <span>Ports</span>
          </div>
          <div className="terminal-tabs-spacer"></div>
          <div className="terminal-actions">
            {terminalPanelTab === 'terminal' && (
              <button
                className="terminal-action-btn"
                onClick={() => {
                  const newId = Date.now().toString()
                  setTerminals(prev => [...prev, { 
                    id: newId, 
                    name: `Terminal ${prev.length + 1}`, 
                    output: [], 
                    input: '' 
                  }])
                  setActiveTerminalId(newId)
                }}
                title="New Terminal"
              >
                +
              </button>
            )}
            <button 
              className="terminal-action-btn terminal-close"
              onClick={() => setShowTerminal(false)}
              title="Close Panel"
            >
              ×
            </button>
          </div>
        </div>
        
        <div className="terminal-content">
          {terminalPanelTab === 'problems' && (
            <ProblemsPanel
              problems={problems}
              onProblemClick={(problem) => {
                if (onProblemClick) {
                  onProblemClick(problem)
                }
              }}
            />
          )}
          
          {terminalPanelTab === 'output' && (
            <div className="terminal-view">
              <div className="terminal-output" ref={terminalRef}>
                {output.length === 0 ? (
                  <div className="terminal-empty">No output yet</div>
                ) : (
                  output.map((line, idx) => (
                    <div key={idx} className="terminal-line">{line}</div>
                  ))
                )}
              </div>
            </div>
          )}
          
          {terminalPanelTab === 'debug' && (
            <div className="terminal-view">
              <div className="terminal-output" ref={terminalRef}>
                {debugOutput.length === 0 ? (
                  <div className="terminal-empty">Debug console ready. Start debugging to see output.</div>
                ) : (
                  debugOutput.map((line, idx) => (
                    <div key={idx} className="terminal-line">{line}</div>
                  ))
                )}
              </div>
            </div>
          )}
          
          {terminalPanelTab === 'terminal' && (
            <div className="terminal-view">
              <div className="terminal-instances">
                {terminals.map((term) => (
                  <div 
                    key={term.id} 
                    className={`terminal-instance ${activeTerminalId === term.id ? 'active' : ''}`}
                    style={{ display: activeTerminalId === term.id ? 'flex' : 'none' }}
                  >
                    <div className="terminal-instance-header">
                      <div className="terminal-instance-tabs">
                        {terminals.map((t) => (
                          <div
                            key={t.id}
                            className={`terminal-instance-tab ${activeTerminalId === t.id ? 'active' : ''}`}
                            onClick={() => setActiveTerminalId(t.id)}
                          >
                            <span>{t.name}</span>
                            {terminals.length > 1 && (
                              <button
                                className="terminal-instance-close"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (terminals.length > 1) {
                                    setTerminals(prev => prev.filter(t => t.id !== term.id))
                                    if (activeTerminalId === term.id) {
                                      const remaining = terminals.filter(t => t.id !== term.id)
                                      if (remaining.length > 0) {
                                        setActiveTerminalId(remaining[0].id)
                                      }
                                    }
                                  }
                                }}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="terminal-output" ref={terminalRef}>
                      {term.output.length === 0 ? (
                        <div className="terminal-empty">Terminal ready. Type commands or run code.</div>
                      ) : (
                        term.output.map((line, idx) => (
                          <div key={idx} className="terminal-line">{line}</div>
                        ))
                      )}
                    </div>
                    <div className="terminal-input-container">
                      <span className="terminal-prompt">$</span>
                      <input
                        type="text"
                        className="terminal-input"
                        value={term.input}
                        onChange={(e) => {
                          setTerminals(prev => prev.map(t => 
                            t.id === term.id ? { ...t, input: e.target.value } : t
                          ))
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const activeTerm = terminals.find(t => t.id === term.id)
                            if (activeTerm) {
                              executeTerminalCommand(activeTerm.input, term.id)
                            }
                          }
                        }}
                        placeholder="Enter command..."
                        disabled={isRunning}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {terminalPanelTab === 'ports' && (
            <div className="terminal-view">
              {ports.length === 0 ? (
                <div className="terminal-empty">No forwarded ports</div>
              ) : (
                <div className="ports-list">
                  {ports.map((port, idx) => (
                    <div key={idx} className="port-item">
                      <span className="port-number">{port.port}</span>
                      <span className="port-name">{port.name}</span>
                      {port.process && (
                        <span className="port-process">{port.process}</span>
                      )}
                      <button className="port-action">Open</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
