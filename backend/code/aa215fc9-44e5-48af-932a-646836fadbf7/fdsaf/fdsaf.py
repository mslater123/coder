"""Utility module providing a simple greeting function.

The module exposes :func:`greet` as its public API. The function is
intentionally tiny, but defensive programming and clear documentation are
important for maintainability and security when the code is reused in other
projects.
"""

def greet(name: str) -> str:
  """Return a friendly greeting for *name*.

  Args:
    name: The name to include in the greeting. Must be a ``str``.

  Returns:
    A greeting string formatted as ``"Hello, <name>!"``.

  Raises:
    TypeError: If *name* is not an instance of ``str``.
  """
  # Defensive check – ensures the function fails fast with a clear error if
  # called with an unexpected type. This prevents subtle bugs and potential
  # security issues when the value is later used in string interpolation or
  # logging.
  if not isinstance(name, str):
    raise TypeError(
      f"name must be a string, got {type(name).__name__}"
    )

  # Using an f‑string provides efficient and readable formatting.
  return f"Hello, {name}!"

# Define the public interface of this module.
__all__: list[str] = ["greet"]
