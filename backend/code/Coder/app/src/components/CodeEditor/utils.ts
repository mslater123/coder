import type { FileNode, ParsedAIResponse, FileOperation } from './types'

// Check if a file should be completely excluded from the file tree
export const shouldSkipFile = (filePath: string, fileName: string): boolean => {
  const lowerPath = filePath.toLowerCase()
  const lowerName = fileName.toLowerCase()
  
  // Skip __pycache__ folders entirely
  if (lowerName === '__pycache__' || lowerPath.includes('/__pycache__/')) {
    return true
  }
  
  // Skip Python cache files entirely
  if (lowerName.endsWith('.pyc') || lowerName.endsWith('.pyo') || lowerName.endsWith('.pyd')) {
    return true
  }
  
  // Skip other cache/temp files entirely
  const skipExtensions = [
    '.cache', // Generic cache
    '.swp', '.swo', '.tmp', // Editor temp files
    '.DS_Store', // macOS
    '.Thumbs.db', // Windows
  ]
  
  const ext = lowerName.split('.').pop() || ''
  if (skipExtensions.some(skipExt => lowerName.endsWith(skipExt))) {
    return true
  }
  
  // Skip node_modules (should be handled separately, but just in case)
  if (lowerPath.includes('/node_modules/')) {
    return true
  }
  
  return false
}

// Check if a file should be skipped when reading content (binary files that can't be read as text)
export const shouldSkipReadingFile = (filePath: string, fileName: string): boolean => {
  const lowerPath = filePath.toLowerCase()
  const lowerName = fileName.toLowerCase()
  
  // First check if file should be completely skipped
  if (shouldSkipFile(filePath, fileName)) {
    return true
  }
  
  // Skip binary/executable files (but show them in explorer)
  const binaryExtensions = [
    // Images
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.ico', '.webp', '.tiff', '.tif',
    // Executables
    '.exe', '.bin', '.so', '.dylib', '.dll', '.o', '.obj',
    // Python cache (already handled, but double-check)
    '.pyc', '.pyo', '.pyd',
    // Compiled
    '.class', // Java
    // Archives
    '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar',
    // Media
    '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv',
    '.wav', '.ogg', '.flac', '.aac',
    // Fonts
    '.ttf', '.otf', '.woff', '.woff2', '.eot',
    // Documents (binary formats)
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  ]
  
  const ext = lowerName.split('.').pop() || ''
  if (binaryExtensions.some(binExt => lowerName.endsWith(binExt))) {
    return true
  }
  
  // Skip files without extensions that might be executables (like 'python', 'python3.12')
  // Check if it's in a bin directory
  if (lowerPath.includes('/bin/')) {
    // Skip if no extension OR if it's a versioned executable (like python3.12, node18, etc.)
    if (!lowerName.includes('.')) {
      return true
    }
    // Check for versioned executables (e.g., python3.12, node18.0.0)
    // These have dots but are still executables
    const versionedExecutablePattern = /^(python|python2|python3|node|npm|pip|pip3|pip2|ruby|perl|java|javac|gcc|g\+\+|clang|clang\+\+)[\d.]*$/
    if (versionedExecutablePattern.test(lowerName)) {
      return true
    }
  }
  
  // Skip files that are likely executables (no extension, common executable names)
  const executableNames = ['python', 'python3', 'python2', 'node', 'npm', 'pip', 'pip3', 'pip2', 'ruby', 'perl', 'java', 'javac', 'gcc', 'g++', 'clang', 'clang++']
  if (!lowerName.includes('.')) {
    // Check if it starts with an executable name
    if (executableNames.some(name => lowerName === name || lowerName.startsWith(name))) {
      return true
    }
  } else {
    // Check for versioned executables even outside /bin/
    const versionedExecutablePattern = /^(python|python2|python3|node|npm|pip|pip3|pip2|ruby|perl|java|javac|gcc|g\+\+|clang|clang\+\+)[\d.]*$/
    if (versionedExecutablePattern.test(lowerName)) {
      return true
    }
  }
  
  return false
}

// Diff line type for showing changes
export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'context'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

// Compute line-by-line diff between old and new content
export const computeDiff = (oldContent: string, newContent: string): DiffLine[] => {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  const diff: DiffLine[] = []
  
  // Simple line-by-line comparison
  // For a more sophisticated diff, we could use a library like 'diff' or 'diff-match-patch'
  const maxLen = Math.max(oldLines.length, newLines.length)
  
  let oldIndex = 0
  let newIndex = 0
  
  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    const oldLine = oldIndex < oldLines.length ? oldLines[oldIndex] : null
    const newLine = newIndex < newLines.length ? newLines[newIndex] : null
    
    if (oldLine === newLine) {
      // Lines match
      diff.push({
        type: 'unchanged',
        content: oldLine || newLine || '',
        oldLineNumber: oldIndex + 1,
        newLineNumber: newIndex + 1
      })
      oldIndex++
      newIndex++
    } else if (oldLine === null) {
      // Only new line exists (addition)
      diff.push({
        type: 'added',
        content: newLine || '',
        newLineNumber: newIndex + 1
      })
      newIndex++
    } else if (newLine === null) {
      // Only old line exists (deletion)
      diff.push({
        type: 'removed',
        content: oldLine,
        oldLineNumber: oldIndex + 1
      })
      oldIndex++
    } else {
      // Lines differ - check if it's a simple addition/deletion or a change
      // Look ahead to see if we can match lines
      let foundMatch = false
      let lookAhead = 1
      const maxLookAhead = Math.min(5, Math.max(oldLines.length - oldIndex, newLines.length - newIndex))
      
      // Check if the new line appears later in old content
      for (let i = oldIndex + 1; i < Math.min(oldIndex + maxLookAhead + 1, oldLines.length); i++) {
        if (oldLines[i] === newLine) {
          // Found match - mark intermediate lines as removed
          for (let j = oldIndex; j < i; j++) {
            diff.push({
              type: 'removed',
              content: oldLines[j],
              oldLineNumber: j + 1
            })
          }
          oldIndex = i
          foundMatch = true
          break
        }
      }
      
      // Check if the old line appears later in new content
      if (!foundMatch) {
        for (let i = newIndex + 1; i < Math.min(newIndex + maxLookAhead + 1, newLines.length); i++) {
          if (newLines[i] === oldLine) {
            // Found match - mark intermediate lines as added
            for (let j = newIndex; j < i; j++) {
              diff.push({
                type: 'added',
                content: newLines[j],
                newLineNumber: j + 1
              })
            }
            newIndex = i
            foundMatch = true
            break
          }
        }
      }
      
      if (!foundMatch) {
        // No match found - treat as change (removed + added)
        diff.push({
          type: 'removed',
          content: oldLine,
          oldLineNumber: oldIndex + 1
        })
        diff.push({
          type: 'added',
          content: newLine,
          newLineNumber: newIndex + 1
        })
        oldIndex++
        newIndex++
      }
    }
  }
  
  return diff
}

