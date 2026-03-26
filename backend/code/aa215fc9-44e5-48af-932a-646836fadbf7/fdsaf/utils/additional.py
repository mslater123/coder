"""
Utility module providing extra functionality for the fdsaf project.

This module demonstrates how to extend the codebase with clean, testable
functions while following the project's coding standards:
- 2‑space indentation
- Double quotes for strings
- Line length ≤ 80 characters
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

def _deep_merge_lists(base: List[Any], overrides: List[Any]) -> List[Any]:
  """Merge two lists element‑wise.

  If both lists contain dictionaries at the same index they are merged
  recursively using ``merge_dicts``. Otherwise the value from ``overrides``
  replaces the one in ``base``. The resulting list is as long as the longer
  of the inputs.
  """
  max_len = max(len(base), len(overrides))
  merged: List[Any] = []
  for i in range(max_len):
    if i < len(base) and i < len(overrides):
      b_item, o_item = base[i], overrides[i]
      if isinstance(b_item, dict) and isinstance(o_item, dict):
        merged.append(merge_dicts(b_item, o_item))
      else:
        merged.append(o_item)
    elif i < len(overrides):
      merged.append(overrides[i])
    else:
      merged.append(base[i])
  return merged

def merge_dicts(base: Dict[str, Any], overrides: Dict[str, Any]) -> Dict[str, Any]:
  """Recursively merge ``overrides`` into ``base``.

  - Keys present only in ``overrides`` are added.
  - For matching keys:
    * If both values are dicts, they are merged recursively.
    * If both are lists, they are merged element‑wise via ``_deep_merge_lists``.
    * Otherwise the value from ``overrides`` replaces the one in ``base``.

  The function returns a **new** dictionary; original inputs remain unchanged.
  """
  result: Dict[str, Any] = {}
  # Start with base values
  for key, val in base.items():
    if isinstance(val, dict):
      result[key] = json.loads(json.dumps(val))  # deep copy
    elif isinstance(val, list):
      result[key] = val.copy()
    else:
      result[key] = val

  # Apply overrides
  for key, o_val in overrides.items():
    if key not in result:
      # New key – copy directly
      result[key] = json.loads(json.dumps(o_val)) if isinstance(o_val, dict) else o_val
      continue

    b_val = result[key]
    if isinstance(b_val, dict) and isinstance(o_val, dict):
      result[key] = merge_dicts(b_val, o_val)
    elif isinstance(b_val, list) and isinstance(o_val, list):
      result[key] = _deep_merge_lists(b_val, o_val)
    else:
      # Primitive or mismatched types – override
      result[key] = o_val
  return result

def load_json_file(file_path: str | Path) -> Dict[str, Any]:
  """Load a JSON file and return its content as a dictionary.

  Args:
    file_path: Path to the JSON file. Can be ``str`` or :class:`pathlib.Path`.

  Returns:
    Parsed JSON data as a dict.

  Raises:
    FileNotFoundError: If the file does not exist.
    json.JSONDecodeError: If the file content is not valid JSON.
  """
  path = Path(file_path)
  if not path.is_file():
    raise FileNotFoundError(f"JSON file not found: {path}")

  try:
    with path.open("r", encoding="utf-8") as f:
      data = json.load(f)
  except json.JSONDecodeError as exc:
    raise json.JSONDecodeError(
      f"Invalid JSON in file {path}: {exc.msg}",
      doc=exc.doc,
      pos=exc.pos,
    ) from None

  if not isinstance(data, dict):
    raise ValueError(f"JSON root must be an object/dict, got {type(data)}")
  return data
