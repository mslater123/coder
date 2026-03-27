"""
WSGI entrypoint for the Coder API.

Application code lives under `src/` (`create_app` in `src.application`).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from src.application import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(
        debug=os.getenv("FLASK_DEBUG", "False").lower() == "true",
        port=port,
        host="0.0.0.0",
    )
