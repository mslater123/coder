import type { ThemeColors } from './types'

export const AVAILABLE_THEMES: Array<{ id: string; name: string; colors: ThemeColors }> = [
  {
    id: 'vs-dark',
    name: 'Dark+ (default dark)',
    colors: {
      bg: '#1e1e1e', fg: '#d4d4d4', accent: '#007acc',
      menuBarBg: '#2d2d30', menuBarFg: '#cccccc', menuBarBorder: '#3e3e42',
      menuDropdownBg: '#252526', menuDropdownFg: '#cccccc', menuDropdownHover: '#2a2d2e', menuDropdownBorder: '#3e3e42',
      headerBg: '#2d2d30', headerFg: '#cccccc', headerBorder: '#3e3e42',
      sidebarBg: '#252526', sidebarFg: '#cccccc', sidebarBorder: '#3e3e42', sidebarItemHover: '#2a2d2e', sidebarItemSelected: '#37373d',
      editorBg: '#1e1e1e', editorFg: '#d4d4d4',
      aiPanelBg: '#252526', aiPanelFg: '#cccccc', aiPanelBorder: '#3e3e42', aiMessageBg: '#2a2d2e', aiInputBg: '#1e1e1e', aiInputFg: '#cccccc', aiInputBorder: '#3e3e42',
      terminalBg: '#1e1e1e', terminalFg: '#cccccc', terminalBorder: '#3e3e42',
      dialogBg: '#252526', dialogFg: '#cccccc', dialogBorder: '#3e3e42', dialogHeaderBg: '#2d2d30',
      buttonBg: '#37373d', buttonFg: '#cccccc', buttonHover: '#454545', buttonPrimaryBg: '#007acc', buttonPrimaryFg: '#ffffff',
      inputBg: '#1e1e1e', inputFg: '#cccccc', inputBorder: '#3e3e42', inputFocusBorder: '#007acc',
      tabBg: '#2d2d30', tabFg: '#969696', tabActiveBg: '#1e1e1e', tabActiveFg: '#cccccc', tabBorder: '#3e3e42',
      statusBarBg: '#2d2d30', statusBarFg: '#cccccc', statusBarBorder: '#3e3e42',
    }
  },
  {
    id: 'vs',
    name: 'Light+ (default light)',
    colors: {
      bg: '#ffffff', fg: '#000000', accent: '#007acc',
      menuBarBg: '#f3f3f3', menuBarFg: '#333333', menuBarBorder: '#e5e5e5',
      menuDropdownBg: '#ffffff', menuDropdownFg: '#333333', menuDropdownHover: '#e8e8e8', menuDropdownBorder: '#e5e5e5',
      headerBg: '#f3f3f3', headerFg: '#333333', headerBorder: '#e5e5e5',
      sidebarBg: '#f3f3f3', sidebarFg: '#333333', sidebarBorder: '#e5e5e5', sidebarItemHover: '#e8e8e8', sidebarItemSelected: '#d0d0d0',
      editorBg: '#ffffff', editorFg: '#000000',
      aiPanelBg: '#ffffff', aiPanelFg: '#333333', aiPanelBorder: '#e5e5e5', aiMessageBg: '#f5f5f5', aiInputBg: '#ffffff', aiInputFg: '#333333', aiInputBorder: '#e5e5e5',
      terminalBg: '#ffffff', terminalFg: '#333333', terminalBorder: '#e5e5e5',
      dialogBg: '#ffffff', dialogFg: '#333333', dialogBorder: '#e5e5e5', dialogHeaderBg: '#f3f3f3',
      buttonBg: '#e8e8e8', buttonFg: '#333333', buttonHover: '#d0d0d0', buttonPrimaryBg: '#007acc', buttonPrimaryFg: '#ffffff',
      inputBg: '#ffffff', inputFg: '#333333', inputBorder: '#e5e5e5', inputFocusBorder: '#007acc',
      tabBg: '#f3f3f3', tabFg: '#666666', tabActiveBg: '#ffffff', tabActiveFg: '#333333', tabBorder: '#e5e5e5',
      statusBarBg: '#f3f3f3', statusBarFg: '#333333', statusBarBorder: '#e5e5e5',
    }
  },
  {
    id: 'monokai',
    name: 'Monokai',
    colors: {
      bg: '#272822', fg: '#f8f8f2', accent: '#66d9ef',
      menuBarBg: '#3e3d32', menuBarFg: '#f8f8f2', menuBarBorder: '#49483e',
      menuDropdownBg: '#272822', menuDropdownFg: '#f8f8f2', menuDropdownHover: '#3e3d32', menuDropdownBorder: '#49483e',
      headerBg: '#3e3d32', headerFg: '#f8f8f2', headerBorder: '#49483e',
      sidebarBg: '#272822', sidebarFg: '#f8f8f2', sidebarBorder: '#49483e', sidebarItemHover: '#3e3d32', sidebarItemSelected: '#49483e',
      editorBg: '#272822', editorFg: '#f8f8f2',
      aiPanelBg: '#272822', aiPanelFg: '#f8f8f2', aiPanelBorder: '#49483e', aiMessageBg: '#3e3d32', aiInputBg: '#272822', aiInputFg: '#f8f8f2', aiInputBorder: '#49483e',
      terminalBg: '#272822', terminalFg: '#f8f8f2', terminalBorder: '#49483e',
      dialogBg: '#272822', dialogFg: '#f8f8f2', dialogBorder: '#49483e', dialogHeaderBg: '#3e3d32',
      buttonBg: '#3e3d32', buttonFg: '#f8f8f2', buttonHover: '#49483e', buttonPrimaryBg: '#66d9ef', buttonPrimaryFg: '#272822',
      inputBg: '#272822', inputFg: '#f8f8f2', inputBorder: '#49483e', inputFocusBorder: '#66d9ef',
      tabBg: '#3e3d32', tabFg: '#a6e22e', tabActiveBg: '#272822', tabActiveFg: '#f8f8f2', tabBorder: '#49483e',
      statusBarBg: '#3e3d32', statusBarFg: '#f8f8f2', statusBarBorder: '#49483e',
    }
  },
  {
    id: 'dracula',
    name: 'Dracula',
    colors: {
      bg: '#282a36', fg: '#f8f8f2', accent: '#bd93f9',
      menuBarBg: '#343746', menuBarFg: '#f8f8f2', menuBarBorder: '#44475a',
      menuDropdownBg: '#282a36', menuDropdownFg: '#f8f8f2', menuDropdownHover: '#343746', menuDropdownBorder: '#44475a',
      headerBg: '#343746', headerFg: '#f8f8f2', headerBorder: '#44475a',
      sidebarBg: '#282a36', sidebarFg: '#f8f8f2', sidebarBorder: '#44475a', sidebarItemHover: '#343746', sidebarItemSelected: '#44475a',
      editorBg: '#282a36', editorFg: '#f8f8f2',
      aiPanelBg: '#282a36', aiPanelFg: '#f8f8f2', aiPanelBorder: '#44475a', aiMessageBg: '#343746', aiInputBg: '#282a36', aiInputFg: '#f8f8f2', aiInputBorder: '#44475a',
      terminalBg: '#282a36', terminalFg: '#f8f8f2', terminalBorder: '#44475a',
      dialogBg: '#282a36', dialogFg: '#f8f8f2', dialogBorder: '#44475a', dialogHeaderBg: '#343746',
      buttonBg: '#343746', buttonFg: '#f8f8f2', buttonHover: '#44475a', buttonPrimaryBg: '#bd93f9', buttonPrimaryFg: '#282a36',
      inputBg: '#282a36', inputFg: '#f8f8f2', inputBorder: '#44475a', inputFocusBorder: '#bd93f9',
      tabBg: '#343746', tabFg: '#6272a4', tabActiveBg: '#282a36', tabActiveFg: '#f8f8f2', tabBorder: '#44475a',
      statusBarBg: '#343746', statusBarFg: '#f8f8f2', statusBarBorder: '#44475a',
    }
  },
  {
    id: 'nord',
    name: 'Nord',
    colors: {
      bg: '#2e3440', fg: '#d8dee9', accent: '#88c0d0',
      menuBarBg: '#3b4252', menuBarFg: '#d8dee9', menuBarBorder: '#434c5e',
      menuDropdownBg: '#2e3440', menuDropdownFg: '#d8dee9', menuDropdownHover: '#3b4252', menuDropdownBorder: '#434c5e',
      headerBg: '#3b4252', headerFg: '#d8dee9', headerBorder: '#434c5e',
      sidebarBg: '#2e3440', sidebarFg: '#d8dee9', sidebarBorder: '#434c5e', sidebarItemHover: '#3b4252', sidebarItemSelected: '#434c5e',
      editorBg: '#2e3440', editorFg: '#d8dee9',
      aiPanelBg: '#2e3440', aiPanelFg: '#d8dee9', aiPanelBorder: '#434c5e', aiMessageBg: '#3b4252', aiInputBg: '#2e3440', aiInputFg: '#d8dee9', aiInputBorder: '#434c5e',
      terminalBg: '#2e3440', terminalFg: '#d8dee9', terminalBorder: '#434c5e',
      dialogBg: '#2e3440', dialogFg: '#d8dee9', dialogBorder: '#434c5e', dialogHeaderBg: '#3b4252',
      buttonBg: '#3b4252', buttonFg: '#d8dee9', buttonHover: '#434c5e', buttonPrimaryBg: '#88c0d0', buttonPrimaryFg: '#2e3440',
      inputBg: '#2e3440', inputFg: '#d8dee9', inputBorder: '#434c5e', inputFocusBorder: '#88c0d0',
      tabBg: '#3b4252', tabFg: '#5e81ac', tabActiveBg: '#2e3440', tabActiveFg: '#d8dee9', tabBorder: '#434c5e',
      statusBarBg: '#3b4252', statusBarFg: '#d8dee9', statusBarBorder: '#434c5e',
    }
  },
  {
    id: 'github-dark',
    name: 'GitHub Dark',
    colors: {
      bg: '#0d1117', fg: '#c9d1d9', accent: '#58a6ff',
      menuBarBg: '#161b22', menuBarFg: '#c9d1d9', menuBarBorder: '#30363d',
      menuDropdownBg: '#0d1117', menuDropdownFg: '#c9d1d9', menuDropdownHover: '#161b22', menuDropdownBorder: '#30363d',
      headerBg: '#161b22', headerFg: '#c9d1d9', headerBorder: '#30363d',
      sidebarBg: '#0d1117', sidebarFg: '#c9d1d9', sidebarBorder: '#30363d', sidebarItemHover: '#161b22', sidebarItemSelected: '#21262d',
      editorBg: '#0d1117', editorFg: '#c9d1d9',
      aiPanelBg: '#0d1117', aiPanelFg: '#c9d1d9', aiPanelBorder: '#30363d', aiMessageBg: '#161b22', aiInputBg: '#0d1117', aiInputFg: '#c9d1d9', aiInputBorder: '#30363d',
      terminalBg: '#0d1117', terminalFg: '#c9d1d9', terminalBorder: '#30363d',
      dialogBg: '#0d1117', dialogFg: '#c9d1d9', dialogBorder: '#30363d', dialogHeaderBg: '#161b22',
      buttonBg: '#21262d', buttonFg: '#c9d1d9', buttonHover: '#30363d', buttonPrimaryBg: '#58a6ff', buttonPrimaryFg: '#0d1117',
      inputBg: '#0d1117', inputFg: '#c9d1d9', inputBorder: '#30363d', inputFocusBorder: '#58a6ff',
      tabBg: '#161b22', tabFg: '#8b949e', tabActiveBg: '#0d1117', tabActiveFg: '#c9d1d9', tabBorder: '#30363d',
      statusBarBg: '#161b22', statusBarFg: '#c9d1d9', statusBarBorder: '#30363d',
    }
  },
  {
    id: 'github-light',
    name: 'GitHub Light',
    colors: {
      bg: '#ffffff', fg: '#24292e', accent: '#0366d6',
      menuBarBg: '#f6f8fa', menuBarFg: '#24292e', menuBarBorder: '#d1d9e0',
      menuDropdownBg: '#ffffff', menuDropdownFg: '#24292e', menuDropdownHover: '#f6f8fa', menuDropdownBorder: '#d1d9e0',
      headerBg: '#f6f8fa', headerFg: '#24292e', headerBorder: '#d1d9e0',
      sidebarBg: '#ffffff', sidebarFg: '#24292e', sidebarBorder: '#d1d9e0', sidebarItemHover: '#f6f8fa', sidebarItemSelected: '#e1e4e8',
      editorBg: '#ffffff', editorFg: '#24292e',
      aiPanelBg: '#ffffff', aiPanelFg: '#24292e', aiPanelBorder: '#d1d9e0', aiMessageBg: '#f6f8fa', aiInputBg: '#ffffff', aiInputFg: '#24292e', aiInputBorder: '#d1d9e0',
      terminalBg: '#ffffff', terminalFg: '#24292e', terminalBorder: '#d1d9e0',
      dialogBg: '#ffffff', dialogFg: '#24292e', dialogBorder: '#d1d9e0', dialogHeaderBg: '#f6f8fa',
      buttonBg: '#f6f8fa', buttonFg: '#24292e', buttonHover: '#e1e4e8', buttonPrimaryBg: '#0366d6', buttonPrimaryFg: '#ffffff',
      inputBg: '#ffffff', inputFg: '#24292e', inputBorder: '#d1d9e0', inputFocusBorder: '#0366d6',
      tabBg: '#f6f8fa', tabFg: '#586069', tabActiveBg: '#ffffff', tabActiveFg: '#24292e', tabBorder: '#d1d9e0',
      statusBarBg: '#f6f8fa', statusBarFg: '#24292e', statusBarBorder: '#d1d9e0',
    }
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    colors: {
      bg: '#1a1b26', fg: '#a9b1d6', accent: '#7aa2f7',
      menuBarBg: '#24283b', menuBarFg: '#a9b1d6', menuBarBorder: '#2f3549',
      menuDropdownBg: '#1a1b26', menuDropdownFg: '#a9b1d6', menuDropdownHover: '#24283b', menuDropdownBorder: '#2f3549',
      headerBg: '#24283b', headerFg: '#a9b1d6', headerBorder: '#2f3549',
      sidebarBg: '#1a1b26', sidebarFg: '#a9b1d6', sidebarBorder: '#2f3549', sidebarItemHover: '#24283b', sidebarItemSelected: '#2f3549',
      editorBg: '#1a1b26', editorFg: '#a9b1d6',
      aiPanelBg: '#1a1b26', aiPanelFg: '#a9b1d6', aiPanelBorder: '#2f3549', aiMessageBg: '#24283b', aiInputBg: '#1a1b26', aiInputFg: '#a9b1d6', aiInputBorder: '#2f3549',
      terminalBg: '#1a1b26', terminalFg: '#a9b1d6', terminalBorder: '#2f3549',
      dialogBg: '#1a1b26', dialogFg: '#a9b1d6', dialogBorder: '#2f3549', dialogHeaderBg: '#24283b',
      buttonBg: '#24283b', buttonFg: '#a9b1d6', buttonHover: '#2f3549', buttonPrimaryBg: '#7aa2f7', buttonPrimaryFg: '#1a1b26',
      inputBg: '#1a1b26', inputFg: '#a9b1d6', inputBorder: '#2f3549', inputFocusBorder: '#7aa2f7',
      tabBg: '#24283b', tabFg: '#565f89', tabActiveBg: '#1a1b26', tabActiveFg: '#a9b1d6', tabBorder: '#2f3549',
      statusBarBg: '#24283b', statusBarFg: '#a9b1d6', statusBarBorder: '#2f3549',
    }
  },
  {
    id: 'macos-dark',
    name: 'macOS Dark',
    colors: {
      bg: '#1e1e1e', fg: '#e5e5e5', accent: '#007aff',
      menuBarBg: '#2c2c2e', menuBarFg: '#e5e5e5', menuBarBorder: '#3a3a3c',
      menuDropdownBg: '#2c2c2e', menuDropdownFg: '#e5e5e5', menuDropdownHover: '#3a3a3c', menuDropdownBorder: '#48484a',
      headerBg: '#2c2c2e', headerFg: '#e5e5e5', headerBorder: '#3a3a3c',
      sidebarBg: '#1e1e1e', sidebarFg: '#e5e5e5', sidebarBorder: '#3a3a3c', sidebarItemHover: '#2c2c2e', sidebarItemSelected: '#3a3a3c',
      editorBg: '#1e1e1e', editorFg: '#e5e5e5',
      aiPanelBg: '#2c2c2e', aiPanelFg: '#e5e5e5', aiPanelBorder: '#3a3a3c', aiMessageBg: '#1e1e1e', aiInputBg: '#1e1e1e', aiInputFg: '#e5e5e5', aiInputBorder: '#3a3a3c',
      terminalBg: '#1e1e1e', terminalFg: '#e5e5e5', terminalBorder: '#3a3a3c',
      dialogBg: '#2c2c2e', dialogFg: '#e5e5e5', dialogBorder: '#3a3a3c', dialogHeaderBg: '#2c2c2e',
      buttonBg: '#3a3a3c', buttonFg: '#e5e5e5', buttonHover: '#48484a', buttonPrimaryBg: '#007aff', buttonPrimaryFg: '#ffffff',
      inputBg: '#1e1e1e', inputFg: '#e5e5e5', inputBorder: '#3a3a3c', inputFocusBorder: '#007aff',
      tabBg: '#2c2c2e', tabFg: '#98989d', tabActiveBg: '#1e1e1e', tabActiveFg: '#e5e5e5', tabBorder: '#3a3a3c',
      statusBarBg: '#2c2c2e', statusBarFg: '#e5e5e5', statusBarBorder: '#3a3a3c',
    }
  },
  {
    id: 'macos-light',
    name: 'macOS Light',
    colors: {
      bg: '#ffffff', fg: '#000000', accent: '#007aff',
      menuBarBg: '#f5f5f7', menuBarFg: '#000000', menuBarBorder: '#e5e5ea',
      menuDropdownBg: '#ffffff', menuDropdownFg: '#000000', menuDropdownHover: '#f5f5f7', menuDropdownBorder: '#e5e5ea',
      headerBg: '#f5f5f7', headerFg: '#000000', headerBorder: '#e5e5ea',
      sidebarBg: '#f5f5f7', sidebarFg: '#000000', sidebarBorder: '#e5e5ea', sidebarItemHover: '#e5e5ea', sidebarItemSelected: '#d1d1d6',
      editorBg: '#ffffff', editorFg: '#000000',
      aiPanelBg: '#ffffff', aiPanelFg: '#000000', aiPanelBorder: '#e5e5ea', aiMessageBg: '#f5f5f7', aiInputBg: '#ffffff', aiInputFg: '#000000', aiInputBorder: '#e5e5ea',
      terminalBg: '#ffffff', terminalFg: '#000000', terminalBorder: '#e5e5ea',
      dialogBg: '#ffffff', dialogFg: '#000000', dialogBorder: '#e5e5ea', dialogHeaderBg: '#f5f5f7',
      buttonBg: '#e5e5ea', buttonFg: '#000000', buttonHover: '#d1d1d6', buttonPrimaryBg: '#007aff', buttonPrimaryFg: '#ffffff',
      inputBg: '#ffffff', inputFg: '#000000', inputBorder: '#e5e5ea', inputFocusBorder: '#007aff',
      tabBg: '#f5f5f7', tabFg: '#8e8e93', tabActiveBg: '#ffffff', tabActiveFg: '#000000', tabBorder: '#e5e5ea',
      statusBarBg: '#f5f5f7', statusBarFg: '#000000', statusBarBorder: '#e5e5ea',
    }
  },
  {
    id: 'windows-dark',
    name: 'Windows Dark',
    colors: {
      bg: '#202020', fg: '#cccccc', accent: '#0078d4',
      menuBarBg: '#2d2d30', menuBarFg: '#cccccc', menuBarBorder: '#3e3e42',
      menuDropdownBg: '#252526', menuDropdownFg: '#cccccc', menuDropdownHover: '#2a2d2e', menuDropdownBorder: '#3e3e42',
      headerBg: '#2d2d30', headerFg: '#cccccc', headerBorder: '#3e3e42',
      sidebarBg: '#252526', sidebarFg: '#cccccc', sidebarBorder: '#3e3e42', sidebarItemHover: '#2a2d2e', sidebarItemSelected: '#37373d',
      editorBg: '#202020', editorFg: '#cccccc',
      aiPanelBg: '#252526', aiPanelFg: '#cccccc', aiPanelBorder: '#3e3e42', aiMessageBg: '#2a2d2e', aiInputBg: '#1e1e1e', aiInputFg: '#cccccc', aiInputBorder: '#3e3e42',
      terminalBg: '#202020', terminalFg: '#cccccc', terminalBorder: '#3e3e42',
      dialogBg: '#252526', dialogFg: '#cccccc', dialogBorder: '#3e3e42', dialogHeaderBg: '#2d2d30',
      buttonBg: '#37373d', buttonFg: '#cccccc', buttonHover: '#454545', buttonPrimaryBg: '#0078d4', buttonPrimaryFg: '#ffffff',
      inputBg: '#1e1e1e', inputFg: '#cccccc', inputBorder: '#3e3e42', inputFocusBorder: '#0078d4',
      tabBg: '#2d2d30', tabFg: '#969696', tabActiveBg: '#202020', tabActiveFg: '#cccccc', tabBorder: '#3e3e42',
      statusBarBg: '#2d2d30', statusBarFg: '#cccccc', statusBarBorder: '#3e3e42',
    }
  },
  {
    id: 'windows-light',
    name: 'Windows Light',
    colors: {
      bg: '#ffffff', fg: '#000000', accent: '#0078d4',
      menuBarBg: '#f3f3f3', menuBarFg: '#000000', menuBarBorder: '#e1e1e1',
      menuDropdownBg: '#ffffff', menuDropdownFg: '#000000', menuDropdownHover: '#f3f3f3', menuDropdownBorder: '#e1e1e1',
      headerBg: '#f3f3f3', headerFg: '#000000', headerBorder: '#e1e1e1',
      sidebarBg: '#fafafa', sidebarFg: '#000000', sidebarBorder: '#e1e1e1', sidebarItemHover: '#f3f3f3', sidebarItemSelected: '#e1e1e1',
      editorBg: '#ffffff', editorFg: '#000000',
      aiPanelBg: '#ffffff', aiPanelFg: '#000000', aiPanelBorder: '#e1e1e1', aiMessageBg: '#fafafa', aiInputBg: '#ffffff', aiInputFg: '#000000', aiInputBorder: '#e1e1e1',
      terminalBg: '#ffffff', terminalFg: '#000000', terminalBorder: '#e1e1e1',
      dialogBg: '#ffffff', dialogFg: '#000000', dialogBorder: '#e1e1e1', dialogHeaderBg: '#f3f3f3',
      buttonBg: '#e1e1e1', buttonFg: '#000000', buttonHover: '#d1d1d1', buttonPrimaryBg: '#0078d4', buttonPrimaryFg: '#ffffff',
      inputBg: '#ffffff', inputFg: '#000000', inputBorder: '#e1e1e1', inputFocusBorder: '#0078d4',
      tabBg: '#f3f3f3', tabFg: '#666666', tabActiveBg: '#ffffff', tabActiveFg: '#000000', tabBorder: '#e1e1e1',
      statusBarBg: '#f3f3f3', statusBarFg: '#000000', statusBarBorder: '#e1e1e1',
    }
  },
  {
    id: 'linux-dark',
    name: 'Linux Dark',
    colors: {
      bg: '#2e3440', fg: '#d8dee9', accent: '#5e81ac',
      menuBarBg: '#3b4252', menuBarFg: '#d8dee9', menuBarBorder: '#434c5e',
      menuDropdownBg: '#2e3440', menuDropdownFg: '#d8dee9', menuDropdownHover: '#3b4252', menuDropdownBorder: '#434c5e',
      headerBg: '#3b4252', headerFg: '#d8dee9', headerBorder: '#434c5e',
      sidebarBg: '#2e3440', sidebarFg: '#d8dee9', sidebarBorder: '#434c5e', sidebarItemHover: '#3b4252', sidebarItemSelected: '#434c5e',
      editorBg: '#2e3440', editorFg: '#d8dee9',
      aiPanelBg: '#2e3440', aiPanelFg: '#d8dee9', aiPanelBorder: '#434c5e', aiMessageBg: '#3b4252', aiInputBg: '#2e3440', aiInputFg: '#d8dee9', aiInputBorder: '#434c5e',
      terminalBg: '#2e3440', terminalFg: '#d8dee9', terminalBorder: '#434c5e',
      dialogBg: '#2e3440', dialogFg: '#d8dee9', dialogBorder: '#434c5e', dialogHeaderBg: '#3b4252',
      buttonBg: '#3b4252', buttonFg: '#d8dee9', buttonHover: '#434c5e', buttonPrimaryBg: '#5e81ac', buttonPrimaryFg: '#2e3440',
      inputBg: '#2e3440', inputFg: '#d8dee9', inputBorder: '#434c5e', inputFocusBorder: '#5e81ac',
      tabBg: '#3b4252', tabFg: '#5e81ac', tabActiveBg: '#2e3440', tabActiveFg: '#d8dee9', tabBorder: '#434c5e',
      statusBarBg: '#3b4252', statusBarFg: '#d8dee9', statusBarBorder: '#434c5e',
    }
  },
  {
    id: 'linux-light',
    name: 'Linux Light',
    colors: {
      bg: '#eceff4', fg: '#2e3440', accent: '#5e81ac',
      menuBarBg: '#e5e9f0', menuBarFg: '#2e3440', menuBarBorder: '#d8dee9',
      menuDropdownBg: '#eceff4', menuDropdownFg: '#2e3440', menuDropdownHover: '#e5e9f0', menuDropdownBorder: '#d8dee9',
      headerBg: '#e5e9f0', headerFg: '#2e3440', headerBorder: '#d8dee9',
      sidebarBg: '#eceff4', sidebarFg: '#2e3440', sidebarBorder: '#d8dee9', sidebarItemHover: '#e5e9f0', sidebarItemSelected: '#d8dee9',
      editorBg: '#eceff4', editorFg: '#2e3440',
      aiPanelBg: '#eceff4', aiPanelFg: '#2e3440', aiPanelBorder: '#d8dee9', aiMessageBg: '#e5e9f0', aiInputBg: '#eceff4', aiInputFg: '#2e3440', aiInputBorder: '#d8dee9',
      terminalBg: '#eceff4', terminalFg: '#2e3440', terminalBorder: '#d8dee9',
      dialogBg: '#eceff4', dialogFg: '#2e3440', dialogBorder: '#d8dee9', dialogHeaderBg: '#e5e9f0',
      buttonBg: '#e5e9f0', buttonFg: '#2e3440', buttonHover: '#d8dee9', buttonPrimaryBg: '#5e81ac', buttonPrimaryFg: '#eceff4',
      inputBg: '#eceff4', inputFg: '#2e3440', inputBorder: '#d8dee9', inputFocusBorder: '#5e81ac',
      tabBg: '#e5e9f0', tabFg: '#4c566a', tabActiveBg: '#eceff4', tabActiveFg: '#2e3440', tabBorder: '#d8dee9',
      statusBarBg: '#e5e9f0', statusBarFg: '#2e3440', statusBarBorder: '#d8dee9',
    }
  },
]

