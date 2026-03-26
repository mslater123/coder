"""Utility module providing a simple greeting function.

The module exposes :func:`greet` as its public API. The function is
intentionally tiny, but defensive programming and clear documentation are
important for maintainability and security when the code is reused in other
projects.
"""

__all__: list[str] = ["greet"]

def greet(name: str) -> str:
  """Return a friendly greeting for *name*.

  The function validates that ``name`` is a non‑empty string before
  constructing the greeting. This defensive check prevents accidental misuse
  (e.g., passing ``None`` or an object with a costly ``__str__`` implementation)
  and makes the behaviour explicit.

  Args:
    name: The name to include in the greeting. Must be a non‑empty ``str``.

  Returns:
    A greeting string formatted as ``"Hello, <name>!"``.

  Raises:
    TypeError: If *name* is not an instance of :class:`str`.
    ValueError: If *name* is an empty string after stripping whitespace.

  Example:
    >>> greet("Alice")
    'Hello, Alice!'
  """
  # Defensive checks – ensure correct type and non‑empty value
  if not isinstance(name, str):
    raise TypeError("name must be a string")

  stripped_name = name.strip()
  if not stripped_name:
    raise ValueError("name cannot be empty or whitespace only")

  # Using an f‑string is both concise and performant.
  return f"Hello, {stripped_name}!"
