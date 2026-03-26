import React, { useState, useEffect, useRef } from 'react'
import './GoToSymbol.css'

interface Symbol {
  name: string
  kind: 'function' | 'class' | 'variable' | 'method' | 'property' | 'interface' | 'enum'
  line: number
  column: number
}

interface GoToSymbolProps {
  isOpen: boolean
  onClose: () => void
  code: string
  language: string
  onGoToLine: (line: number, column?: number) => void
}

const symbolIcons: Record<string, string> = {
  function: 'ƒ',
  class: 'C',
  variable: 'v',
  method: 'm',
  property: 'p',
  interface: 'I',
  enum: 'E'
}

export const GoToSymbol: React.FC<GoToSymbolProps> = ({
  isOpen,
  onClose,
  code,
  language,
  onGoToLine
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [symbols, setSymbols] = useState<Symbol[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setSelectedIndex(0)
      extractSymbols()
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen, code, language])

  const extractSymbols = () => {
    if (!code) {
      setSymbols([])
      return
    }

    const extracted: Symbol[] = []
    const lines = code.split('\n')

    // JavaScript/TypeScript patterns
    if (language === 'javascript' || language === 'typescript' || language === 'jsx' || language === 'tsx') {
      lines.forEach((line, lineIndex) => {
        // Functions: function name() or const name = () =>
        const functionMatch = line.match(/(?:function|const|let|var)\s+(\w+)\s*[=(]/)
        if (functionMatch) {
          extracted.push({
            name: functionMatch[1],
            kind: line.includes('=>') ? 'function' : 'function',
            line: lineIndex + 1,
            column: line.indexOf(functionMatch[1]) + 1
          })
        }

        // Classes: class Name
        const classMatch = line.match(/class\s+(\w+)/)
        if (classMatch) {
          extracted.push({
            name: classMatch[1],
            kind: 'class',
            line: lineIndex + 1,
            column: line.indexOf(classMatch[1]) + 1
          })
        }

        // Methods: methodName() or methodName: function()
        const methodMatch = line.match(/(\w+)\s*[:=]\s*(?:function|\(|=>)/)
        if (methodMatch && !line.match(/^(const|let|var|function)/)) {
          extracted.push({
            name: methodMatch[1],
            kind: 'method',
            line: lineIndex + 1,
            column: line.indexOf(methodMatch[1]) + 1
          })
        }

        // Variables: const/let/var name =
        const varMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=/)
        if (varMatch && !line.includes('=>')) {
          extracted.push({
            name: varMatch[1],
            kind: 'variable',
            line: lineIndex + 1,
            column: line.indexOf(varMatch[1]) + 1
          })
        }
      })
    }

    // Python patterns
    if (language === 'python') {
      lines.forEach((line, lineIndex) => {
        // Functions: def name()
        const functionMatch = line.match(/def\s+(\w+)\s*\(/)
        if (functionMatch) {
          extracted.push({
            name: functionMatch[1],
            kind: 'function',
            line: lineIndex + 1,
            column: line.indexOf(functionMatch[1]) + 1
          })
        }

        // Classes: class Name
        const classMatch = line.match(/class\s+(\w+)/)
        if (classMatch) {
          extracted.push({
            name: classMatch[1],
            kind: 'class',
            line: lineIndex + 1,
            column: line.indexOf(classMatch[1]) + 1
          })
        }

        // Variables: name = (at module level)
        if (lineIndex === 0 || lines[lineIndex - 1].trim() === '' || !lines[lineIndex - 1].match(/^\s/)) {
          const varMatch = line.match(/^(\w+)\s*=/)
          if (varMatch && !line.match(/^(def|class|if|for|while|with|import|from)/)) {
            extracted.push({
              name: varMatch[1],
              kind: 'variable',
              line: lineIndex + 1,
              column: 1
            })
          }
        }
      })
    }

    // Sort by line number
    extracted.sort((a, b) => a.line - b.line)
    setSymbols(extracted)
  }

  const filteredSymbols = symbols.filter(symbol => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return symbol.name.toLowerCase().includes(query)
  })

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, filteredSymbols.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredSymbols[selectedIndex]) {
        const symbol = filteredSymbols[selectedIndex]
        onGoToLine(symbol.line, symbol.column)
        onClose()
      }
    }
  }

  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  if (!isOpen) return null

  return (
    <div className="go-to-symbol-overlay" onClick={onClose}>
      <div className="go-to-symbol" onClick={(e) => e.stopPropagation()}>
        <div className="go-to-symbol-header">
          <input
            ref={inputRef}
            type="text"
            className="go-to-symbol-input"
            placeholder="Type symbol name (Ctrl+Shift+O)"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>
        <div className="go-to-symbol-list" ref={listRef}>
          {filteredSymbols.length === 0 ? (
            <div className="go-to-symbol-empty">
              {searchQuery ? 'No symbols found' : 'No symbols in file'}
            </div>
          ) : (
            filteredSymbols.map((symbol, idx) => (
              <div
                key={`${symbol.line}-${symbol.column}`}
                data-index={idx}
                className={`go-to-symbol-item ${selectedIndex === idx ? 'selected' : ''}`}
                onClick={() => {
                  onGoToLine(symbol.line, symbol.column)
                  onClose()
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <span className="go-to-symbol-icon">{symbolIcons[symbol.kind] || '•'}</span>
                <span className="go-to-symbol-name">{symbol.name}</span>
                <span className="go-to-symbol-kind">{symbol.kind}</span>
                <span className="go-to-symbol-line">{symbol.line}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
