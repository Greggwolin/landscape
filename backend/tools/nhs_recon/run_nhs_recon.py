import argparse
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

from .analysis import (
    FieldTracker,
    analyze_tos,
    build_final_recommendation,
    build_markdown,
    evaluate_mapping,
    volatility_check,
)
from .config import ReconConfig, load_config
from .schemas import CrawlSamples
from .sampler import ReconSampler
from ..common import HttpClient, RobotsInfo, fetch_robots, tos_url


def setup_logging() -> None:
    logs_dir = Path("backend/tools/nhs_recon/logs")
    logs_dir.mkdir(parents=True, exist_ok=True)
    log_file = logs_dir / "nhs_recon.log"
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=[logging.FileHandler(log_file), logging.StreamHandler(sys.stdout)],
    )


def determine_legal_assessment(
    robots_info: RobotsInfo,
    tos_phrases: List[str],
    respect_robots: bool,
    tos_page_url: str,
) -> Dict[str, Any]:
    risk_level = "LOW"
    risk_rationale = "Robots and ToS do not explicitly restrict automated access."
    recommended_policy = "GO"
    if respect_robots and not robots_info.allowed:
        risk_level = "HIGH"
        risk_rationale = "robots.txt denies access to key paths for this crawl."
        recommended_policy = "NO_GO"
    elif any("automated" in phrase.lower() or "scraping" in phrase.lower() for phrase in tos_phrases):
        risk_level = "MEDIUM"
        risk_rationale = "ToS contains language related to automated access; proceed cautiously."
        recommended_policy = "LIMITED_GO"
    return {
        "robots_txt_url": robots_info.robots_txt_url,
        "robots_txt_summary": robots_info.summary,
        "tos_url": tos_page_url,
        "tos_key_phrases": tos_phrases,
        "risk_level": risk_level,
        "risk_rationale": risk_rationale,
        "recommended_policy": recommended_policy,
    }


def build_site_structure(
    config: ReconConfig,
    community_urls: List[str],
    plan_urls: List[str],
    listing_urls: List[str],
) -> Dict[str, Any]:
    return {
        "page_types": [
            {
                "type": "metro_index",
                "example_urls": [config.metro_entry_url],
                "url_pattern_hint": "/{metro-slug}/new-homes",
                "typical_selectors": {
                    "community_cards": ".community-tile",
                    "community_link": "a[href*='/community/']",
                },
            },
            {
                "type": "community",
                "example_urls": community_urls[:3],
                "url_pattern_hint": "contains '/community/'",
                "typical_selectors": {
                    "community_name": "h1",
                    "builder_name": ".builder-name",
                    "plan_cards": "a[href*='/plan/']",
                },
            },
            {
                "type": "plan",
                "example_urls": plan_urls[:3],
                "url_pattern_hint": "contains '/plan/'",
                "typical_selectors": {
                    "plan_name": "h1",
                    "beds": "[data-testid='beds']",
                    "baths": "[data-testid='baths']",
                    "sqft": "[data-testid='sqft']",
                    "base_price": ".price",
                },
            },
            {
                "type": "inventory_home",
                "example_urls": listing_urls[:3],
                "url_pattern_hint": "contains '/spechome/' or similar",
                "typical_selectors": {
                    "address": ".address",
                    "status": ".status",
                    "price": ".price",
                },
            },
        ],
        "identifier_hints": {
            "community_id_patterns": [u for u in community_urls[:5] if "/community/" in u],
            "plan_id_patterns": [u for u in plan_urls[:5] if "/plan/" in u],
            "listing_id_patterns": [u for u in listing_urls[:5] if "spec" in u or "spechome" in u],
        },
    }


def main() -> None:
    parser_cli = argparse.ArgumentParser(description="Run NewHomeSource recon agent.")
    parser_cli.add_argument("--config-path", type=str, help="Path to recon config JSON.")
    args = parser_cli.parse_args()
    try:
        setup_logging()
        config = load_config(args.config_path)
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to load config: {exc}", file=sys.stderr)
        sys.exit(1)

    run_started_at = datetime.now(timezone.utc)
    client = HttpClient(
        user_agent=config.user_agent, request_delay_seconds=config.request_delay_seconds
    )
    field_tracker = FieldTracker()
    sampler = ReconSampler(config=config, client=client, field_tracker=field_tracker)
    robots_info = fetch_robots(
        client, config.metro_entry_url, [config.metro_entry_url], config.user_agent
    )
    tos_page_html = ""
    tos_page_url = tos_url(config.metro_entry_url)
    try:
        tos_resp = client.get(tos_page_url)
        if tos_resp and tos_resp.status_code < 400:
            tos_page_html = tos_resp.text
    except Exception:
        tos_page_html = ""
    tos_phrases = analyze_tos(tos_page_html) if tos_page_html else []
    legal_assessment = determine_legal_assessment(
        robots_info, tos_phrases, config.respect_robots_txt, tos_page_url
    )
    samples = CrawlSamples()
    if not (config.respect_robots_txt and not robots_info.allowed):
        samples = sampler.crawl()
    field_matrix = field_tracker.to_matrix()
    mapping = evaluate_mapping(field_matrix)
    volatility = volatility_check(
        client,
        samples.all_listing_urls()[:3],
        config.request_delay_seconds,
    )
    recommendation, summary, next_steps = build_final_recommendation(
        legal_assessment["risk_level"], mapping.get("overall_fit_score", 0.0)
    )
    final_reco = {
        "recommendation": recommendation,
        "summary": summary,
        "next_steps": next_steps,
    }
    site_structure = build_site_structure(
        config,
        [sample.url for sample in samples.communities],
        [sample.url for sample in samples.plans],
        [sample.url for sample in samples.listings],
    )
    run_finished_at = datetime.now(timezone.utc)
    run_metadata = {
        "analysis_version": "v1.0",
        "run_started_at": run_started_at.isoformat(),
        "run_finished_at": run_finished_at.isoformat(),
        "total_http_requests": client.request_count,
        "unique_communities_sampled": samples.unique_counts()["communities"],
        "unique_plans_sampled": samples.unique_counts()["plans"],
        "unique_listings_sampled": samples.unique_counts()["listings"],
    }
    report = {
        "source_system": "newhomesource",
        "target_market": config.target_market,
        "run_metadata": run_metadata,
        "legal_assessment": legal_assessment,
        "site_structure": site_structure,
        "field_matrix": field_matrix,
        "volatility_observations": volatility,
        "mapping_to_landscape_schema": mapping,
        "final_recommendation": final_reco,
        "human_readable_markdown": build_markdown(
            config.target_market, legal_assessment, mapping, final_reco
        ),
    }
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
