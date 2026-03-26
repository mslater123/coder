import React, { useRef, useEffect } from 'react'
import type { AIMessage, FileOperation } from '../types'
import { parseMessageContent, computeDiff, type DiffLine } from '../utils'
import { AutoImprovementPanel } from './AutoImprovementPanel'

interface AIPanelProps {
  position: 'left' | 'right'
  width: number
  selectedAgentId: number | null
  selectedAgentIds: number[]
  selectedGpu: number | null
  agents: any[]
  queuedRequests: Array<{ id: string; prompt: string; status: string }>
  activeAgentRequests: Record<number, { status: string; agentName: string }>
  currentPromptGoal: string
  activeTab: string
  language: string
  isAIThinking: boolean
  isAIAssisting: boolean
  aiStatus: string
  aiMessages: AIMessage[]
  aiInput: string
  messageActions: Record<string, { accepted?: boolean; rejected?: boolean }>
  formatInlineMarkdown: (text: string) => string
  setAiPanelPosition: (position: 'left' | 'right') => void
  setAiPanelVisible: (visible: boolean) => void
  setSelectedAgentId: (id: number | null) => void
  setQueuedRequests: React.Dispatch<React.SetStateAction<Array<{ id: string; prompt: string; status: string }>>>
  setIsAIThinking: (thinking: boolean) => void
  setIsAIAssisting: (assisting: boolean) => void
  setAiStatus: (status: string) => void
  setCurrentPromptGoal: (goal: string) => void
  setAiInput: (input: string) => void
  sendAIMessage: () => void
  requestAIAssistance: (prompt?: string) => void
  handleAcceptSuggestion: (messageId: string) => void
  handleRejectSuggestion: (messageId: string) => void
  handleCopySuggestion: (content: string) => void
  handleApplyToFile: (content: string) => void
  applyFileOperations: (operations: FileOperation[]) => Promise<void>
  setMessageActions: React.Dispatch<React.SetStateAction<Record<string, { accepted?: boolean; rejected?: boolean }>>>
  onResizeStart: (e: React.MouseEvent) => void
}

