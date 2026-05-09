import asyncio
from datetime import datetime, timezone
from typing import Optional

from config_manager import load_config
from database import save_scan_result, save_snapshot, get_snapshot, get_scan_results
from scraper import scrape_competitor, content_hash, diff_content
from news_research import research_competitor_news
from ai_summarizer import summarize_changes, generate_daily_digest
from slack_notifier import post_daily_digest

FREQ_HOURS = {
    "daily": 20,
    "weekly": 144,
    "monthly": 648,
}


def _get_label(competitor: dict, config: dict) -> Optional[dict]:
    label_id = competitor.get("priority_label_id")
    if not label_id:
        return None
    return next((l for l in config.get("priority_labels", []) if l["id"] == label_id), None)


def should_run_competitor(competitor: dict, config: dict) -> bool:
    label = _get_label(competitor, config)
    freq = label.get("crawl_frequency") if label else None

    if freq in ("on-demand", "never"):
        return False

    threshold_hours = FREQ_HOURS.get(freq) if freq else config.get("scan_frequency_hours", 24)

    scans = get_scan_results(competitor["id"], limit=1)
    if not scans:
        return True  # never scanned — treat as overdue

    last_ts = scans[0].get("timestamp")
    if not last_ts:
        return True

    elapsed = (datetime.utcnow() - datetime.fromisoformat(last_ts)).total_seconds() / 3600
    return elapsed >= threshold_hours


async def run_competitor_research(competitor: dict, config: dict) -> dict:
    competitor_id = competitor["id"]
    max_pages = config.get("max_pages_per_site", 5)
    lookback_days = config.get("news_lookback_days", 7)
    api_key = config.get("openai_api_key", "")
    relevant_topics = competitor.get("relevant_topics", "")

    label = _get_label(competitor, config)
    skip_news = label and label.get("news_frequency") == "never"

    # Scrape website
    scrape_result = await scrape_competitor(competitor, max_pages=max_pages)
    changes = []
    if not scrape_result.get("error"):
        for page in scrape_result.get("pages", []):
            url = page["url"]
            new_hash = page["hash"]
            old_snapshot = get_snapshot(competitor_id, url)
            if old_snapshot:
                if old_snapshot["hash"] != new_hash:
                    diff = diff_content(old_snapshot["content"], page["text"])
                    diff["url"] = url
                    changes.append(diff)
            save_snapshot(competitor_id, url, new_hash, page["text"])

    # Research news (skip if label says never)
    articles = []
    if not skip_news:
        news_result = await research_competitor_news(competitor, lookback_days=lookback_days)
        articles = news_result.get("articles", [])

    # AI summary
    summary = await summarize_changes(
        competitor["name"], changes, articles, api_key,
        relevant_topics=relevant_topics,
    )

    result = {
        "competitor_id": competitor_id,
        "competitor_name": competitor["name"],
        "pages_scanned": scrape_result.get("pages_scanned", 0),
        "scrape_error": scrape_result.get("error"),
        "changes_detected": len(changes),
        "changes": changes,
        "news_articles": articles,
        "ai_summary": summary,
        "status": "error" if scrape_result.get("error") else "success",
    }

    save_scan_result(competitor_id, result)
    return result


async def run_all_competitors(post_slack: bool = True) -> list[dict]:
    config = load_config()
    competitors = [
        c for c in config.get("competitors", [])
        if c.get("active", True) and should_run_competitor(c, config)
    ]

    results = []
    for competitor in competitors:
        try:
            result = await run_competitor_research(competitor, config)
            results.append(result)
        except Exception as e:
            results.append({
                "competitor_id": competitor["id"],
                "competitor_name": competitor["name"],
                "status": "error",
                "error": str(e),
            })

    if post_slack and config.get("slack_webhook_url") and results:
        label_map = {l["id"]: l for l in config.get("priority_labels", [])}
        slack_results = []
        for r in results:
            comp = next((c for c in config.get("competitors", []) if c["id"] == r["competitor_id"]), {})
            label = label_map.get(comp.get("priority_label_id", ""), {})
            if label.get("slack_notifications", True):
                slack_results.append(r)

        if slack_results:
            summaries = [
                {"name": r["competitor_name"], "summary": r.get("ai_summary", "No summary available")}
                for r in slack_results
            ]
            api_key = config.get("openai_api_key", "")
            digest = await generate_daily_digest(summaries, api_key)
            await post_daily_digest(config["slack_webhook_url"], digest)

    return results