// Function to apply theme colors as CSS variables
export const applyTheme = (themeId: string) => {
  const themeDef = AVAILABLE_THEMES.find(t => t.id === themeId) || AVAILABLE_THEMES[0]
  const colors = themeDef.colors
  
  const root = document.documentElement
  root.style.setProperty('--theme-bg', colors.bg)
  root.style.setProperty('--theme-fg', colors.fg)
  root.style.setProperty('--theme-accent', colors.accent)
  root.style.setProperty('--theme-menu-bar-bg', colors.menuBarBg)
  root.style.setProperty('--theme-menu-bar-fg', colors.menuBarFg)
  root.style.setProperty('--theme-menu-bar-border', colors.menuBarBorder)
  root.style.setProperty('--theme-menu-dropdown-bg', colors.menuDropdownBg)
  root.style.setProperty('--theme-menu-dropdown-fg', colors.menuDropdownFg)
  root.style.setProperty('--theme-menu-dropdown-hover', colors.menuDropdownHover)
  root.style.setProperty('--theme-menu-dropdown-border', colors.menuDropdownBorder)
  root.style.setProperty('--theme-header-bg', colors.headerBg)
  root.style.setProperty('--theme-header-fg', colors.headerFg)
  root.style.setProperty('--theme-header-border', colors.headerBorder)
  root.style.setProperty('--theme-sidebar-bg', colors.sidebarBg)
  root.style.setProperty('--theme-sidebar-fg', colors.sidebarFg)
  root.style.setProperty('--theme-sidebar-border', colors.sidebarBorder)
  root.style.setProperty('--theme-sidebar-item-hover', colors.sidebarItemHover)
  root.style.setProperty('--theme-sidebar-item-selected', colors.sidebarItemSelected)
  root.style.setProperty('--theme-editor-bg', colors.editorBg)
  root.style.setProperty('--theme-editor-fg', colors.editorFg)
  root.style.setProperty('--theme-ai-panel-bg', colors.aiPanelBg)
  root.style.setProperty('--theme-ai-panel-fg', colors.aiPanelFg)
  root.style.setProperty('--theme-ai-panel-border', colors.aiPanelBorder)
  root.style.setProperty('--theme-ai-message-bg', colors.aiMessageBg)
  root.style.setProperty('--theme-ai-input-bg', colors.aiInputBg)
  root.style.setProperty('--theme-ai-input-fg', colors.aiInputFg)
  root.style.setProperty('--theme-ai-input-border', colors.aiInputBorder)
  root.style.setProperty('--theme-terminal-bg', colors.terminalBg)
  root.style.setProperty('--theme-terminal-fg', colors.terminalFg)
  root.style.setProperty('--theme-terminal-border', colors.terminalBorder)
  root.style.setProperty('--theme-dialog-bg', colors.dialogBg)
  root.style.setProperty('--theme-dialog-fg', colors.dialogFg)
  root.style.setProperty('--theme-dialog-border', colors.dialogBorder)
  root.style.setProperty('--theme-dialog-header-bg', colors.dialogHeaderBg)
  root.style.setProperty('--theme-button-bg', colors.buttonBg)
  root.style.setProperty('--theme-button-fg', colors.buttonFg)
  root.style.setProperty('--theme-button-hover', colors.buttonHover)
  root.style.setProperty('--theme-button-primary-bg', colors.buttonPrimaryBg)
  root.style.setProperty('--theme-button-primary-fg', colors.buttonPrimaryFg)
  root.style.setProperty('--theme-input-bg', colors.inputBg)
  root.style.setProperty('--theme-input-fg', colors.inputFg)
  root.style.setProperty('--theme-input-border', colors.inputBorder)
  root.style.setProperty('--theme-input-focus-border', colors.inputFocusBorder)
  root.style.setProperty('--theme-tab-bg', colors.tabBg)
  root.style.setProperty('--theme-tab-fg', colors.tabFg)
  root.style.setProperty('--theme-tab-active-bg', colors.tabActiveBg)
  root.style.setProperty('--theme-tab-active-fg', colors.tabActiveFg)
  root.style.setProperty('--theme-tab-border', colors.tabBorder)
  root.style.setProperty('--theme-status-bar-bg', colors.statusBarBg)
  root.style.setProperty('--theme-status-bar-fg', colors.statusBarFg)
  root.style.setProperty('--theme-status-bar-border', colors.statusBarBorder)
  
  // Semantic colors for success, error, warning
  root.style.setProperty('--theme-success', '#4caf50')
  root.style.setProperty('--theme-success-hover', '#45a049')
  root.style.setProperty('--theme-error', '#f44336')
  root.style.setProperty('--theme-warning', '#ffc107')
  root.style.setProperty('--theme-accent-light', '#4ec9b0')
  
  // Additional theme variables
  root.style.setProperty('--theme-border', colors.menuBarBorder)
  root.style.setProperty('--theme-item-bg', colors.menuBarBg)
  root.style.setProperty('--theme-fg-secondary', '#858585')
}
