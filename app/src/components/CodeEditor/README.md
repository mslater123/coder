# CodeEditor Component Structure

This directory contains the refactored CodeEditor component, split into smaller, more manageable files.

## File Structure

```
CodeEditor/
├── types.ts              # All TypeScript interfaces and types
├── themes.ts             # Theme definitions and applyTheme function
├── utils.ts              # Utility functions (detectLanguage, parseAIResponse, etc.)
├── components/
│   ├── MenuBar.tsx       # Top menu bar component
│   ├── EditorHeader.tsx  # Editor header with project selector and agent selector
│   ├── FileExplorer.tsx  # File explorer sidebar (TODO)
│   ├── AIPanel.tsx       # AI assistant panel (TODO)
│   ├── TerminalPanel.tsx # Terminal panel component (TODO)
│   ├── SettingsDialog.tsx # Settings dialog (TODO)
│   └── ...               # Other modal dialogs (TODO)
├── index.ts              # Main export file
└── CodeEditor.tsx        # Main component (to be moved here)

```

## Status

- ✅ Types extracted to `types.ts`
- ✅ Themes extracted to `themes.ts`
- ✅ Utils extracted to `utils.ts`
- ✅ MenuBar component extracted
- ✅ EditorHeader component extracted
- ⏳ FileExplorer component (in progress)
- ⏳ AIPanel component (in progress)
- ⏳ TerminalPanel component (in progress)
- ⏳ SettingsDialog component (in progress)
- ⏳ Modal dialogs (in progress)

## Next Steps

1. Extract FileExplorer component
2. Extract AIPanel component
3. Extract TerminalPanel component
4. Extract SettingsDialog component
5. Extract all modal dialogs
6. Move main CodeEditor.tsx into this directory
7. Update imports in App.tsx
