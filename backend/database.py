import json
import os
from pathlib import Path
from datetime import datetime
from typing import Optional

DB_PATH = Path(__file__).parent.parent / "data"
DB_PATH.mkdir(exist_ok=True)

SCANS_FILE = DB_PATH / "scans.json"
SNAPSHOTS_FILE = DB_PATH / "snapshots.json"
SITEMAPS_FILE = DB_PATH / "sitemaps.json"
COMPLIANCE_SCANS_FILE = DB_PATH / "compliance_scans.json"


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


def save_compliance_scan(brand_id: str, scan: dict) -> None:
    scans = _load(COMPLIANCE_SCANS_FILE)
    if brand_id not in scans:
        scans[brand_id] = {"history": []}

    scan_entry = {**scan, "timestamp": scan.get("timestamp") or datetime.utcnow().isoformat()}
    scans[brand_id]["history"].insert(0, scan_entry)
    scans[brand_id]["history"] = scans[brand_id]["history"][:50]
    scans[brand_id]["latest"] = scan_entry
    _save(COMPLIANCE_SCANS_FILE, scans)


def get_latest_compliance_scan(brand_id: str) -> Optional[dict]:
    scans = _load(COMPLIANCE_SCANS_FILE)
    brand_scans = scans.get(brand_id, {})
    return brand_scans.get("latest")


def get_compliance_scan_history(brand_id: str, limit: int = 20) -> list:
    scans = _load(COMPLIANCE_SCANS_FILE)
    brand_scans = scans.get(brand_id, {})
    return brand_scans.get("history", [])[:limit]


# ── Sitemap storage ───────────────────────────────────────────────────────────

def get_sitemap(competitor_id: str) -> Optional[dict]:
    data = _load(SITEMAPS_FILE)
    return data.get(competitor_id)


def save_sitemap(competitor_id: str, sitemap_entry: dict) -> None:
    data = _load(SITEMAPS_FILE)
    data[competitor_id] = sitemap_entry
    _save(SITEMAPS_FILE, data)


def get_sitemap_pages_list(competitor_id: str) -> Optional[dict]:
    data = _load(SITEMAPS_FILE)
    entry = data.get(competitor_id)
    if not entry:
        return None
    pages = sorted(
        entry["pages"].values(),
        key=lambda p: (-(p.get("importance_score") or 0), p.get("first_seen") or ""),
        reverse=False,
    )
    return {
        "competitor_id": competitor_id,
        "last_crawled": entry.get("last_crawled"),
        "pages_count": entry.get("pages_count", len(pages)),
        "pages": pages,
    }


def merge_sitemap_pages(old_pages: dict, new_pages: dict, crawl_time: str) -> dict:
    merged = {}

    for url, page in new_pages.items():
        old = old_pages.get(url, {})
        merged[url] = {
            **page,
            "first_seen": old.get("first_seen") or crawl_time,
            "last_seen": crawl_time,
            "status": "active",
            "is_new": url not in old_pages,
            # Preserve existing AI fields — never overwrite once set
            "ai_description": old.get("ai_description") or page.get("ai_description"),
            "category": old.get("category") or page.get("category"),
            "importance_score": old.get("importance_score") if old.get("importance_score") is not None else page.get("importance_score"),
        }

    for url, page in old_pages.items():
        if url not in new_pages:
            merged[url] = {**page, "status": "not found", "is_new": False}

    return merged