export const AIPanel: React.FC<AIPanelProps> = ({
  position,
  width,
  selectedAgentId,
  selectedAgentIds,
  selectedGpu,
  agents,
  queuedRequests,
  activeAgentRequests,
  currentPromptGoal,
  activeTab,
  language,
  isAIThinking,
  isAIAssisting,
  aiStatus,
  aiMessages,
  aiInput,
  messageActions,
  formatInlineMarkdown,
  setAiPanelPosition,
  setAiPanelVisible,
  setSelectedAgentId,
  setQueuedRequests,
  setIsAIThinking,
  setIsAIAssisting,
  setAiStatus,
  setCurrentPromptGoal,
  setAiInput,
  sendAIMessage,
  requestAIAssistance,
  handleAcceptSuggestion,
  handleRejectSuggestion,
  handleCopySuggestion,
  handleApplyToFile,
  applyFileOperations,
  setMessageActions,
  onResizeStart,
  workingDir,
  onFilesChanged
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (messagesEndRef.current) {
          const messagesContainer = messagesEndRef.current.parentElement
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight
          } else {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' })
          }
        }
      }, 50)
    })
  }

  useEffect(() => {
    scrollToBottom()
  }, [aiMessages.length])

  return (
    <>
      {position === 'left' && (
        <div 
          className="resize-handle resize-handle-vertical"
          onMouseDown={onResizeStart}
          style={{ cursor: 'col-resize' }}
        />
      )}
      <div className="ai-panel cursor-style" style={{ width: width + 'px' }}>
        <div className="ai-panel-header">
          <div className="ai-panel-header-left">
            <select
              className="agent-selector"
              value={selectedAgentId || ''}
              onChange={(e) => setSelectedAgentId(e.target.value ? parseInt(e.target.value) : null)}
            >
              <option value="">Auto (GPU {selectedGpu || 'None'})</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.agent_type})
                </option>
              ))}
            </select>
            {queuedRequests.length > 0 && (
              <div className="queue-badge">
                {queuedRequests.length} in queue
              </div>
            )}
          </div>
          <div className="ai-panel-controls">
            <button
              className="panel-position-btn"
              onClick={() => setAiPanelPosition(position === 'left' ? 'right' : 'left')}
              title={`Move to ${position === 'left' ? 'Right' : 'Left'}`}
            >
              {position === 'left' ? '→' : '←'}
            </button>
            <button
              className="panel-close-btn"
              onClick={() => setAiPanelVisible(false)}
              title="Close Panel"
            >
              ×
            </button>
          </div>
        </div>
        
        {/* Auto Improvement Panel */}
        <div className="auto-improvement-section">
          <AutoImprovementPanel
            workingDir={workingDir}
            onImprovementsApplied={(count, filesModified) => {
              if (onFilesChanged) {
                onFilesChanged()
              }
            }}
          />
        </div>
        
        {/* Processing Information - Moved to top for better visibility */}
        {/* Thinking Indicator */}
        {isAIThinking && (
          <div className="ai-thinking-panel">
            <div className="thinking-indicator">
              <div className="thinking-spinner"></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span>{aiStatus || 'Thinking...'}</span>
                {aiStatus && aiStatus.includes('Reading') && (
                  <span style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                    📖 Analyzing file contents and structure
                  </span>
                )}
                {aiStatus && aiStatus.includes('Processing') && aiStatus.includes('file') && (
                  <span style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                    ✏️ Applying changes to files
                  </span>
                )}
              </div>
            </div>
            <button 
              className="stop-thinking-btn"
              onClick={() => {
                setIsAIThinking(false)
                setIsAIAssisting(false)
                setAiStatus('')
                setCurrentPromptGoal('')
                setQueuedRequests(prev => prev.filter(q => q.status !== 'processing'))
              }}
              title="Stop thinking"
            >
              ⏹ Stop
            </button>
          </div>
        )}

        {/* Generating Indicator */}
        {isAIAssisting && !isAIThinking && (
          <div className="ai-generating">
            <div className="generating-indicator">
              <div className="generating-spinner"></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span>{aiStatus || 'Generating...'}</span>
                {aiStatus && aiStatus.includes('Reading') && (
                  <span style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                    📖 Analyzing file contents and structure
                  </span>
                )}
                {aiStatus && aiStatus.includes('Processing') && aiStatus.includes('file') && (
                  <span style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                    ✏️ Applying changes to files
                  </span>
                )}
                {aiStatus && (aiStatus.includes('Creating') || aiStatus.includes('Updating') || aiStatus.includes('Deleting')) && (
                  <span style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                    💾 Writing file changes to disk
                  </span>
                )}
              </div>
            </div>
            <button 
              className="stop-generating-btn"
              onClick={() => {
                setIsAIAssisting(false)
                setAiStatus('')
                setCurrentPromptGoal('')
                setQueuedRequests(prev => prev.filter(q => q.status !== 'processing'))
              }}
              title="Stop generating"
            >
              ⏹ Stop
            </button>
          </div>
        )}

        {/* Active Agent Requests Display */}
        {Object.keys(activeAgentRequests).length > 0 && (
          <div className="queue-panel">
            <div className="queue-header">
              <span>Active Agents ({Object.keys(activeAgentRequests).length})</span>
            </div>
            {Object.entries(activeAgentRequests).map(([agentId, info]) => (
              <div key={agentId} className="queue-item">
                <div className="queue-status-icon">
                  {info.status === 'pending' ? '⏳' : 
                   info.status === 'sending' ? '📤' :
                   info.status === 'polling' ? '🔄' :
                   info.status === 'completed' ? '✓' :
                   info.status === 'error' ? '❌' :
                   info.status === 'timeout' ? '⏱️' : '⏳'}
                </div>
                <div className="queue-prompt">
                  {info.agentName} - {info.status}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Queue Display */}
        {queuedRequests.length > 0 && (
          <div className="queue-panel">
            <div className="queue-header">
              <span>Queue ({queuedRequests.length})</span>
            </div>
            {queuedRequests.map((req) => (
              <div key={req.id} className="queue-item">
                <div className="queue-status-icon">
                  {req.status === 'pending' ? '⏳' : '🔄'}
                </div>
                <div className="queue-prompt">{req.prompt.substring(0, 60)}{req.prompt.length > 60 ? '...' : ''}</div>
                <button 
                  className="queue-cancel" 
                  onClick={() => setQueuedRequests(prev => prev.filter(q => q.id !== req.id))}
                  title="Cancel"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Prompt Goal Display */}
        {currentPromptGoal ? (
          <div className="ai-context-bar">
            <span className="context-file-icon">🎯</span>
            <span className="context-file" title={currentPromptGoal}>{currentPromptGoal}</span>
          </div>
        ) : activeTab ? (
          <div className="ai-context-bar">
            <span className="context-file-icon">📄</span>
            <span className="context-file">{activeTab.split('/').pop()}</span>
            <span className="context-language">{language}</span>
          </div>
        ) : null}

        <div className="ai-panel-messages">
          {aiMessages.length === 0 && !isAIAssisting && !isAIThinking ? (
            <div className="ai-panel-empty">
              <div className="empty-icon">💬</div>
              <p className="empty-title">Start a conversation</p>
              <p className="empty-hint">Use Ctrl+Space for quick assistance</p>
              <div className="quick-actions">
                <button className="quick-action-btn" onClick={() => requestAIAssistance('Analyze the current codebase and suggest improvements.')}>
                  Analyze Codebase
                </button>
                <button className="quick-action-btn" onClick={() => requestAIAssistance('Find bugs in the current file.')}>
                  Find Bugs
                </button>
                <button className="quick-action-btn" onClick={() => requestAIAssistance('Refactor the selected code.')}>
                  Refactor Code
                </button>
                <button className="quick-action-btn" onClick={() => requestAIAssistance('Add unit tests for the current file.')}>
                  Add Tests
                </button>
              </div>
            </div>
          ) : (
            aiMessages.map((msg, msgIndex) => {
              // Only render assistant messages, but include input after each one
              if (msg.role !== 'assistant') return null
              
              // For streaming messages, show content as it arrives with code detection
              // For completed messages, parse and format properly
              const isStreaming = msg.isStreaming || false
              const contentToParse = msg.parsed?.text || msg.content
              const isLastAssistantMessage = msgIndex === aiMessages.length - 1 || 
                !aiMessages.slice(msgIndex + 1).some(m => m.role === 'assistant')
              
              // If streaming, try to detect and format code blocks in real-time
              if (isStreaming) {
                // Try to parse what we have so far (may be incomplete)
                const partialParts = parseMessageContent(contentToParse)
                const hasIncompleteCodeBlock = contentToParse.includes('```') && !contentToParse.match(/```[\s\S]*?```/g)?.length
                
                return (
                  <React.Fragment key={msg.id}>
                    <div className={`ai-message streaming`}>
                      <div className="ai-message-content">
                      {partialParts.length > 0 ? (
                        // Show parsed parts if we have complete blocks
                        <>
                          {partialParts.map((part, idx) => {
                            if (part.type === 'code') {
                              return (
                                <div key={idx} className="code-block-container">
                                  {part.language && (
                                    <div className="code-block-header">
                                      <span className="code-block-language">{part.language}</span>
                                    </div>
                                  )}
                                  <pre className="code-block streaming-code-block">
                                    <code>{part.content}</code>
                                  </pre>
                                </div>
                              )
                            } else {
                              return (
                                <div key={idx} className="ai-message-text">
                                  {part.content.split('\n').map((line, lineIdx) => (
                                    <p key={lineIdx} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line || '\u00A0') }} />
                                  ))}
                                </div>
                              )
                            }
                          })}
                          {/* Show remaining unparsed content if there's an incomplete code block */}
                          {hasIncompleteCodeBlock && (() => {
                            const lastCompleteIndex = contentToParse.lastIndexOf('```')
                            const remainingContent = contentToParse.substring(lastCompleteIndex)
                            // Check if we're in a code block
                            const codeBlockMatches = contentToParse.match(/```/g)
                            const isInCodeBlock = codeBlockMatches && codeBlockMatches.length % 2 === 1
                            
                            if (isInCodeBlock) {
                              // Extract language if present
                              const langMatch = remainingContent.match(/```(\w+)?\n?/)
                              const language = langMatch ? langMatch[1] : ''
                              const codeContent = remainingContent.replace(/```\w*\n?/, '')
                              
                              return (
                                <div className="code-block-container">
                                  {language && (
                                    <div className="code-block-header">
                                      <span className="code-block-language">{language}</span>
                                    </div>
                                  )}
                                  <pre className="code-block streaming-code-block">
                                    <code>{codeContent}</code>
                                    <span className="streaming-indicator">▋</span>
                                  </pre>
                                </div>
                              )
                            } else {
                              return (
                                <div className="ai-message-text">
                                  <p dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(remainingContent) }} />
                                  <span className="streaming-indicator">▋</span>
                                </div>
                              )
                            }
                          })()}
                          {!hasIncompleteCodeBlock && (
                            <span className="streaming-indicator">▋</span>
                          )}
                        </>
                      ) : (
                        // No complete blocks yet, show raw content
                        <div className="streaming-content">
                          <pre className="streaming-code">
                            <code>{contentToParse}</code>
                            <span className="streaming-indicator">▋</span>
                          </pre>
                        </div>
                      )}
                      </div>
                    </div>
                    {/* Input appears after each assistant message when not processing */}
                    {isLastAssistantMessage && !isAIAssisting && !isAIThinking && (
                      <div className="ai-panel-input-inline">
                        <div className="ai-input-wrapper">
                          <textarea
                            className="ai-input-textarea"
                            value={aiInput}
                            onChange={(e) => setAiInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                if (aiInput.trim() && !isAIAssisting && !isAIThinking && (selectedAgentId || selectedGpu || selectedAgentIds.length > 0)) {
                                  sendAIMessage()
                                }
                              }
                            }}
                            placeholder="Continue conversation... (Enter to send, Shift+Enter for new line)"
                            disabled={isAIAssisting || isAIThinking || (selectedAgentIds.length === 0 && !selectedAgentId && !selectedGpu)}
                            rows={1}
                            style={{ 
                              minHeight: '40px',
                              maxHeight: '200px',
                              overflowY: 'auto',
                              resize: 'none'
                            }}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement
                              target.style.height = 'auto'
                              target.style.height = `${Math.min(target.scrollHeight, 200)}px`
                            }}
                          />
                          <button
                            onClick={sendAIMessage}
                            disabled={isAIAssisting || isAIThinking || (selectedAgentIds.length === 0 && !selectedAgentId && !selectedGpu) || !aiInput.trim()}
                            className="ai-send-btn"
                            title="Send (Enter)"
                          >
                            {isAIAssisting ? (
                              <span className="ai-send-spinner">⏳</span>
                            ) : (
                              <span className="ai-send-icon">→</span>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                )
              }
              
              // For completed messages, parse and format normally
              const messageParts = parseMessageContent(contentToParse)
              const hasFileOperations = msg.parsed?.hasOperations && msg.parsed.fileOperations.length > 0
              
              // Filter out code blocks that match file operations to avoid duplication
              const filteredParts = hasFileOperations 
                ? messageParts.filter(part => {
                    if (part.type === 'code') {
                      const fileOps = msg.parsed?.fileOperations || []
                      // Check if this code block matches any file operation content
                      const normalizedPartContent = part.content.trim()
                      const matchesFileOp = fileOps.some(op => {
                        if (!op.content) return false
                        const normalizedOpContent = op.content.trim()
                        // Check for exact match or if the code block contains the file operation content
                        return normalizedOpContent === normalizedPartContent || 
                               normalizedPartContent.includes(normalizedOpContent) ||
                               normalizedOpContent.includes(normalizedPartContent)
                      })
                      // Filter out code blocks that match file operations
                      return !matchesFileOp
                    }
                    return true
                  })
                : messageParts
              
              return (
                <React.Fragment key={msg.id}>
                  <div className={`ai-message ${messageActions[msg.id]?.accepted ? 'accepted' : ''} ${messageActions[msg.id]?.rejected ? 'rejected' : ''}`}>
                    <div className="ai-message-content">
                    {hasFileOperations && msg.parsed && (
                      <div className="file-operations-panel">
                        <div className="file-operations-header">
                          <span className="file-operations-title">
                            📁 File Changes
                            {msg.parsed.fileOperations.length > 0 && (
                              <span className="file-ops-count">
                                ({msg.parsed.fileOperations.length} file{msg.parsed.fileOperations.length !== 1 ? 's' : ''})
                              </span>
                            )}
                          </span>
                          <div className="file-operations-actions">
                            <button
                              className="file-op-action-btn accept-all"
                              onClick={async () => {
                                if (msg.parsed?.fileOperations) {
                                  await applyFileOperations(msg.parsed.fileOperations)
                                  setMessageActions(prev => ({ ...prev, [msg.id]: { accepted: true } }))
                                }
                              }}
                              title="Accept All"
                            >
                              ✓ Accept All
                            </button>
                            <button
                              className="file-op-action-btn reject-all"
                              onClick={() => {
                                setMessageActions(prev => ({ ...prev, [msg.id]: { rejected: true } }))
                              }}
                              title="Reject All"
                            >
                              ✗ Reject All
                            </button>
                          </div>
                        </div>
                        <div className="file-operations-list">
                          {msg.parsed.fileOperations.map((op, opIdx) => {
                            // Calculate file stats for better preview
                            const lineCount = op.content ? op.content.split('\n').length : 0
                            const charCount = op.content ? op.content.length : 0
                            const hasChanges = op.type === 'edit' && op.oldContent && op.content && op.oldContent !== op.content
                            const changeStats = hasChanges && op.oldContent ? (() => {
                              const oldLines = op.oldContent.split('\n').length
                              const newLines = op.content.split('\n').length
                              const added = Math.max(0, newLines - oldLines)
                              const removed = Math.max(0, oldLines - newLines)
                              return { added, removed, total: oldLines }
                            })() : null
                            
                            return (
                            <div key={opIdx} className={`file-operation-item file-operation-${op.type}`}>
                              <div className="file-operation-header">
                                <span className="file-operation-icon">
                                  {op.type === 'create' && '✨'}
                                  {op.type === 'edit' && '✏️'}
                                  {op.type === 'delete' && '🗑️'}
                                </span>
                                <span className="file-operation-path" title={op.path}>{op.path}</span>
                                <span className="file-operation-type-badge">{op.type}</span>
                                {op.language && (
                                  <span className="file-operation-language-badge" title={`Language: ${op.language}`}>
                                    {op.language}
                                  </span>
                                )}
                                {lineCount > 0 && (
                                  <span className="file-operation-stats" title={`${lineCount} lines, ${charCount} characters`}>
                                    {lineCount} lines
                                    {changeStats && changeStats.added + changeStats.removed > 0 && (
                                      <span className="change-stats">
                                        {' '}(<span className="added">+{changeStats.added}</span>/<span className="removed">-{changeStats.removed}</span>)
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                              {op.description && (
                                <div className="file-operation-description">{op.description}</div>
                              )}
                              {hasChanges && (
                                <div className="file-operation-preview-note">
                                  ⚠️ This will modify existing content. Review changes below.
                                </div>
                              )}
                              {op.type === 'create' && op.content && (
                                <div className="file-operation-content">
                                  <div className="file-operation-content-header">
                                    <span>New file</span>
                                  </div>
                                  <pre className="file-operation-code">
                                    <code>{op.content}</code>
                                  </pre>
                                </div>
                              )}
                              {op.type === 'edit' && op.oldContent && op.content && (() => {
                                const diffLines = computeDiff(op.oldContent, op.content)
                                const addedCount = diffLines.filter(l => l.type === 'added').length
                                const removedCount = diffLines.filter(l => l.type === 'removed').length
                                
                                return (
                                  <div className="file-operation-diff">
                                    <div className="file-diff-header">
                                      <span className="diff-label">Line-by-line changes</span>
                                      <span className="diff-stats">
                                        <span className="diff-stat added">+{addedCount}</span>
                                        <span className="diff-stat removed">-{removedCount}</span>
                                      </span>
                                    </div>
                                    <div className="file-diff-content unified-diff">
                                      <pre className="diff-code">
                                        <code>
                                          {diffLines.map((line, idx) => {
                                            if (line.type === 'unchanged') {
                                              return (
                                                <React.Fragment key={idx}>
                                                  <span className="diff-line unchanged">
                                                    <span className="diff-line-number">{line.newLineNumber}</span>
                                                    {line.content}
                                                  </span>
                                                  {'\n'}
                                                </React.Fragment>
                                              )
                                            } else if (line.type === 'removed') {
                                              return (
                                                <React.Fragment key={idx}>
                                                  <span className="diff-line removed">
                                                    <span className="diff-line-number">{line.oldLineNumber}</span>
                                                    <span className="diff-line-prefix">-</span>
                                                    {line.content}
                                                  </span>
                                                  {'\n'}
                                                </React.Fragment>
                                              )
                                            } else if (line.type === 'added') {
                                              return (
                                                <React.Fragment key={idx}>
                                                  <span className="diff-line added">
                                                    <span className="diff-line-number">{line.newLineNumber}</span>
                                                    <span className="diff-line-prefix">+</span>
                                                    {line.content}
                                                  </span>
                                                  {'\n'}
                                                </React.Fragment>
                                              )
                                            }
                                            return null
                                          })}
                                        </code>
                                      </pre>
                                    </div>
                                  </div>
                                )
                              })()}
                              {op.type === 'edit' && !op.oldContent && op.content && (
                                <div className="file-operation-content">
                                  <div className="file-operation-content-header">
                                    <span>Updated content</span>
                                  </div>
                                  <pre className="file-operation-code">
                                    <code>{op.content}</code>
                                  </pre>
                                </div>
                              )}
                              {op.type === 'delete' && (
                                <div className="file-operation-delete-notice">
                                  This file will be deleted.
                                </div>
                              )}
                              <div className="file-operation-item-actions">
                                <button
                                  className="file-op-item-btn accept"
                                  onClick={async () => {
                                    await applyFileOperations([op])
                                  }}
                                  title="Accept"
                                >
                                  ✓ Accept
                                </button>
                                <button
                                  className="file-op-item-btn reject"
                                  onClick={() => {}}
                                  title="Reject"
                                >
                                  ✗ Reject
                                </button>
                              </div>
                            </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {filteredParts.map((part, idx) => {
                      if (part.type === 'code') {
                        return (
                          <div key={idx} className="code-block-container">
                            {part.language && (
                              <div className="code-block-header">
                                <span className="code-block-language">{part.language}</span>
                              </div>
                            )}
                            <pre className="code-block">
                              <code>{part.content}</code>
                            </pre>
                          </div>
                        )
                      } else if (part.type === 'table' && part.tableData) {
                        return (
                          <div key={idx} className="ai-message-table-container">
                            <table className="ai-message-table">
                              <thead>
                                <tr>
                                  {part.tableData[0]?.map((cell, cellIdx) => (
                                    <th key={cellIdx}>{cell}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {part.tableData.slice(1).map((row, rowIdx) => (
                                  <tr key={rowIdx}>
                                    {row.map((cell, cellIdx) => (
                                      <td key={cellIdx}>{cell}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      } else if (part.type === 'list') {
                        const items = part.content.split('\n').filter(item => item.trim())
                        return (
                          <div key={idx} className={`ai-message-list ${part.listType === 'numbered' ? 'numbered-list' : 'bullet-list'}`}>
                            {part.listType === 'numbered' ? (
                              <ol>
                                {items.map((item, itemIdx) => (
                                  <li key={itemIdx} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item) }} />
                                ))}
                              </ol>
                            ) : (
                              <ul>
                                {items.map((item, itemIdx) => (
                                  <li key={itemIdx} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(item) }} />
                                ))}
                              </ul>
                            )}
                          </div>
                        )
                      } else if (part.type === 'header') {
                        const headerLevel = Math.min(part.headerLevel || 3, 6)
                        const headerContent = formatInlineMarkdown(part.content)
                        return (
                          <div key={idx} className={`ai-message-header ai-message-header-h${headerLevel}`}>
                            {headerLevel === 1 && <h1 dangerouslySetInnerHTML={{ __html: headerContent }} />}
                            {headerLevel === 2 && <h2 dangerouslySetInnerHTML={{ __html: headerContent }} />}
                            {headerLevel === 3 && <h3 dangerouslySetInnerHTML={{ __html: headerContent }} />}
                            {headerLevel === 4 && <h4 dangerouslySetInnerHTML={{ __html: headerContent }} />}
                            {headerLevel === 5 && <h5 dangerouslySetInnerHTML={{ __html: headerContent }} />}
                            {headerLevel === 6 && <h6 dangerouslySetInnerHTML={{ __html: headerContent }} />}
                          </div>
                        )
                      } else if (part.type === 'blockquote') {
                        return (
                          <div key={idx} className="ai-message-blockquote">
                            {part.content.split('\n').map((line, lineIdx) => (
                              <div key={lineIdx} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line || '\u00A0') }} />
                            ))}
                          </div>
                        )
                      } else if (part.type === 'hr') {
                        return (
                          <hr key={idx} className="ai-message-hr" />
                        )
                      } else {
                        return (
                          <div key={idx} className="ai-message-text">
                            {part.content.split('\n').map((line, lineIdx) => (
                              <p key={lineIdx} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line || '\u00A0') }} />
                            ))}
                          </div>
                        )
                      }
                    })}
                    {!messageActions[msg.id]?.accepted && !messageActions[msg.id]?.rejected && (
                      <div className="message-actions">
                        <button 
                          className="action-btn accept-btn"
                          onClick={() => handleAcceptSuggestion(msg.id)}
                          title="Accept"
                        >
                          ✓
                        </button>
                        <button 
                          className="action-btn apply-btn"
                          onClick={() => handleApplyToFile(msg.content)}
                          title="Apply"
                        >
                          ✓✓
                        </button>
                        <button 
                          className="action-btn copy-btn"
                          onClick={() => handleCopySuggestion(msg.content)}
                          title="Copy"
                        >
                          📋
                        </button>
                        <button 
                          className="action-btn reject-btn"
                          onClick={() => handleRejectSuggestion(msg.id)}
                          title="Reject"
                        >
                          ✗
                        </button>
                      </div>
                    )}
                    {messageActions[msg.id]?.accepted && (
                      <div className="action-status accepted-status">✓ Accepted</div>
                    )}
                    {messageActions[msg.id]?.rejected && (
                      <div className="action-status rejected-status">✗ Rejected</div>
                    )}
                    </div>
                  </div>
                  {/* Input appears after each assistant message when not processing */}
                  {isLastAssistantMessage && !isAIAssisting && !isAIThinking && (
                    <div className="ai-panel-input-inline">
                      <div className="ai-input-wrapper">
                        <textarea
                          className="ai-input-textarea"
                          value={aiInput}
                          onChange={(e) => setAiInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              if (aiInput.trim() && !isAIAssisting && !isAIThinking && (selectedAgentId || selectedGpu || selectedAgentIds.length > 0)) {
                                sendAIMessage()
                              }
                            }
                          }}
                          placeholder="Continue conversation... (Enter to send, Shift+Enter for new line)"
                          disabled={isAIAssisting || isAIThinking || (selectedAgentIds.length === 0 && !selectedAgentId && !selectedGpu)}
                          rows={1}
                          style={{ 
                            minHeight: '40px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            resize: 'none'
                          }}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement
                            target.style.height = 'auto'
                            target.style.height = `${Math.min(target.scrollHeight, 200)}px`
                          }}
                        />
                        <button
                          onClick={sendAIMessage}
                          disabled={isAIAssisting || isAIThinking || (selectedAgentIds.length === 0 && !selectedAgentId && !selectedGpu) || !aiInput.trim()}
                          className="ai-send-btn"
                          title="Send (Enter)"
                        >
                          {isAIAssisting ? (
                            <span className="ai-send-spinner">⏳</span>
                          ) : (
                            <span className="ai-send-icon">→</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              )
            }).filter(Boolean)
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Fixed input at bottom - always visible */}
        <div className="ai-panel-input-fixed">
          <div className="ai-input-wrapper">
            <textarea
              className="ai-input-textarea"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (aiInput.trim() && !isAIAssisting && !isAIThinking && (selectedAgentId || selectedGpu || selectedAgentIds.length > 0)) {
                    sendAIMessage()
                  }
                }
              }}
              placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
              disabled={isAIAssisting || isAIThinking || (selectedAgentIds.length === 0 && !selectedAgentId && !selectedGpu)}
              rows={1}
              style={{ 
                minHeight: '40px',
                maxHeight: '200px',
                overflowY: 'auto',
                resize: 'none'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = `${Math.min(target.scrollHeight, 200)}px`
              }}
            />
            <button
              onClick={sendAIMessage}
              disabled={isAIAssisting || isAIThinking || (selectedAgentIds.length === 0 && !selectedAgentId && !selectedGpu) || !aiInput.trim()}
              className="ai-send-btn"
              title="Send (Enter)"
            >
              {isAIAssisting ? (
                <span className="ai-send-spinner">⏳</span>
              ) : (
                <span className="ai-send-icon">→</span>
              )}
            </button>
          </div>
        </div>
      </div>
      {position === 'right' && (
        <div 
          className="resize-handle resize-handle-vertical"
          onMouseDown={onResizeStart}
          style={{ cursor: 'col-resize' }}
        />
      )}
    </>
  )
}
