import json
import os
from pathlib import Path
from datetime import datetime
from typing import Optional

DB_PATH = Path(__file__).parent.parent / "data"
DB_PATH.mkdir(exist_ok=True)

SCANS_FILE = DB_PATH / "scans.json"
SNAPSHOTS_FILE = DB_PATH / "snapshots.json"


def _load(path: Path) -> dict:
    if not path.exists():
        return {}
    with open(path) as f:
        return json.load(f)


def _save(path: Path, data: dict) -> None:
    with open(path, "w") as f:
        json.dump(data, f, indent=2, default=str)


def save_scan_result(competitor_id: str, result: dict) -> None:
    scans = _load(SCANS_FILE)
    if competitor_id not in scans:
        scans[competitor_id] = []
    result["timestamp"] = datetime.utcnow().isoformat()
    scans[competitor_id].insert(0, result)
    scans[competitor_id] = scans[competitor_id][:50]  # keep last 50
    _save(SCANS_FILE, scans)


def get_scan_results(competitor_id: str, limit: int = 10) -> list:
    scans = _load(SCANS_FILE)
    return scans.get(competitor_id, [])[:limit]


def get_latest_scan(competitor_id: str) -> Optional[dict]:
    results = get_scan_results(competitor_id, limit=1)
    return results[0] if results else None


def get_all_latest_scans() -> dict:
    scans = _load(SCANS_FILE)
    return {cid: entries[0] for cid, entries in scans.items() if entries}


def save_snapshot(competitor_id: str, url: str, content_hash: str, text_content: str) -> None:
    snapshots = _load(SNAPSHOTS_FILE)
    key = f"{competitor_id}:{url}"
    snapshots[key] = {
        "hash": content_hash,
        "content": text_content[:5000],
        "timestamp": datetime.utcnow().isoformat()
    }
    _save(SNAPSHOTS_FILE, snapshots)


def get_snapshot(competitor_id: str, url: str) -> Optional[dict]:
    snapshots = _load(SNAPSHOTS_FILE)
    return snapshots.get(f"{competitor_id}:{url}")
