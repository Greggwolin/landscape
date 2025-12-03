from __future__ import annotations

import json
import logging
import subprocess
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Dict, List, Tuple
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from .schemas import BuilderRecon, FieldCoverage, ListingCoverage, PlanCoverage
from ..common import HttpClient, RobotsInfo, fetch_robots

LennarPhoenixURL = "https://phxlennar.com/"


def run_lennar_adapter(builder: Dict[str, any], config: Dict[str, any]) -> BuilderRecon:
    # Run existing Lennar offerings CLI and interpret results.
    tmp_config = {
        "target_market": builder.get("builder_name", "Lennar"),
        "entry_url": LennarPhoenixURL,
        "max_communities": config["max_communities_per_builder"],
        "max_plans_per_community": config["max_plans_per_builder"],
        "max_listings_per_community": config["max_listings_per_builder"],
        "user_agent": f"LandscapeReconBot/0.1 ({builder.get('builder_name')} recon)",
        "respect_robots_txt": config["respect_robots_txt"],
        "request_delay_seconds": config["request_delay_seconds"],
    }
    result_json = ""
    try:
        completed = subprocess.run(
            [
                "python3",
                "-m",
                "backend.tools.lennar_offerings.run_lennar_offerings",
            ],
            input=json.dumps(tmp_config),
            text=True,
            capture_output=True,
            check=True,
        )
        result_json = completed.stdout
    except subprocess.CalledProcessError as exc:
        logging.error("Lennar adapter failed: %s", exc.stderr)
    offerings = {}
    try:
        for line in reversed(result_json.splitlines()):
            if not line.strip().startswith("{"):
                continue
            try:
                offerings = json.loads(line)
                break
            except json.JSONDecodeError:
                continue
        if not offerings and "{" in result_json:
            snippet = result_json[result_json.find("{") :]
            try:
                offerings = json.loads(snippet)
            except json.JSONDecodeError:
                offerings = {}
    except Exception:
        offerings = {}
    communities = offerings.get("communities", [])
    has_price = any(c.get("price_min") or c.get("price_max") for c in communities)
    has_sqft = any(c.get("sqft_min") or c.get("sqft_max") for c in communities)
    has_beds = any(c.get("beds_min") or c.get("beds_max") for c in communities)
    coverage = {
        "community": asdict(
            FieldCoverage(
                has_price_range=bool(has_price),
                has_sqft_range=bool(has_sqft),
                has_bed_bath_range=bool(has_beds),
                has_hoa_or_fees=False,
                has_location_data=any(c.get("city") or c.get("state") for c in communities),
            )
        ),
        "plan": asdict(PlanCoverage(accessible=False)),
        "listing": asdict(ListingCoverage(accessible=False)),
    }
    crawl_stats = {
        "communities_sampled": len(communities),
        "plans_sampled": len(offerings.get("plans", [])),
        "listings_sampled": len(offerings.get("listings", [])),
        "total_http_requests": offerings.get("run_metadata", {}).get("total_http_requests", 0),
        "errors": 0,
    }
    legal = {
        "robots_url": offerings.get("legal_assessment", {}).get("robots_txt_url", ""),
        "robots_summary": offerings.get("legal_assessment", {}).get("robots_txt_summary", ""),
        "risk_level": offerings.get("legal_assessment", {}).get("risk_level", "UNKNOWN"),
        "notes": offerings.get("legal_assessment", {}).get("risk_rationale", ""),
    }
    notes = ""
    if communities:
        notes = f"Example community: {communities[0].get('url','')}"
    return BuilderRecon(
        rank=builder.get("rank", 0),
        builder_name=builder.get("builder_name", "Lennar"),
        canonical_domain=builder.get("canonical_domain", ""),
        scraper_status="HAS_MINER",
        legal_assessment=legal,
        field_coverage=coverage,
        crawl_stats=crawl_stats,
        notes=notes,
    )


def _detect_fields_from_html(html: str) -> Tuple[FieldCoverage, int]:
    soup = BeautifulSoup(html, "lxml")
    text = soup.get_text(" ", strip=True)
    has_price = "$" in text or "Price" in text
    has_sqft = "sq" in text.lower()
    has_beds = "bed" in text.lower()
    has_baths = "bath" in text.lower()
    has_location = "az" in text.lower() or "phoenix" in text.lower()
    tiles = soup.find_all(class_=lambda c: c and any(k in c.lower() for k in ["community", "card", "home"]))
    tile_count = len(tiles) if tiles else 0
    return (
        FieldCoverage(
            has_price_range=has_price,
            has_sqft_range=has_sqft,
            has_bed_bath_range=has_beds or has_baths,
            has_hoa_or_fees=False,
            has_location_data=has_location,
        ),
        tile_count,
    )


GENERIC_PATHS = [
    "/new-homes",
    "/new-homes/arizona/phoenix",
    "/phoenix-az",
    "/phoenix",
]

