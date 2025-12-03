from __future__ import annotations

import json
import logging
import statistics
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Tuple

from bs4 import BeautifulSoup

from . import parser
from .schemas import CrawlSamples
from ..common import HttpClient


FIELD_DEFINITIONS: List[Dict[str, Any]] = [
    # Communities
    {
        "entity": "community",
        "field": "name",
        "source": "html_text",
        "selector_example": "h1, [data-testid='community-name']",
        "stability_risk": "LOW",
    },
    {
        "entity": "community",
        "field": "builder_name",
        "source": "html_text",
        "selector_example": ".builder-name",
        "stability_risk": "MEDIUM",
    },
    {
        "entity": "community",
        "field": "hoa_monthly",
        "source": "html_text",
        "selector_example": ".hoa-fee",
        "stability_risk": "MEDIUM",
    },
    {
        "entity": "community",
        "field": "city_state",
        "source": "html_text",
        "selector_example": ".community-address",
        "stability_risk": "LOW",
    },
    # Plans
    {
        "entity": "plan",
        "field": "plan_name",
        "source": "html_text",
        "selector_example": "h1, .plan-name",
        "stability_risk": "LOW",
    },
    {
        "entity": "plan",
        "field": "base_price",
        "source": "html_text",
        "selector_example": ".price",
        "stability_risk": "MEDIUM",
    },
    {
        "entity": "plan",
        "field": "beds_min",
        "source": "html_text",
        "selector_example": ".beds",
        "stability_risk": "LOW",
    },
    {
        "entity": "plan",
        "field": "baths_min",
        "source": "html_text",
        "selector_example": ".baths",
        "stability_risk": "LOW",
    },
    {
        "entity": "plan",
        "field": "sqft_min",
        "source": "html_text",
        "selector_example": ".sqft",
        "stability_risk": "LOW",
    },
    {
        "entity": "plan",
        "field": "product_type",
        "source": "json_ld",
        "selector_example": "script[type='application/ld+json']",
        "stability_risk": "MEDIUM",
    },
    # Listings
    {
        "entity": "listing",
        "field": "status",
        "source": "html_text",
        "selector_example": ".status",
        "stability_risk": "MEDIUM",
    },
    {
        "entity": "listing",
        "field": "price_current",
        "source": "html_text",
        "selector_example": ".price",
        "stability_risk": "MEDIUM",
    },
    {
        "entity": "listing",
        "field": "quick_move_in_date",
        "source": "html_text",
        "selector_example": ".qmi-date",
        "stability_risk": "MEDIUM",
    },
    {
        "entity": "listing",
        "field": "sqft_actual",
        "source": "html_text",
        "selector_example": ".sqft",
        "stability_risk": "LOW",
    },
    {
        "entity": "listing",
        "field": "address",
        "source": "html_text",
        "selector_example": "address",
        "stability_risk": "LOW",
    },
]


@dataclass
class FieldStat:
    seen_count: int = 0
    present_count: int = 0
    parsed_count: int = 0


class FieldTracker:
    def __init__(self) -> None:
        self.stats: Dict[Tuple[str, str], FieldStat] = {
            (item["entity"], item["field"]): FieldStat()
            for item in FIELD_DEFINITIONS
        }

    def record(self, entity: str, parsed_fields: Dict[str, Any]) -> None:
        for item in FIELD_DEFINITIONS:
            if item["entity"] != entity:
                continue
            key = (entity, item["field"])
            stat = self.stats[key]
            stat.seen_count += 1
            value = parsed_fields.get(item["field"])
            present = value is not None and value != ""
            if present:
                stat.present_count += 1
                stat.parsed_count += 1

    def to_matrix(self) -> List[Dict[str, Any]]:
        matrix = []
        for item in FIELD_DEFINITIONS:
            key = (item["entity"], item["field"])
            stat = self.stats.get(key, FieldStat())
            denominator = max(stat.seen_count, 1)
            present_ratio = stat.present_count / denominator
            parseable_ratio = stat.parsed_count / denominator
            matrix.append(
                {
                    "entity": item["entity"],
                    "field": item["field"],
                    "present_ratio": round(present_ratio, 3),
                    "parseable_ratio": round(parseable_ratio, 3),
                    "source": item["source"],
                    "selector_example": item["selector_example"],
                    "stability_risk": item["stability_risk"],
                }
            )
        return matrix


