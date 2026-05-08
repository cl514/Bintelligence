import httpx
import xml.etree.ElementTree as ET
from datetime import datetime
from urllib.parse import quote_plus

TIMEOUT = 15
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}


async def search_google_news_rss(query: str, max_results: int = 8) -> list[dict]:
    """Search Google News RSS feed — free, no API key needed."""
    url = f"https://news.google.com/rss/search?q={quote_plus(query)}&hl=en-US&gl=US&ceid=US:en"
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=TIMEOUT) as client:
            resp = await client.get(url, headers=HEADERS)
            resp.raise_for_status()
    except Exception:
        return []

    try:
        root = ET.fromstring(resp.text)
    except ET.ParseError:
        return []

    ns = {"media": "http://search.yahoo.com/mrss/"}
    results = []
    for item in root.findall(".//item")[:max_results]:
        title = item.findtext("title", "").strip()
        link = item.findtext("link", "").strip()
        desc = item.findtext("description", "").strip()
        pub_date = item.findtext("pubDate", "").strip()
        source_el = item.find("source")
        source = source_el.text if source_el is not None else ""

        # Strip HTML from description
        import re
        desc = re.sub(r"<[^>]+>", "", desc).strip()

        if title:
            results.append({
                "title": title,
                "url": link,
                "snippet": desc[:300] if desc else pub_date,
                "source": source,
                "published": pub_date,
            })
    return results


async def research_competitor_news(competitor: dict, lookback_days: int = 7) -> dict:
    name = competitor["name"]
    year = datetime.now().year
    queries = [
        f"{name} press release {year}",
        f"{name} partnership announcement",
        f"{name} news accounting",
    ]

    all_results = []
    seen_titles: set[str] = set()
    for query in queries:
        items = await search_google_news_rss(query, max_results=6)
        for item in items:
            if item["title"] not in seen_titles:
                seen_titles.add(item["title"])
                all_results.append(item)

    return {
        "competitor": name,
        "articles": all_results[:15],
        "queries_run": queries,
        "timestamp": datetime.utcnow().isoformat(),
    }
