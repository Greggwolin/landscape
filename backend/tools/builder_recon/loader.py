import json
from pathlib import Path
from typing import Any, Dict, List


def load_builder_matrix(path: str = "backend/tools/builder_matrix/top20_builders_phx.json") -> Dict[str, Any]:
    payload = json.loads(Path(path).read_text())
    return payload


def top_builders(matrix: Dict[str, Any], top_n: int, filters: List[str]) -> List[Dict[str, Any]]:
    builders = matrix.get("builders", [])
    builders = sorted(builders, key=lambda b: b.get("rank", 999))
    if filters:
        builders = [b for b in builders if b.get("builder_name") in filters]
    return builders[:top_n]
