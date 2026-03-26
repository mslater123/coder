# CodeEditor Refactoring Guide

## Overview
The `CodeEditor.tsx` file has grown to 6626 lines and needs to be split into smaller, more manageable modules.

## Completed Extractions

### 1. State Management (`hooks/useCodeEditorState.ts`)
- All `useState` declarations
- All `useRef` declarations
- Centralized state management

### 2. Settings (`hooks/useSettings.ts`)
- All settings state (editor, appearance, model, git, terminal, file, search, workspace, performance, security)

### 3. File Operations (`hooks/useFileOperations.ts`)
- `startCreatingFile`
- `startCreatingFolder`
- `finishCreatingFile`
- `finishCreatingFolder`
- `handleDeleteFile`
- `handleCopyFile`
- `handleCutFile`
- `handleRenameFile`
- `finishRenamingFile`
- `handleRevealInExplorer`
- `handleFileUpload`
- `uploadFiles`

### 4. Project Operations (`hooks/useProjectOperations.ts`)
- `loadProjects`
- `saveProjects`
- `saveCurrentProject`
- `createNewProject`
- `openProject`
- `deleteProject`
- `getProjectPath`
- `getRelativePath`

### 5. Terminal Operations (`hooks/useTerminalOperations.ts`)
- `runCode`
- `stopExecution`
- `executeTerminalCommand`

### 6. AI Helpers (`hooks/useAIHelpers.ts`)
- `getEditorDiagnostics`
- `getRelatedFiles`
- `detectTaskType`
- `buildTaskSpecificPrompt`
- `handleParseAIResponse`
- `scrollToBottom`
- `formatInlineMarkdown`
- `getCodePatterns`

### 7. Initialization (`hooks/useInitialization.ts`)
- `loadGPUs`
- `loadAgents`
- `loadUserFromStorage`
- `loadPanelSizes`
- Venv detection effect

## Remaining to Extract

### Large Functions Still in Main Component:
1. **`requestAIAssistance`** (~1000 lines) - Complex AI request handling with streaming, polling, multi-agent support
2. **`applyFileOperations`** (~200 lines) - File operation validation and application
3. **`handleEditorDidMount`** (~400 lines) - Monaco Editor setup and configuration
4. **`loadFilesFromBackend`** (~120 lines) - File tree building and loading
5. **Pane management functions** (~300 lines) - Split editor pane operations
6. **Various file operation handlers** (~500 lines) - Copy, move, duplicate, drag-drop

## Next Steps

1. Extract `requestAIAssistance` and `applyFileOperations` into `hooks/useAIOperations.ts`
2. Extract Monaco Editor setup into `hooks/useEditorOperations.ts`
3. Extract pane management into `hooks/usePaneOperations.ts`
4. Update main component to use all hooks
5. Extract remaining utility functions

## Usage Example

```typescript
import { useCodeEditorState, useSettings, useFileOperations, useProjectOperations, useTerminalOperations, useAIHelpers, useInitialization } from './hooks'

export function CodeEditor({ onClose }: CodeEditorProps) {
  // State
  const state = useCodeEditorState()
  const settings = useSettings()
  
  // Operations
  const projectOps = useProjectOperations({ ...state, ...settings })
  const fileOps = useFileOperations({ ...state, ...projectOps })
  const terminalOps = useTerminalOperations({ ...state })
  const aiHelpers = useAIHelpers({ ...state })
  
  // Initialization
  useInitialization({ ...state, ...projectOps })
  
  // ... rest of component
}
```
