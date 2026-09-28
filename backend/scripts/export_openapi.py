"""Write the API's OpenAPI schema to frontend/openapi.json.

The frontend generates its TypeScript types from this file
(`npm run gen:api` in frontend/), so request/response shapes can't drift.
CI re-runs this and fails if the committed file is out of date.

    python -m scripts.export_openapi        # from backend/
"""

import json
from pathlib import Path

from app.main import app

OUT = Path(__file__).resolve().parents[2] / "frontend" / "openapi.json"


def main() -> None:
    OUT.write_text(json.dumps(app.openapi(), indent=2, sort_keys=True) + "\n")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
