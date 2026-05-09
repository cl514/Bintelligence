import asyncio
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from config_manager import load_config, save_config
from database import get_scan_results, get_latest_scan, get_all_latest_scans, get_sitemap_pages_list
from research_runner import run_all_competitors, run_competitor_research
from sitemap_crawler import run_sitemap_crawl

app = FastAPI(title="Competitive Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

scheduler = AsyncIOScheduler()
running_jobs: dict[str, str] = {}  # job_id -> status


# ── Models ──────────────────────────────────────────────────────────────────

class Competitor(BaseModel):
    name: str
    website: str
    active: bool = True


class CompetitorUpdate(BaseModel):
    name: Optional[str] = None
    website: Optional[str] = None
    active: Optional[bool] = None


class ConfigUpdate(BaseModel):
    openai_api_key: Optional[str] = None
    slack_webhook_url: Optional[str] = None
    scan_frequency_hours: Optional[int] = None
    max_pages_per_site: Optional[int] = None
    news_lookback_days: Optional[int] = None


# ── Startup / Shutdown ──────────────────────────────────────────────────────

@app.on_event("startup")
async def startup():
    _reschedule()
    scheduler.start()


@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown(wait=False)


def _reschedule():
    config = load_config()
    hours = config.get("scan_frequency_hours", 24)
    scheduler.remove_all_jobs()
    scheduler.add_job(
        run_all_competitors,
        IntervalTrigger(hours=hours),
        id="auto_scan",
        replace_existing=True,
        kwargs={"post_slack": True},
    )


# ── Config endpoints ─────────────────────────────────────────────────────────

@app.get("/api/config")
def get_config():
    config = load_config()
    # Mask API key
    safe = dict(config)
    if safe.get("openai_api_key"):
        safe["openai_api_key"] = "***" + safe["openai_api_key"][-4:]
    return safe


@app.put("/api/config")
def update_config(updates: ConfigUpdate):
    config = load_config()
    data = updates.model_dump(exclude_none=True)
    # Don't overwrite masked key
    if data.get("openai_api_key", "").startswith("***"):
        data.pop("openai_api_key")
    config.update(data)
    save_config(config)
    _reschedule()
    return {"status": "ok"}


# ── Competitor endpoints ──────────────────────────────────────────────────────

@app.get("/api/competitors")
def list_competitors():
    return load_config().get("competitors", [])


@app.post("/api/competitors")
def add_competitor(competitor: Competitor):
    config = load_config()
    new_id = str(uuid.uuid4())[:8]
    entry = {"id": new_id, **competitor.model_dump()}
    config.setdefault("competitors", []).append(entry)
    save_config(config)
    return entry


@app.put("/api/competitors/{competitor_id}")
def update_competitor(competitor_id: str, updates: CompetitorUpdate):
    config = load_config()
    for comp in config.get("competitors", []):
        if comp["id"] == competitor_id:
            for k, v in updates.model_dump(exclude_none=True).items():
                comp[k] = v
            save_config(config)
            return comp
    raise HTTPException(404, "Competitor not found")


@app.delete("/api/competitors/{competitor_id}")
def delete_competitor(competitor_id: str):
    config = load_config()
    before = len(config.get("competitors", []))
    config["competitors"] = [c for c in config.get("competitors", []) if c["id"] != competitor_id]
    if len(config["competitors"]) == before:
        raise HTTPException(404, "Competitor not found")
    save_config(config)
    return {"status": "deleted"}


# ── Scan results ──────────────────────────────────────────────────────────────

@app.get("/api/results")
def get_all_results():
    latest = get_all_latest_scans()
    config = load_config()
    competitors = {c["id"]: c for c in config.get("competitors", [])}
    out = []
    for cid, scan in latest.items():
        comp = competitors.get(cid, {})
        out.append({**scan, "competitor_name": comp.get("name", cid), "website": comp.get("website", "")})
    return out


@app.get("/api/results/{competitor_id}")
def get_results(competitor_id: str, limit: int = 10):
    return get_scan_results(competitor_id, limit=limit)


# ── Run research ──────────────────────────────────────────────────────────────

@app.post("/api/run/all")
async def run_all(background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())[:8]
    running_jobs[job_id] = "running"

    async def _run():
        try:
            await run_all_competitors(post_slack=True)
            running_jobs[job_id] = "done"
        except Exception as e:
            running_jobs[job_id] = f"error: {e}"

    background_tasks.add_task(_run)
    return {"job_id": job_id, "status": "started"}


@app.post("/api/run/{competitor_id}")
async def run_one(competitor_id: str, background_tasks: BackgroundTasks):
    config = load_config()
    competitor = next((c for c in config.get("competitors", []) if c["id"] == competitor_id), None)
    if not competitor:
        raise HTTPException(404, "Competitor not found")

    job_id = str(uuid.uuid4())[:8]
    running_jobs[job_id] = "running"

    async def _run():
        try:
            await run_competitor_research(competitor, config)
            running_jobs[job_id] = "done"
        except Exception as e:
            running_jobs[job_id] = f"error: {e}"

    background_tasks.add_task(_run)
    return {"job_id": job_id, "status": "started"}


# ── Sitemap ───────────────────────────────────────────────────────────────────

@app.post("/api/sitemap/crawl/{competitor_id}")
async def crawl_sitemap(competitor_id: str, background_tasks: BackgroundTasks):
    config = load_config()
    competitor = next((c for c in config.get("competitors", []) if c["id"] == competitor_id), None)
    if not competitor:
        raise HTTPException(404, "Competitor not found")

    job_id = str(uuid.uuid4())[:8]
    running_jobs[job_id] = "running"

    async def _run():
        try:
            await run_sitemap_crawl(
                competitor_id,
                competitor["website"],
                config.get("openai_api_key", ""),
                config.get("slack_webhook_url", ""),
            )
            running_jobs[job_id] = "done"
        except Exception as e:
            running_jobs[job_id] = f"error: {e}"

    background_tasks.add_task(_run)
    return {"job_id": job_id, "status": "started"}


@app.get("/api/sitemap/{competitor_id}")
def get_sitemap(competitor_id: str):
    result = get_sitemap_pages_list(competitor_id)
    if not result:
        return {"competitor_id": competitor_id, "last_crawled": None, "pages_count": 0, "pages": []}
    return result


@app.get("/api/jobs/{job_id}")
def job_status(job_id: str):
    status = running_jobs.get(job_id, "not_found")
    return {"job_id": job_id, "status": status}


@app.get("/api/status")
def system_status():
    config = load_config()
    next_run = None
    job = scheduler.get_job("auto_scan")
    if job and job.next_run_time:
        next_run = job.next_run_time.isoformat()
    return {
        "scheduler_running": scheduler.running,
        "next_scheduled_run": next_run,
        "scan_frequency_hours": config.get("scan_frequency_hours", 24),
        "competitors_count": len(config.get("competitors", [])),
        "slack_configured": bool(config.get("slack_webhook_url")),
        "ai_configured": bool(config.get("openai_api_key")),
    }


# ── Serve React frontend ──────────────────────────────────────────────────────

FRONTEND_BUILD = Path(__file__).parent.parent / "frontend" / "dist"

if FRONTEND_BUILD.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_BUILD / "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        index = FRONTEND_BUILD / "index.html"
        return FileResponse(str(index))
