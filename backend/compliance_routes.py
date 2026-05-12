from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, HttpUrl

from config_manager import load_config, load_compliance_settings, save_compliance_settings
from compliance_manager import (
    find_brand_for_url,
    get_compliance_brand,
    get_compliance_brands,
)
from compliance_checker import run_compliance_checks_for_page
from database import (
    get_compliance_scan_history,
    get_latest_compliance_scan,
    save_compliance_scan,
)
from scraper import extract_links, fetch_page

router = APIRouter(prefix="/api/compliance", tags=["compliance"])


class BrandScanRequest(BaseModel):
    max_pages: int = Field(50, ge=1, le=500)
    include_manual_urls: bool = True


class UrlScanRequest(BaseModel):
    url: HttpUrl
    brand_id: Optional[str] = None


class ComplianceSettingsUpdate(BaseModel):
    llm_system_prompt: str


@router.get("/brands")
def list_brands():
    return get_compliance_brands()


@router.get("/brands/{brand_id}")
def get_brand(brand_id: str):
    brand = get_compliance_brand(brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")
    return brand


@router.post("/scan/brand/{brand_id}")
async def scan_brand(brand_id: str, request: BrandScanRequest):
    brand = get_compliance_brand(brand_id)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand not found")

    api_key = load_config().get("openai_api_key", "")
    if not api_key:
        raise HTTPException(status_code=400, detail="OpenAI API key is not configured.")

    pages = []
    crawled_urls = set()

    async def _crawl_domain(start_url: str, limit: int) -> List[Dict[str, Any]]:
        if not urlparse(start_url).scheme:
            start_url = f"https://{start_url}"
        queue = [start_url]
        results = []
        while queue and len(results) < limit:
            url = queue.pop(0)
            if url in crawled_urls:
                continue
            crawled_urls.add(url)
            html = await fetch_page(url)
            if not html:
                continue
            result = await run_compliance_checks_for_page(url, html, brand, api_key)
            results.append(result)
            if len(results) >= limit:
                break
            links = extract_links(html, url, max_links=20)
            for link in links:
                if link not in crawled_urls and len(results) + len(queue) < limit:
                    queue.append(link)
        return results

    for domain in brand.get("domains", []):
        pages.extend(await _crawl_domain(domain, request.max_pages))

    if request.include_manual_urls:
        for url in brand.get("manual_urls", []):
            if url in crawled_urls:
                continue
            html = await fetch_page(url)
            if not html:
                continue
            checks = await run_compliance_checks_for_page(url, html, brand, api_key)
            checks["is_manual_url"] = True
            pages.append(checks)

    scan = {
        "brand_id": brand_id,
        "brand_name": brand.get("name"),
        "timestamp": None,
        "pages": pages,
    }
    save_compliance_scan(brand_id, scan)
    return scan


@router.post("/scan/url")
async def scan_url(request: UrlScanRequest):
    brand = get_compliance_brand(request.brand_id) if request.brand_id else find_brand_for_url(request.url)
    if not brand:
        raise HTTPException(status_code=404, detail="Brand could not be determined for the requested URL.")

    api_key = load_config().get("openai_api_key", "")
    if not api_key:
        raise HTTPException(status_code=400, detail="OpenAI API key is not configured.")

    html = await fetch_page(str(request.url))
    if not html:
        raise HTTPException(status_code=400, detail="Could not fetch the requested URL.")

    checks = await run_compliance_checks_for_page(str(request.url), html, brand, api_key)
    return checks


@router.get("/reports/{brand_id}")
def get_report(brand_id: str):
    report = get_latest_compliance_scan(brand_id)
    if not report:
        raise HTTPException(status_code=404, detail="No compliance report found for brand")
    return report


@router.get("/settings")
def get_compliance_settings():
    return load_compliance_settings()


@router.put("/settings")
def update_compliance_settings(settings: ComplianceSettingsUpdate):
    current = load_compliance_settings()
    current.update(settings.model_dump(exclude_none=True))
    save_compliance_settings(current)
    return current


@router.get("/history/{brand_id}")
def get_history(brand_id: str):
    return get_compliance_scan_history(brand_id)
