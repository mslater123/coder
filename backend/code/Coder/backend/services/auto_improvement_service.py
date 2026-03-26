"""Service for automatically analyzing and improving codebase"""
import os
import re
import ast
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

class ImprovementType(Enum):
    """Types of improvements that can be made"""
    CODE_QUALITY = "code_quality"
    PERFORMANCE = "performance"
    SECURITY = "security"
    STYLE = "style"
    REFACTOR = "refactor"
    BEST_PRACTICE = "best_practice"
    DOCUMENTATION = "documentation"
    ERROR_HANDLING = "error_handling"
    ACCESSIBILITY = "accessibility"

@dataclass
class Improvement:
    """Represents a single improvement suggestion"""
    type: ImprovementType
    file_path: str
    line_number: int
    description: str
    current_code: str
    suggested_code: str
    priority: int  # 1-10, higher is more important
    confidence: float  # 0.0-1.0
    category: str
    auto_apply: bool  # Whether this can be automatically applied

class AutoImprovementService:
    """Service for detecting and applying code improvements"""
    
    def __init__(self):
        self.improvements: List[Improvement] = []
    
    def analyze_file(self, file_path: str, content: str) -> List[Improvement]:
        """Analyze a single file for improvements"""
        improvements = []
        
        if not content:
            return improvements
        
        # Detect file type
        ext = os.path.splitext(file_path)[1].lower()
        language = self._detect_language(ext)
        
        if language == 'python':
            improvements.extend(self._analyze_python(file_path, content))
        elif language in ['javascript', 'typescript']:
            improvements.extend(self._analyze_javascript(file_path, content))
        elif language == 'html':
            improvements.extend(self._analyze_html(file_path, content))
        elif language == 'css':
            improvements.extend(self._analyze_css(file_path, content))
        
        # General improvements for all languages
        improvements.extend(self._analyze_general(file_path, content))
        
        return improvements
    
    def _detect_language(self, ext: str) -> str:
        """Detect programming language from extension"""
        lang_map = {
            '.py': 'python',
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.html': 'html',
            '.htm': 'html',
            '.css': 'css',
            '.scss': 'css',
            '.sass': 'css',
            '.less': 'css'
        }
        return lang_map.get(ext, 'unknown')
    
    def _analyze_python(self, file_path: str, content: str) -> List[Improvement]:
        """Analyze Python code for improvements"""
        improvements = []
        lines = content.split('\n')
        
        try:
            tree = ast.parse(content)
except Exception:
            return improvements
        
        # Check for common issues
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            
            # Check for bare except clauses
            if re.search(r'except\s*:', stripped):
                improvements.append(Improvement(
                    type=ImprovementType.ERROR_HANDLING,
                    file_path=file_path,
                    line_number=i,
                    description="Bare except clause - should specify exception type",
                    current_code=stripped,
suggested_code=stripped.replace('except Exception:', 'except Exception:'),
                    priority=7,
                    confidence=0.9,
                    category="error_handling",
                    auto_apply=True
                ))
            
            # Check for print statements (should use logging in production)
            if re.match(r'^\s*print\s*\(', stripped) and 'logging' not in content:
                improvements.append(Improvement(
                    type=ImprovementType.BEST_PRACTICE,
                    file_path=file_path,
                    line_number=i,
                    description="Consider using logging instead of print statements",
                    current_code=stripped,
                    suggested_code=stripped.replace('print(', 'logger.info('),
                    priority=5,
                    confidence=0.7,
                    category="best_practice",
                    auto_apply=False
                ))
            
