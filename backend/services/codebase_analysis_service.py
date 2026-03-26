"""Service for analyzing codebase structure and caching results"""
import os
import re
import hashlib
import json
from typing import Dict, List, Optional, Set
from datetime import datetime
from collections import defaultdict

# Language-specific patterns for code analysis
LANGUAGE_PATTERNS = {
    'python': {
        'import': r'^(?:from\s+[\w.]+\s+)?import\s+([\w\s,.*]+)',
        'function': r'^\s*def\s+(\w+)\s*\(',
        'class': r'^\s*class\s+(\w+)',
        'file_extensions': ['.py', '.pyw', '.pyi']
    },
    'javascript': {
        'import': r'^(?:import\s+(?:\{[^}]+\}|\w+)\s+from\s+[\'"]([^\'"]+)[\'"]|require\s*\([\'"]([^\'"]+)[\'"]\))',
        'function': r'^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)|^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(|^\s*(\w+)\s*:\s*(?:async\s+)?\(',
        'class': r'^\s*(?:export\s+)?class\s+(\w+)',
        'file_extensions': ['.js', '.jsx', '.mjs', '.cjs']
    },
    'typescript': {
        'import': r'^(?:import\s+(?:\{[^}]+\}|\w+)\s+from\s+[\'"]([^\'"]+)[\'"]|require\s*\([\'"]([^\'"]+)[\'"]\))',
        'function': r'^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)|^\s*(?:export\s+)?(?:const|let|var)\s+(\w+)\s*[:=]\s*(?:async\s+)?\(|^\s*(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\(',
        'class': r'^\s*(?:export\s+)?(?:abstract\s+)?class\s+(\w+)',
        'file_extensions': ['.ts', '.tsx', '.mts', '.cts']
    },
    'java': {
        'import': r'^import\s+(?:static\s+)?([\w.]+)',
        'function': r'^\s*(?:public|private|protected|static)?\s*(?:[\w<>\[\]]+\s+)?(\w+)\s*\(',
        'class': r'^\s*(?:public|private|protected|abstract|final)?\s*class\s+(\w+)',
        'file_extensions': ['.java']
    },
    'cpp': {
        'import': r'^#include\s*[<"]([^>"]+)[>"]',
        'function': r'^\s*(?:inline|static|extern)?\s*(?:[\w:<>\[\]]+\s+)?(\w+)\s*\(',
        'class': r'^\s*(?:class|struct)\s+(\w+)',
        'file_extensions': ['.cpp', '.cc', '.cxx', '.hpp', '.h', '.hxx']
    },
    'go': {
        'import': r'^import\s+(?:\(|[\'"]([^\'"]+)[\'"]|[\'"]([^\'"]+)[\'"])',
        'function': r'^\s*func\s+(\w+)',
        'class': r'^\s*type\s+(\w+)\s+(?:struct|interface)',
        'file_extensions': ['.go']
    }
}

def detect_language_from_file(filename: str) -> Optional[str]:
    """Detect programming language from filename"""
    ext = os.path.splitext(filename)[1].lower()
    for lang, patterns in LANGUAGE_PATTERNS.items():
        if ext in patterns['file_extensions']:
            return lang
    return None

def calculate_directory_hash(directory: str, max_files: int = 1000) -> str:
    """Calculate hash of directory structure for cache invalidation"""
    file_info = []
    count = 0
    
    for root, dirs, files in os.walk(directory):
        # Skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        for file in files:
            if file.startswith('.'):
                continue
            if count >= max_files:
                break
            file_path = os.path.join(root, file)
            try:
                stat = os.stat(file_path)
                rel_path = os.path.relpath(file_path, directory)
                file_info.append(f"{rel_path}:{stat.st_mtime}:{stat.st_size}")
                count += 1
            except:
                pass
        if count >= max_files:
            break
    
    content = '\n'.join(sorted(file_info))
    return hashlib.sha256(content.encode()).hexdigest()

