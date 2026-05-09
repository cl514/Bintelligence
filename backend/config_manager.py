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
    "priority_labels": [
        {"id": "prio-a", "name": "Prio A", "color": "#ef4444",
         "crawl_frequency": "daily", "news_frequency": "daily",
         "homepage_frequency": "daily", "slack_notifications": True},
        {"id": "prio-b", "name": "Prio B", "color": "#f59e0b",
         "crawl_frequency": "weekly", "news_frequency": "weekly",
         "homepage_frequency": "weekly", "slack_notifications": True},
        {"id": "prio-c", "name": "Prio C", "color": "#3b82f6",
         "crawl_frequency": "monthly", "news_frequency": "monthly",
         "homepage_frequency": "monthly", "slack_notifications": False},
        {"id": "subbrand", "name": "Subbrand", "color": "#8b5cf6",
         "crawl_frequency": "weekly", "news_frequency": "weekly",
         "homepage_frequency": "weekly", "slack_notifications": False},
        {"id": "inactive", "name": "Inactive", "color": "#475569",
         "crawl_frequency": "on-demand", "news_frequency": "never",
         "homepage_frequency": "never", "slack_notifications": False},
    ],
    "category_labels": [
        {"id": "accounting", "name": "Accounting", "color": "#10b981"},
        {"id": "tax-advisor", "name": "Tax Advisor", "color": "#6366f1"},
        {"id": "accounting-tech", "name": "Accounting-Tech", "color": "#0ea5e9"},
    ],
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

    # Backfill new keys for existing installations
    if "priority_labels" not in config:
        config["priority_labels"] = list(DEFAULTS["priority_labels"])
    if "category_labels" not in config:
        config["category_labels"] = list(DEFAULTS["category_labels"])

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