# Check for is None (should use is None)
            if re.search(r'==\s*None', stripped):
                improvements.append(Improvement(
                    type=ImprovementType.STYLE,
                    file_path=file_path,
                    line_number=i,
description="Use 'is None' instead of 'is None'",
                    current_code=stripped,
                    suggested_code=stripped.replace('== None', 'is None'),
                    priority=6,
                    confidence=0.95,
                    category="style",
                    auto_apply=True
                ))
            
            # Check for != None (should use is not None)
            if re.search(r'!=\s*None', stripped):
                improvements.append(Improvement(
                    type=ImprovementType.STYLE,
                    file_path=file_path,
                    line_number=i,
                    description="Use 'is not None' instead of '!= None'",
                    current_code=stripped,
                    suggested_code=stripped.replace('!= None', 'is not None'),
                    priority=6,
                    confidence=0.95,
                    category="style",
                    auto_apply=True
                ))
            
            # Check for string concatenation with +
            if re.search(r'["\'].*["\']\s*\+\s*["\']', stripped):
                improvements.append(Improvement(
                    type=ImprovementType.PERFORMANCE,
                    file_path=file_path,
                    line_number=i,
                    description="Consider using f-strings or .format() instead of string concatenation",
                    current_code=stripped,
                    suggested_code=stripped,  # Would need context to suggest better
                    priority=4,
                    confidence=0.6,
                    category="performance",
                    auto_apply=False
                ))
        
        # Check for missing docstrings in functions/classes
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.ClassDef, ast.AsyncFunctionDef)):
                if not ast.get_docstring(node):
                    line_num = node.lineno
                    improvements.append(Improvement(
                        type=ImprovementType.DOCUMENTATION,
                        file_path=file_path,
                        line_number=line_num,
                        description=f"Missing docstring for {node.name}",
                        current_code=lines[line_num - 1] if line_num <= len(lines) else "",
                        suggested_code=lines[line_num - 1] + '\n    """Add docstring here."""',
                        priority=3,
                        confidence=0.8,
                        category="documentation",
                        auto_apply=False
                    ))
        
        return improvements
    
    def _analyze_javascript(self, file_path: str, content: str) -> List[Improvement]:
        """Analyze JavaScript/TypeScript code for improvements"""
        improvements = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            
            # Check for == instead of ===
            if re.search(r'[^=!]=\s*[^=]', stripped) and '===' not in stripped and '!==' not in stripped:
                if re.search(r'==\s*[^=]', stripped):
                    improvements.append(Improvement(
                        type=ImprovementType.STYLE,
                        file_path=file_path,
                        line_number=i,
                        description="Use strict equality (===) instead of == for better type safety",
                        current_code=stripped,
                        suggested_code=stripped.replace('==', '==='),
                        priority=7,
                        confidence=0.9,
                        category="style",
                        auto_apply=True
                    ))
            
            # Check for != instead of !==
            if re.search(r'!=\s*[^=]', stripped):
                improvements.append(Improvement(
                    type=ImprovementType.STYLE,
                    file_path=file_path,
                    line_number=i,
                    description="Use strict inequality (!==) instead of != for better type safety",
                    current_code=stripped,
                    suggested_code=stripped.replace('!=', '!=='),
                    priority=7,
                    confidence=0.9,
                    category="style",
                    auto_apply=True
                ))
            
            # Check for var instead of let/const
            if re.search(r'\bvar\s+', stripped):
                improvements.append(Improvement(
                    type=ImprovementType.BEST_PRACTICE,
                    file_path=file_path,
                    line_number=i,
                    description="Use 'let' or 'const' instead of 'var' for better scoping",
                    current_code=stripped,
                    suggested_code=stripped.replace('var ', 'const '),
                    priority=6,
                    confidence=0.85,
                    category="best_practice",
                    auto_apply=True
                ))
            
            # Check for console.log (should use proper logging)
            if 'console.log' in stripped and 'logger' not in content.lower():
                improvements.append(Improvement(
                    type=ImprovementType.BEST_PRACTICE,
                    file_path=file_path,
                    line_number=i,
                    description="Consider using a logging library instead of console.log",
                    current_code=stripped,
                    suggested_code=stripped,
                    priority=4,
                    confidence=0.7,
                    category="best_practice",
                    auto_apply=False
                ))
        
        return improvements
    
    def _analyze_html(self, file_path: str, content: str) -> List[Improvement]:
        """Analyze HTML for improvements"""
        improvements = []
        lines = content.split('\n')
        
        # Check for missing alt attributes on images
        for i, line in enumerate(lines, 1):
            if re.search(r'<img[^>]*>', line, re.IGNORECASE):
                if 'alt=' not in line.lower():
                    improvements.append(Improvement(
                        type=ImprovementType.ACCESSIBILITY,
                        file_path=file_path,
                        line_number=i,
                        description="Image missing alt attribute for accessibility",
                        current_code=line,
                        suggested_code=re.sub(r'(<img[^>]+)(>)', r'\1 alt="" \2', line, flags=re.IGNORECASE),
                        priority=8,
                        confidence=0.95,
                        category="accessibility",
                        auto_apply=True
                    ))
        
        return improvements
    
    def _analyze_css(self, file_path: str, content: str) -> List[Improvement]:
        """Analyze CSS for improvements"""
        improvements = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            
            # Check for !important (should be avoided when possible)
            if '!important' in stripped:
                improvements.append(Improvement(
                    type=ImprovementType.STYLE,
                    file_path=file_path,
                    line_number=i,
                    description="Avoid using !important - consider refactoring CSS specificity",
                    current_code=stripped,
                    suggested_code=stripped,
                    priority=3,
                    confidence=0.7,
                    category="style",
                    auto_apply=False
                ))
        
        return improvements
    
    def _analyze_general(self, file_path: str, content: str) -> List[Improvement]:
        """General improvements for all file types"""
        improvements = []
        lines = content.split('\n')
        
        # Check for trailing whitespace
        for i, line in enumerate(lines, 1):
            if line.rstrip() != line and line.strip():
                improvements.append(Improvement(
                    type=ImprovementType.STYLE,
                    file_path=file_path,
                    line_number=i,
                    description="Remove trailing whitespace",
                    current_code=line,
                    suggested_code=line.rstrip(),
                    priority=5,
                    confidence=1.0,
                    category="style",
                    auto_apply=True
                ))
        
        # Check for very long lines (over 120 characters)
        for i, line in enumerate(lines, 1):
            if len(line) > 120 and line.strip():
                improvements.append(Improvement(
                    type=ImprovementType.STYLE,
                    file_path=file_path,
                    line_number=i,
                    description=f"Line too long ({len(line)} characters) - consider breaking into multiple lines",
                    current_code=line,
                    suggested_code=line,
                    priority=3,
                    confidence=0.8,
                    category="style",
                    auto_apply=False
                ))
        
        # Check for TODO/FIXME comments
        for i, line in enumerate(lines, 1):
            if re.search(r'\b(TODO|FIXME|XXX|HACK|BUG)\b', line, re.IGNORECASE):
                improvements.append(Improvement(
                    type=ImprovementType.CODE_QUALITY,
                    file_path=file_path,
                    line_number=i,
                    description="TODO/FIXME comment found - consider addressing",
                    current_code=line,
                    suggested_code=line,
                    priority=4,
                    confidence=1.0,
                    category="code_quality",
                    auto_apply=False
                ))
        
        return improvements
    
    def analyze_codebase(self, working_dir: str, max_files: int = 100) -> Dict:
        """Analyze entire codebase for improvements"""
        all_improvements = []
        file_count = 0
        
        # File extensions to analyze
        code_extensions = {'.py', '.js', '.jsx', '.ts', '.tsx', '.html', '.htm', '.css', '.scss', '.sass'}
        
        skip_dirs = {'.git', '.svn', '.hg', '__pycache__', 'node_modules', '.venv', 'venv', 'env', 
                     'dist', 'build', '.next', '.nuxt', 'target', 'bin', 'obj', '.idea', '.vscode'}
        
        for root, dirs, files in os.walk(working_dir):
            # Skip hidden and excluded directories
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in skip_dirs]
            
            for file in files:
                if file_count >= max_files:
                    break
                
                file_path = os.path.join(root, file)
                ext = os.path.splitext(file)[1].lower()
                
                if ext in code_extensions:
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()
                            rel_path = os.path.relpath(file_path, working_dir)
                            rel_path = '/' + rel_path.replace(os.sep, '/')
                            
                            file_improvements = self.analyze_file(rel_path, content)
                            all_improvements.extend(file_improvements)
                            file_count += 1
                    except Exception as e:
                        pass
        
        # Group improvements by category and priority
        by_category = {}
        by_priority = {i: [] for i in range(1, 11)}
        
        for imp in all_improvements:
            if imp.category not in by_category:
                by_category[imp.category] = []
            by_category[imp.category].append(imp)
            by_priority[imp.priority].append(imp)
        
        # Get auto-applicable improvements
        auto_apply = [imp for imp in all_improvements if imp.auto_apply]
        
        return {
            'total_improvements': len(all_improvements),
            'auto_applicable': len(auto_apply),
            'by_category': {cat: len(imps) for cat, imps in by_category.items()},
            'by_priority': {str(pri): len(imps) for pri, imps in by_priority.items() if imps},
            'improvements': [
                {
                    'type': imp.type.value,
                    'file_path': imp.file_path,
                    'line_number': imp.line_number,
                    'description': imp.description,
                    'current_code': imp.current_code,
                    'suggested_code': imp.suggested_code,
                    'priority': imp.priority,
                    'confidence': imp.confidence,
                    'category': imp.category,
                    'auto_apply': imp.auto_apply
                }
                for imp in all_improvements
            ],
            'summary': f"Found {len(all_improvements)} potential improvements across {file_count} files. {len(auto_apply)} can be automatically applied."
        }
    
    def apply_improvement(self, improvement: Dict, file_content: str) -> Tuple[str, bool]:
        """Apply a single improvement to file content"""
        lines = file_content.split('\n')
        line_idx = improvement['line_number'] - 1
        
        if line_idx < 0 or line_idx >= len(lines):
            return file_content, False
        
        old_line = lines[line_idx]
        new_line = improvement['suggested_code']
        
        # Simple replacement - in production, would use AST or more sophisticated parsing
        if old_line.strip() == improvement['current_code'].strip():
            lines[line_idx] = new_line
            return '\n'.join(lines), True
        
        return file_content, False
    
    def apply_auto_improvements(self, improvements: List[Dict], working_dir: str) -> Dict:
        """Apply all auto-applicable improvements"""
        results = {
            'applied': 0,
            'failed': 0,
            'files_modified': set(),
            'errors': []
        }
        
        # Group by file
        by_file = {}
        for imp in improvements:
            if imp['auto_apply']:
                if imp['file_path'] not in by_file:
                    by_file[imp['file_path']] = []
                by_file[imp['file_path']].append(imp)
        
        # Apply improvements file by file
        for file_path, file_improvements in by_file.items():
            # Sort by line number (descending) to avoid line number shifts
            file_improvements.sort(key=lambda x: x['line_number'], reverse=True)
            
            # Get full file path
            full_path = os.path.join(working_dir, file_path.lstrip('/'))
            full_path = full_path.replace('/', os.sep)
            
            if not os.path.exists(full_path):
                results['errors'].append(f"File not found: {file_path}")
                continue
            
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                original_content = content
                
                # Apply each improvement
                for imp in file_improvements:
                    content, applied = self.apply_improvement(imp, content)
                    if applied:
                        results['applied'] += 1
                    else:
                        results['failed'] += 1
                        results['errors'].append(f"Failed to apply improvement in {file_path}:{imp['line_number']}")
                
                # Write back if changed
                if content != original_content:
                    with open(full_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    results['files_modified'].add(file_path)
            
            except Exception as e:
                results['failed'] += len(file_improvements)
                results['errors'].append(f"Error processing {file_path}: {str(e)}")
        
        results['files_modified'] = list(results['files_modified'])
        return results
