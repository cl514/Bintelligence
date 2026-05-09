import json
import re
from datetime import datetime
from pathlib import Path
from typing import List, Optional
from uuid import uuid4

import httpx
from bs4 import BeautifulSoup
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from openai import OpenAI
from pydantic import BaseModel

from config_manager import load_config

router = APIRouter(prefix="/api/ads", tags=["ads"])

DATA_DIR = Path(__file__).parent.parent / "data"
ADS_FILE = DATA_DIR / "ads.json"
SCREENSHOT_DIR = DATA_DIR / "ad_screenshots"
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)


def _ensure_ads_file() -> None:
    ADS_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not ADS_FILE.exists():
        ADS_FILE.write_text("[]", encoding="utf-8")


def _load_ads() -> List[dict]:
    _ensure_ads_file()
    with ADS_FILE.open("r", encoding="utf-8") as f:
        return json.load(f)


def _save_ads(ads: List[dict]) -> None:
    ADS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with ADS_FILE.open("w", encoding="utf-8") as f:
        json.dump(ads, f, indent=2, ensure_ascii=False)


def _normalize_url(url: str) -> str:
    text = url.strip()
    if not re.match(r"^https?://", text, re.IGNORECASE):
        text = f"https://{text}"
    return text


def _truncate(text: str, limit: int = 3000) -> str:
    return text[:limit]


def _strip_html(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    return _truncate(soup.get_text(separator="\n", strip=True), 3000)


async def _fetch_landing_page(url: str) -> str:
    normalized = _normalize_url(url)
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(normalized)
            response.raise_for_status()
            return _strip_html(response.text)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Landing page fetch failed: {exc}")


def _get_screenshot_path(filename: str) -> Path:
    extension = Path(filename).suffix or ".png"
    return SCREENSHOT_DIR / f"{uuid4().hex}{extension}"


async def _save_screenshot(file: UploadFile) -> str:
    path = _get_screenshot_path(file.filename or "screenshot.png")
    contents = await file.read()
    path.write_bytes(contents)
    return path.name


def _build_analysis_prompt(ad_copy: str, landing_page_text: str) -> str:
    return (
        "You are an ad intelligence analyst. Analyze the ad copy and landing page text below.\n\n"
        "Ad copy:\n"
        f"{ad_copy}\n\n"
        "Landing page text:\n"
        f"{landing_page_text}\n\n"
        "Extract the following fields and return a single valid JSON object only:\n"
        "  hook: one sentence summary of the main hook\n"
        "  pain_points: list of the main pain points the ad addresses\n"
        "  cta: the call-to-action\n"
        "  tone: the overall tone of the ad\n"
        "  format: the ad format or style\n"
        "  landing_page_structure: brief description of the landing page structure\n"
        "  key_insights: list of the most important insights from the ad and page\n"
    )


async def _analyze_with_ai(ad_copy: str, landing_page_text: str, api_key: str) -> dict:
    if not api_key:
        raise HTTPException(status_code=400, detail="OpenAI API key is not configured.")
    prompt = _build_analysis_prompt(ad_copy, landing_page_text)
    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"AI analysis failed: {exc}")


class AdAnalyzeRequest(BaseModel):
    ad_copy: str
    landing_page_url: str


@router.get("")
def list_ads(competitor_id: Optional[str] = None):
    ads = _load_ads()
    if competitor_id:
        ads = [a for a in ads if a.get("competitor_id") == competitor_id]
    return ads


@router.post("")
async def create_ad(
    competitor_id: str = Form(...),
    ad_copy: str = Form(...),
    landing_page_url: str = Form(...),
    notes: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    screenshot: Optional[UploadFile] = File(None),
):
    screenshot_filename = None
    if screenshot is not None:
        screenshot_filename = await _save_screenshot(screenshot)

    entry = {
        "id": uuid4().hex,
        "competitor_id": competitor_id,
        "ad_copy": ad_copy,
        "landing_page_url": _normalize_url(landing_page_url),
        "screenshot_filename": screenshot_filename,
        "notes": notes or "",
        "tags": [t.strip() for t in tags.split(",")] if tags else [],
        "created_at": datetime.utcnow().isoformat() + "Z",
        "updated_at": datetime.utcnow().isoformat() + "Z",
    }
    ads = _load_ads()
    ads.append(entry)
    _save_ads(ads)
    return entry


@router.post("/analyze")
async def analyze_ad(payload: AdAnalyzeRequest):
    text = await _fetch_landing_page(payload.landing_page_url)
    api_key = load_config().get("openai_api_key", "")
    analysis = await _analyze_with_ai(payload.ad_copy, text, api_key)
    return {"analysis": analysis, "landing_page_text": text}


@router.delete("/{ad_id}")
def delete_ad(ad_id: str):
    ads = _load_ads()
    before = len(ads)
    ads = [a for a in ads if a.get("id") != ad_id]
    if len(ads) == before:
        raise HTTPException(status_code=404, detail="Ad not found")
    _save_ads(ads)
    return {"status": "deleted"}
