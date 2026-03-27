"""Filesystem anchors: repository `backend/` directory (parent of `src/`)."""

from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