// Comprehensive language detection based on file extension
// Maps file extensions to Monaco Editor language IDs for proper syntax highlighting and error checking
export const detectLanguage = (filename: string): string => {
  if (!filename) return 'plaintext'
  
  // Get file extension (handle multiple dots like file.test.tsx)
  const parts = filename.toLowerCase().split('.')
  const ext = parts.length > 1 ? parts[parts.length - 1] : ''
  const baseName = filename.split('/').pop()?.toLowerCase() || ''
  
  // Debug: log detection (can be removed in production)
  if (typeof window !== 'undefined' && (window as any).__langDebug) {
    console.log(`[Lang Detect] File: ${filename}, Ext: ${ext}, BaseName: ${baseName}`)
  }
  
  // Monaco Editor language IDs - these must match Monaco's supported languages
  // Comprehensive mapping of file extensions to Monaco language IDs
  const langMap: Record<string, string> = {
    // JavaScript/TypeScript/React
    'js': 'javascript',
    'jsx': 'javascript', // React JSX files
    'mjs': 'javascript',
    'cjs': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript', // React TypeScript files
    'd.ts': 'typescript',
    'd.mts': 'typescript',
    'd.cts': 'typescript',
    'mts': 'typescript',
    'cts': 'typescript',
    
    // Python
    'py': 'python',
    'pyw': 'python',
    'pyi': 'python',
    'pyx': 'python',
    'pxd': 'python',
    'pxi': 'python',
    
    // Java
    'java': 'java',
    'class': 'java',
    'jar': 'java',
    
    // C/C++
    'c': 'c',
    'cpp': 'cpp',
    'cc': 'cpp',
    'cxx': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'hxx': 'cpp',
    
    // C#
    'cs': 'csharp',
    'csx': 'csharp',
    
    // Go
    'go': 'go',
    
    // Rust
    'rs': 'rust',
    
    // Ruby
    'rb': 'ruby',
    'rake': 'ruby',
    'gemspec': 'ruby',
    
    // PHP
    'php': 'php',
    'phtml': 'php',
    'php3': 'php',
    'php4': 'php',
    'php5': 'php',
    
    // Web
    'html': 'html',
    'htm': 'html',
    'xhtml': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    'styl': 'stylus',
    
    // JSON/YAML
    'json': 'json',
    'jsonc': 'jsonc',
    'yaml': 'yaml',
    'yml': 'yaml',
    
    // Markdown
    'md': 'markdown',
    'markdown': 'markdown',
    'mdown': 'markdown',
    'mkd': 'markdown',
    
    // SQL
    'sql': 'sql',
    
    // Shell
    'sh': 'shellscript',
    'bash': 'shellscript',
    'zsh': 'shellscript',
    'fish': 'shellscript',
    'ps1': 'powershell',
    'bat': 'bat',
    'cmd': 'bat',
    
    // Config
    'xml': 'xml',
    'toml': 'toml',
    'ini': 'ini',
    'cfg': 'ini',
    'conf': 'ini',
    'properties': 'properties',
    
    // Vue/Svelte/Angular
    'vue': 'vue',
    'svelte': 'svelte',
    'ng': 'typescript', // Angular template files
    
    // Additional languages that Monaco supports
    'coffeescript': 'coffeescript',
    'litcoffee': 'coffeescript',
    'iced': 'coffeescript',
    
    // Other languages
    'dart': 'dart',
    'swift': 'swift',
    'kt': 'kotlin',
    'kts': 'kotlin',
    'scala': 'scala',
    'sc': 'scala',
    'clj': 'clojure',
    'cljs': 'clojure',
    'cljc': 'clojure',
    'edn': 'clojure',
    'hs': 'haskell',
    'lhs': 'haskell',
    'ml': 'ocaml',
    'mli': 'ocaml',
    'fs': 'fsharp',
    'fsi': 'fsharp',
    'fsx': 'fsharp',
    'ex': 'elixir',
    'exs': 'elixir',
    'erl': 'erlang',
    'hrl': 'erlang',
    'lua': 'lua',
    'r': 'r',
    'rdata': 'r',
    'rds': 'r',
    'rda': 'r',
    'pl': 'perl',
    'pm': 'perl',
    't': 'perl',
    'pod': 'perl',
    'vim': 'vim',
    'vimrc': 'vim',
    'lisp': 'lisp',
    'lsp': 'lisp',
    'el': 'lisp', // Emacs Lisp
    'rkt': 'racket',
    'rktl': 'racket',
    'jl': 'julia',
    'cr': 'crystal',
    'ecr': 'crystal',
    'nim': 'nim',
    'nims': 'nim',
    'zig': 'zig',
    'v': 'plaintext', // V language - not supported by Monaco, use plaintext
    'vh': 'plaintext',
    'sv': 'plaintext', // SystemVerilog - not supported by Monaco, use plaintext
    'svh': 'plaintext',
    'vhd': 'plaintext', // VHDL - not supported by Monaco, use plaintext
    'vhdl': 'plaintext',
    
    // Additional web technologies
    'jsm': 'javascript',
    'es6': 'javascript',
    'es': 'javascript',
    'coffee': 'coffeescript',
    'coffee.erb': 'coffeescript',
    'litcoffee': 'coffeescript',
    'iced': 'coffeescript',
    
    // Styling
    'styl': 'css', // Stylus - fallback to CSS for syntax highlighting
    'stylus': 'css',
    'postcss': 'css',
    'pcss': 'css',
    
    // Build tools and configs
    'gradle': 'plaintext', // Groovy - fallback to plaintext if not supported
    'groovy': 'plaintext',
    'gvy': 'plaintext',
    'gy': 'plaintext',
    'gsh': 'plaintext',
    'maven': 'xml',
    'pom': 'xml',
    
    // Database
    'sql': 'sql',
    'ddl': 'sql',
    'dml': 'sql',
    'pgsql': 'sql',
    'mysql': 'sql',
    'plsql': 'sql',
    
    // Documentation
    'rst': 'restructuredtext',
    'rest': 'restructuredtext',
    'tex': 'latex',
    'latex': 'latex',
    'ltx': 'latex',
    'bib': 'bibtex',
    'bibtex': 'bibtex',
    
    // Data formats
    'csv': 'csv',
    'tsv': 'csv',
    'xml': 'xml',
    'xsd': 'xml',
    'xsl': 'xml',
    'xslt': 'xml',
    'rss': 'xml',
    'atom': 'xml',
    'xhtml': 'html',
    'htm': 'html',
    'shtml': 'html',
    
    // Configuration files
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    'lock': 'toml', // Cargo.lock, package-lock.json handled separately
    'ini': 'ini',
    'cfg': 'ini',
    'conf': 'ini',
    'config': 'ini',
    'properties': 'properties',
    'prop': 'properties',
    'editorconfig': 'ini',
    'gitconfig': 'ini',
    'gitignore': 'plaintext',
    'gitattributes': 'plaintext',
    'gitmodules': 'ini',
    
    // Shell scripts
    'sh': 'shellscript',
    'bash': 'shellscript',
    'zsh': 'shellscript',
    'fish': 'shellscript',
    'ksh': 'shellscript',
    'csh': 'shellscript',
    'tcsh': 'shellscript',
    'ps1': 'powershell',
    'psm1': 'powershell',
    'psd1': 'powershell',
    'ps1xml': 'xml',
    'bat': 'bat',
    'cmd': 'bat',
    'com': 'bat',
    
    // Docker and containers
    'dockerfile': 'dockerfile',
    'dockerignore': 'plaintext',
    
    // Make and build
    'makefile': 'plaintext', // Makefile - fallback to plaintext if not supported
    'make': 'plaintext',
    'mk': 'plaintext',
    'cmake': 'plaintext', // CMake - fallback to plaintext if not supported
    'cmakecache': 'plaintext',
    
    // Other configs
    'editorconfig': 'ini',
    'eslintrc': 'json',
    'eslintignore': 'plaintext',
    'prettierrc': 'json',
    'prettierignore': 'plaintext',
    'babelrc': 'json',
    'browserslistrc': 'plaintext',
    'browserslist': 'plaintext',
    'npmrc': 'ini',
    'npmignore': 'plaintext',
    'yarnrc': 'yaml',
    'yarnignore': 'plaintext',
    'pnpmfile': 'javascript',
    'commitlintrc': 'json',
    'stylelintrc': 'json',
    'stylelintignore': 'plaintext',
    'huskyrc': 'json',
    'lintstagedrc': 'json',
    'noderc': 'json',
    'nvmrc': 'plaintext',
    'nvm': 'plaintext',
    'node-version': 'plaintext',
    'python-version': 'plaintext',
    'ruby-version': 'plaintext',
    'php-version': 'plaintext',
    
    // Logs
    'log': 'log',
    'out': 'plaintext',
    'err': 'plaintext',
    
    // Text and misc
    'txt': 'plaintext',
    'text': 'plaintext',
    'readme': 'markdown',
    'changelog': 'markdown',
    'license': 'plaintext',
    'licence': 'plaintext',
    'authors': 'plaintext',
    'contributors': 'plaintext',
    'credits': 'plaintext',
    'copying': 'plaintext',
    'notice': 'plaintext',
    'todo': 'plaintext',
    'fixme': 'plaintext',
    'hack': 'plaintext',
    'xxx': 'plaintext',
    'note': 'plaintext',
  }
  
  // Check for special filenames first (case-insensitive matching)
  const specialFiles: Record<string, string> = {
    // Docker
    'dockerfile': 'plaintext', // Dockerfile syntax - Monaco may not support, use plaintext
    '.dockerignore': 'plaintext',
    'docker-compose.yml': 'yaml',
    'docker-compose.yaml': 'yaml',
    'docker-compose.override.yml': 'yaml',
    'docker-compose.override.yaml': 'yaml',
    
    // Build files
    'makefile': 'plaintext', // Makefile syntax - Monaco may not support, use plaintext
    'cmakelists.txt': 'plaintext', // CMake syntax - Monaco may not support, use plaintext
    'cmakecache.txt': 'plaintext',
    'build.gradle': 'plaintext', // Groovy syntax - Monaco may not support, use plaintext
    'build.gradle.kts': 'kotlin',
    'settings.gradle': 'plaintext', // Groovy syntax - Monaco may not support, use plaintext
    'settings.gradle.kts': 'kotlin',
    'gradle.properties': 'properties',
    'gradlew': 'shellscript',
    'gradlew.bat': 'bat',
    'mvnw': 'shellscript',
    'mvnw.cmd': 'bat',
    
    // Package managers
    'package.json': 'json',
    'package-lock.json': 'json',
    'yarn.lock': 'plaintext',
    'pnpm-lock.yaml': 'yaml',
    'composer.json': 'json',
    'composer.lock': 'json',
    'pom.xml': 'xml',
    'build.xml': 'xml',
    'cargo.toml': 'toml',
    'cargo.lock': 'toml',
    'go.mod': 'plaintext',
    'go.sum': 'plaintext',
    'requirements.txt': 'plaintext',
    'pipfile': 'toml',
    'pipfile.lock': 'json',
    'poetry.lock': 'plaintext',
    'pyproject.toml': 'toml',
    'setup.py': 'python',
    'setup.cfg': 'ini',
    'manifest.json': 'json',
    'pubspec.yaml': 'yaml',
    'pubspec.lock': 'yaml',
    'mix.exs': 'elixir',
    'mix.lock': 'plaintext',
    'rebar.config': 'erlang',
    'rebar.lock': 'plaintext',
    'project.clj': 'clojure',
    'deps.edn': 'clojure',
    'build.boot': 'clojure',
    'build.sbt': 'scala',
    'build.sc': 'scala',
    'project.scala': 'scala',
    'Gemfile': 'ruby',
    'Gemfile.lock': 'plaintext',
    'Rakefile': 'ruby',
    'rakefile': 'ruby',
    'Podfile': 'ruby',
    'Podfile.lock': 'plaintext',
    'Cartfile': 'plaintext',
    'Cartfile.resolved': 'plaintext',
    'Package.swift': 'swift',
    'Package.resolved': 'json',
    'Podspec': 'ruby',
    'xcodeproj': 'plaintext',
    'xcworkspace': 'plaintext',
    
    // Config files
    'tsconfig.json': 'json',
    'tsconfig.base.json': 'json',
    'jsconfig.json': 'json',
    'webpack.config.js': 'javascript',
    'webpack.config.ts': 'typescript',
    'webpack.config.babel.js': 'javascript',
    'webpack.config.babel.ts': 'typescript',
    'rollup.config.js': 'javascript',
    'rollup.config.ts': 'typescript',
    'vite.config.js': 'javascript',
    'vite.config.ts': 'typescript',
    'vite.config.mjs': 'javascript',
    'vite.config.cjs': 'javascript',
    'next.config.js': 'javascript',
    'next.config.ts': 'typescript',
    'next.config.mjs': 'javascript',
    'nuxt.config.js': 'javascript',
    'nuxt.config.ts': 'typescript',
    'nuxt.config.ts': 'typescript',
    'angular.json': 'json',
    'nest-cli.json': 'json',
    'nest-cli.json': 'json',
    'svelte.config.js': 'javascript',
    'svelte.config.ts': 'typescript',
    'tailwind.config.js': 'javascript',
    'tailwind.config.ts': 'typescript',
    'tailwind.config.cjs': 'javascript',
    'postcss.config.js': 'javascript',
    'postcss.config.ts': 'typescript',
    'postcss.config.cjs': 'javascript',
    'babel.config.js': 'javascript',
    'babel.config.json': 'json',
    'babel.config.cjs': 'javascript',
    'babel.config.mjs': 'javascript',
    '.babelrc': 'json',
    '.babelrc.js': 'javascript',
    '.babelrc.json': 'json',
    '.babelrc.cjs': 'javascript',
    '.babelrc.mjs': 'javascript',
    '.eslintrc': 'json',
    '.eslintrc.js': 'javascript',
    '.eslintrc.json': 'json',
    '.eslintrc.yml': 'yaml',
    '.eslintrc.yaml': 'yaml',
    '.eslintignore': 'plaintext',
    '.prettierrc': 'json',
    '.prettierrc.js': 'javascript',
    '.prettierrc.json': 'json',
    '.prettierrc.yml': 'yaml',
    '.prettierrc.yaml': 'yaml',
    '.prettierignore': 'plaintext',
    '.stylelintrc': 'json',
    '.stylelintrc.js': 'javascript',
    '.stylelintrc.json': 'json',
    '.stylelintrc.yml': 'yaml',
    '.stylelintrc.yaml': 'yaml',
    '.stylelintignore': 'plaintext',
    '.editorconfig': 'ini',
    '.gitignore': 'plaintext',
    '.gitattributes': 'plaintext',
    '.gitconfig': 'ini',
    '.gitmodules': 'ini',
    '.gitkeep': 'plaintext',
    '.npmrc': 'ini',
    '.npmignore': 'plaintext',
    '.yarnrc': 'yaml',
    '.yarnrc.yml': 'yaml',
    '.yarnignore': 'plaintext',
    '.nvmrc': 'plaintext',
    '.node-version': 'plaintext',
    '.python-version': 'plaintext',
    '.ruby-version': 'plaintext',
    '.php-version': 'plaintext',
    '.env': 'plaintext',
    '.env.local': 'plaintext',
    '.env.development': 'plaintext',
    '.env.production': 'plaintext',
    '.env.test': 'plaintext',
    '.env.staging': 'plaintext',
    '.env.example': 'plaintext',
    '.env.template': 'plaintext',
    
    // Documentation
    'readme.md': 'markdown',
    'readme.txt': 'plaintext',
    'readme': 'markdown',
    'readme.rst': 'restructuredtext',
    'changelog.md': 'markdown',
    'changelog.txt': 'plaintext',
    'changelog': 'markdown',
    'changelog.rst': 'restructuredtext',
    'contributing.md': 'markdown',
    'contributing.txt': 'plaintext',
    'contributing': 'markdown',
    'license': 'plaintext',
    'licence': 'plaintext',
    'license.txt': 'plaintext',
    'licence.txt': 'plaintext',
    'license.md': 'markdown',
    'licence.md': 'markdown',
    'copying': 'plaintext',
    'authors': 'plaintext',
    'contributors': 'plaintext',
    'credits': 'plaintext',
    'notice': 'plaintext',
    'todo': 'plaintext',
    'fixme': 'plaintext',
    'hack': 'plaintext',
    'xxx': 'plaintext',
    'note': 'plaintext',
    
    // CI/CD
    '.github/workflows': 'yaml',
    '.gitlab-ci.yml': 'yaml',
    '.travis.yml': 'yaml',
    '.circleci/config.yml': 'yaml',
    'appveyor.yml': 'yaml',
    'azure-pipelines.yml': 'yaml',
    'jenkinsfile': 'groovy',
    'jenkinsfile.groovy': 'groovy',
    '.drone.yml': 'yaml',
    '.drone.yaml': 'yaml',
    'bitbucket-pipelines.yml': 'yaml',
    
    // Kubernetes
    'k8s.yml': 'yaml',
    'k8s.yaml': 'yaml',
    'kubernetes.yml': 'yaml',
    'kubernetes.yaml': 'yaml',
  }
  
  // Check exact filename matches (case-insensitive)
  const lowerBaseName = baseName.toLowerCase()
  if (specialFiles[lowerBaseName]) {
    return specialFiles[lowerBaseName]
  }
  
  // Check filename patterns (case-insensitive)
  if (lowerBaseName.startsWith('dockerfile')) {
    return 'plaintext' // Dockerfile - fallback to plaintext if not supported
  }
  if (lowerBaseName.startsWith('makefile')) {
    return 'plaintext' // Makefile - fallback to plaintext if not supported
  }
  if (lowerBaseName.startsWith('.env')) {
    return 'plaintext' // Environment files are typically plain text
  }
  if (lowerBaseName.startsWith('readme')) {
    // Check extension for readme files
    if (ext === 'md' || ext === 'markdown') return 'markdown'
    if (ext === 'rst' || ext === 'rest') return 'restructuredtext'
    if (ext === 'txt' || ext === 'text') return 'plaintext'
    return 'markdown' // Default to markdown
  }
  if (lowerBaseName.startsWith('changelog')) {
    if (ext === 'md' || ext === 'markdown') return 'markdown'
    if (ext === 'rst' || ext === 'rest') return 'restructuredtext'
    if (ext === 'txt' || ext === 'text') return 'plaintext'
    return 'markdown'
  }
  if (lowerBaseName.startsWith('license') || lowerBaseName.startsWith('licence')) {
    if (ext === 'md' || ext === 'markdown') return 'markdown'
    return 'plaintext'
  }
  if (lowerBaseName.startsWith('jenkinsfile')) {
    return 'plaintext' // Jenkinsfile (Groovy) - fallback to plaintext if not supported
  }
  if (lowerBaseName.includes('config') && (ext === 'js' || ext === 'ts' || ext === 'mjs' || ext === 'cjs')) {
    if (ext === 'ts' || ext === 'tsx') return 'typescript'
    return 'javascript'
  }
  
  // Check for multi-part extensions first (e.g., .d.ts, .test.js)
  // Reuse the parts variable already declared above
  if (parts.length > 2) {
    // Check two-part extensions (e.g., d.ts, test.js, config.js)
    const twoPartExt = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`
    if (langMap[twoPartExt]) {
      return langMap[twoPartExt]
    }
  }
  
  // Check single file extension
  if (ext && langMap[ext]) {
    return langMap[ext]
  }
  
  // Default to plaintext if no match
  return 'plaintext'
}

export const isCodeFile = (path: string): boolean => {
  const ext = path.split('.').pop()?.toLowerCase()
  const codeExtensions = [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'rb', 'php',
    'html', 'css', 'scss', 'sass', 'less', 'json', 'xml', 'yaml', 'yml', 'md', 'sql',
    'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd', 'vue', 'svelte', 'dart', 'swift',
    'kt', 'scala', 'clj', 'hs', 'ml', 'fs', 'ex', 'exs', 'erl', 'lua', 'r', 'm', 'mm',
    'pl', 'pm', 'tcl', 'vim', 'lisp', 'cl', 'rkt', 'jl', 'cr', 'nim', 'zig', 'v'
  ]
  return codeExtensions.includes(ext || '')
}

// Map file extensions to their expected languages
const extensionToLanguage: Record<string, string[]> = {
  'py': ['python'],
  'js': ['javascript'],
  'jsx': ['javascript'],
  'ts': ['typescript'],
  'tsx': ['typescript'],
  'java': ['java'],
  'cpp': ['cpp', 'c++'],
  'c': ['c'],
  'cs': ['csharp', 'c#'],
  'go': ['go'],
  'rs': ['rust'],
  'rb': ['ruby'],
  'php': ['php'],
  'html': ['html'],
  'css': ['css'],
  'scss': ['scss', 'sass'],
  'sass': ['sass', 'scss'],
  'less': ['less'],
  'json': ['json'],
  'xml': ['xml'],
  'yaml': ['yaml'],
  'yml': ['yaml'],
  'md': ['markdown'],
  'sql': ['sql'],
  'sh': ['shell', 'bash'],
  'bash': ['shell', 'bash'],
  'zsh': ['shell', 'zsh'],
  'fish': ['shell', 'fish'],
  'ps1': ['powershell'],
  'bat': ['batch'],
  'cmd': ['batch'],
  'vue': ['vue'],
  'svelte': ['svelte'],
  'dart': ['dart'],
  'swift': ['swift'],
  'kt': ['kotlin'],
  'scala': ['scala'],
  'clj': ['clojure'],
  'hs': ['haskell'],
  'ml': ['ocaml'],
  'fs': ['fsharp', 'f#'],
  'ex': ['elixir'],
  'exs': ['elixir'],
  'erl': ['erlang'],
  'lua': ['lua'],
  'r': ['r'],
  'm': ['objective-c', 'matlab'],
  'mm': ['objective-c++'],
  'pl': ['perl'],
  'pm': ['perl'],
  'tcl': ['tcl'],
  'vim': ['vim'],
  'lisp': ['lisp'],
  'cl': ['common-lisp'],
  'rkt': ['racket'],
  'jl': ['julia'],
  'cr': ['crystal'],
  'nim': ['nim'],
  'zig': ['zig'],
  'v': ['v']
}

export const validateLanguageMatchesFile = (filePath: string, codeLanguage?: string): boolean => {
  if (!codeLanguage) return true // No language specified, allow it
  
  const ext = filePath.split('.').pop()?.toLowerCase()
  if (!ext) return true // No extension, allow it
  
  const expectedLanguages = extensionToLanguage[ext]
  if (!expectedLanguages) return true // Unknown extension, allow it
  
  const normalizedCodeLang = codeLanguage.toLowerCase().trim()
  return expectedLanguages.some(lang => lang.toLowerCase() === normalizedCodeLang)
}

export const detectLanguageFromPath = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase()
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'cs': 'csharp',
    'go': 'go',
    'rs': 'rust',
    'rb': 'ruby',
    'php': 'php',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sql': 'sql',
    'sh': 'shell',
    'bash': 'shell'
  }
  return langMap[ext || ''] || 'plaintext'
}

// Get folder icon based on expanded state
export const getFolderIcon = (isExpanded: boolean): string => {
  return isExpanded ? 'codicon-folder-opened' : 'codicon-folder'
}

// VS Code file icon mapping - uses vscode-icons-js which provides exact VS Code icon theme mappings
// This matches VS Code's file icon associations exactly as defined in the vscode-icons extension
// which is the most popular icon theme for VS Code and matches VS Code's icon structure

import { getIconForFile, getIconForFolder, getIconForOpenFolder } from 'vscode-icons-js'

// Get VS Code icon name using vscode-icons-js library
// This library provides the exact same icon mappings as VS Code's vscode-icons extension
export const getFileIcon = (filename: string): string => {
  try {
    // Special case: Dockerfile should use the blue Docker icon, not the red docker-compose icon
    // Check for exact match first (case-insensitive)
    const baseName = filename.split('/').pop()?.toLowerCase() || ''
    if (baseName === 'dockerfile') {
      return 'file_type_docker.svg'
    }
    
    // Check for docker-compose files - these should use the red docker-compose icon
    if (baseName === 'docker-compose.yml' || baseName === 'docker-compose.yaml' ||
        baseName === 'compose.yml' || baseName === 'compose.yaml' ||
        baseName.startsWith('docker-compose.') || baseName.startsWith('compose.')) {
      // Use file_type_docker2.svg which is the red docker-compose icon in vscode-icons
      // This is different from file_type_docker.svg (blue Dockerfile icon)
      return 'file_type_docker2.svg'
    }
    
    const iconName = getIconForFile(filename)
    // vscode-icons-js returns icon names like 'file_type_js.svg', 'file_type_python.svg', etc.
    return iconName || 'default_file.svg'
  } catch (e) {
    console.warn('Failed to get icon for file:', filename, e)
    return 'default_file.svg'
  }
}

// Get the CDN URL for a VS Code icon
// Uses vscode-icons repository which contains the exact icons used in VS Code
export const getFileIconUrl = (filename: string): string => {
  const iconName = getFileIcon(filename)
  
  // Use jsdelivr CDN (fast and reliable)
  // The vscode-icons repository structure: https://github.com/vscode-icons/vscode-icons/tree/master/icons
  // CDN format: https://cdn.jsdelivr.net/gh/{user}/{repo}@{version}/{path}
  // Using @latest ensures we get the most recent icons
  const url = `https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@latest/icons/${iconName}`
  
  // Debug: log icon URLs to verify they're different for different file types
  // Enable with: window.__iconDebug = true in browser console
  if (typeof window !== 'undefined' && (window as any).__iconDebug) {
    console.log(`[Icon Debug] File: ${filename}, Icon: ${iconName}, URL: ${url}`)
  }
  
  return url
}

// Get folder icon URL - VS Code uses codicons for folders
export const getFolderIconUrl = (folderName: string, isExpanded: boolean): string => {
  let iconName: string
  try {
    iconName = isExpanded
      ? getIconForOpenFolder(folderName) || 'default_folder_opened.svg'
      : getIconForFolder(folderName) || 'default_folder.svg'
  } catch (e) {
    iconName = isExpanded ? 'default_folder_opened.svg' : 'default_folder.svg'
  }
  
    return `https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@latest/icons/${iconName}`
}

// Legacy function for backward compatibility - returns class names
export const getFileIconClass = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const baseName = filename.split('/').pop()?.toLowerCase() || ''
  
  // VS Code codicons mapping - matches VS Code's icon theme
  // Using codicon classes with file-type-specific classes for styling
  const icons: Record<string, string> = {
    // JavaScript/TypeScript
    'js': 'codicon-file-code file-icon-js',
    'jsx': 'codicon-file-code file-icon-jsx',
    'mjs': 'codicon-file-code file-icon-js',
    'cjs': 'codicon-file-code file-icon-js',
    'ts': 'codicon-file-code file-icon-ts',
    'tsx': 'codicon-file-code file-icon-tsx',
    'd.ts': 'codicon-file-code file-icon-ts',
    
    // Python
    'py': 'codicon-file-code file-icon-python',
    'pyw': 'codicon-file-code file-icon-python',
    'pyi': 'codicon-file-code file-icon-python',
    'pyc': 'codicon-file-code file-icon-python',
    'pyd': 'codicon-file-code file-icon-python',
    
    // Java
    'java': 'codicon-file-code file-icon-java',
    'class': 'codicon-file-code file-icon-java',
    'jar': 'codicon-file-code file-icon-java',
    
    // C/C++
    'c': 'codicon-file-code file-icon-c',
    'cpp': 'codicon-file-code file-icon-cpp',
    'cc': 'codicon-file-code file-icon-cpp',
    'cxx': 'codicon-file-code file-icon-cpp',
    'h': 'codicon-file-code file-icon-header',
    'hpp': 'codicon-file-code file-icon-header',
    'hxx': 'codicon-file-code file-icon-header',
    
    // C#
    'cs': 'codicon-file-code file-icon-csharp',
    'csx': 'codicon-file-code file-icon-csharp',
    
    // Go
    'go': 'codicon-file-code file-icon-go',
    
    // Rust
    'rs': 'codicon-file-code file-icon-rust',
    
    // Ruby
    'rb': 'codicon-file-code file-icon-ruby',
    'rake': 'codicon-file-code file-icon-ruby',
    
    // PHP
    'php': 'codicon-file-code file-icon-php',
    'phtml': 'codicon-file-code file-icon-php',
    
    // Web
    'html': 'codicon-file-code file-icon-html',
    'htm': 'codicon-file-code file-icon-html',
    'xhtml': 'codicon-file-code file-icon-html',
    'css': 'codicon-file-code file-icon-css',
    'scss': 'codicon-file-code file-icon-scss',
    'sass': 'codicon-file-code file-icon-sass',
    'less': 'codicon-file-code file-icon-less',
    'styl': 'codicon-file-code file-icon-stylus',
    
    // JSON/YAML
    'json': 'codicon-file-code file-icon-json',
    'jsonc': 'codicon-file-code file-icon-json',
    'yaml': 'codicon-file-code file-icon-yaml',
    'yml': 'codicon-file-code file-icon-yaml',
    
    // Markdown
    'md': 'codicon-markdown file-icon-markdown',
    'markdown': 'codicon-markdown file-icon-markdown',
    
    // SQL
    'sql': 'codicon-database file-icon-sql',
    'db': 'codicon-database file-icon-database',
    
    // Shell
    'sh': 'codicon-terminal file-icon-shell',
    'bash': 'codicon-terminal file-icon-bash',
    'zsh': 'codicon-terminal file-icon-zsh',
    'fish': 'codicon-terminal file-icon-fish',
    'ps1': 'codicon-terminal file-icon-powershell',
    'bat': 'codicon-terminal file-icon-batch',
    'cmd': 'codicon-terminal file-icon-batch',
    
    // Config
    'xml': 'codicon-file-code file-icon-xml',
    'toml': 'codicon-settings file-icon-toml',
    'ini': 'codicon-settings file-icon-ini',
    'cfg': 'codicon-settings file-icon-config',
    'conf': 'codicon-settings file-icon-config',
    
    // Vue/Svelte
    'vue': 'codicon-file-code file-icon-vue',
    'svelte': 'codicon-file-code file-icon-svelte',
    
    // Other languages
    'dart': 'codicon-file-code file-icon-dart',
    'swift': 'codicon-file-code file-icon-swift',
    'kt': 'codicon-file-code file-icon-kotlin',
    'scala': 'codicon-file-code file-icon-scala',
    'clj': 'codicon-file-code file-icon-clojure',
    'hs': 'codicon-file-code file-icon-haskell',
    'ml': 'codicon-file-code file-icon-ocaml',
    'fs': 'codicon-file-code file-icon-fsharp',
    'ex': 'codicon-file-code file-icon-elixir',
    'exs': 'codicon-file-code file-icon-elixir',
    'erl': 'codicon-file-code file-icon-erlang',
    'lua': 'codicon-file-code file-icon-lua',
    'r': 'codicon-file-code file-icon-r',
    'pl': 'codicon-file-code file-icon-perl',
    'pm': 'codicon-file-code file-icon-perl',
    'vim': 'codicon-file-code file-icon-vim',
    'lisp': 'codicon-file-code file-icon-lisp',
    'rkt': 'codicon-file-code file-icon-racket',
    'jl': 'codicon-file-code file-icon-julia',
    'cr': 'codicon-file-code file-icon-crystal',
    'nim': 'codicon-file-code file-icon-nim',
    'zig': 'codicon-file-code file-icon-zig',
    'v': 'codicon-file-code file-icon-v',
    
    // Images
    'png': 'codicon-file-media file-icon-image',
    'jpg': 'codicon-file-media file-icon-image',
    'jpeg': 'codicon-file-media file-icon-image',
    'gif': 'codicon-file-media file-icon-image',
    'svg': 'codicon-file-media file-icon-svg',
    'webp': 'codicon-file-media file-icon-image',
    'ico': 'codicon-file-media file-icon-image',
    
    // Documents
    'pdf': 'codicon-file-pdf file-icon-pdf',
    'doc': 'codicon-file file-icon-word',
    'docx': 'codicon-file file-icon-word',
    'xls': 'codicon-file file-icon-excel',
    'xlsx': 'codicon-file file-icon-excel',
    'ppt': 'codicon-file file-icon-powerpoint',
    'pptx': 'codicon-file file-icon-powerpoint',
    
    // Archives
    'zip': 'codicon-file-zip file-icon-archive',
    'tar': 'codicon-file-zip file-icon-archive',
    'gz': 'codicon-file-zip file-icon-archive',
    'rar': 'codicon-file-zip file-icon-archive',
    '7z': 'codicon-file-zip file-icon-archive',
    
    // Text
    'txt': 'codicon-file-text file-icon-text',
    'log': 'codicon-file-text file-icon-log',
  }
  
  // Special filenames (check exact matches first)
  const specialFiles: Record<string, string> = {
    'package.json': 'codicon-package file-icon-package',
    'package-lock.json': 'codicon-package file-icon-package',
    'yarn.lock': 'codicon-package file-icon-package',
    'pnpm-lock.yaml': 'codicon-package file-icon-package',
    'requirements.txt': 'codicon-package file-icon-package',
    'pom.xml': 'codicon-package file-icon-package',
    'build.gradle': 'codicon-package file-icon-package',
    'cargo.toml': 'codicon-package file-icon-package',
    'go.mod': 'codicon-package file-icon-package',
    'composer.json': 'codicon-package file-icon-package',
    'dockerfile': 'codicon-docker file-icon-docker',
    'docker-compose.yml': 'codicon-docker file-icon-docker',
    'docker-compose.yaml': 'codicon-docker file-icon-docker',
    '.gitignore': 'codicon-file file-icon-git',
    '.gitattributes': 'codicon-file file-icon-git',
    '.gitconfig': 'codicon-file file-icon-git',
    'readme.md': 'codicon-markdown file-icon-readme',
    'readme': 'codicon-markdown file-icon-readme',
    'license': 'codicon-file-text file-icon-license',
    'makefile': 'codicon-settings file-icon-makefile',
  }
  
  // Check special filenames first
  if (specialFiles[baseName]) {
    return specialFiles[baseName]
  }
  
  // Check if filename starts with special patterns
  if (baseName.startsWith('dockerfile')) {
    return 'codicon-docker file-icon-docker'
  }
  if (baseName.startsWith('readme')) {
    return 'codicon-markdown file-icon-readme'
  }
  if (baseName.startsWith('license')) {
    return 'codicon-file-text file-icon-license'
  }
  if (baseName.startsWith('makefile')) {
    return 'codicon-settings file-icon-makefile'
  }
  
  // Check file extensions
  if (ext && icons[ext]) {
    return icons[ext]
  }
  
  // Default file icon (matches VS Code's default file icon)
  return 'codicon-file'
}

export const findFileInArray = (nodes: FileNode[], path: string): FileNode | null => {
  for (const node of nodes) {
    if (node.path === path) return node
    if (node.children) {
      const found = findFileInArray(node.children, path)
      if (found) return found
    }
  }
  return null
}

export const findFirstFile = (nodes: FileNode[]): FileNode | null => {
  for (const node of nodes) {
    if (node.type === 'file') return node
    if (node.children) {
      const found = findFirstFile(node.children)
      if (found) return found
    }
  }
  return null
}

export const getAllFiles = (nodes: FileNode[]): FileNode[] => {
  const allFiles: FileNode[] = []
  nodes.forEach(node => {
    if (node.type === 'file') {
      allFiles.push(node)
    }
    if (node.children) {
      allFiles.push(...getAllFiles(node.children))
    }
  })
  return allFiles
}

export interface MessagePart {
  type: 'text' | 'code' | 'list' | 'table' | 'header' | 'blockquote' | 'hr'
  content: string
  language?: string
  listType?: 'bullet' | 'numbered'
  tableData?: Array<string[]>
  headerLevel?: number
}

export const parseMessageContent = (content: string): MessagePart[] => {
  const parts: MessagePart[] = []
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add content before code block
    if (match.index > lastIndex) {
      const textContent = content.substring(lastIndex, match.index)
      if (textContent.trim()) {
        parts.push(...parseTextContent(textContent))
      }
    }
    
    // Add code block
    const language = match[1] || ''
    const codeContent = match[2].trim()
    parts.push({ type: 'code', content: codeContent, language })
    
    lastIndex = match.index + match[0].length
  }
  
  // Add remaining content
  if (lastIndex < content.length) {
    const textContent = content.substring(lastIndex)
    if (textContent.trim()) {
      parts.push(...parseTextContent(textContent))
    }
  }
  
  // If no code blocks found, parse entire content as text
  if (parts.length === 0) {
    parts.push(...parseTextContent(content))
  }
  
  return parts
}

const parseTextContent = (text: string): MessagePart[] => {
  const parts: MessagePart[] = []
  const lines = text.split('\n')
  let currentText = ''
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmedLine = line.trim()

    // Check for markdown table
    if (trimmedLine.includes('|') && trimmedLine.split('|').length >= 3) {
      // Save any accumulated text
      if (currentText.trim()) {
        parts.push({ type: 'text', content: currentText.trim() })
        currentText = ''
      }

      // Parse table
      const tableData: Array<string[]> = []
      let headerRow: string[] | null = null
      let separatorRow = false

      // Collect table rows
      while (i < lines.length && lines[i].trim().includes('|')) {
        const row = lines[i].trim()
        if (row.match(/^\|[\s\-:]+\|$/)) {
          // This is a separator row, skip it
          separatorRow = true
          i++
          continue
        }

        const cells = row.split('|').map(c => c.trim()).filter(c => c)
        if (cells.length > 0) {
          if (!headerRow) {
            headerRow = cells
          } else {
            tableData.push(cells)
          }
        }
        i++
      }

      if (headerRow && tableData.length > 0) {
        // Add header as first row
        tableData.unshift(headerRow)
        parts.push({ type: 'table', content: '', tableData })
      } else if (headerRow) {
        // Single row table
        parts.push({ type: 'table', content: '', tableData: [headerRow] })
      }
      continue
    }

    // Check for headers (# ## ###)
    const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/)
    if (headerMatch) {
      if (currentText.trim()) {
        parts.push({ type: 'text', content: currentText.trim() })
        currentText = ''
      }
      parts.push({
        type: 'header',
        content: headerMatch[2],
        headerLevel: headerMatch[1].length
      })
      i++
      continue
    }

    // Check for lists
    const bulletListMatch = trimmedLine.match(/^[\*\-\•]\s+(.+)$/)
    const numberedListMatch = trimmedLine.match(/^\d+[\.\)]\s+(.+)$/)

    if (bulletListMatch || numberedListMatch) {
      // Save any accumulated text
      if (currentText.trim()) {
        parts.push({ type: 'text', content: currentText.trim() })
        currentText = ''
      }

      // Collect list items
      const listItems: string[] = []
      const listType = bulletListMatch ? 'bullet' : 'numbered'

      while (i < lines.length) {
        const currentLine = lines[i].trim()
        const bulletMatch = currentLine.match(/^[\*\-\•]\s+(.+)$/)
        const numberedMatch = currentLine.match(/^\d+[\.\)]\s+(.+)$/)

        if (bulletMatch && listType === 'bullet') {
          listItems.push(bulletMatch[1])
          i++
        } else if (numberedMatch && listType === 'numbered') {
          listItems.push(numberedMatch[1])
          i++
        } else if (currentLine === '') {
          // Empty line might be part of list or end of list
          i++
          // Check if next line continues the list
          if (i < lines.length) {
            const nextLine = lines[i].trim()
            if (nextLine.match(/^[\*\-\•]\s+/) || nextLine.match(/^\d+[\.\)]\s+/)) {
              continue
            }
          }
          break
        } else {
          break
        }
      }

      if (listItems.length > 0) {
        parts.push({
          type: 'list',
          content: listItems.join('\n'),
          listType
        })
      }
      continue
    }

    // Check for blockquote
    if (trimmedLine.startsWith('>')) {
      if (currentText.trim()) {
        parts.push({ type: 'text', content: currentText.trim() })
        currentText = ''
      }
      
      // Collect blockquote lines
      const blockquoteLines: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        blockquoteLines.push(lines[i].trim().substring(1).trim())
        i++
      }
      
      if (blockquoteLines.length > 0) {
        parts.push({
          type: 'blockquote',
          content: blockquoteLines.join('\n')
        })
      }
      continue
    }
    
    // Check for horizontal rule
    if (trimmedLine.match(/^[-*_]{3,}$/)) {
      if (currentText.trim()) {
        parts.push({ type: 'text', content: currentText.trim() })
        currentText = ''
      }
      parts.push({ type: 'hr', content: '' })
      i++
      continue
    }

    // Regular text line
    currentText += line + '\n'
    i++
  }

  // Add any remaining text
  if (currentText.trim()) {
    parts.push({ type: 'text', content: currentText.trim() })
  }

  return parts.length > 0 ? parts : [{ type: 'text', content: text.trim() }]
}

// Helper function to clean code content - removes thinking/metadata tags and extra text
const cleanCodeContent = (content: string): string => {
  if (!content) return ''
  
  let cleaned = content.trim()
  
  // Remove channel/constrain tags like <|channel|>final <|constrain|>file_file_operations<|message|>
  cleaned = cleaned.replace(/<\|[^|]+\|>/g, '').trim()
  
  // Remove JSON structure if the content is wrapped in JSON (but preserve the actual code content)
  // Only remove if it's clearly JSON structure, not code that happens to have braces
  if (cleaned.startsWith('{') && cleaned.includes('"content"') && cleaned.includes('"operations"')) {
    try {
      // Try to extract content from JSON structure
      const jsonMatch = cleaned.match(/"content"\s*:\s*"([^"]*)"|"content"\s*:\s*`([^`]*)`|"content"\s*:\s*"([\s\S]*?)"\s*[,}]/s)
      if (jsonMatch && (jsonMatch[1] || jsonMatch[2] || jsonMatch[3])) {
        cleaned = (jsonMatch[1] || jsonMatch[2] || jsonMatch[3] || '').replace(/\\n/g, '\n').replace(/\\"/g, '"')
      }
    } catch (e) {
      // Not valid JSON extraction, continue with original content
    }
  }
  
  // Remove obvious thinking/metadata lines only at the very beginning
  // Be very conservative - only remove lines that are clearly not code
  const lines = cleaned.split('\n')
  const codeLines: string[] = []
  let foundCodeStart = false
  let skipCount = 0
  const maxSkipLines = 5 // Only skip thinking lines at the very start
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()
    
    // Skip channel tags
    if (trimmed.includes('<|') && trimmed.includes('|>')) {
      continue
    }
    
    // Only skip obvious thinking patterns in the first few lines
    if (!foundCodeStart && skipCount < maxSkipLines) {
      // Very specific patterns that are clearly not code
      if (trimmed.match(/^(We don't have|Need to|Probably|Let's|Can't|Assume|We'll|Might be|Create tests folder|Add test_|But we don't|its adding|it only should)/i)) {
        skipCount++
        continue
      }
      
      // Skip lines that are pure JSON structure (not code)
      if (trimmed.match(/^[\{\}\[\]",:\s]+$/) && !trimmed.includes('"') && trimmed.length < 20) {
        skipCount++
        continue
      }
      
      // Skip JSON keys at the start
      if (trimmed.match(/^"(type|path|content|description|operations)"\s*:/) && !foundCodeStart) {
        skipCount++
        continue
      }
    }
    
    // Once we find code-like content, include everything
    if (trimmed && (
      trimmed.match(/^(import|from|def\s|class\s|if\s|for\s|while\s|#|\/\/|\/\*|function|const|let|var|export|return|console|print)/) ||
      trimmed.includes('=') ||
      trimmed.includes('(') ||
      trimmed.includes('[') ||
      trimmed.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*\s*[:=]/)
    )) {
      foundCodeStart = true
    }
    
    // If we've found code start or passed the skip threshold, include all lines
    if (foundCodeStart || skipCount >= maxSkipLines) {
      codeLines.push(line)
    } else if (trimmed && !trimmed.match(/^[<\{]/)) {
      // Include lines that don't look like metadata
      codeLines.push(line)
      foundCodeStart = true
    }
  }
  
  cleaned = codeLines.join('\n').trim()
  
  // Only remove JSON artifacts if they're clearly not part of the code
  // (e.g., standalone braces at start/end, not code that uses braces)
  if (cleaned.startsWith('{') && cleaned.endsWith('}') && cleaned.split('\n').length < 3) {
    // Might be JSON wrapper, try to extract content
    try {
      const parsed = JSON.parse(cleaned)
      if (parsed.content && typeof parsed.content === 'string') {
        cleaned = parsed.content
      }
    } catch (e) {
      // Not JSON, keep as is
    }
  }
  
  // Remove trailing commas only if they're clearly JSON artifacts (at end of line, not in code)
  cleaned = cleaned.replace(/,\s*$/, '').trim()
  
  return cleaned
}

// Analyze code patterns in existing codebase to maintain consistency
export const analyzeCodePatterns = (codebaseContext: any[], language: string): {
  indentation: 'tabs' | 'spaces' | 'mixed'
  indentSize: number
  quoteStyle: 'single' | 'double' | 'mixed'
  lineEnding: 'lf' | 'crlf' | 'mixed'
  namingConvention: 'camelCase' | 'snake_case' | 'PascalCase' | 'mixed'
  maxLineLength: number
} => {
  const patterns = {
    indentation: 'spaces' as 'tabs' | 'spaces' | 'mixed',
    indentSize: 2,
    quoteStyle: 'double' as 'single' | 'double' | 'mixed',
    lineEnding: 'lf' as 'lf' | 'crlf' | 'mixed',
    namingConvention: 'camelCase' as 'camelCase' | 'snake_case' | 'PascalCase' | 'mixed',
    maxLineLength: 80
  }
  
  // Analyze files of the same language
  const sameLangFiles = codebaseContext.filter(f =>
    f.language === language && f.content && f.content.length > 0
  ).slice(0, 10) // Sample first 10 files
  
  if (sameLangFiles.length === 0) return patterns
  
  // Analyze indentation
  const indentCounts: Record<string, number> = {}
  let tabCount = 0
  let spaceCount = 0
  
  sameLangFiles.forEach(file => {
    const lines = file.content.split('\n').slice(0, 50) // Sample first 50 lines
    lines.forEach(line => {
      if (line.trim().length === 0) return
      const match = line.match(/^(\s+)/)
      if (match) {
        const indent = match[1]
        if (indent.includes('\t')) tabCount++
        else {
          spaceCount++
          const size = indent.length
          indentCounts[size] = (indentCounts[size] || 0) + 1
        }
      }
    })
  })
  
  if (tabCount > spaceCount) {
    patterns.indentation = 'tabs'
  } else if (spaceCount > 0) {
    patterns.indentation = 'spaces'
    // Find most common indent size
    const mostCommon = Object.entries(indentCounts).sort((a, b) => b[1] - a[1])[0]
    if (mostCommon) {
      patterns.indentSize = parseInt(mostCommon[0])
    }
  }
  
  // Analyze quote style (for JS/TS/Python)
  if (['javascript', 'typescript', 'python'].includes(language)) {
    let singleQuotes = 0
    let doubleQuotes = 0
    
    sameLangFiles.forEach(file => {
      const content = file.content.substring(0, 5000) // Sample first 5000 chars
      singleQuotes += (content.match(/'/g) || []).length
      doubleQuotes += (content.match(/"/g) || []).length
    })
    
    if (singleQuotes > doubleQuotes * 1.2) {
      patterns.quoteStyle = 'single'
    } else if (doubleQuotes > singleQuotes * 1.2) {
      patterns.quoteStyle = 'double'
    } else {
      patterns.quoteStyle = 'mixed'
    }
  }
  
  // Analyze line endings
  let lfCount = 0
  let crlfCount = 0
  
  sameLangFiles.forEach(file => {
    const content = file.content.substring(0, 10000) // Sample
    lfCount += (content.match(/\n(?!\r)/g) || []).length
    crlfCount += (content.match(/\r\n/g) || []).length
  })
  
  if (crlfCount > lfCount) {
    patterns.lineEnding = 'crlf'
  } else {
    patterns.lineEnding = 'lf'
  }
  
  // Analyze naming convention (sample function/variable names)
  if (['javascript', 'typescript', 'python'].includes(language)) {
    const names: string[] = []
    sameLangFiles.forEach(file => {
      const content = file.content.substring(0, 5000)
      // Extract function/variable names
      const functionMatches = content.match(/(?:function|const|let|var|def|class)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g)
      if (functionMatches) {
        functionMatches.forEach(match => {
          const name = match.split(/\s+/).pop()
          if (name) names.push(name)
        })
      }
    })
    
    if (names.length > 0) {
      const camelCase = names.filter(n => /^[a-z][a-zA-Z0-9]*$/.test(n)).length
      const snakeCase = names.filter(n => /^[a-z_][a-z0-9_]*$/.test(n)).length
      const PascalCase = names.filter(n => /^[A-Z][a-zA-Z0-9]*$/.test(n)).length
      
      if (camelCase > snakeCase && camelCase > PascalCase) {
        patterns.namingConvention = 'camelCase'
      } else if (snakeCase > camelCase && snakeCase > PascalCase) {
        patterns.namingConvention = 'snake_case'
      } else if (PascalCase > camelCase && PascalCase > snakeCase) {
        patterns.namingConvention = 'PascalCase'
      } else {
        patterns.namingConvention = 'mixed'
      }
    }
  }
  
  // Analyze max line length
  let maxLen = 0
  sameLangFiles.forEach(file => {
    const lines = file.content.split('\n')
    lines.forEach(line => {
      if (line.length > maxLen) maxLen = line.length
    })
  })
  patterns.maxLineLength = Math.min(120, Math.max(80, Math.round(maxLen / 10) * 10))
  
  return patterns
}

// Validate file operation quality and correctness
export const validateFileOperation = (operation: FileOperation, findFile: (path: string) => FileNode | null): {
  isValid: boolean
  warnings: string[]
  errors: string[]
} => {
  const warnings: string[] = []
  const errors: string[] = []
  
  // Validate path
  if (!operation.path || operation.path.trim() === '') {
    errors.push('File path is required')
  } else {
    // Check for invalid path characters
    if (operation.path.includes('..') || operation.path.includes('//')) {
      errors.push('Invalid file path: contains unsafe characters')
    }
    
    // Check if path is absolute (should be relative to project root)
    if (operation.path.startsWith('/') && !operation.path.startsWith('/Coder/')) {
      warnings.push('Path appears to be absolute - ensure it\'s relative to project root')
    }
  }
  
  // Validate operation type
  if (!['create', 'edit', 'delete'].includes(operation.type)) {
    errors.push(`Invalid operation type: ${operation.type}. Must be 'create', 'edit', or 'delete'`)
  }
  
  // Validate content based on operation type
  if (operation.type === 'delete') {
    // Delete operations don't need content
    if (operation.content && operation.content.trim() !== '') {
      warnings.push('Delete operation should not have content')
    }
  } else if (operation.type === 'create' || operation.type === 'edit') {
    // Create and edit operations need content
    if (!operation.content || operation.content.trim() === '') {
      warnings.push('Operation has empty content - ensure this is intentional')
    }
    
    // Validate language matches file extension
    const detectedLang = detectLanguageFromPath(operation.path)
    if (operation.language && operation.language !== detectedLang && detectedLang !== 'plaintext') {
      warnings.push(`Language mismatch: file extension suggests '${detectedLang}' but operation specifies '${operation.language}'`)
    }
    
    // Basic syntax checks for common languages
    if (operation.content) {
      const content = operation.content.trim()
      
      // Python-specific checks
      if (operation.path.endsWith('.py') || detectedLang === 'python') {
        // Check for common Python syntax issues
        if (content.includes('if name ==') && !content.includes('if __name__ ==')) {
          warnings.push('Python: Use `if __name__ == "__main__":` instead of `if name ==`')
        }
        if (content.includes('importmodule') && !content.includes('import_module')) {
          warnings.push('Python: Use `import_module` instead of `importmodule`')
        }
        // Check for missing main guard in scripts
        if (content.includes('def main') && !content.includes('if __name__') && !content.includes('if __name__ ==')) {
          warnings.push('Python: Consider adding `if __name__ == "__main__":` guard for script execution')
        }
      }
      
      // JavaScript/TypeScript checks
      if (operation.path.endsWith('.js') || operation.path.endsWith('.ts') ||
          operation.path.endsWith('.jsx') || operation.path.endsWith('.tsx')) {
        // Check for common issues
        if (content.includes('console.log') && !content.includes('//')) {
          // This is just informational, not an error
        }
        // Check for missing semicolons (optional in JS, but good practice)
        const lines = content.split('\n')
        let missingSemicolons = 0
        lines.forEach(line => {
          const trimmed = line.trim()
          if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('*') &&
              !trimmed.startsWith('/*') && !trimmed.endsWith(';') &&
              !trimmed.endsWith('{') && !trimmed.endsWith('}') &&
              !trimmed.match(/^(if|else|for|while|function|const|let|var|class|interface|type|export|import)\s/)) {
            missingSemicolons++
          }
        })
        if (missingSemicolons > 5) {
          warnings.push('JavaScript/TypeScript: Consider adding semicolons for consistency')
        }
      }
      
      // Check for suspicious patterns (metadata/thinking in content)
      if (content.includes('<|') && content.includes('|>')) {
        errors.push('Content appears to contain metadata tags - ensure only code is included')
      }
      if (content.includes('"operations"') && content.includes('"type"') && content.includes('"path"')) {
        warnings.push('Content may contain JSON structure instead of actual code')
      }
    }
  }
  
  // Check if file exists for edit operations
  if (operation.type === 'edit') {
    const existingFile = findFile(operation.path)
    if (!existingFile) {
      warnings.push('File does not exist - operation will create a new file instead of editing')
    }
  }
  
  // Check if file already exists for create operations
  if (operation.type === 'create') {
    const existingFile = findFile(operation.path)
    if (existingFile) {
      warnings.push('File already exists - operation will overwrite existing file')
    }
  }
  
  return {
    valid: errors.length === 0,
    warnings,
    errors
  }
}

export const parseAIResponse = (content: string, findFile: (path: string) => FileNode | null): ParsedAIResponse => {
  const operations: FileOperation[] = []
  let text = content

  // First, try to parse as raw JSON if the entire content looks like JSON
  if (content.trim().startsWith('{') && content.trim().includes('"operations"')) {
    try {
      const opsData = JSON.parse(content.trim())
      if (opsData.operations && Array.isArray(opsData.operations)) {
        const opsWithLang = opsData.operations.map((op: any) => {
          let cleanedContent = op.content
          if (cleanedContent && typeof cleanedContent === 'string') {
            cleanedContent = cleanCodeContent(cleanedContent)
            // Fix common syntax errors
            if (op.path.endsWith('.py') || detectLanguageFromPath(op.path) === 'python') {
              cleanedContent = cleanedContent.replace(/\bimportmodule\b/g, 'import_module')
cleanedContent = cleanedContent.replace(/\bif\s+name\s+===\s+['"]main['"]:/g, "if __name__ === '__main__':")
              cleanedContent = cleanedContent.replace(/\bfrom\s+importlib\s+import\s+importmodule\b/g, 'from importlib import import_module')
            }
          }
          // Automatically get oldContent for edit operations if not provided
          let oldContent = op.oldContent
          if (op.type === 'edit' && !oldContent) {
            const existingFile = findFile(op.path)
            oldContent = existingFile?.content || ''
          }
          return {
            ...op,
            content: cleanedContent,
            oldContent: oldContent,
            language: op.language || detectLanguageFromPath(op.path)
          }
        })
        operations.push(...opsWithLang)
        text = '' // Remove all content since it's all operations
        return {
          text: '',
          hasOperations: operations.length > 0,
          fileOperations: operations
        }
      }
    } catch (e) {
      // Not valid JSON, continue with normal parsing
    }
  }

  // Try to parse structured file_operations block
  const fileOpsMatch = content.match(/```file_operations\s*([\s\S]*?)```/i)
  if (fileOpsMatch) {
    try {
      const opsData = JSON.parse(fileOpsMatch[1])
      if (opsData.operations && Array.isArray(opsData.operations)) {
        // Add language detection and clean content for each operation
        const opsWithLang = opsData.operations.map((op: any) => {
          let cleanedContent = op.content
          if (cleanedContent && typeof cleanedContent === 'string') {
            // Clean the content to remove metadata/thinking
            cleanedContent = cleanCodeContent(cleanedContent)
            
            // Fix common syntax errors in Python code
            if (op.path.endsWith('.py') || detectLanguageFromPath(op.path) === 'python') {
              // Fix import_module typo
              cleanedContent = cleanedContent.replace(/\bimportmodule\b/g, 'import_module')
              // Fix __name__ == '__main__' pattern
cleanedContent = cleanedContent.replace(/\bif\s+name\s+===\s+['"]main['"]:/g, "if __name__ === '__main__':")
              // Fix from importmodule
              cleanedContent = cleanedContent.replace(/\bfrom\s+importlib\s+import\s+importmodule\b/g, 'from importlib import import_module')
            }
          }
          // Automatically get oldContent for edit operations if not provided
          let oldContent = op.oldContent
          if (op.type === 'edit' && !oldContent) {
            const existingFile = findFile(op.path)
            oldContent = existingFile?.content || ''
          }
          
          return {
            ...op,
            content: cleanedContent,
            oldContent: oldContent,
            language: op.language || detectLanguageFromPath(op.path)
          }
        })
        operations.push(...opsWithLang)
        // Remove the file_operations block from text
        text = content.replace(fileOpsMatch[0], '').trim()
      }
    } catch (e) {
      console.warn('Failed to parse file_operations JSON:', e)
      // Try to parse as raw JSON (without code block wrapper)
      try {
        const opsData = JSON.parse(content.trim())
        if (opsData.operations && Array.isArray(opsData.operations)) {
          const opsWithLang = opsData.operations.map((op: any) => {
            let cleanedContent = op.content
            if (cleanedContent && typeof cleanedContent === 'string') {
              cleanedContent = cleanCodeContent(cleanedContent)
              // Fix common syntax errors
              if (op.path.endsWith('.py') || detectLanguageFromPath(op.path) === 'python') {
                cleanedContent = cleanedContent.replace(/\bimportmodule\b/g, 'import_module')
cleanedContent = cleanedContent.replace(/\bif\s+name\s+===\s+['"]main['"]:/g, "if __name__ === '__main__':")
                cleanedContent = cleanedContent.replace(/\bfrom\s+importlib\s+import\s+importmodule\b/g, 'from importlib import import_module')
              }
            }
            // Automatically get oldContent for edit operations if not provided
            let oldContent = op.oldContent
            if (op.type === 'edit' && !oldContent) {
              const existingFile = findFile(op.path)
              oldContent = existingFile?.content || ''
            }
            return {
              ...op,
              content: cleanedContent,
              oldContent: oldContent,
              language: op.language || detectLanguageFromPath(op.path)
            }
          })
          operations.push(...opsWithLang)
          text = '' // Remove all content since it's all operations
        }
      } catch (e2) {
        console.warn('Failed to parse as raw JSON:', e2)
      }
    }
  }

  // Parse edit_file blocks: ```edit_file:/path/to/file ... ```
  const editFileRegex = /```edit_file:([^\n]+)\n([\s\S]*?)```/g
  let match
  while ((match = editFileRegex.exec(content)) !== null) {
    const filePath = match[1].trim()
    let fileContent = match[2].trim()
    
    // Clean the content to remove any metadata/thinking
    fileContent = cleanCodeContent(fileContent)
    
    // Fix common syntax errors
    const detectedLang = detectLanguageFromPath(filePath)
    if (detectedLang === 'python' || filePath.endsWith('.py')) {
      fileContent = fileContent.replace(/\bimportmodule\b/g, 'import_module')
fileContent = fileContent.replace(/\bif\s+name\s+===\s+['"]main['"]:/g, "if __name__ === '__main__':")
      fileContent = fileContent.replace(/\bfrom\s+importlib\s+import\s+importmodule\b/g, 'from importlib import import_module')
    }
    
    // Get old content if file exists
    const existingFile = findFile(filePath)
    const oldContent = existingFile?.content || ''
    
    operations.push({
      type: 'edit',
      path: filePath,
      content: fileContent,
      oldContent: oldContent,
      description: `Edit ${filePath}`,
      language: detectedLang
    })
    
    // Remove from text
    text = text.replace(match[0], '').trim()
  }

  // Parse create_file blocks: ```create_file:/path/to/file ... ```
  const createFileRegex = /```create_file:([^\n]+)\n([\s\S]*?)```/g
  while ((match = createFileRegex.exec(content)) !== null) {
    const filePath = match[1].trim()
    let fileContent = match[2].trim()
    
    // Clean the content to remove any metadata/thinking
    fileContent = cleanCodeContent(fileContent)
    
    // Fix common syntax errors
    const detectedLang = detectLanguageFromPath(filePath)
    if (detectedLang === 'python' || filePath.endsWith('.py')) {
      fileContent = fileContent.replace(/\bimportmodule\b/g, 'import_module')
fileContent = fileContent.replace(/\bif\s+name\s+===\s+['"]main['"]:/g, "if __name__ === '__main__':")
      fileContent = fileContent.replace(/\bfrom\s+importlib\s+import\s+importmodule\b/g, 'from importlib import import_module')
    }
    
    operations.push({
      type: 'create',
      path: filePath,
      content: fileContent,
      description: `Create ${filePath}`,
      language: detectedLang
    })
    
    // Remove from text
    text = text.replace(match[0], '').trim()
  }

  // Parse delete_file mentions
  const deleteFileRegex = /```delete_file:([^\n]+)```/g
  while ((match = deleteFileRegex.exec(content)) !== null) {
    const filePath = match[1].trim()
    
    operations.push({
      type: 'delete',
      path: filePath,
      description: `Delete ${filePath}`
    })
    
    // Remove from text
    text = text.replace(match[0], '').trim()
  }

  // Also try to detect file operations from code blocks with file paths in language or content
  // Pattern: ```python:/path/to/file.py or ```/path/to/file.py
  const codeBlockWithPathRegex = /```(\w+)?:?([\/\w\.\-]+\.\w+)\n([\s\S]*?)```/g
  while ((match = codeBlockWithPathRegex.exec(content)) !== null) {
    const codeLanguage = match[1] || ''
    const potentialPath = match[2]
    let codeContent = match[3].trim()
    
    // Clean the content to remove any metadata/thinking
    codeContent = cleanCodeContent(codeContent)
    
    // Fix common syntax errors
    const detectedLang = detectLanguageFromPath(potentialPath) || codeLanguage
    if (detectedLang === 'python' || potentialPath.endsWith('.py')) {
      codeContent = codeContent.replace(/\bimportmodule\b/g, 'import_module')
codeContent = codeContent.replace(/\bif\s+name\s+===\s+['"]main['"]:/g, "if __name__ === '__main__':")
      codeContent = codeContent.replace(/\bfrom\s+importlib\s+import\s+importmodule\b/g, 'from importlib import import_module')
    }
    
    // Check if the second match looks like a file path
    if (potentialPath.startsWith('/') || potentialPath.includes('/') || potentialPath.match(/\.\w+$/)) {
      const filePath = potentialPath.startsWith('/') ? potentialPath : `/${potentialPath}`
      
      // Detect expected language from file path
      const expectedLang = detectLanguageFromPath(filePath)
      
      // Validate language matches file extension
      if (codeLanguage && !validateLanguageMatchesFile(filePath, codeLanguage)) {
        console.warn(`Language mismatch: code is ${codeLanguage} but file is ${filePath} (expected ${expectedLang})`)
        // Still allow it but log a warning
      }
      
      // Check if file exists
      const existingFile = findFile(filePath)
      
      if (existingFile) {
        // It's an edit
        operations.push({
          type: 'edit',
          path: filePath,
          content: codeContent,
          oldContent: existingFile.content || '',
          description: `Edit ${filePath}`,
          language: codeLanguage || expectedLang
        })
      } else {
        // It's a create
        operations.push({
          type: 'create',
          path: filePath,
          content: codeContent,
          description: `Create ${filePath}`,
          language: codeLanguage || expectedLang
        })
      }
      
      // Remove from text
      text = text.replace(match[0], '').trim()
    }
  }

  return {
    text: text.trim(),
    fileOperations: operations,
    hasOperations: operations.length > 0
  }
}

// Merge multiple AI responses to find the best result
export const mergeAIResponses = (responses: Array<{ content: string; parsed: ParsedAIResponse; agentId?: number; agentName?: string }>): ParsedAIResponse => {
  if (responses.length === 0) {
    return { text: '', fileOperations: [], hasOperations: false }
  }
  
  if (responses.length === 1) {
    return responses[0].parsed
  }
  
  // Strategy: Combine all file operations, prefer more complete responses
  const allOperations: FileOperation[] = []
  const allTexts: string[] = []
  const seenPaths = new Set<string>()
  
  // Sort responses by quality indicators (more file operations, longer content)
  const sortedResponses = [...responses].sort((a, b) => {
    const aOps = a.parsed.fileOperations.length
    const bOps = b.parsed.fileOperations.length
    if (aOps !== bOps) return bOps - aOps // More operations = better
    return b.parsed.text.length - a.parsed.text.length // Longer text = better
  })
  
  // Collect file operations (avoid duplicates, prefer first occurrence)
  for (const response of sortedResponses) {
    for (const op of response.parsed.fileOperations) {
      if (!seenPaths.has(op.path)) {
        allOperations.push(op)
        seenPaths.add(op.path)
      }
    }
  }
  
  // Combine text content intelligently
  // Take the longest/most complete text response
  const bestTextResponse = sortedResponses[0]
  let mergedText = bestTextResponse.parsed.text
  
  // If multiple responses have valuable content, combine them
  if (sortedResponses.length > 1) {
    const additionalTexts = sortedResponses.slice(1)
      .filter(r => r.parsed.text.trim().length > 50) // Only include substantial responses
      .map(r => r.parsed.text)
      .filter((text, idx, arr) => arr.indexOf(text) === idx) // Remove duplicates
    
    if (additionalTexts.length > 0) {
      mergedText = `${mergedText}\n\n--- Additional insights from other agents ---\n\n${additionalTexts.join('\n\n---\n\n')}`
    }
  }
  
  return {
    text: mergedText.trim(),
    fileOperations: allOperations,
    hasOperations: allOperations.length > 0
  }
}
