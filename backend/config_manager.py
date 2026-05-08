import json
import os
from pathlib import Path
from typing import Any

CONFIG_PATH = Path(__file__).parent.parent / "config.json"


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        return {"competitors": [], "openai_api_key": "", "slack_webhook_url": "", "scan_frequency_hours": 24, "max_pages_per_site": 10, "news_lookback_days": 7}
    with open(CONFIG_PATH) as f:
        return json.load(f)


def save_config(config: dict) -> None:
    with open(CONFIG_PATH, "w") as f:
        json.dump(config, f, indent=2)


def get_setting(key: str, default: Any = None) -> Any:
    config = load_config()
    return config.get(key, default)
