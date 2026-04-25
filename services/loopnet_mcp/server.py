"""
LoopNet MCP Server
==================
FastAPI REST service. Deployed to Railway as a standalone HTTP service.
Landscaper calls the /api/* REST endpoints.

Anti-detection:
  - curl_cffi with Chrome 136 TLS fingerprint (primary)
  - nodriver headless Chrome (Akamai JS challenge fallback)

Endpoints:
  GET  /health
  POST /api/search   → loopnet_search_listings
  POST /api/detail   → loopnet_get_listing_detail
  POST /api/similar  → loopnet_search_similar
"""

import logging
import os
from typing import Any, Dict, Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, ConfigDict, field_validator

from scraper import search_listings, get_detail, search_similar, PROPERTY_TYPE_MAP

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ─── Request models ────────────────────────────────────────────────────────────


class SearchFilters(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    min_units: Optional[int] = Field(None, ge=1)
    max_units: Optional[int] = Field(None, ge=1)
    min_year_built: Optional[int] = Field(None, ge=1800, le=2030)
    max_year_built: Optional[int] = Field(None, ge=1800, le=2030)


class SearchRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    location: str = Field(..., min_length=2, max_length=200)
    property_type: str = Field(default="Multifamily")
    filters: Optional[SearchFilters] = None
    max_results: int = Field(default=10, ge=1, le=25)

    @field_validator("property_type")
    @classmethod
    def normalize(cls, v: str) -> str:
        return v.strip().title()


class DetailRequest(BaseModel):
    listing_url: str


class SimilarRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    location: str = Field(..., min_length=2)
    units: Optional[int] = Field(None, ge=1)
    year_built_before: Optional[int] = Field(None, ge=1800, le=2030)
    year_built_after: Optional[int] = Field(None, ge=1800, le=2030)
    max_price: Optional[float] = Field(None, ge=0)
    radius_miles: float = Field(default=5.0, ge=0.5, le=50)
    max_results: int = Field(default=10, ge=1, le=25)


# ─── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="LoopNet MCP",
    description="curl_cffi + nodriver LoopNet scraper for Landscaper AI",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "loopnet_mcp", "version": "1.1.0"}


@app.post("/api/search")
async def api_search(req: SearchRequest):
    try:
        filters: Dict[str, Any] = {}
        if req.filters:
            f = req.filters
            for k, v in {
                "min_price": f.min_price,
                "max_price": f.max_price,
                "min_units": f.min_units,
                "max_units": f.max_units,
                "min_year_built": f.min_year_built,
                "max_year_built": f.max_year_built,
            }.items():
                if v is not None:
                    filters[k] = v

        result = await search_listings(
            location=req.location,
            property_type=req.property_type,
            filters=filters,
            max_results=req.max_results,
        )
        return JSONResponse(content=result)
    except Exception as e:
        logger.exception("Search failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/detail")
async def api_detail(req: DetailRequest):
    if "loopnet.com" not in req.listing_url.lower():
        raise HTTPException(status_code=400, detail="Invalid LoopNet URL")
    try:
        result = await get_detail(req.listing_url)
        return JSONResponse(content=result)
    except Exception as e:
        logger.exception("Detail fetch failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/similar")
async def api_similar(req: SimilarRequest):
    try:
        result = await search_similar(
            location=req.location,
            units=req.units,
            year_built_before=req.year_built_before,
            year_built_after=req.year_built_after,
            max_price=req.max_price,
            max_results=req.max_results,
        )
        return JSONResponse(content=result)
    except Exception as e:
        logger.exception("Similar search failed")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Debug endpoint (TEMPORARY — remove once parser is tuned) ─────────────────


class DebugRequest(BaseModel):
    location: str = Field(..., min_length=2)
    property_type: str = Field(default="Multifamily")
    force_nodriver: bool = False


@app.post("/api/debug")
async def api_debug(req: DebugRequest):
    """Diagnostic — fetches the search URL and returns HTML stats + sample.
    Default path = curl_cffi (same as /api/search). force_nodriver=true skips
    curl_cffi and exercises the nodriver fallback directly. For parser tuning only."""
    import re
    from bs4 import BeautifulSoup
    from curl_cffi.requests import AsyncSession
    from scraper import (
        AKAMAI_SIGNALS, HEADERS, IMPERSONATE, LOOPNET_BASE,
        _is_akamai_challenge, _nodriver_fetch, build_search_url,
    )

    url = build_search_url(req.location, req.property_type, {})
    final_url = url
    status_code: Optional[int] = None

    if req.force_nodriver:
        html = await _nodriver_fetch(url)
        fetch_path = "nodriver"
    else:
        async with AsyncSession(impersonate=IMPERSONATE) as session:
            try:
                await session.get(LOOPNET_BASE, headers=HEADERS, timeout=15)
            except Exception:
                pass
            resp = await session.get(url, headers=HEADERS, timeout=30, allow_redirects=True)
            html = resp.text
            status_code = resp.status_code
            final_url = str(resp.url)
        fetch_path = "curl_cffi"

    soup = BeautifulSoup(html, "lxml")

    placard_articles = len(soup.find_all("article", class_=re.compile(r"placard|listing-card", re.I)))
    listing_lis = len(soup.find_all("li", class_=re.compile(r"placard|listing", re.I)))
    listing_card_divs = len(soup.find_all("div", class_=re.compile(r"ListingCard|property-record", re.I)))

    article_classes = list({" ".join(a.get("class", [])) for a in soup.find_all("article")[:20]})
    li_classes = list({" ".join(li.get("class", [])) for li in soup.find_all("li", class_=True)[:30]})

    signals_seen = [s for s in AKAMAI_SIGNALS if s.lower() in html.lower()]

    return {
        "url_built": url,
        "url_final": final_url,
        "status_code": status_code,
        "fetch_path": fetch_path,
        "html_length": len(html),
        "is_akamai_detected": _is_akamai_challenge(html),
        "akamai_signals_seen": signals_seen,
        "card_counts": {
            "article_placard": placard_articles,
            "li_listing": listing_lis,
            "div_listing_card": listing_card_divs,
        },
        "article_classes_sample": article_classes,
        "li_classes_sample": li_classes,
        "html_sample": html[:5000],
    }


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("server:app", host="0.0.0.0", port=port, log_level="info")
