import React, { useState, useEffect } from 'react'

interface BuildStage {
  id: string
  name: string
  description: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  files: string[]
  error?: string
}

interface BuildPlan {
  stages: BuildStage[]
  estimatedTime?: string
  totalFiles?: number
}

interface AutoImprovementPanelProps {
  workingDir?: string
  currentProjectName?: string
  selectedAgentId: number | null
  selectedAgentIds: number[]
  selectedGpu: number | null
  agents: Array<{ id: number; name: string; agent_type?: string; [key: string]: any }>
  requestAIAssistance: (prompt?: string) => void
  applyFileOperations: (operations: any[]) => Promise<void>
  isAIAssisting: boolean
  isAIThinking: boolean
  aiMessages: any[]
  onImprovementsApplied?: (count: number, filesModified: string[]) => void
}

type AppType = 
  | 'iphone'
  | 'android'
  | 'web-react'
  | 'web-vue'
  | 'web-angular'
  | 'web-vanilla'
  | 'desktop-electron'
  | 'desktop-python'
  | 'backend-api'
  | 'fullstack'
  | 'other'

interface AppTypeOption {
  value: AppType
  label: string
  icon: string
  description: string
  template: string
}

const APP_TYPES: AppTypeOption[] = [
  {
    value: 'iphone',
    label: 'iPhone App',
    icon: '📱',
    description: 'iOS native app using Swift/SwiftUI',
    template: 'iOS app with SwiftUI, following Apple Human Interface Guidelines'
  },
  {
    value: 'android',
    label: 'Android App',
    icon: '🤖',
    description: 'Android native app using Kotlin/Java',
    template: 'Android app with Kotlin and Jetpack Compose, following Material Design'
  },
  {
    value: 'web-react',
    label: 'Web App (React)',
    icon: '⚛️',
    description: 'React web application',
    template: 'React web application with modern hooks, TypeScript, and best practices'
  },
  {
    value: 'web-vue',
    label: 'Web App (Vue)',
    icon: '💚',
    description: 'Vue.js web application',
    template: 'Vue.js web application with Composition API and TypeScript'
  },
  {
    value: 'web-angular',
    label: 'Web App (Angular)',
    icon: '🅰️',
    description: 'Angular web application',
    template: 'Angular web application with TypeScript and modern Angular patterns'
  },
  {
    value: 'web-vanilla',
    label: 'Web App (Vanilla)',
    icon: '🌐',
    description: 'Vanilla HTML/CSS/JavaScript',
    template: 'Vanilla web application with modern JavaScript (ES6+), HTML5, and CSS3'
  },
  {
    value: 'desktop-electron',
    label: 'Desktop App (Electron)',
    icon: '🖥️',
    description: 'Cross-platform desktop app with Electron',
    template: 'Electron desktop application with React/Vue frontend'
  },
  {
    value: 'desktop-python',
    label: 'Desktop App (Python)',
    icon: '🐍',
    description: 'Python desktop application',
    template: 'Python desktop application with Tkinter or PyQt'
  },
  {
    value: 'backend-api',
    label: 'Backend API',
    icon: '🔌',
    description: 'REST/GraphQL API server',
    template: 'RESTful API with proper authentication, validation, and documentation'
  },
  {
    value: 'fullstack',
    label: 'Full Stack App',
    icon: '🚀',
    description: 'Complete full-stack application',
    template: 'Full-stack application with frontend, backend, and database'
  },
  {
    value: 'other',
    label: 'Other',
    icon: '🔧',
    description: 'Custom application type',
    template: 'Custom application based on your description'
  }
]

type TabType = 'builder' | 'developer' | 'error-fixer' | 'optimizer'

