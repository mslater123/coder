#!/usr/bin/env bash
# Push the current branch to GitHub (remote: origin by default).
#
# Usage:
#   ./scripts/push_to_github.sh              # push only (commit first yourself)
#   ./scripts/push_to_github.sh "commit msg" # git add -A, commit, then push
#
# Optional: GIT_REMOTE=myfork ./scripts/push_to_github.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

usage() {
  echo "Usage: $0 [--help|-h]"
  echo "       $0 [<commit message>]"
  echo ""
  echo "  No message   — runs: git push -u \${GIT_REMOTE:-origin} <current-branch>"
  echo "  With message — runs: git add -A && git commit -m \"...\" && git push -u ..."
  echo ""
  echo "Environment: GIT_REMOTE (default: origin)"
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "Error: not a git repository."
  echo "Initialize with: cd \"$REPO_ROOT\" && git init && git remote add origin https://github.com/USER/REPO.git"
  exit 1
fi

REMOTE="${GIT_REMOTE:-origin}"
if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
  echo "Error: git remote '$REMOTE' is not configured."
  echo "Example: git remote add $REMOTE https://github.com/USER/REPO.git"
  exit 1
fi

BRANCH="$(git branch --show-current)"
if [[ -z "$BRANCH" ]]; then
  echo "Error: detached HEAD — checkout a branch first."
  exit 1
fi

MSG="${*:-}"
if [[ -n "$MSG" ]]; then
  git add -A
  if git diff --cached --quiet; then
    echo "Nothing to commit (working tree clean or ignored-only changes)."
    exit 1
  fi
  git commit -m "$MSG"
fi

echo "Pushing branch '$BRANCH' to '$REMOTE'..."
git push -u "$REMOTE" "$BRANCH"
echo "Done."
