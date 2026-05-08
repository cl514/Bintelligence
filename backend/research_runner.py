import asyncio
from datetime import datetime
from typing import Optional

from config_manager import load_config
from database import save_scan_result, save_snapshot, get_snapshot
from scraper import scrape_competitor, content_hash, diff_content
from news_research import research_competitor_news
from ai_summarizer import summarize_changes, generate_daily_digest
from slack_notifier import post_daily_digest


async def run_competitor_research(competitor: dict, config: dict) -> dict:
    competitor_id = competitor["id"]
    max_pages = config.get("max_pages_per_site", 5)
    lookback_days = config.get("news_lookback_days", 7)
    api_key = config.get("openai_api_key", "")

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

    # Research news
    news_result = await research_competitor_news(competitor, lookback_days=lookback_days)
    articles = news_result.get("articles", [])

    # AI summary
    summary = await summarize_changes(
        competitor["name"], changes, articles, api_key
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
    competitors = [c for c in config.get("competitors", []) if c.get("active", True)]

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

    if post_slack and config.get("slack_webhook_url"):
        summaries = [
            {"name": r["competitor_name"], "summary": r.get("ai_summary", "No summary available")}
            for r in results
        ]
        api_key = config.get("openai_api_key", "")
        digest = await generate_daily_digest(summaries, api_key)
        await post_daily_digest(config["slack_webhook_url"], digest)

    return results
