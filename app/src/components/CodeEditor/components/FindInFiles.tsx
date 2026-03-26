import React, { useState, useEffect, useRef } from 'react'
import './FindInFiles.css'

interface FindResult {
  file: string
  line: number
  column: number
  content: string
  match: string
}

interface FindInFilesProps {
  isOpen: boolean
  onClose: () => void
  files: Array<{ path: string; content: string }>
  onFileSelect: (path: string, line?: number) => void
}

export const FindInFiles: React.FC<FindInFilesProps> = ({
  isOpen,
  onClose,
  files,
  onFileSelect
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [useRegex, setUseRegex] = useState(false)
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [results, setResults] = useState<FindResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setResults([])
      setSelectedIndex(0)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  const performSearch = async () => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    const searchResults: FindResult[] = []

    try {
      let regexPattern: RegExp
      if (useRegex) {
        try {
          regexPattern = new RegExp(searchQuery, caseSensitive ? 'g' : 'gi')
        } catch (e) {
          // Invalid regex, treat as literal
          regexPattern = new RegExp(
            searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
            caseSensitive ? 'g' : 'gi'
          )
        }
      } else {
        const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const pattern = wholeWord ? `\\b${escaped}\\b` : escaped
        regexPattern = new RegExp(pattern, caseSensitive ? 'g' : 'gi')
      }

      for (const file of files) {
        if (!file.content) continue

        const lines = file.content.split('\n')
        lines.forEach((line, lineIndex) => {
          const matches = [...line.matchAll(regexPattern)]
          matches.forEach(match => {
            if (match.index !== undefined) {
              searchResults.push({
                file: file.path,
                line: lineIndex + 1,
                column: match.index + 1,
                content: line.trim(),
                match: match[0]
              })
            }
          })
        })
      }

      setResults(searchResults)
      setSelectedIndex(0)
    } catch (err) {
      console.error('Search error:', err)
      setResults([])
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch()
    }, 300) // Debounce search

    return () => clearTimeout(timeoutId)
  }, [searchQuery, useRegex, caseSensitive, wholeWord, files])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[selectedIndex]) {
        const result = results[selectedIndex]
        onFileSelect(result.file, result.line)
        onClose()
      }
    }
  }

  useEffect(() => {
    if (resultsRef.current && selectedIndex >= 0) {
      const selectedElement = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  if (!isOpen) return null

  const highlightMatch = (text: string, match: string) => {
    if (!caseSensitive) {
      const regex = new RegExp(`(${match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      const parts = text.split(regex)
      return parts.map((part, i) => 
        regex.test(part) ? <mark key={i}>{part}</mark> : part
      )
    } else {
      const index = text.indexOf(match)
      if (index === -1) return text
      return (
        <>
          {text.substring(0, index)}
          <mark>{match}</mark>
          {text.substring(index + match.length)}
        </>
      )
    }
  }

  return (
    <div className="find-in-files-overlay" onClick={onClose}>
      <div className="find-in-files" onClick={(e) => e.stopPropagation()}>
        <div className="find-in-files-header">
          <div className="find-in-files-input-group">
            <input
              ref={inputRef}
              type="text"
              className="find-in-files-input"
              placeholder="Search (Ctrl+Shift+F)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <div className="find-in-files-options">
              <button
                className={`find-option-btn ${useRegex ? 'active' : ''}`}
                onClick={() => setUseRegex(!useRegex)}
                title="Use Regular Expression"
              >
                .*
              </button>
              <button
                className={`find-option-btn ${caseSensitive ? 'active' : ''}`}
                onClick={() => setCaseSensitive(!caseSensitive)}
                title="Match Case"
              >
                Aa
              </button>
              <button
                className={`find-option-btn ${wholeWord ? 'active' : ''}`}
                onClick={() => setWholeWord(!wholeWord)}
                title="Match Whole Word"
              >
                Ab
              </button>
            </div>
          </div>
        </div>
        <div className="find-in-files-results" ref={resultsRef}>
          {isSearching ? (
            <div className="find-in-files-loading">Searching...</div>
          ) : results.length === 0 ? (
            <div className="find-in-files-empty">
              {searchQuery ? 'No results found' : 'Enter a search query'}
            </div>
          ) : (
            <>
              <div className="find-in-files-summary">
                {results.length} result{results.length !== 1 ? 's' : ''} in {new Set(results.map(r => r.file)).size} file{new Set(results.map(r => r.file)).size !== 1 ? 's' : ''}
              </div>
              {Object.entries(
                results.reduce((acc, result) => {
                  if (!acc[result.file]) acc[result.file] = []
                  acc[result.file].push(result)
                  return acc
                }, {} as Record<string, FindResult[]>)
              ).map(([file, fileResults]) => (
                <div key={file} className="find-in-files-file-group">
                  <div className="find-in-files-file-name">{file}</div>
                  {fileResults.map((result, idx) => {
                    const globalIndex = results.indexOf(result)
                    return (
                      <div
                        key={`${result.line}-${result.column}`}
                        data-index={globalIndex}
                        className={`find-in-files-result ${selectedIndex === globalIndex ? 'selected' : ''}`}
                        onClick={() => {
                          onFileSelect(result.file, result.line)
                          onClose()
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                      >
                        <span className="find-in-files-line-number">{result.line}</span>
                        <span className="find-in-files-content">
                          {highlightMatch(result.content, result.match)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
