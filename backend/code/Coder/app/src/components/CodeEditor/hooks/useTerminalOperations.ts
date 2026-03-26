import { useCallback } from 'react'

interface UseTerminalOperationsProps {
  isRunning: boolean
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>
  showTerminal: boolean
  setShowTerminal: React.Dispatch<React.SetStateAction<boolean>>
  terminalPanelTab: 'problems' | 'output' | 'debug' | 'terminal' | 'ports'
  setTerminalPanelTab: React.Dispatch<React.SetStateAction<'problems' | 'output' | 'debug' | 'terminal' | 'ports'>>
  terminals: Array<{ id: string; name: string; output: string[]; input: string }>
  setTerminals: React.Dispatch<React.SetStateAction<Array<{ id: string; name: string; output: string[]; input: string }>>>
  activeTerminalId: string
  setActiveTerminalId: React.Dispatch<React.SetStateAction<string>>
  code: string
  language: string
  selectedFile: string
  venvInfo: { path: string; python_path: string } | null
  terminalRef: React.RefObject<HTMLDivElement>
  getAllFiles: () => any[]
}

export function useTerminalOperations({
  isRunning,
  setIsRunning,
  showTerminal,
  setShowTerminal,
  terminalPanelTab,
  setTerminalPanelTab,
  terminals,
  setTerminals,
  activeTerminalId,
  setActiveTerminalId,
  code,
  language,
  selectedFile,
  venvInfo,
  terminalRef,
  getAllFiles,
}: UseTerminalOperationsProps) {
  
  const runCode = useCallback(async () => {
    if (isRunning) return
    
    setIsRunning(true)
    setShowTerminal(true)
    setTerminalPanelTab('terminal')
    
    const activeTerm = terminals.find(t => t.id === activeTerminalId)
    if (activeTerm) {
      setTerminals(prev => prev.map(t => 
        t.id === activeTerminalId
          ? { ...t, output: [...t.output, `$ Running ${selectedFile.split('/').pop()}...`] }
          : t
      ))
    }
    
    try {
      const output = `[Execution started]\n${code}\n[Execution completed]`
      
      if (activeTerm) {
        setTerminals(prev => prev.map(t => 
          t.id === activeTerminalId
            ? { ...t, output: [...t.output, output] }
            : t
        ))
      }
      
      if (language === 'javascript') {
        try {
          const result = eval(code)
          if (activeTerm) {
            setTerminals(prev => prev.map(t => 
              t.id === activeTerminalId
                ? { 
                    ...t, 
                    output: [
                      ...t.output,
                      ...(result !== undefined ? [`Result: ${result}`] : [])
                    ]
                  }
                : t
            ))
          }
        } catch (err: any) {
          if (activeTerm) {
            setTerminals(prev => prev.map(t => 
              t.id === activeTerminalId
                ? { ...t, output: [...t.output, `Error: ${err.message}`] }
                : t
            ))
          }
        }
      } else {
        if (activeTerm) {
          setTerminals(prev => prev.map(t => 
            t.id === activeTerminalId
              ? { ...t, output: [...t.output, `[Note: ${language} execution would run here]`] }
              : t
          ))
        }
      }
    } catch (err: any) {
      if (activeTerm) {
        setTerminals(prev => prev.map(t => 
          t.id === activeTerminalId
            ? { ...t, output: [...t.output, `Error: ${err.message}`] }
            : t
        ))
      }
    } finally {
      setIsRunning(false)
      setTimeout(() => {
        terminalRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [isRunning, setIsRunning, setShowTerminal, setTerminalPanelTab, terminals, setTerminals, activeTerminalId, code, language, selectedFile, terminalRef])

  const stopExecution = useCallback(() => {
    setIsRunning(false)
    const activeTerm = terminals.find(t => t.id === activeTerminalId)
    if (activeTerm) {
      setTerminals(prev => prev.map(t => 
        t.id === activeTerminalId
          ? { ...t, output: [...t.output, '[Execution stopped]'] }
          : t
      ))
    }
  }, [setIsRunning, terminals, activeTerminalId, setTerminals])

  const executeTerminalCommand = useCallback((command: string, terminalId?: string) => {
    if (!command.trim()) return

    const targetId = terminalId || activeTerminalId
    const activeTerm = terminals.find(t => t.id === targetId)
    if (!activeTerm) return

    let commandToExecute = command
    if (venvInfo && venvInfo.python_path && (
      command.startsWith('python ') || 
      command.startsWith('python3 ') ||
      command === 'python' ||
      command === 'python3' ||
      command.startsWith('pip ') ||
      command === 'pip'
    )) {
      commandToExecute = command.replace(/^python3?/, venvInfo.python_path)
      if (command.startsWith('pip')) {
        const pipPath = venvInfo.python_path.replace(/python(\.exe)?$/, 'pip$1')
        commandToExecute = command.replace(/^pip/, pipPath)
      }
    }

    setTerminals(prev => prev.map(t => 
      t.id === targetId 
        ? { ...t, output: [...t.output, `$ ${command}`], input: '' }
        : t
    ))
    
    if (command.startsWith('cd ')) {
      setTerminals(prev => prev.map(t => 
        t.id === targetId 
          ? { ...t, output: [...t.output, '[Directory change not implemented in browser]'] }
          : t
      ))
    } else if (command === 'clear' || command === 'cls') {
      setTerminals(prev => prev.map(t => 
        t.id === targetId ? { ...t, output: [] } : t
      ))
    } else if (command === 'ls' || command === 'dir') {
      const fileList = getAllFiles().map(f => f.name).join('  ')
      setTerminals(prev => prev.map(t => 
        t.id === targetId 
          ? { ...t, output: [...t.output, fileList || '(no files)'] }
          : t
      ))
    } else if (command.startsWith('cat ') || command.startsWith('type ')) {
      const fileName = command.split(' ')[1]
      const file = getAllFiles().find(f => f.name === fileName)
      if (file && file.content) {
        setTerminals(prev => prev.map(t => 
          t.id === targetId 
            ? { ...t, output: [...t.output, file.content || ''] }
            : t
        ))
      } else {
        setTerminals(prev => prev.map(t => 
          t.id === targetId 
            ? { ...t, output: [...t.output, `File not found: ${fileName}`] }
            : t
        ))
      }
    } else {
      setTerminals(prev => prev.map(t => 
        t.id === targetId 
          ? { ...t, output: [...t.output, `[Command: ${command}]\n[Note: Terminal commands would execute here]`] }
          : t
      ))
    }
    
    setTimeout(() => {
      terminalRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [activeTerminalId, terminals, setTerminals, venvInfo, getAllFiles, terminalRef])

  return {
    runCode,
    stopExecution,
    executeTerminalCommand,
  }
}
