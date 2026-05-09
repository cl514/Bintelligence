import asyncio
import json
from datetime import datetime
from typing import Optional
from urllib.parse import urlparse, urlunparse

from openai import OpenAI

from scraper import fetch_page, extract_links, extract_text
from database import get_sitemap, save_sitemap, merge_sitemap_pages
from slack_notifier import post_new_pages_notification

BATCH_SIZE = 10  # concurrent fetches per round


def _normalize_url(url: str) -> str:
    """Strip query string and fragment for deduplication purposes."""
    p = urlparse(url)
    return urlunparse(p._replace(query="", fragment="")).rstrip("/")


def extract_title(html: str) -> Optional[str]:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "lxml")
    tag = soup.find("title")
    return tag.get_text(strip=True) if tag else None


async def analyse_page(text: str, url: str, title: Optional[str], api_key: str) -> Optional[dict]:
    if not api_key:
        return None

    prompt = f"""Analyse this web page and respond with ONLY a JSON object with these fields:
- "category": one of ["Landing Page", "Product/Solution", "Pricing", "Blog/Article", "Legal", "Career", "About", "Other"]
- "importance_score": integer 1-10. High score for: pricing pages, AI/automation/partnership content, product landing pages, strategic announcements. Low score for: legal/cookie/impressum pages, deep archive pages, generic boilerplate.
- "description": 2-3 sentence summary of what this page is about. Write the description in German (Deutsch).

URL: {url}
Title: {title or ''}
Content: {text[:1500]}

Respond with only the JSON object, no markdown."""

    def _call():
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
        )
        return json.loads(resp.choices[0].message.content)

    try:
        return await asyncio.to_thread(_call)
    except Exception:
        return None


async def _process_url(url: str, base_url: str, api_key: str, old_pages: dict) -> Optional[dict]:
    """Fetch and analyse a single URL. Returns page dict + discovered links, or None on failure."""
    html = await fetch_page(url)
    if not html:
        return None

    title = extract_title(html)
    text = extract_text(html)
    links = extract_links(html, base_url, max_links=500)

    is_new_page = url not in old_pages
    analysis = await analyse_page(text, url, title, api_key) if is_new_page else None

    return {
        "url": url,
        "title": title,
        "ai_description": analysis.get("description") if analysis else None,
        "category": analysis.get("category") if analysis else None,
        "importance_score": analysis.get("importance_score") if analysis else None,
        "status": "active",
        "_links": links,  # temporary, stripped before saving
    }


async def crawl_site(base_url: str, api_key: str, old_pages: dict, max_pages: int = 200) -> dict:
    norm_base = _normalize_url(base_url)
    visited: set[str] = {norm_base}
    queue: list[str] = [norm_base]
    results: dict = {}

    while queue and len(results) < max_pages:
        batch = queue[:BATCH_SIZE]
        queue = queue[BATCH_SIZE:]

        tasks = [_process_url(url, base_url, api_key, old_pages) for url in batch]
        batch_results = await asyncio.gather(*tasks, return_exceptions=True)

        for url, page in zip(batch, batch_results):
            if isinstance(page, Exception) or page is None:
                continue
            links = page.pop("_links", [])
            results[url] = page
            if len(results) >= max_pages:
                break
            for link in links:
                norm = _normalize_url(link)
                if norm not in visited:
                    visited.add(norm)
                    queue.append(norm)

    return results


async def run_sitemap_crawl(
    competitor_id: str,
    website: str,
    api_key: str,
    slack_webhook_url: str,
    max_pages: int = 200,
) -> dict:
    crawl_time = datetime.utcnow().isoformat()

    existing = get_sitemap(competitor_id)
    old_pages = existing["pages"] if existing else {}

    new_pages = await crawl_site(website, api_key, old_pages, max_pages=max_pages)

    new_urls = set(new_pages) - set(old_pages)
    merged = merge_sitemap_pages(old_pages, new_pages, crawl_time)

    save_sitemap(competitor_id, {
        "last_crawled": crawl_time,
        "pages_count": len(merged),
        "pages": merged,
    })

    if new_urls and bool(old_pages) and slack_webhook_url:
        new_page_dicts = [merged[u] for u in new_urls if u in merged]
        await post_new_pages_notification(slack_webhook_url, competitor_id, new_page_dicts)

    return {
        "pages_crawled": len(new_pages),
        "new_pages_found": len(new_urls),
        "status": "success",
    }