export const AutoImprovementPanel: React.FC<AutoImprovementPanelProps> = ({
  workingDir,
  currentProjectName,
  selectedAgentId,
  selectedAgentIds,
  selectedGpu,
  agents,
  requestAIAssistance,
  applyFileOperations,
  isAIAssisting,
  isAIThinking,
  aiMessages,
  onImprovementsApplied
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('builder')
  const [appType, setAppType] = useState<AppType | ''>('')
  const [buildDescription, setBuildDescription] = useState<string>('')
  const [buildPlan, setBuildPlan] = useState<BuildPlan | null>(null)
  const [currentStageIndex, setCurrentStageIndex] = useState<number>(-1)
  const [isPlanning, setIsPlanning] = useState(false)
  const [isBuilding, setIsBuilding] = useState(false)
  const [status, setStatus] = useState<string>('')
  const [buildLog, setBuildLog] = useState<string[]>([])
  
  // Error Fixer state
  const [errorDescription, setErrorDescription] = useState<string>('')
  const [isFixingErrors, setIsFixingErrors] = useState(false)
  const [fixLog, setFixLog] = useState<string[]>([])
  
  // Optimizer state
  const [optimizationType, setOptimizationType] = useState<'performance' | 'code-quality' | 'security' | 'all'>('all')
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [optimizationLog, setOptimizationLog] = useState<string[]>([])
  
  // Developer state
  const [featureDescription, setFeatureDescription] = useState<string>('')
  const [isDeveloping, setIsDeveloping] = useState(false)
  const [developmentLog, setDevelopmentLog] = useState<string[]>([])
  
  // Auto-continue mode - automatically keep fixing/building without manual intervention
  const [autoContinue, setAutoContinue] = useState<boolean>(false)

  const addLog = React.useCallback((message: string) => {
    setBuildLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }, [])

  // Helper function to get agent names and create multi-agent collaboration message
  const getMultiAgentCollaborationMessage = React.useCallback(() => {
    const agentIdsToUse = selectedAgentIds.length > 0 ? selectedAgentIds : (selectedAgentId ? [selectedAgentId] : [])
    
    if (agentIdsToUse.length <= 1) {
      return ''
    }

    const agentNames = agentIdsToUse.map(id => {
      const agent = agents.find(a => a.id === id)
      return agent ? agent.name : `Agent ${id}`
    })

    return `\n\nMULTI-AGENT COLLABORATION MODE:
You are working with ${agentIdsToUse.length} AI agents in parallel: ${agentNames.join(', ')}
- Each agent will work on the same task independently
- Your responses will be merged to create the best solution
- Focus on providing comprehensive, high-quality output
- Consider different approaches and perspectives
- Ensure your file operations are complete and well-structured
- The system will combine all agents' file operations intelligently`
  }, [selectedAgentId, selectedAgentIds, agents])

  const handleAppTypeChange = (type: AppType) => {
    setAppType(type)
    const selectedType = APP_TYPES.find(t => t.value === type)
    if (selectedType && !buildDescription.trim()) {
      // Pre-fill description with template guidance
      setBuildDescription(`Build a ${selectedType.label.toLowerCase()}${selectedType.value !== 'other' ? `: ${selectedType.template}` : ''}`)
    }
  }

  const createBuildPlan = async () => {
    if (!selectedAgentId && selectedAgentIds.length === 0 && !selectedGpu) {
      setStatus('Please select an agent first')
      return
    }

    if (!currentProjectName) {
      setStatus('Please open a project first')
      return
    }

    if (!appType) {
      setStatus('Please select an application type first')
      return
    }

    if (!buildDescription.trim()) {
      setStatus('Please enter a description of what you want to build')
      return
    }

    setIsPlanning(true)
    const agentCount = selectedAgentIds.length > 0 ? selectedAgentIds.length : (selectedAgentId ? 1 : 0)
    setStatus(agentCount > 1 ? `Creating build plan with ${agentCount} agents...` : 'Creating build plan...')
    setBuildLog([])
    addLog(agentCount > 1 ? `Starting build plan creation with ${agentCount} agents...` : 'Starting build plan creation...')

    const projectPath = `/${currentProjectName}`
    const workingDirPath = workingDir ? ` (working directory: ${workingDir})` : ''
    const selectedAppType = APP_TYPES.find(t => t.value === appType)
    const multiAgentMsg = getMultiAgentCollaborationMessage()

    const planningPrompt = `You are a software architect. Analyze the following build request and create a detailed, step-by-step build plan.${multiAgentMsg}

Project: "${currentProjectName}" (project path: ${projectPath})${workingDirPath}

Application Type: ${selectedAppType?.label || appType}${selectedAppType?.description ? ` (${selectedAppType.description})` : ''}
${selectedAppType?.template ? `Template Guidance: ${selectedAppType.template}` : ''}

Build Request:
${buildDescription}

IMPORTANT: Return ONLY a JSON object with this exact structure (no markdown, no code blocks, just the JSON):
{
  "stages": [
    {
      "id": "stage-1",
      "name": "Stage Name",
      "description": "Detailed description of what this stage will build",
      "files": ["${projectPath}/path/to/file1.py", "${projectPath}/path/to/file2.js"]
    }
  ],
  "estimatedTime": "5-10 minutes",
  "totalFiles": 5
}

Requirements:
1. Break the build into 3-6 logical stages (e.g., "Setup & Configuration", "Core Features", "UI Components", "Testing")
2. Each stage should be independent and buildable
3. List all files that will be created/modified in each stage (use full paths starting with ${projectPath}/)
4. Stages should build on each other logically
5. Return ONLY the JSON object, no other text, no markdown code blocks, no explanations`

    try {
      // Request AI assistance - the response will be handled by the parent component
      // For now, create a default plan structure that will be refined
      requestAIAssistance(planningPrompt)
      addLog('Build plan request sent to AI agent...')
      
      // Create a default plan structure as fallback
      // The AI response will ideally update this, but we provide a structure to work with
      const defaultPlan: BuildPlan = {
        stages: [
          {
            id: 'stage-1',
            name: 'Project Setup & Configuration',
            description: 'Set up project structure, dependencies, and initial configuration files',
            status: 'pending',
            files: []
          },
          {
            id: 'stage-2',
            name: 'Core Implementation',
            description: 'Implement core functionality and business logic',
            status: 'pending',
            files: []
          },
          {
            id: 'stage-3',
            name: 'UI/UX Components',
            description: 'Build user interface components and user experience features',
            status: 'pending',
            files: []
          },
          {
            id: 'stage-4',
            name: 'Integration & Testing',
            description: 'Integrate components and add tests for validation',
            status: 'pending',
            files: []
          }
        ],
        estimatedTime: '10-15 minutes',
        totalFiles: 0
      }
      
      setBuildPlan(defaultPlan)
      setStatus('Build plan structure created. Review and start build when ready.')
      addLog(`Default build plan created with ${defaultPlan.stages.length} stages`)
      addLog('Note: AI may refine this plan based on your description')
      setIsPlanning(false)
    } catch (err: any) {
      console.error('Failed to create build plan:', err)
      setStatus(`Error: ${err.message}`)
      addLog(`Error creating plan: ${err.message}`)
      setIsPlanning(false)
    }
  }

  const buildStage = React.useCallback(async (stageIndex: number) => {
    if (!buildPlan || !buildPlan.stages[stageIndex]) {
      console.warn(`Cannot build stage ${stageIndex}: buildPlan or stage not available`)
      return
    }

    const stage = buildPlan.stages[stageIndex]
    
    // Update stage status
    setBuildPlan(prev => {
      if (!prev) return null
      const updated = { ...prev }
      updated.stages = [...updated.stages]
      updated.stages[stageIndex] = { ...stage, status: 'in-progress' }
      return updated
    })
    
    setCurrentStageIndex(stageIndex)
    setStatus(`Building stage ${stageIndex + 1}/${buildPlan.stages.length}: ${stage.name}`)
    addLog(`Starting stage ${stageIndex + 1}: ${stage.name}`)

    const projectPath = `/${currentProjectName}`
    const workingDirPath = workingDir ? ` (working directory: ${workingDir})` : ''
    const selectedAppType = APP_TYPES.find(t => t.value === appType)
    const multiAgentMsg = getMultiAgentCollaborationMessage()

    const buildPrompt = `Build Stage ${stageIndex + 1}: ${stage.name}${multiAgentMsg}

Project: "${currentProjectName}" (project path: ${projectPath})${workingDirPath}

Application Type: ${selectedAppType?.label || appType}${selectedAppType?.description ? ` (${selectedAppType.description})` : ''}
${selectedAppType?.template ? `Template: ${selectedAppType.template}` : ''}

Stage Description: ${stage.description}

Previous Stages: ${stageIndex > 0 ? buildPlan.stages.slice(0, stageIndex).map(s => s.name).join(', ') : 'None'}

IMPORTANT REQUIREMENTS:
1. All file paths MUST start with "${projectPath}/" (e.g., "${projectPath}/src/app.js")
2. You MUST return file operations in this EXACT format (use a file_operations code block):
   \`\`\`file_operations
   {
     "operations": [
       {
         "type": "create",
         "path": "${projectPath}/src/file.js",
         "content": "// complete file content here"
       }
     ]
   }
   \`\`\`
3. Build ONLY what is described in this stage - do NOT build future stages
4. Make the code production-ready, well-structured, and properly formatted
5. Include complete, working code - no placeholders or TODOs
6. Create ALL files listed for this stage

CRITICAL: Your response MUST include file operations in the file_operations code block format above. This is REQUIRED for automatic file creation. Use the exact file paths starting with "${projectPath}/".

Files to create/modify for this stage:
${stage.files.length > 0 ? stage.files.map(f => `- ${f}`).join('\n') : 'Create files as needed for this stage'}

Now build this stage with complete, working code.`

    try {
      // Request AI assistance for this stage
      requestAIAssistance(buildPrompt)
      addLog(`Stage ${stageIndex + 1} build request sent to AI`)
      
      // Note: The actual file operations will be applied via the AI response handler
      // We'll mark this stage as completed when operations are applied
    } catch (err: any) {
      console.error(`Failed to build stage ${stageIndex + 1}:`, err)
      setStatus(`Error building stage ${stageIndex + 1}: ${err.message}`)
      addLog(`Error in stage ${stageIndex + 1}: ${err.message}`)
      
      // Mark stage as failed
      setBuildPlan(prev => {
        if (!prev) return null
        const updated = { ...prev }
        updated.stages = [...updated.stages]
        updated.stages[stageIndex] = { ...stage, status: 'failed' as const, error: err.message }
        return updated
      })
    }
  }, [buildPlan, currentProjectName, workingDir, appType, requestAIAssistance, addLog])

  const startBuild = async () => {
    if (!buildPlan) return
    
    setIsBuilding(true)
    setStatus('Starting staged build...')
    setBuildLog([])
    addLog('Build process started')
    addLog(`Total stages: ${buildPlan.stages.length}`)
    
    // Start with the first stage - progression will happen automatically
    // when file operations are detected and applied
    await buildStage(0)
  }

  // Track the last message ID we've processed to avoid reprocessing
  const lastProcessedMessageIdRef = React.useRef<string | null>(null)
  const lastProcessedPlanMessageIdRef = React.useRef<string | null>(null)

  // Listen for AI responses with build plan JSON and parse it
  useEffect(() => {
    if (!isPlanning) return

    // Find the most recent AI message that we haven't processed yet
    const latestMessage = aiMessages
      .filter(msg => msg.role === 'assistant' && msg.id !== lastProcessedPlanMessageIdRef.current)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]

    if (!latestMessage) return

    // Try to parse build plan from the message content
    const content = latestMessage.content || ''
    
    // Try to extract JSON from the content (could be raw JSON or in code blocks)
    let jsonContent: string | null = null
    
    // First, try to find JSON in markdown code blocks
    const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonBlockMatch) {
      jsonContent = jsonBlockMatch[1].trim()
    } else {
      // If no code block, try to extract JSON object from the text
      // Find the first { and try to parse from there
      const firstBrace = content.indexOf('{')
      if (firstBrace >= 0) {
        // Try to find the matching closing brace by counting braces
        let braceCount = 0
        let endIndex = firstBrace
        for (let i = firstBrace; i < content.length; i++) {
          if (content[i] === '{') braceCount++
          if (content[i] === '}') braceCount--
          if (braceCount === 0) {
            endIndex = i + 1
            break
          }
        }
        if (braceCount === 0) {
          jsonContent = content.substring(firstBrace, endIndex).trim()
        }
      }
    }
    
    // Try to parse as JSON
    if (jsonContent && jsonContent.includes('"stages"')) {
      try {
        const planData = JSON.parse(jsonContent)
        
        if (planData.stages && Array.isArray(planData.stages)) {
          lastProcessedPlanMessageIdRef.current = latestMessage.id
          
          // Convert the parsed plan to our BuildPlan format
          const parsedPlan: BuildPlan = {
            stages: planData.stages.map((stage: any) => ({
              id: stage.id || `stage-${Math.random().toString(36).substr(2, 9)}`,
              name: stage.name || 'Unnamed Stage',
              description: stage.description || '',
              status: 'pending' as const,
              files: Array.isArray(stage.files) ? stage.files : []
            })),
            estimatedTime: planData.estimatedTime || 'Unknown',
            totalFiles: planData.totalFiles || planData.stages.reduce((sum: number, s: any) => sum + (Array.isArray(s.files) ? s.files.length : 0), 0)
          }
          
          setBuildPlan(parsedPlan)
          setStatus(`Build plan created with ${parsedPlan.stages.length} stages. Review and start build when ready.`)
          addLog(`Build plan parsed from AI response: ${parsedPlan.stages.length} stages`)
          setIsPlanning(false)
        }
      } catch (err: any) {
        // Not valid JSON, continue
        console.warn('Failed to parse build plan JSON:', err)
      }
    }
  }, [aiMessages, isPlanning, addLog])

  // Listen for AI responses with file operations and automatically apply them
  useEffect(() => {
    if (!isBuilding || currentStageIndex < 0 || !buildPlan) return

    // Find the most recent AI message that we haven't processed yet
    // Skip messages that are still streaming
    const latestMessage = aiMessages
      .filter(msg => 
        msg.role === 'assistant' && 
        msg.id !== lastProcessedMessageIdRef.current &&
        !msg.isStreaming
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]

    if (!latestMessage) return
    
    // Add a small delay to ensure the message is fully processed
    const checkTimer = setTimeout(() => {
      // Check if this message has file operations
      const hasOperations = latestMessage.parsed?.hasOperations && latestMessage.parsed.fileOperations?.length > 0
      
      // Also check the raw content for file operations if parsed doesn't have them
      let operations = latestMessage.parsed?.fileOperations || []
      
      if (!hasOperations && latestMessage.content) {
        // Try to parse file operations from content if not already parsed
        // This handles cases where the parser might have missed them
        const content = latestMessage.content
        
        // Check for file_operations block
        const fileOpsMatch = content.match(/```file_operations\s*([\s\S]*?)```/i)
        if (fileOpsMatch) {
          try {
            const opsData = JSON.parse(fileOpsMatch[1])
            if (opsData.operations && Array.isArray(opsData.operations)) {
              operations = opsData.operations
            }
          } catch (e) {
            // Ignore parse errors - no logging to reduce console noise
          }
        }
        
        // Check for raw JSON operations
        if (operations.length === 0 && content.trim().startsWith('{') && content.includes('"operations"')) {
          try {
            const opsData = JSON.parse(content.trim())
            if (opsData.operations && Array.isArray(opsData.operations)) {
              operations = opsData.operations
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        // Also check for code blocks with file paths (alternative format)
        if (operations.length === 0) {
          // Look for code blocks with file paths like ```javascript:/path/to/file.js
          const codeBlockRegex = /```(\w+)?:([^\n]+)\n([\s\S]*?)```/g
          let match
          while ((match = codeBlockRegex.exec(content)) !== null) {
            const [, language, filePath, codeContent] = match
            if (filePath && codeContent) {
              // Extract path (remove project path prefix if present)
              const cleanPath = filePath.trim()
              operations.push({
                type: 'create',
                path: cleanPath,
                content: codeContent.trim(),
                language: language || undefined
              })
            }
          }
        }
      }

      if (operations.length > 0) {
        lastProcessedMessageIdRef.current = latestMessage.id

        addLog(`Stage ${currentStageIndex + 1}: Found ${operations.length} file operation(s)`)
        addLog(`Stage ${currentStageIndex + 1}: Files: ${operations.map(op => op.path?.split('/').pop() || 'unknown').join(', ')}`)
        
        // Apply file operations automatically
        applyFileOperations(operations)
          .then(() => {
            addLog(`Stage ${currentStageIndex + 1}: File operations applied successfully`)
            
            // Mark current stage as completed and move to next stage
            setBuildPlan(prev => {
              if (!prev || currentStageIndex < 0) return prev
              const updated = { ...prev }
              updated.stages = [...updated.stages]
              const currentStage = updated.stages[currentStageIndex]
              
              // Always mark as completed if we got here
              updated.stages[currentStageIndex] = { 
                ...currentStage, 
                status: 'completed' as const 
              }
              
              // Move to next stage if available
              const nextStageIndex = currentStageIndex + 1
              if (nextStageIndex < updated.stages.length) {
                // Use a ref to ensure we have the latest buildStage function
                addLog(`Stage ${currentStageIndex + 1} completed. Preparing stage ${nextStageIndex + 1}...`)
                setTimeout(() => {
                  addLog(`Starting stage ${nextStageIndex + 1}: ${updated.stages[nextStageIndex]?.name || 'Unknown'}`)
                  buildStage(nextStageIndex).catch((err) => {
                    console.error(`Failed to start stage ${nextStageIndex + 1}:`, err)
                    addLog(`Error starting stage ${nextStageIndex + 1}: ${err.message}`)
                  })
                }, 2000)
              } else {
                // All stages complete
                setIsBuilding(false)
                setStatus('All stages completed successfully!')
                addLog('Build process completed!')
                
                if (onImprovementsApplied) {
                  const filesModified = operations.map(op => op.path).filter(Boolean)
                  onImprovementsApplied(operations.length, filesModified)
                }
              }
              return updated
            })
          })
          .catch((err: any) => {
            console.error(`Failed to apply file operations for stage ${currentStageIndex + 1}:`, err)
            addLog(`Stage ${currentStageIndex + 1}: Error applying operations - ${err.message}`)
            
            // Mark stage as failed
            setBuildPlan(prev => {
              if (!prev || currentStageIndex < 0) return prev
              const updated = { ...prev }
              updated.stages = [...updated.stages]
              updated.stages[currentStageIndex] = { 
                ...updated.stages[currentStageIndex], 
                status: 'failed' as const,
                error: err.message
              }
              return updated
            })
          })
      } else {
        // Log when we have a message but no operations (for debugging)
        if (latestMessage.content && latestMessage.content.length > 50) {
          addLog(`Stage ${currentStageIndex + 1}: AI response received but no file operations detected`)
          // Debug log removed to reduce console noise
          // Uncomment below for debugging if needed:
          // const contentSnippet = latestMessage.content.substring(0, 200)
          // console.log('AI response snippet:', contentSnippet)
        }
      }
    }, 500) // Wait 500ms for message to be fully processed
    
    return () => clearTimeout(checkTimer)
  }, [aiMessages, isBuilding, currentStageIndex, buildPlan, applyFileOperations, addLog, onImprovementsApplied, buildStage])

  const addFixLog = React.useCallback((message: string) => {
    setFixLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }, [])

  const addOptimizationLog = React.useCallback((message: string) => {
    setOptimizationLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }, [])

  const addDevelopmentLog = React.useCallback((message: string) => {
    setDevelopmentLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`])
  }, [])

  const handleFixErrors = React.useCallback(async () => {
    if (!selectedAgentId && selectedAgentIds.length === 0 && !selectedGpu) {
      setStatus('Please select an agent first')
      return
    }

    if (!currentProjectName) {
      setStatus('Please open a project first')
      return
    }

    setIsFixingErrors(true)
    const agentCount = selectedAgentIds.length > 0 ? selectedAgentIds.length : (selectedAgentId ? 1 : 0)
    setStatus(agentCount > 1 ? `Analyzing and fixing errors with ${agentCount} agents...` : 'Analyzing and fixing errors...')
    setFixLog([])
    addFixLog(agentCount > 1 ? `Starting error analysis with ${agentCount} agents...` : 'Starting error analysis...')

    const projectPath = `/${currentProjectName}`
    const workingDirPath = workingDir ? ` (working directory: ${workingDir})` : ''
    const multiAgentMsg = getMultiAgentCollaborationMessage()
    const errorDesc = errorDescription.trim()
    const fixPrompt = `You are an expert software engineer and debugger. Analyze and fix all errors in the following project.${multiAgentMsg}

Project: "${currentProjectName}" (project path: ${projectPath})${workingDirPath}

${errorDesc ? `Error Description:\n${errorDesc}\n\n` : ''}IMPORTANT: ${errorDesc ? 'Focus on the errors described above, but also' : 'Automatically'} detect and fix ALL errors in the codebase including:

IMPORTANT REQUIREMENTS:
1. Analyze the entire codebase to identify all errors, bugs, and issues
2. Fix syntax errors, runtime errors, logical errors, and type errors
3. Ensure all fixes are production-ready and well-tested
4. All file paths MUST start with "${projectPath}/"
5. Return file operations in this EXACT format:
   \`\`\`file_operations
   {
     "operations": [
       {
         "type": "edit",
         "path": "${projectPath}/path/to/file.js",
         "content": "// fixed code here"
       }
     ]
   }
   \`\`\`
6. Fix all related errors, not just the ones mentioned
7. Ensure code compiles and runs correctly after fixes
8. Add proper error handling where needed

Now analyze the codebase and fix all errors.`

    try {
      requestAIAssistance(fixPrompt)
      addFixLog('Error fix request sent to AI agent...')
    } catch (err: unknown) {
      console.error('Failed to fix errors:', err)
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`)
      addFixLog(`Error: ${err instanceof Error ? err.message : String(err)}`)
      setIsFixingErrors(false)
    }
  }, [selectedAgentId, selectedAgentIds, selectedGpu, currentProjectName, errorDescription, requestAIAssistance, addFixLog, getMultiAgentCollaborationMessage, workingDir])

  const handleOptimize = React.useCallback(async () => {
    if (!selectedAgentId && selectedAgentIds.length === 0 && !selectedGpu) {
      setStatus('Please select an agent first')
      return
    }

    if (!currentProjectName) {
      setStatus('Please open a project first')
      return
    }

    setIsOptimizing(true)
    const agentCount = selectedAgentIds.length > 0 ? selectedAgentIds.length : (selectedAgentId ? 1 : 0)
    setStatus(agentCount > 1 ? `Optimizing application with ${agentCount} agents...` : 'Optimizing application...')
    setOptimizationLog([])
    addOptimizationLog(agentCount > 1 ? `Starting optimization analysis with ${agentCount} agents...` : 'Starting optimization analysis...')

    const projectPath = `/${currentProjectName}`
    const workingDirPath = workingDir ? ` (working directory: ${workingDir})` : ''
    const multiAgentMsg = getMultiAgentCollaborationMessage()

    const optimizationTypes = {
      performance: 'performance optimization (speed, memory, efficiency)',
      'code-quality': 'code quality improvements (readability, maintainability, best practices)',
      security: 'security improvements (vulnerabilities, best practices, hardening)',
      all: 'comprehensive optimization (performance, code quality, and security)'
    }

    const optimizePrompt = `You are an expert software optimizer. Analyze and optimize the following project for ${optimizationTypes[optimizationType]}.${multiAgentMsg}

Project: "${currentProjectName}" (project path: ${projectPath})${workingDirPath}

Optimization Focus: ${optimizationTypes[optimizationType]}

IMPORTANT REQUIREMENTS:
1. Analyze the entire codebase for optimization opportunities
2. Optimize code for: ${optimizationType === 'all' ? 'performance, code quality, and security' : optimizationTypes[optimizationType]}
3. All file paths MUST start with "${projectPath}/"
4. Return file operations in this EXACT format:
   \`\`\`file_operations
   {
     "operations": [
       {
         "type": "edit",
         "path": "${projectPath}/path/to/file.js",
         "content": "// optimized code here"
       }
     ]
   }
   \`\`\`
5. Maintain functionality while improving code
6. Add comments explaining optimizations
7. Ensure optimizations don't break existing features

Now analyze and optimize the codebase.`

    try {
      requestAIAssistance(optimizePrompt)
      addOptimizationLog('Optimization request sent to AI agent...')
    } catch (err: unknown) {
      console.error('Failed to optimize:', err)
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`)
      addOptimizationLog(`Error: ${err instanceof Error ? err.message : String(err)}`)
      setIsOptimizing(false)
    }
  }, [selectedAgentId, selectedAgentIds, selectedGpu, currentProjectName, optimizationType, requestAIAssistance, addOptimizationLog, getMultiAgentCollaborationMessage, workingDir])

  const handleDevelopFeature = React.useCallback(async () => {
    if (!selectedAgentId && selectedAgentIds.length === 0 && !selectedGpu) {
      setStatus('Please select an agent first')
      return
    }

    if (!currentProjectName) {
      setStatus('Please open a project first')
      return
    }

    if (!featureDescription.trim()) {
      setStatus('Please describe the feature you want to develop')
      return
    }

    setIsDeveloping(true)
    const agentCount = selectedAgentIds.length > 0 ? selectedAgentIds.length : (selectedAgentId ? 1 : 0)
    setStatus(agentCount > 1 ? `Developing feature with ${agentCount} agents...` : 'Developing feature...')
    setDevelopmentLog([])
    addDevelopmentLog(agentCount > 1 ? `Starting feature development with ${agentCount} agents...` : 'Starting feature development...')

    const projectPath = `/${currentProjectName}`
    const workingDirPath = workingDir ? ` (working directory: ${workingDir})` : ''
    const multiAgentMsg = getMultiAgentCollaborationMessage()

    const developPrompt = `You are an expert software developer. Develop the following feature for the project.${multiAgentMsg}

Project: "${currentProjectName}" (project path: ${projectPath})${workingDirPath}

Feature Description:
${featureDescription}

IMPORTANT REQUIREMENTS:
1. Analyze the existing codebase structure and patterns
2. Develop the feature following existing code style and architecture
3. Integrate seamlessly with existing code
4. All file paths MUST start with "${projectPath}/"
5. Return file operations in this EXACT format:
   \`\`\`file_operations
   {
     "operations": [
       {
         "type": "create",
         "path": "${projectPath}/path/to/file.js",
         "content": "// complete feature code here"
       }
     ]
   }
   \`\`\`
6. Write production-ready, well-structured code
7. Include proper error handling and validation
8. Follow best practices and maintain consistency with existing code
9. Add necessary tests if applicable

Now develop this feature.`

    try {
      requestAIAssistance(developPrompt)
      addDevelopmentLog('Feature development request sent to AI agent...')
    } catch (err: unknown) {
      console.error('Failed to develop feature:', err)
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`)
      addDevelopmentLog(`Error: ${err instanceof Error ? err.message : String(err)}`)
      setIsDeveloping(false)
    }
  }, [selectedAgentId, selectedAgentIds, selectedGpu, currentProjectName, featureDescription, requestAIAssistance, addDevelopmentLog, getMultiAgentCollaborationMessage, workingDir])

  // Track file operations for error fixer, optimizer, and developer
  const lastProcessedFixMessageIdRef = React.useRef<string | null>(null)
  const lastProcessedOptimizeMessageIdRef = React.useRef<string | null>(null)
  const lastProcessedDevelopMessageIdRef = React.useRef<string | null>(null)

  useEffect(() => {
    if ((isFixingErrors || isOptimizing || isDeveloping) && aiMessages.length > 0) {
      const latestMessage = aiMessages
        .filter(msg => {
          if (msg.role !== 'assistant' || msg.isStreaming) return false
          // Check if we've already processed this message
          if (isFixingErrors && msg.id === lastProcessedFixMessageIdRef.current) return false
          if (isOptimizing && msg.id === lastProcessedOptimizeMessageIdRef.current) return false
          if (isDeveloping && msg.id === lastProcessedDevelopMessageIdRef.current) return false
          return true
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]

      if (!latestMessage) return

      // Add delay to ensure message is fully processed
      const checkTimer = setTimeout(() => {
        let operations = latestMessage.parsed?.fileOperations || []
        
        // Try to parse from content if not already parsed
        if (operations.length === 0 && latestMessage.content) {
          const content = latestMessage.content
          
          // Check for file_operations block
          const fileOpsMatch = content.match(/```file_operations\s*([\s\S]*?)```/i)
          if (fileOpsMatch) {
            try {
              const opsData = JSON.parse(fileOpsMatch[1])
              if (opsData.operations && Array.isArray(opsData.operations)) {
                operations = opsData.operations
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }

        if (operations.length > 0) {
          // Mark message as processed
          if (isFixingErrors) lastProcessedFixMessageIdRef.current = latestMessage.id
          if (isOptimizing) lastProcessedOptimizeMessageIdRef.current = latestMessage.id
          if (isDeveloping) lastProcessedDevelopMessageIdRef.current = latestMessage.id

          applyFileOperations(operations)
            .then(() => {
              if (isFixingErrors) {
                addFixLog(`Applied ${operations.length} fix(es)`)
                if (autoContinue) {
                  // Auto-continue: Check for more errors and continue fixing
                  addFixLog('Auto-continue enabled: Checking for remaining errors...')
                  setTimeout(() => {
                    // Only continue if still in fixing mode and auto-continue is still enabled
                    if (isFixingErrors && autoContinue) {
                      handleFixErrors()
                    } else if (!autoContinue) {
                      setIsFixingErrors(false)
                      setStatus('Auto-continue disabled. Errors fixed!')
                    }
                  }, 2000)
                } else {
                  setIsFixingErrors(false)
                  setStatus('Errors fixed successfully!')
                }
              }
              if (isOptimizing) {
                addOptimizationLog(`Applied ${operations.length} optimization(s)`)
                if (autoContinue) {
                  // Auto-continue: Continue optimizing
                  addOptimizationLog('Auto-continue enabled: Continuing optimization...')
                  setTimeout(() => {
                    // Only continue if still in optimizing mode and auto-continue is still enabled
                    if (isOptimizing && autoContinue) {
                      handleOptimize()
                    } else if (!autoContinue) {
                      setIsOptimizing(false)
                      setStatus('Auto-continue disabled. Optimization completed!')
                    }
                  }, 2000)
                } else {
                  setIsOptimizing(false)
                  setStatus('Optimization completed!')
                }
              }
              if (isDeveloping) {
                addDevelopmentLog(`Applied ${operations.length} file operation(s)`)
                if (autoContinue) {
                  // Auto-continue: Continue development
                  addDevelopmentLog('Auto-continue enabled: Continuing development...')
                  setTimeout(() => {
                    // Only continue if still in developing mode and auto-continue is still enabled
                    if (isDeveloping && autoContinue) {
                      handleDevelopFeature()
                    } else if (!autoContinue) {
                      setIsDeveloping(false)
                      setStatus('Auto-continue disabled. Feature development completed!')
                    }
                  }, 2000)
                } else {
                  setIsDeveloping(false)
                  setStatus('Feature development completed!')
                }
              }
              if (onImprovementsApplied) {
                const filesModified = operations.map(op => op.path).filter(Boolean)
                onImprovementsApplied(operations.length, filesModified)
              }
            })
            .catch((err: unknown) => {
              const errorMsg = err instanceof Error ? err.message : String(err)
              if (isFixingErrors) {
                addFixLog(`Error: ${errorMsg}`)
                setIsFixingErrors(false)
              }
              if (isOptimizing) {
                addOptimizationLog(`Error: ${errorMsg}`)
                setIsOptimizing(false)
              }
              if (isDeveloping) {
                addDevelopmentLog(`Error: ${errorMsg}`)
                setIsDeveloping(false)
              }
            })
        } else {
          // No operations found - stop even if auto-continue is enabled
          if (isFixingErrors) {
            addFixLog('No more errors found. Stopping.')
            setIsFixingErrors(false)
            setStatus(autoContinue ? 'All errors fixed! Auto-continue stopped.' : 'Errors fixed successfully!')
          }
          if (isOptimizing) {
            addOptimizationLog('No more optimizations found. Stopping.')
            setIsOptimizing(false)
            setStatus(autoContinue ? 'Optimization complete! Auto-continue stopped.' : 'Optimization completed!')
          }
          if (isDeveloping) {
            addDevelopmentLog('No more operations found. Stopping.')
            setIsDeveloping(false)
            setStatus(autoContinue ? 'Feature development complete! Auto-continue stopped.' : 'Feature development completed!')
          }
        }
      }, 500)

      return () => clearTimeout(checkTimer)
    }
  }, [aiMessages, isFixingErrors, isOptimizing, isDeveloping, applyFileOperations, addFixLog, addOptimizationLog, addDevelopmentLog, onImprovementsApplied, autoContinue, handleFixErrors, handleOptimize, handleDevelopFeature])

  return (
    <div className="auto-app-builder">
      <div className="auto-app-builder-header">
        <h3>🚀 Auto App Tools</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {currentProjectName && (
            <div className="auto-app-project-info">
              <span className="project-badge">📁 {currentProjectName}</span>
            </div>
          )}
          {/* Auto-Continue Toggle - Compact inline version */}
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            cursor: 'pointer',
            fontSize: '12px',
            color: 'var(--theme-fg, #cccccc)',
            whiteSpace: 'nowrap'
          }}>
            <input
              type="checkbox"
              checked={autoContinue}
              onChange={(e) => setAutoContinue(e.target.checked)}
              style={{ cursor: 'pointer', margin: 0 }}
            />
            <span>🔄 Auto-Continue</span>
          </label>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="auto-app-tabs">
        <button
          className={`auto-app-tab ${activeTab === 'builder' ? 'active' : ''}`}
          onClick={() => setActiveTab('builder')}
        >
          🏗️ Builder
        </button>
        <button
          className={`auto-app-tab ${activeTab === 'developer' ? 'active' : ''}`}
          onClick={() => setActiveTab('developer')}
        >
          👨‍💻 Developer
        </button>
        <button
          className={`auto-app-tab ${activeTab === 'error-fixer' ? 'active' : ''}`}
          onClick={() => setActiveTab('error-fixer')}
        >
          🔧 Error Fixer
        </button>
        <button
          className={`auto-app-tab ${activeTab === 'optimizer' ? 'active' : ''}`}
          onClick={() => setActiveTab('optimizer')}
        >
          ⚡ Optimizer
        </button>
      </div>

      {(!selectedAgentId && selectedAgentIds.length === 0 && !selectedGpu) && (
        <div className="auto-app-warning">
          <p>⚠️ Please select an agent to use Auto App Tools</p>
        </div>
      )}

      {selectedAgentIds.length > 1 && (
        <div className="auto-app-info" style={{ 
          padding: '8px 12px', 
          background: 'rgba(0, 122, 204, 0.1)', 
          border: '1px solid rgba(0, 122, 204, 0.3)', 
          borderRadius: '6px',
          fontSize: '12px',
          color: 'var(--theme-fg, #cccccc)',
          marginBottom: '8px'
        }}>
          <strong>🤝 Multi-Agent Mode:</strong> {selectedAgentIds.length} agents will collaborate on this task. Responses will be merged for the best solution.
        </div>
      )}

      {!currentProjectName && (
        <div className="auto-app-warning">
          <p>⚠️ Please open a project first</p>
        </div>
      )}

      {/* Auto App Builder Tab */}
      {activeTab === 'builder' && (
        <>
          <div className="auto-app-build-section">
        <label className="auto-app-label">
          <strong>Application Type</strong>
        </label>
        <div className="auto-app-type-selector">
          {APP_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              className={`auto-app-type-option ${appType === type.value ? 'selected' : ''}`}
              onClick={() => handleAppTypeChange(type.value)}
              disabled={isPlanning || isBuilding}
              title={type.description}
            >
              <span className="auto-app-type-icon">{type.icon}</span>
              <span className="auto-app-type-label">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="auto-app-build-section">
        <label className="auto-app-label">
          <strong>What do you want to build?</strong>
        </label>
        <textarea
          className="auto-app-textarea"
          value={buildDescription}
          onChange={(e) => setBuildDescription(e.target.value)}
          placeholder={appType ? `Describe your ${APP_TYPES.find(t => t.value === appType)?.label.toLowerCase()}...` : "Select an application type first, then describe what you want to build"}
          rows={3}
          disabled={isPlanning || isBuilding || !appType}
        />
        <div className="auto-app-char-count">
          {buildDescription.trim().length > 0 ? `${buildDescription.trim().length} characters` : appType ? 'Enter a description' : 'Select an application type first'}
        </div>
      </div>

      <div className="auto-app-actions">
        <button
          className="auto-app-btn auto-app-btn-primary"
          onClick={createBuildPlan}
          disabled={isPlanning || isBuilding || !appType || !buildDescription.trim() || !currentProjectName || (!selectedAgentId && selectedAgentIds.length === 0 && !selectedGpu)}
        >
          {isPlanning ? '⏳ Creating Plan...' : '📋 Create Build Plan'}
        </button>
        
        {buildPlan && (
          <button
            className="auto-app-btn auto-app-btn-success"
            onClick={startBuild}
            disabled={isBuilding || isPlanning || isAIAssisting || isAIThinking}
          >
            {isBuilding ? '⏳ Building...' : '🚀 Start Build'}
          </button>
        )}
      </div>

      {buildPlan && (
        <div className="auto-app-plan-section">
          <div className="auto-app-plan-header">
            <h4>Build Plan</h4>
            {buildPlan.estimatedTime && (
              <span className="auto-app-estimate">⏱️ {buildPlan.estimatedTime}</span>
            )}
          </div>
          
          <div className="auto-app-stages">
            {buildPlan.stages.map((stage, index) => (
              <div 
                key={stage.id} 
                className={`auto-app-stage ${stage.status} ${index === currentStageIndex ? 'active' : ''}`}
              >
                <div className="auto-app-stage-header">
                  <div className="auto-app-stage-number">{index + 1}</div>
                  <div className="auto-app-stage-info">
                    <div className="auto-app-stage-name">{stage.name}</div>
                    <div className="auto-app-stage-desc">{stage.description}</div>
                  </div>
                  <div className="auto-app-stage-status">
                    {stage.status === 'completed' && '✓'}
                    {stage.status === 'in-progress' && '⏳'}
                    {stage.status === 'failed' && '✗'}
                    {stage.status === 'pending' && '○'}
                  </div>
                </div>
                {stage.files.length > 0 && (
                  <div className="auto-app-stage-files">
                    <strong>Files:</strong> {stage.files.join(', ')}
                  </div>
                )}
                {stage.error && (
                  <div className="auto-app-stage-error">Error: {stage.error}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {status && (
        <div className="auto-app-status">
          <p>{status}</p>
        </div>
      )}

      {buildLog.length > 0 && (
        <div className="auto-app-log">
          <div className="auto-app-log-header">
            <strong>Build Log</strong>
            <button 
              className="auto-app-log-clear"
              onClick={() => setBuildLog([])}
            >
              Clear
            </button>
          </div>
          <div className="auto-app-log-content">
            {buildLog.map((log, idx) => (
              <div key={idx} className="auto-app-log-entry">{log}</div>
            ))}
          </div>
        </div>
      )}
      </>
      )}

      {/* Auto App Developer Tab */}
      {activeTab === 'developer' && (
        <div className="auto-app-section">
          <div className="auto-app-section-header">
            <h4>👨‍💻 Auto App Developer</h4>
            <p>Develop new features and functionality for your application</p>
          </div>

          <div className="auto-app-build-section">
            <label className="auto-app-label">
              <strong>Feature Description</strong>
            </label>
            <textarea
              className="auto-app-textarea"
              value={featureDescription}
              onChange={(e) => setFeatureDescription(e.target.value)}
              placeholder="Describe the feature you want to develop (e.g., 'Add user authentication with login and registration', 'Create a dashboard with charts and statistics')"
              rows={5}
              disabled={isDeveloping || !currentProjectName || (!selectedAgentId && selectedAgentIds.length === 0 && !selectedGpu)}
            />
            <div className="auto-app-char-count">
              {featureDescription.trim().length > 0 ? `${featureDescription.trim().length} characters` : 'Describe the feature you want to develop'}
            </div>
          </div>

          <div className="auto-app-actions">
            <button
              className="auto-app-btn auto-app-btn-primary"
              onClick={handleDevelopFeature}
              disabled={isDeveloping || !featureDescription.trim() || !currentProjectName || (!selectedAgentId && selectedAgentIds.length === 0 && !selectedGpu)}
            >
              {isDeveloping ? '⏳ Developing...' : '🚀 Develop Feature'}
            </button>
          </div>

          {status && isDeveloping && (
            <div className="auto-app-status">
              <p>{status}</p>
            </div>
          )}

          {developmentLog.length > 0 && (
            <div className="auto-app-log">
              <div className="auto-app-log-header">
                <strong>Development Log</strong>
                <button 
                  className="auto-app-log-clear"
                  onClick={() => setDevelopmentLog([])}
                >
                  Clear
                </button>
              </div>
              <div className="auto-app-log-content">
                {developmentLog.map((log, idx) => (
                  <div key={idx} className="auto-app-log-entry">{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Auto App Error Fixer Tab */}
      {activeTab === 'error-fixer' && (
        <div className="auto-app-section">
          <div className="auto-app-section-header">
            <h4>🔧 Auto App Error Fixer</h4>
            <p>Automatically detect and fix errors, bugs, and issues in your codebase</p>
          </div>

          <div className="auto-app-build-section">
            <label className="auto-app-label">
              <strong>Error Description</strong>
            </label>
            <textarea
              className="auto-app-textarea"
              value={errorDescription}
              onChange={(e) => setErrorDescription(e.target.value)}
              placeholder="Describe the errors you're experiencing (e.g., 'Fix all TypeScript errors', 'Resolve runtime exceptions in the API', 'Fix authentication bugs'). Leave empty to auto-detect all errors."
              rows={5}
              disabled={isFixingErrors || !currentProjectName || (!selectedAgentId && selectedAgentIds.length === 0 && !selectedGpu)}
            />
            <div className="auto-app-char-count">
              {errorDescription.trim().length > 0 ? `${errorDescription.trim().length} characters` : 'Describe specific errors or leave empty to auto-detect all errors'}
            </div>
          </div>

          <div className="auto-app-actions">
            <button
              className="auto-app-btn auto-app-btn-primary"
              onClick={handleFixErrors}
              disabled={isFixingErrors || !currentProjectName || (!selectedAgentId && selectedAgentIds.length === 0 && !selectedGpu)}
            >
              {isFixingErrors ? '⏳ Fixing Errors...' : '🔧 Fix Errors'}
            </button>
          </div>

          {status && isFixingErrors && (
            <div className="auto-app-status">
              <p>{status}</p>
            </div>
          )}

          {fixLog.length > 0 && (
            <div className="auto-app-log">
              <div className="auto-app-log-header">
                <strong>Fix Log</strong>
                <button 
                  className="auto-app-log-clear"
                  onClick={() => setFixLog([])}
                >
                  Clear
                </button>
              </div>
              <div className="auto-app-log-content">
                {fixLog.map((log, idx) => (
                  <div key={idx} className="auto-app-log-entry">{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Auto App Optimizer Tab */}
      {activeTab === 'optimizer' && (
        <div className="auto-app-section">
          <div className="auto-app-section-header">
            <h4>⚡ Auto App Optimizer</h4>
            <p>Optimize your application for performance, code quality, and security</p>
          </div>

          <div className="auto-app-build-section">
            <label className="auto-app-label">
              <strong>Optimization Type</strong>
            </label>
            <div className="auto-app-type-selector">
              <button
                type="button"
                className={`auto-app-type-option ${optimizationType === 'performance' ? 'selected' : ''}`}
                onClick={() => setOptimizationType('performance')}
                disabled={isOptimizing}
                title="Optimize for speed, memory usage, and efficiency"
              >
                <span className="auto-app-type-icon">⚡</span>
                <span className="auto-app-type-label">Performance</span>
              </button>
              <button
                type="button"
                className={`auto-app-type-option ${optimizationType === 'code-quality' ? 'selected' : ''}`}
                onClick={() => setOptimizationType('code-quality')}
                disabled={isOptimizing}
                title="Improve code readability, maintainability, and best practices"
              >
                <span className="auto-app-type-icon">✨</span>
                <span className="auto-app-type-label">Code Quality</span>
              </button>
              <button
                type="button"
                className={`auto-app-type-option ${optimizationType === 'security' ? 'selected' : ''}`}
                onClick={() => setOptimizationType('security')}
                disabled={isOptimizing}
                title="Fix security vulnerabilities and apply security best practices"
              >
                <span className="auto-app-type-icon">🔒</span>
                <span className="auto-app-type-label">Security</span>
              </button>
              <button
                type="button"
                className={`auto-app-type-option ${optimizationType === 'all' ? 'selected' : ''}`}
                onClick={() => setOptimizationType('all')}
                disabled={isOptimizing}
                title="Comprehensive optimization (performance, quality, and security)"
              >
                <span className="auto-app-type-icon">🚀</span>
                <span className="auto-app-type-label">All</span>
              </button>
            </div>
          </div>

          <div className="auto-app-actions">
            <button
              className="auto-app-btn auto-app-btn-primary"
              onClick={handleOptimize}
              disabled={isOptimizing || !currentProjectName || (!selectedAgentId && selectedAgentIds.length === 0 && !selectedGpu)}
            >
              {isOptimizing ? '⏳ Optimizing...' : '⚡ Optimize App'}
            </button>
          </div>

          {status && isOptimizing && (
            <div className="auto-app-status">
              <p>{status}</p>
            </div>
          )}

          {optimizationLog.length > 0 && (
            <div className="auto-app-log">
              <div className="auto-app-log-header">
                <strong>Optimization Log</strong>
                <button 
                  className="auto-app-log-clear"
                  onClick={() => setOptimizationLog([])}
                >
                  Clear
                </button>
              </div>
              <div className="auto-app-log-content">
                {optimizationLog.map((log, idx) => (
                  <div key={idx} className="auto-app-log-entry">{log}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
