#!/bin/bash
# Clean Python cache files (__pycache__ directories and .pyc files)
# Usage: ./clean_pycache.sh [--dry-run] [directory]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
DRY_RUN=false
TARGET_DIR="."

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            TARGET_DIR="$1"
            shift
            ;;
    esac
done

# Get absolute path
TARGET_DIR=$(cd "$TARGET_DIR" && pwd)

echo -e "${BLUE}🔍 Cleaning Python cache files in: ${TARGET_DIR}${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}🔍 DRY RUN MODE - No files will be deleted${NC}"
    echo
fi

# Count files before deletion
CACHE_DIRS=$(find "$TARGET_DIR" -type d -name "__pycache__" ! -path "*/venv/*" ! -path "*/.venv/*" ! -path "*/env/*" ! -path "*/.env/*" ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null | wc -l | tr -d ' ')
CACHE_FILES=$(find "$TARGET_DIR" -type f \( -name "*.pyc" -o -name "*.pyo" \) ! -path "*/venv/*" ! -path "*/.venv/*" ! -path "*/env/*" ! -path "*/.env/*" ! -path "*/node_modules/*" ! -path "*/.git/*" 2>/dev/null | wc -l | tr -d ' ')

echo "   Found $CACHE_DIRS __pycache__ directories"
echo "   Found $CACHE_FILES .pyc/.pyo files"
echo

# Delete __pycache__ directories
DELETED_DIRS=0
while IFS= read -r -d '' dir; do
    if [ "$DRY_RUN" = true ]; then
        echo -e "   ${YELLOW}[DRY RUN] Would delete: $dir${NC}"
    else
        rm -rf "$dir"
        DELETED_DIRS=$((DELETED_DIRS + 1))
    fi
done < <(find "$TARGET_DIR" -type d -name "__pycache__" ! -path "*/venv/*" ! -path "*/.venv/*" ! -path "*/env/*" ! -path "*/.env/*" ! -path "*/node_modules/*" ! -path "*/.git/*" -print0 2>/dev/null)

# Delete .pyc and .pyo files
DELETED_FILES=0
while IFS= read -r -d '' file; do
    if [ "$DRY_RUN" = true ]; then
        echo -e "   ${YELLOW}[DRY RUN] Would delete: $file${NC}"
    else
        rm -f "$file"
        DELETED_FILES=$((DELETED_FILES + 1))
    fi
done < <(find "$TARGET_DIR" -type f \( -name "*.pyc" -o -name "*.pyo" \) ! -path "*/venv/*" ! -path "*/.venv/*" ! -path "*/env/*" ! -path "*/.env/*" ! -path "*/node_modules/*" ! -path "*/.git/*" -print0 2>/dev/null)

# Summary
echo
if [ "$DRY_RUN" = true ]; then
    echo -e "${GREEN}✅ DRY RUN COMPLETE${NC}"
    echo "   Would delete $CACHE_DIRS directories"
    echo "   Would delete $CACHE_FILES files"
else
    echo -e "${GREEN}✅ CLEANUP COMPLETE${NC}"
    echo "   Deleted $DELETED_DIRS __pycache__ directories"
    echo "   Deleted $DELETED_FILES .pyc/.pyo files"
fi

