"""Filesystem path safety helpers."""

from __future__ import annotations

import os


def is_path_inside_directory(candidate: str, root: str) -> bool:
    """
    True if ``candidate`` resolves under ``root`` (same real path allowed for root itself).

    Uses ``os.path.commonpath`` so prefix tricks like ``/foo/bar_baz`` vs ``/foo/bar`` are handled.
    """
    try:
        root_r = os.path.realpath(os.path.abspath(root))
        cand_r = os.path.realpath(os.path.abspath(candidate))
    except OSError:
        return False
    if cand_r == root_r:
        return True
    try:
        return os.path.commonpath([cand_r, root_r]) == root_r
    except ValueError:
        return False
