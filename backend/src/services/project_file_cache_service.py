"""Service for caching project file structure and contents"""
import os
import hashlib
import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from src.models import db, ProjectFileCache


def calculate_file_hash(content: str) -> str:
    """Calculate SHA256 hash of file content"""
    return hashlib.sha256(content.encode('utf-8')).hexdigest()


def get_cached_file_tree(working_dir: str, project_path: str = None) -> Optional[List[Dict]]:
    """Get cached file tree for a project"""
    if not project_path:
        project_path = working_dir
    
    cache_entries = ProjectFileCache.query.filter_by(
        working_dir=working_dir,
        project_path=project_path
    ).all()
    
    if not cache_entries:
        return None
    
    # Convert to file tree format
    files = []
    for entry in cache_entries:
        files.append({
            'name': os.path.basename(entry.file_path),
            'path': entry.file_path,
            'type': 'folder' if entry.is_directory else 'file',
            'size': entry.file_size,
            'mtime': entry.file_mtime,
            'cached': True
        })
    
    return files


def get_cached_file_content(working_dir: str, file_path: str, project_path: str = None) -> Optional[Tuple[str, float]]:
    """Get cached file content and mtime. Returns (content, mtime) or None if not cached or stale"""
    if not project_path:
        project_path = working_dir
    
    # Normalize file path
    file_path = file_path.lstrip('/')
    
    cache_entry = ProjectFileCache.query.filter_by(
        working_dir=working_dir,
        project_path=project_path,
        file_path=file_path,
        is_directory=False
    ).first()
    
    if not cache_entry:
        return None
    
    # Check if file still exists and get current mtime
    full_path = os.path.join(working_dir, file_path)
    if not os.path.exists(full_path):
        # File was deleted, remove from cache
        db.session.delete(cache_entry)
        db.session.commit()
        return None
    
    current_mtime = os.path.getmtime(full_path)
    
    # If file was modified, cache is stale
    if abs(current_mtime - (cache_entry.file_mtime or 0)) > 0.1:  # 0.1 second tolerance
        return None
    
    return (cache_entry.file_content, cache_entry.file_mtime)


def cache_file_tree(working_dir: str, files: List[Dict], project_path: str = None, max_files: int = 10000):
    """Cache file tree structure"""
    if not project_path:
        project_path = working_dir
    
    # Delete existing cache for this project
    ProjectFileCache.query.filter_by(
        working_dir=working_dir,
        project_path=project_path
    ).delete()
    
    # Cache files (limit to max_files to avoid memory issues)
    cached_count = 0
    for file_info in files[:max_files]:
        file_path = file_info.get('path', '').lstrip('/')
        if not file_path:
            continue
        
        full_path = os.path.join(working_dir, file_path)
        
        # Skip if file doesn't exist
        if not os.path.exists(full_path):
            continue
        
        is_directory = file_info.get('type') == 'folder' or os.path.isdir(full_path)
        
        cache_entry = ProjectFileCache(
            project_path=project_path,
            working_dir=working_dir,
            file_path=file_path,
            is_directory=is_directory,
            file_size=file_info.get('size', 0),
            file_mtime=os.path.getmtime(full_path) if os.path.exists(full_path) else None,
            file_content=None,  # Don't cache content in tree cache
            file_hash=None
        )
        
        db.session.add(cache_entry)
        cached_count += 1
    
    db.session.commit()
    return cached_count


def cache_file_content(working_dir: str, file_path: str, content: str, project_path: str = None):
    """Cache file content"""
    if not project_path:
        project_path = working_dir
    
    # Normalize file path
    file_path = file_path.lstrip('/')
    full_path = os.path.join(working_dir, file_path)
    
    if not os.path.exists(full_path) or os.path.isdir(full_path):
        return False
    
    # Calculate hash and get mtime
    file_hash = calculate_file_hash(content)
    mtime = os.path.getmtime(full_path)
    file_size = len(content.encode('utf-8'))
    
    # Check if entry exists
    cache_entry = ProjectFileCache.query.filter_by(
        working_dir=working_dir,
        project_path=project_path,
        file_path=file_path,
        is_directory=False
    ).first()
    
    if cache_entry:
        # Update existing entry
        cache_entry.file_content = content
        cache_entry.file_hash = file_hash
        cache_entry.file_mtime = mtime
        cache_entry.file_size = file_size
        cache_entry.updated_at = datetime.utcnow()
    else:
        # Create new entry
        cache_entry = ProjectFileCache(
            project_path=project_path,
            working_dir=working_dir,
            file_path=file_path,
            is_directory=False,
            file_content=content,
            file_hash=file_hash,
            file_mtime=mtime,
            file_size=file_size
        )
        db.session.add(cache_entry)
    
    db.session.commit()
    return True


def invalidate_file_cache(working_dir: str, file_path: str = None, project_path: str = None):
    """Invalidate cache for a specific file or entire project"""
    if not project_path:
        project_path = working_dir
    
    if file_path:
        # Invalidate specific file
        file_path = file_path.lstrip('/')
        ProjectFileCache.query.filter_by(
            working_dir=working_dir,
            project_path=project_path,
            file_path=file_path
        ).delete()
    else:
        # Invalidate entire project
        ProjectFileCache.query.filter_by(
            working_dir=working_dir,
            project_path=project_path
        ).delete()
    
    db.session.commit()


def is_file_cached(working_dir: str, file_path: str, project_path: str = None) -> bool:
    """Check if a file is cached and up-to-date"""
    if not project_path:
        project_path = working_dir
    
    file_path = file_path.lstrip('/')
    full_path = os.path.join(working_dir, file_path)
    
    if not os.path.exists(full_path):
        return False
    
    cache_entry = ProjectFileCache.query.filter_by(
        working_dir=working_dir,
        project_path=project_path,
        file_path=file_path,
        is_directory=False
    ).first()
    
    if not cache_entry:
        return False
    
    # Check if file was modified
    current_mtime = os.path.getmtime(full_path)
    if abs(current_mtime - (cache_entry.file_mtime or 0)) > 0.1:
        return False
    
    return True
