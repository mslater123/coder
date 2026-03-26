import React, { useState, useEffect } from 'react'
import './ProblemsPanel.css'

export interface Problem {
  file: string
  line: number
  column: number
  severity: 'error' | 'warning' | 'info'
  message: string
  source?: string
}

interface ProblemsPanelProps {
  problems: Problem[]
  onProblemClick: (problem: Problem) => void
}

export const ProblemsPanel: React.FC<ProblemsPanelProps> = ({
  problems,
  onProblemClick
}) => {
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all')

  const filteredProblems = problems.filter(p => 
    filter === 'all' || p.severity === filter
  )

  const errorCount = problems.filter(p => p.severity === 'error').length
  const warningCount = problems.filter(p => p.severity === 'warning').length
  const infoCount = problems.filter(p => p.severity === 'info').length

  const groupedProblems = filteredProblems.reduce((acc, problem) => {
    if (!acc[problem.file]) {
      acc[problem.file] = []
    }
    acc[problem.file].push(problem)
    return acc
  }, {} as Record<string, Problem[]>)

  return (
    <div className="problems-panel">
      <div className="problems-panel-header">
        <div className="problems-panel-title">Problems</div>
        <div className="problems-panel-filters">
          <button
            className={`problems-filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({problems.length})
          </button>
          <button
            className={`problems-filter-btn ${filter === 'error' ? 'active' : ''}`}
            onClick={() => setFilter('error')}
          >
            Errors ({errorCount})
          </button>
          <button
            className={`problems-filter-btn ${filter === 'warning' ? 'active' : ''}`}
            onClick={() => setFilter('warning')}
          >
            Warnings ({warningCount})
          </button>
          <button
            className={`problems-filter-btn ${filter === 'info' ? 'active' : ''}`}
            onClick={() => setFilter('info')}
          >
            Info ({infoCount})
          </button>
        </div>
      </div>
      <div className="problems-panel-content">
        {filteredProblems.length === 0 ? (
          <div className="problems-panel-empty">
            {filter === 'all' ? 'No problems detected' : `No ${filter}s`}
          </div>
        ) : (
          Object.entries(groupedProblems).map(([file, fileProblems]) => (
            <div key={file} className="problems-file-group">
              <div className="problems-file-name">{file}</div>
              {fileProblems.map((problem, idx) => (
                <div
                  key={`${problem.line}-${problem.column}-${idx}`}
                  className={`problems-item problems-${problem.severity}`}
                  onClick={() => onProblemClick(problem)}
                >
                  <div className="problems-item-header">
                    <span className={`problems-severity-icon problems-${problem.severity}`}>
                      {problem.severity === 'error' ? '✗' : problem.severity === 'warning' ? '⚠' : 'ℹ'}
                    </span>
                    <span className="problems-message">{problem.message}</span>
                    {problem.source && (
                      <span className="problems-source">{problem.source}</span>
                    )}
                  </div>
                  <div className="problems-location">
                    {problem.line}:{problem.column}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
