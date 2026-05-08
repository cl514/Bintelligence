import hashlib
import re
from typing import Optional
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup


HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; CompetitiveIntelligenceBot/1.0)"
}

TIMEOUT = 15


async def fetch_page(url: str) -> Optional[str]:
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=TIMEOUT) as client:
            resp = await client.get(url, headers=HEADERS)
            resp.raise_for_status()
            return resp.text
    except Exception:
        return None


def extract_text(html: str) -> str:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()
    text = soup.get_text(separator=" ", strip=True)
    return re.sub(r"\s+", " ", text).strip()


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def extract_links(html: str, base_url: str, max_links: int = 20) -> list[str]:
    soup = BeautifulSoup(html, "lxml")
    base_domain = urlparse(base_url).netloc
    links = set()
    for a in soup.find_all("a", href=True):
        href = a["href"]
        full = urljoin(base_url, href)
        parsed = urlparse(full)
        if parsed.netloc == base_domain and parsed.scheme in ("http", "https"):
            links.add(full.split("#")[0].rstrip("/"))
        if len(links) >= max_links:
            break
    return list(links)


def diff_content(old_text: str, new_text: str) -> dict:
    old_words = set(old_text.lower().split())
    new_words = set(new_text.lower().split())
    added = new_words - old_words
    removed = old_words - new_words
    return {
        "added_word_count": len(added),
        "removed_word_count": len(removed),
        "significant": len(added) > 20 or len(removed) > 20,
        "sample_added": list(added)[:30],
    }


async def scrape_competitor(competitor: dict, max_pages: int = 5) -> dict:
    base_url = competitor["website"]
    html = await fetch_page(base_url)
    if not html:
        return {"error": "Could not fetch homepage", "pages_scanned": 0, "changes": []}

    pages_data = []
    main_text = extract_text(html)
    pages_data.append({"url": base_url, "text": main_text, "hash": content_hash(main_text)})

    links = extract_links(html, base_url, max_links=max_pages * 2)
    for link in links[:max_pages - 1]:
        page_html = await fetch_page(link)
        if page_html:
            text = extract_text(page_html)
            pages_data.append({"url": link, "text": text, "hash": content_hash(text)})

    return {"pages": pages_data, "pages_scanned": len(pages_data), "error": None}