def run_meritage_adapter(
    builder: Dict[str, any],
    config: Dict[str, any],
    client: HttpClient,
) -> BuilderRecon:
    start_url = urljoin(builder.get("canonical_domain", ""), "/state/az/phoenix")
    legal = fetch_robots(client, start_url, [start_url], client.client.headers.get("User-Agent", "Mozilla"))
    coverage = FieldCoverage()
    errors = 0
    communities_sampled = 0
    try:
        resp = client.get(start_url)
        if resp and resp.status_code < 400 and resp.text:
            soup = BeautifulSoup(resp.text, "lxml")
            text = soup.get_text(" ", strip=True).lower()
            if "$" in text:
                coverage.has_price_range = True
            if "sq" in text:
                coverage.has_sqft_range = True
            if "bed" in text or "bath" in text:
                coverage.has_bed_bath_range = True
            script = soup.find("script", id="__NEXT_DATA__")
            if script and script.string:
                data = json.loads(script.string)
                props = data.get("props", {})
                page_props = props.get("pageProps", {})
                apollo_state = page_props.get("__APOLLO_STATE__", {})
                # find entries that look like community data in APOLLO_STATE
                # heuristic: objects with priceRange or basePrice fields
                for val in apollo_state.values():
                    if not isinstance(val, dict):
                        continue
                    if val.get("__typename", "").lower().endswith("homesummary"):
                        price_min = val.get("priceRange", {}).get("start") or val.get("basePrice")
                        sqft_min = val.get("squareFootageRange", {}).get("start") or val.get("squareFootage")
                        beds = val.get("bedrooms")
                        baths = val.get("bathrooms")
                        coverage.has_price_range = coverage.has_price_range or bool(price_min)
                        coverage.has_sqft_range = coverage.has_sqft_range or bool(sqft_min)
                        coverage.has_bed_bath_range = coverage.has_bed_bath_range or bool(beds or baths)
                        coverage.has_location_data = True
                        communities_sampled += 1
    except Exception as exc:  # noqa: BLE001
        logging.debug("Meritage adapter parse error: %s", exc)
        errors += 1

    field_coverage = {
        "community": asdict(coverage),
        "plan": asdict(PlanCoverage(accessible=False)),
        "listing": asdict(ListingCoverage(accessible=False)),
    }
    crawl_stats = {
        "communities_sampled": min(communities_sampled, config["max_communities_per_builder"]),
        "plans_sampled": 0,
        "listings_sampled": 0,
        "total_http_requests": client.request_count,
        "errors": errors,
    }
    legal_assessment = {
        "robots_url": legal.robots_url,
        "robots_summary": legal.summary,
        "risk_level": "LOW" if legal.allowed else "HIGH",
        "notes": "robots.txt missing or permissive" if legal.allowed else "robots.txt restricts crawl",
    }
    scraper_status = "READY_FOR_RECON" if communities_sampled > 0 else "NOT_EVALUATED"
    notes = f"Probed Meritage metro page: {start_url}"
    return BuilderRecon(
        rank=builder.get("rank", 0),
        builder_name=builder.get("builder_name", ""),
        canonical_domain=builder.get("canonical_domain", ""),
        scraper_status=scraper_status,
        legal_assessment=legal_assessment,
        field_coverage=field_coverage,
        crawl_stats=crawl_stats,
        notes=notes,
    )


def run_generic_adapter(
    builder: Dict[str, any],
    config: Dict[str, any],
    client: HttpClient,
) -> BuilderRecon:
    base = builder.get("canonical_domain", "")
    start_url = base
    legal = fetch_robots(client, base, [base], client.client.headers.get("User-Agent", "Mozilla"))
    coverage = FieldCoverage()
    tile_count = 0
    errors = 0
    for path in GENERIC_PATHS:
        url = urljoin(base + "/", path.lstrip("/"))
        if config["respect_robots_txt"] and not legal.allowed:
            break
        try:
            resp = client.get(url)
            if resp and resp.status_code < 400 and resp.text:
                coverage, tile_count = _detect_fields_from_html(resp.text)
                start_url = url
                break
            else:
                errors += 1
        except Exception as exc:  # noqa: BLE001
            logging.debug("Generic adapter failed %s: %s", url, exc)
            errors += 1
    field_coverage = {
        "community": asdict(coverage),
        "plan": asdict(PlanCoverage(accessible=False)),
        "listing": asdict(ListingCoverage(accessible=False)),
    }
    crawl_stats = {
        "communities_sampled": min(tile_count, config["max_communities_per_builder"]),
        "plans_sampled": 0,
        "listings_sampled": 0,
        "total_http_requests": client.request_count,
        "errors": errors,
    }
    legal_assessment = {
        "robots_url": legal.robots_url,
        "robots_summary": legal.summary,
        "risk_level": "LOW" if legal.allowed else "HIGH",
        "notes": "robots.txt missing or permissive" if legal.allowed else "robots.txt restricts crawl",
    }
    scraper_status = "READY_FOR_RECON" if tile_count > 0 else "NOT_EVALUATED"
    notes = f"Probed starting URL: {start_url}"
    return BuilderRecon(
        rank=builder.get("rank", 0),
        builder_name=builder.get("builder_name", ""),
        canonical_domain=base,
        scraper_status=scraper_status,
        legal_assessment=legal_assessment,
        field_coverage=field_coverage,
        crawl_stats=crawl_stats,
        notes=notes,
    )