def _collect_phrases(text: str, keywords: Iterable[str]) -> List[str]:
    phrases = []
    lower = text.lower()
    for keyword in keywords:
        if keyword.lower() in lower:
            phrases.append(keyword)
    return phrases


def analyze_tos(html: str) -> List[str]:
    soup = BeautifulSoup(html, "lxml")
    text = soup.get_text(" ", strip=True)
    keywords = [
        "automated",
        "scraping",
        "robot",
        "data mining",
        "personal use",
        "crawl",
    ]
    found = _collect_phrases(text, keywords)
    snippets = []
    for keyword in found:
        idx = text.lower().find(keyword.lower())
        if idx != -1:
            start = max(0, idx - 60)
            end = min(len(text), idx + 120)
            snippets.append(text[start:end].strip())
    return snippets or ["No explicit scraping language found."]


def evaluate_mapping(field_matrix: List[Dict[str, Any]]) -> Dict[str, Any]:
    def score_for_entity(entity: str, field_names: List[str]) -> Tuple[float, List[str]]:
        entries = [row for row in field_matrix if row["entity"] == entity]
        usable = [
            row for row in entries if row["field"] in field_names and row["parseable_ratio"] >= 0.3
        ]
        if not usable:
            return 0.0, []
        coverage = statistics.mean(row["parseable_ratio"] for row in usable)
        solid_fields = [row["field"] for row in usable if row["parseable_ratio"] >= 0.5]
        return round(coverage, 3), solid_fields

    comm_score, comm_fields = score_for_entity(
        "community",
        ["name", "builder_name", "city_state", "hoa_monthly"],
    )
    plan_score, plan_fields = score_for_entity(
        "plan",
        ["plan_name", "base_price", "beds_min", "baths_min", "sqft_min", "product_type"],
    )
    listing_score, listing_fields = score_for_entity(
        "listing",
        ["status", "price_current", "sqft_actual", "quick_move_in_date", "address"],
    )
    overall = statistics.mean([comm_score, plan_score, listing_score]) if any(
        [comm_score, plan_score, listing_score]
    ) else 0.0
    return {
        "nhs_community": {
            "coverage_score": comm_score,
            "fields_mappable": comm_fields,
            "notes": "Community info captured from headers and address blocks; HOA may be sparse.",
        },
        "nhs_plan": {
            "coverage_score": plan_score,
            "fields_mappable": plan_fields,
            "notes": "Plan metadata available on most sampled pages; pricing sometimes in JSON-LD.",
        },
        "nhs_listing": {
            "coverage_score": listing_score,
            "fields_mappable": listing_fields,
            "notes": "Status and price captured when inventory pages exist.",
        },
        "bmk_new_home_offerings": {
            "coverage_score": round(statistics.mean(
                [s for s in [comm_score, plan_score, listing_score] if s > 0]
            ), 3) if any([comm_score, plan_score, listing_score]) else 0.0,
            "notes": "Sufficient signal to build benchmarks if legal posture allows.",
        },
        "overall_fit_score": round(overall, 3),
    }


