#!/usr/bin/env python3
"""
Clean Python cache files (__pycache__ directories and .pyc files)
Usage: python clean_pycache.py [--dry-run] [--verbose]
"""

import os
import shutil
import sys
import argparse
from pathlib import Path


def find_cache_files(root_dir):
    """Find all __pycache__ directories and .pyc/.pyo files"""
    cache_dirs = []
    cache_files = []
    
    for root, dirs, files in os.walk(root_dir):
        # Skip virtual environments and common ignore patterns
        if any(skip in root for skip in ['venv', '.venv', 'env', '.env', 'node_modules', '.git']):
            continue
            
        # Find __pycache__ directories
        if '__pycache__' in dirs:
            cache_path = os.path.join(root, '__pycache__')
            cache_dirs.append(cache_path)
            # Remove from dirs to avoid walking into it
            dirs.remove('__pycache__')
        
        # Find .pyc and .pyo files
        for file in files:
            if file.endswith(('.pyc', '.pyo')):
                cache_path = os.path.join(root, file)
                cache_files.append(cache_path)
    
    return cache_dirs, cache_files


def clean_cache(root_dir, dry_run=False, verbose=False):
    """Clean all Python cache files"""
    cache_dirs, cache_files = find_cache_files(root_dir)
    
    total_size = 0
    deleted_dirs = 0
    deleted_files = 0
    
    print(f"🔍 Scanning for Python cache files in: {root_dir}")
    print(f"   Found {len(cache_dirs)} __pycache__ directories")
    print(f"   Found {len(cache_files)} .pyc/.pyo files")
    print()
    
    if dry_run:
        print("🔍 DRY RUN MODE - No files will be deleted")
        print()
    
    # Delete __pycache__ directories
    for cache_dir in cache_dirs:
        try:
            if verbose:
                print(f"   {'[DRY RUN] Would delete' if dry_run else 'Deleting'}: {cache_dir}")
            
            if not dry_run:
                # Calculate size before deletion
                for root, dirs, files in os.walk(cache_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        try:
                            total_size += os.path.getsize(file_path)
                        except OSError:
                            pass
                
                shutil.rmtree(cache_dir)
                deleted_dirs += 1
        except Exception as e:
            print(f"   ❌ Error deleting {cache_dir}: {e}")
    
    # Delete .pyc and .pyo files
    for cache_file in cache_files:
        try:
            if verbose:
                print(f"   {'[DRY RUN] Would delete' if dry_run else 'Deleting'}: {cache_file}")
            
            if not dry_run:
                try:
                    total_size += os.path.getsize(cache_file)
                except OSError:
                    pass
                os.remove(cache_file)
                deleted_files += 1
        except Exception as e:
            print(f"   ❌ Error deleting {cache_file}: {e}")
    
    # Summary
    print()
    if dry_run:
        print(f"✅ DRY RUN COMPLETE")
        print(f"   Would delete {len(cache_dirs)} directories")
        print(f"   Would delete {len(cache_files)} files")
    else:
        print(f"✅ CLEANUP COMPLETE")
        print(f"   Deleted {deleted_dirs} __pycache__ directories")
        print(f"   Deleted {deleted_files} .pyc/.pyo files")
        if total_size > 0:
            size_mb = total_size / (1024 * 1024)
            print(f"   Freed {size_mb:.2f} MB of disk space")


def main():
    parser = argparse.ArgumentParser(
        description='Clean Python cache files (__pycache__ directories and .pyc files)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python clean_pycache.py                    # Clean all cache files
  python clean_pycache.py --dry-run           # Preview what would be deleted
  python clean_pycache.py --verbose          # Show detailed output
  python clean_pycache.py --dir backend      # Clean only backend directory
        """
    )
    parser.add_argument(
        '--dir',
        default='.',
        help='Directory to clean (default: current directory)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Preview what would be deleted without actually deleting'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Show detailed output for each file/directory'
    )
    
    args = parser.parse_args()
    
    root_dir = os.path.abspath(args.dir)
    
    if not os.path.exists(root_dir):
        print(f"❌ Error: Directory does not exist: {root_dir}")
        sys.exit(1)
    
    if not os.path.isdir(root_dir):
        print(f"❌ Error: Not a directory: {root_dir}")
        sys.exit(1)
    
    clean_cache(root_dir, dry_run=args.dry_run, verbose=args.verbose)


if __name__ == '__main__':
    main()