def analyze_file(file_path: str, language: Optional[str] = None) -> Dict:
    """Analyze a single file for functions, classes, and imports"""
    if not language:
        language = detect_language_from_file(file_path)
    
    if not language or language not in LANGUAGE_PATTERNS:
        return {
            'imports': [],
            'functions': [],
            'classes': []
        }
    
    patterns = LANGUAGE_PATTERNS[language]
    imports = []
    functions = []
    classes = []
    
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            for i, line in enumerate(lines, 1):
                line_stripped = line.strip()
                
                # Extract imports
                import_match = re.search(patterns['import'], line_stripped)
                if import_match:
                    import_val = import_match.group(1) or import_match.group(2) if import_match.lastindex > 1 else import_match.group(1)
                    if import_val:
                        imports.append({
                            'line': i,
                            'module': import_val.strip()
                        })
                
                # Extract functions
                func_match = re.search(patterns['function'], line_stripped)
                if func_match:
                    func_name = func_match.group(1) or func_match.group(2) or func_match.group(3)
                    if func_name:
                        functions.append({
                            'line': i,
                            'name': func_name.strip()
                        })
                
                # Extract classes
                class_match = re.search(patterns['class'], line_stripped)
                if class_match:
                    class_name = class_match.group(1)
                    if class_name:
                        classes.append({
                            'line': i,
                            'name': class_name.strip()
                        })
    except Exception as e:
        pass
    
    return {
        'imports': imports,
        'functions': functions,
        'classes': classes
    }

