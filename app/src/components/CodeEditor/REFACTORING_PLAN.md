# CodeEditor Refactoring Plan

## Current State
- **File Size**: ~7,400 lines
- **Main Issues**: 
  - Too much logic in one component
  - Hard to maintain and test
  - Difficult to understand the flow

## Refactoring Strategy

### Phase 1: Extract Hooks (Priority: High)
1. ✅ `useFileOperations` - Already exists
2. ✅ `useProjectOperations` - Already exists  
3. ✅ `useSettings` - Already exists
4. ✅ `useAIHelpers` - Already exists
5. ⏳ `useAIOperations` - Extract `requestAIAssistance` and `applyFileOperations`
6. ⏳ `useEditorOperations` - Extract split pane, tab management, editor mounting
7. ⏳ `useKeyboardShortcuts` - Extract all keyboard handlers
8. ⏳ `useContextMenu` - Extract context menu operations
9. ⏳ `useFileHandlers` - Extract file selection, loading, saving handlers

### Phase 2: Extract Components (Priority: Medium)
1. `ProjectManagement` - Project dialogs and UI
2. `FileContextMenu` - Context menu component
3. `KeyboardShortcutsDialog` - Keyboard shortcuts display
4. `EditorConfig` - Editor configuration logic

### Phase 3: Extract Utilities (Priority: Low)
1. Move large handler functions to separate utility files
2. Extract constants to separate file
3. Create type definitions file for all interfaces

## Target Structure

```
CodeEditor/
├── CodeEditor.tsx (Main component - ~500-800 lines)
├── components/
│   ├── AIPanel.tsx ✅
│   ├── AutoAppPanel.tsx ✅
│   ├── EditorHeader.tsx ✅
│   ├── FileExplorer.tsx ✅
│   ├── ProjectManagement.tsx (NEW)
│   ├── FileContextMenu.tsx (NEW)
│   └── ...
├── hooks/
│   ├── useFileOperations.ts ✅
│   ├── useProjectOperations.ts ✅
│   ├── useSettings.ts ✅
│   ├── useAIHelpers.ts ✅
│   ├── useAIOperations.ts (NEW)
│   ├── useEditorOperations.ts (NEW)
│   ├── useKeyboardShortcuts.ts (NEW)
│   ├── useContextMenu.ts (NEW)
│   └── useFileHandlers.ts (NEW)
└── utils/
    ├── handlers.ts (NEW - large handler functions)
    └── constants.ts (NEW)
```

## Implementation Order

1. **Start with hooks** - They're the easiest to extract and provide immediate value
2. **Then components** - Break down UI into smaller pieces
3. **Finally utilities** - Move large functions to separate files

## Notes

- Keep backward compatibility during refactoring
- Test after each extraction
- Update imports as needed
- Maintain type safety throughout
