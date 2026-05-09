import httpx
from datetime import datetime


async def post_to_slack(webhook_url: str, message: str, competitor_name: str = None) -> bool:
    if not webhook_url:
        return False

    header = f":mag: *Competitive Intelligence Digest* — {datetime.now().strftime('%B %d, %Y')}"
    if competitor_name:
        header = f":mag: *{competitor_name} Update* — {datetime.now().strftime('%B %d, %Y')}"

    payload = {
        "channel": "#competition",
        "username": "CompIntel Bot",
        "icon_emoji": ":bar_chart:",
        "blocks": [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": "Competitive Intelligence Update"}
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": header}
            },
            {"type": "divider"},
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": message[:3000]}
            },
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(webhook_url, json=payload)
            return resp.status_code == 200
    except Exception:
        return False


async def post_daily_digest(webhook_url: str, digest: str) -> bool:
    return await post_to_slack(webhook_url, digest)


async def post_new_pages_notification(webhook_url: str, competitor_name: str, new_pages: list) -> bool:
    if not webhook_url or not new_pages:
        return False

    capped = new_pages[:20]
    lines = []
    for p in capped:
        cat = p.get("category") or "Unknown"
        score = p.get("importance_score") or "?"
        lines.append(f"• {p['url']}  _{cat}, score: {score}_")
    if len(new_pages) > 20:
        lines.append(f"_…and {len(new_pages) - 20} more_")

    message = f"*{len(new_pages)} new page(s) discovered on {competitor_name}:*\n" + "\n".join(lines)

    payload = {
        "channel": "#competition",
        "username": "CompIntel Bot",
        "icon_emoji": ":world_map:",
        "blocks": [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": f"New Pages Detected — {competitor_name}"}
            },
            {"type": "divider"},
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": message[:3000]}
            },
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(webhook_url, json=payload)
            return resp.status_code == 200
    except Exception:
        return False