def volatility_check(
    client: HttpClient,
    listing_urls: List[str],
    delay_seconds: float,
) -> Dict[str, Any]:
    if not listing_urls:
        return {
            "sampling_window_minutes": 0,
            "price_change_events_observed": 0,
            "listing_status_changes_observed": 0,
            "commentary": "No listing pages sampled; volatility not measured.",
        }
    baseline: Dict[str, Dict[str, Any]] = {}
    for url in listing_urls:
        try:
            resp = client.get(url)
            if resp and resp.status_code < 400:
                data = parser.parse_listing_page(resp.text)
                baseline[url] = {
                    "price_current": data.get("price_current"),
                    "status": data.get("status"),
                }
        except Exception as exc:  # noqa: BLE001
            logging.debug("Volatility baseline fetch failed for %s: %s", url, exc)
    window_start = datetime.now(timezone.utc)
    time.sleep(max(delay_seconds, 0))
    price_changes = 0
    status_changes = 0
    for url, initial in baseline.items():
        try:
            resp = client.get(url)
            if resp and resp.status_code < 400:
                data = parser.parse_listing_page(resp.text)
                if data.get("price_current") != initial.get("price_current"):
                    price_changes += 1
                if (data.get("status") or "").lower() != (initial.get("status") or "").lower():
                    status_changes += 1
        except Exception as exc:  # noqa: BLE001
            logging.debug("Volatility recheck failed for %s: %s", url, exc)
    window_minutes = int(
        round((datetime.now(timezone.utc) - window_start).total_seconds() / 60)
    )
    commentary = (
        "Single-pass delta check; low counts can mean either stability or a narrow sampling window."
    )
    return {
        "sampling_window_minutes": window_minutes,
        "price_change_events_observed": price_changes,
        "listing_status_changes_observed": status_changes,
        "commentary": commentary,
    }


def build_final_recommendation(
    legal_risk_level: str, fit_score: float
) -> Tuple[str, str, List[str]]:
    if legal_risk_level == "HIGH":
        return (
            "NO_GO",
            "Robots/ToS restrictions signal high legal risk; do not proceed without counsel approval.",
            [
                "Have counsel review robots.txt and ToS language before any further ingestion.",
                "Pause automation until explicit permission is secured.",
            ],
        )
    if legal_risk_level == "MEDIUM" and fit_score >= 0.5:
        return (
            "LIMITED_GO",
            "Data quality is workable but legal language is cautionary; proceed with throttled, read-only discovery.",
            [
                "Confirm permissible use with counsel using the highlighted ToS phrases.",
                "Limit to benchmark-style aggregation without user-facing listing exposure.",
            ],
        )
    if fit_score >= 0.6:
        return (
            "GO",
            "Robots/ToS signals are acceptable and coverage is strong enough for benchmarks.",
            [
                "Implement ingestion with conservative rate limits.",
                "Add monitoring for selector drift on pricing and availability fields.",
            ],
        )
    return (
        "LIMITED_GO",
        "Coverage is partial; restrict automation to exploratory sampling while maturing parsers.",
        [
            "Expand selector set for price and status fields.",
            "Increase sampling breadth before moving to production ingestion.",
        ],
    )


def build_markdown(
    target_market: str,
    legal: Dict[str, Any],
    mapping: Dict[str, Any],
    final_reco: Dict[str, Any],
) -> str:
    return "\n".join(
        [
            f"## NewHomeSource Recon Report – {target_market}",
            "",
            "### 1. Legal / ToS Snapshot",
            "",
            f"- Risk level: {legal.get('risk_level')}",
            f"- Recommended policy: {legal.get('recommended_policy')}",
            "- Key phrases:",
            *(f"  - {phrase}" for phrase in legal.get("tos_key_phrases", [])),
            "",
            "### 2. Site Structure",
            "",
            "- Community coverage score: "
            f"{mapping.get('nhs_community', {}).get('coverage_score', 0)}",
            "- Plan coverage score: "
            f"{mapping.get('nhs_plan', {}).get('coverage_score', 0)}",
            "- Listing coverage score: "
            f"{mapping.get('nhs_listing', {}).get('coverage_score', 0)}",
            "",
            "### 3. Field Coverage",
            "",
            "- Overall fit score: "
            f"{mapping.get('overall_fit_score', 0)}",
            "",
            "### 4. Recommendation",
            "",
            f"- {final_reco.get('summary')}",
            "- Next steps:",
            *(f"  - {step}" for step in final_reco.get("next_steps", [])),
            "",
        ]
    )