def analyze_codebase(working_dir: str, max_files: int = None, max_depth: int = 50, include_content: bool = True) -> Dict:
    """Comprehensive codebase analysis"""
    if not os.path.exists(working_dir):
        return {'error': 'Directory does not exist'}
    
    analysis = {
        'total_files': 0,
        'total_dirs': 0,
        'file_types': defaultdict(int),
        'files_by_language': defaultdict(int),
        'files': [],
        'dependencies': defaultdict(set),
        'functions': [],
        'classes': [],
        'imports': [],
        'structure': {},
        'largest_files': [],
        'recent_files': []
    }
    
    # Directories to skip
    skip_dirs = {'.git', '.svn', '.hg', '__pycache__', 'node_modules', '.venv', 'venv', 'env', 
                 'dist', 'build', '.next', '.nuxt', 'target', 'bin', 'obj', '.idea', '.vscode'}
    
    # File extensions to analyze
    code_extensions = {'.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.cpp', '.cc', '.cxx', 
                       '.hpp', '.h', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala',
                       '.cs', '.fs', '.vb', '.clj', '.hs', '.ml', '.erl', '.ex', '.exs'}
    
    file_analyses = []
    file_count = 0
    
    def scan_directory(path: str, relative_path: str = '', depth: int = 0):
        """Recursively scan directory"""
        nonlocal file_count
        
        if depth > max_depth:
            return
        if max_files is not None and file_count >= max_files:
            return
        
        try:
            items = os.listdir(path)
            for item in items:
                if item.startswith('.') or item in skip_dirs:
                    continue
                
                item_path = os.path.join(path, item)
                rel_item_path = os.path.join(relative_path, item) if relative_path else item
                
                if os.path.isdir(item_path):
                    analysis['total_dirs'] += 1
                    scan_directory(item_path, rel_item_path, depth + 1)
                elif os.path.isfile(item_path):
                    if max_files is not None and file_count >= max_files:
                        return
                    
                    ext = os.path.splitext(item)[1].lstrip('.').lower()
                    if ext:
                        analysis['file_types'][ext] += 1
                    
                    # Analyze all files, not just code files
                    file_ext = os.path.splitext(item)[1].lower()
                    rel_path = '/' + rel_item_path.replace(os.sep, '/')
                    
                    # Try to read file content if it's a text file
                    file_content = None
                    is_text_file = True
                    
                    # Check if it's a code file
                    if file_ext in code_extensions:
                        language = detect_language_from_file(item)
                        if language:
                            analysis['files_by_language'][language] += 1
                            
                            # Analyze file content
                            file_analysis = analyze_file(item_path, language)
                            
                            file_info = {
                                'path': rel_path,
                                'name': item,
                                'language': language,
                                'size': os.path.getsize(item_path),
                                'mtime': os.path.getmtime(item_path),
                                'imports': file_analysis['imports'],
                                'functions': file_analysis['functions'],
                                'classes': file_analysis['classes']
                            }
                            
                            # Include file content if requested
                            if include_content:
                                try:
                                    with open(item_path, 'r', encoding='utf-8', errors='ignore') as f:
                                        content = f.read()
                                        # Limit content size to 1MB per file to avoid memory issues
                                        if len(content) <= 1024 * 1024:
                                            file_content = content
                                            file_info['content'] = content
                                        else:
                                            file_info['content'] = content[:1024 * 1024] + '\n... [truncated, file too large]'
                                            file_info['content_size'] = len(content)
                                except:
                                    is_text_file = False
                            
                            analysis['files'].append(file_info)
                            file_analyses.append((rel_path, file_analysis))
                            
                            # Collect dependencies
                            for imp in file_analysis['imports']:
                                module = imp['module']
                                analysis['dependencies'][rel_path].add(module)
                            
                            # Collect functions and classes
                            for func in file_analysis['functions']:
                                analysis['functions'].append({
                                    'file': rel_path,
                                    'name': func['name'],
                                    'line': func['line']
                                })
                            
                            for cls in file_analysis['classes']:
                                analysis['classes'].append({
                                    'file': rel_path,
                                    'name': cls['name'],
                                    'line': cls['line']
                                })
                            
                            file_count += 1
                            analysis['total_files'] += 1
                    else:
                        # Non-code file - still track it
                        try:
                            size = os.path.getsize(item_path)
                            mtime = os.path.getmtime(item_path)
                            
                            file_info = {
                                'path': rel_path,
                                'name': item,
                                'language': None,
                                'size': size,
                                'mtime': mtime,
                                'extension': file_ext.lstrip('.') if file_ext else None
                            }
                            
                            # Try to include content for text-based files (config, markdown, etc.)
                            if include_content and file_ext in {'.txt', '.md', '.json', '.yaml', '.yml', '.xml', '.html', '.css', '.scss', '.less', '.ini', '.conf', '.config', '.env', '.gitignore', '.dockerignore', '.editorconfig'}:
                                try:
                                    with open(item_path, 'r', encoding='utf-8', errors='ignore') as f:
                                        content = f.read()
                                        if len(content) <= 1024 * 1024:
                                            file_info['content'] = content
                                        else:
                                            file_info['content'] = content[:1024 * 1024] + '\n... [truncated]'
                                            file_info['content_size'] = len(content)
                                except:
                                    pass
                            
                            analysis['files'].append(file_info)
                            file_count += 1
                            analysis['total_files'] += 1
                        except:
                            pass
                    
                    # Track all files for size/recent analysis
                    try:
                        size = os.path.getsize(item_path)
                        mtime = os.path.getmtime(item_path)
                        rel_path = '/' + rel_item_path.replace(os.sep, '/')
                        
                        analysis['largest_files'].append({
                            'path': rel_path,
                            'name': item,
                            'size': size
                        })
                        
                        analysis['recent_files'].append({
                            'path': rel_path,
                            'name': item,
                            'mtime': mtime
                        })
                    except:
                        pass
        except PermissionError:
            pass
        except Exception:
            pass
    
    scan_directory(working_dir)
    
    # Convert defaultdicts to regular dicts
    analysis['file_types'] = dict(analysis['file_types'])
    analysis['files_by_language'] = dict(analysis['files_by_language'])
    analysis['dependencies'] = {k: list(v) for k, v in analysis['dependencies'].items()}
    
    # Sort and limit
    analysis['largest_files'].sort(key=lambda x: x['size'], reverse=True)
    analysis['largest_files'] = analysis['largest_files'][:20]
    
    analysis['recent_files'].sort(key=lambda x: x['mtime'], reverse=True)
    analysis['recent_files'] = analysis['recent_files'][:20]
    
    # Create structure summary
    structure_summary = f"Codebase contains {analysis['total_files']} code files across {analysis['total_dirs']} directories. "
    if analysis['files_by_language']:
        top_langs = sorted(analysis['files_by_language'].items(), key=lambda x: x[1], reverse=True)[:3]
        lang_str = ', '.join([f"{lang} ({count})" for lang, count in top_langs])
        structure_summary += f"Primary languages: {lang_str}. "
    if analysis['functions']:
        structure_summary += f"Found {len(analysis['functions'])} functions and {len(analysis['classes'])} classes."
    
    analysis['structure_summary'] = structure_summary
    
    return analysis
