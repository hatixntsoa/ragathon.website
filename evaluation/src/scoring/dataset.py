import json
from pathlib import Path

# Repo root: src/scoring/dataset.py -> src/scoring -> src -> repo root
REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATASET_PATH = REPO_ROOT / "data" / "expected_answers.json"


def load_expected_answers(path: Path = DEFAULT_DATASET_PATH) -> dict[str, str]:
    with open(path, encoding="utf-8") as f:
        return json.load(f)
