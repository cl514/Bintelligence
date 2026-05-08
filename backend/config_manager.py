import json
import os
from pathlib import Path
from typing import Any

CONFIG_PATH = Path(__file__).parent.parent / "config.json"

DEFAULTS = {
    "competitors": [],
    "openai_api_key": "",
    "slack_webhook_url": "",
    "scan_frequency_hours": 24,
    "max_pages_per_site": 10,
    "news_lookback_days": 7,
}


def load_config() -> dict:
    if CONFIG_PATH.exists():
        with open(CONFIG_PATH) as f:
            config = json.load(f)
    else:
        config = dict(DEFAULTS)

    # Replit Secrets (env vars) override config.json values when set
    if os.environ.get("OPENAI_API_KEY"):
        config["openai_api_key"] = os.environ["OPENAI_API_KEY"]
    if os.environ.get("SLACK_WEBHOOK_URL"):
        config["slack_webhook_url"] = os.environ["SLACK_WEBHOOK_URL"]

    return config


def save_config(config: dict) -> None:
    # When running on Replit with env vars, don't overwrite keys that come
    # from secrets — just persist everything else to config.json
    to_save = dict(config)
    if os.environ.get("OPENAI_API_KEY"):
        to_save["openai_api_key"] = ""
    if os.environ.get("SLACK_WEBHOOK_URL"):
        to_save["slack_webhook_url"] = ""

    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_PATH, "w") as f:
        json.dump(to_save, f, indent=2)


def get_setting(key: str, default: Any = None) -> Any:
    return load_config().get(key, default)
