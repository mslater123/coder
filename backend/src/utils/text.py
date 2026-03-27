"""String helpers."""


def truncate(text: str, max_length: int, *, suffix: str = "…") -> str:
    """Truncate ``text`` to ``max_length`` characters (suffix counts toward limit)."""
    if max_length <= 0:
        return ""
    if len(text) <= max_length:
        return text
    if len(suffix) >= max_length:
        return suffix[:max_length]
    return text[: max_length - len(suffix)] + suffix
