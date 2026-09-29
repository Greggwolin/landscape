"""
Command-line entry point for the Landscape Market Analysis Engine (v1).
"""

from __future__ import annotations

import argparse
import sys
from collections import defaultdict
from datetime import date, datetime
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

from dateutil.parser import isoparse
from loguru import logger

from .bls_client import BlsClient
from .census_client import CensusClient
from .config import DEFAULT_BUNDLES, Settings, get_settings
from .db import Database, GeoRecord, SeriesMeta
from .fhfa_client import FhfaClient
from .fred_client import FredClient
from .geo import GeoResolver, GeoTarget
from .geo_bootstrap import FIPS_TO_ABBR
from .normalize import NormalizedObservation
from .provider_codes import resolve_provider_code
from .umich_client import UMichClient

# One process runs the refresh for every tracked geography in turn, and each run
# expands its geography up to the nation -- so a national series such as CPIAUCSL
# was requested once per geography, ~30 times a run. Publisher responses are
# memoised per process on (provider, code, window, frequency, geo_id).
_FETCH_MEMO: Dict[tuple, List[NormalizedObservation]] = {}


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Landscape Market Ingestion Engine (v1)")
    parser.add_argument("--project", help="Project location formatted as City,ST (e.g. Phoenix,AZ)")
    parser.add_argument("--geo-level", help="Explicit geo level (US|STATE|MSA|COUNTY|CITY)")
    parser.add_argument("--geo-id", help="Explicit geography identifier")
    parser.add_argument("--project-id", type=int, help="Optional internal project_id for lineage linkage")
    parser.add_argument("--series", nargs="+", help="One or more series codes to fetch")
    parser.add_argument("--bundle", help=f"Series bundle key (default: {get_settings().default_bundle})")
    parser.add_argument("--start", required=True, help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end", required=True, help="End date (YYYY-MM-DD)")
    parser.add_argument("--freq", help="Optional frequency override (A,Q,M,W,D)")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and normalize data but skip database writes",
    )
    return parser.parse_args(argv)


def ensure_series_list(settings: Settings, args: argparse.Namespace) -> List[str]:
    if args.series:
        return args.series
    bundle_key = args.bundle or settings.default_bundle
    if bundle_key not in DEFAULT_BUNDLES:
        raise ValueError(f"Unknown series bundle '{bundle_key}'")
    return list(DEFAULT_BUNDLES[bundle_key])


def parse_date(value: str) -> date:
    return isoparse(value).date()


def group_series_by_source(series_map: Dict[str, SeriesMeta]) -> Dict[str, List[SeriesMeta]]:
    grouped: Dict[str, List[SeriesMeta]] = defaultdict(list)
    for meta in series_map.values():
        grouped[meta.source.upper()].append(meta)
    return grouped


def _state_fips_for(geo: GeoRecord) -> Optional[str]:
    """State FIPS for a geography; falls back to a two-digit parent (some metro rows
    carry the state only as parent_geo_id, e.g. Tucson MSA 46060)."""
    if geo.state_fips:
        return geo.state_fips
    parent = (geo.parent_geo_id or "").strip()
    return parent if len(parent) == 2 and parent.isdigit() else None


def resolve_code(meta: SeriesMeta, provider: str, geo: GeoRecord,
                 overrides: Dict[Tuple[int, str], str]) -> Tuple[Optional[str], Optional[str]]:
    """Publisher code for this series at this geography, or (None, reason). See provider_codes."""
    return resolve_provider_code(
        meta.provider_code(provider) or (meta.series_code if geo.geo_level == "US" else None),
        geo_level=geo.geo_level,
        state_fips=_state_fips_for(geo),
        county_fips=geo.county_fips,
        place_fips=geo.place_fips,
        cbsa_code=geo.cbsa_code,
        override=overrides.get((meta.series_id, provider)),
    )


def interpolate_provider_code(template: str, geo: GeoRecord) -> str:
    """Kept for callers outside this module; new code uses resolve_code()."""
    code, _reason = resolve_provider_code(
        template, geo_level=geo.geo_level, state_fips=_state_fips_for(geo),
        county_fips=geo.county_fips, place_fips=geo.place_fips, cbsa_code=geo.cbsa_code,
    )
    return code or template


def main(argv: Optional[Sequence[str]] = None) -> dict:
    args = parse_args(argv)
    settings = get_settings()

    start = parse_date(args.start)
    end = parse_date(args.end)
    if start > end:
        raise ValueError("start date must be before end date")

    db = Database(settings.database_url)
    geo_resolver = GeoResolver(db)

    if args.project:
        base_geo = geo_resolver.resolve_from_city_label(args.project)
    elif args.geo_id:
        base_geo = db.get_geo(args.geo_id)
    else:
        raise ValueError("Either --project or --geo-id must be provided")

    targets = geo_resolver.expand_targets(base_geo)
    hierarchy_payload = geo_resolver.build_hierarchy_payload(targets)

    series_codes = ensure_series_list(settings, args)
    series_meta = db.get_series_metadata(series_codes)
    missing_series = set(series_codes) - set(series_meta.keys())
    if missing_series:
        raise ValueError(f"Series metadata missing for: {', '.join(sorted(missing_series))}")

    providers = group_series_by_source(series_meta)

    if any(source in {"FRED", "SPCS", "BEA", "FHFA"} for source in providers) and not settings.providers.fred_api_key:
        raise RuntimeError("FRED_API_KEY is required for requested series")

    fred_client = (
        FredClient(settings.providers.fred_api_key) if settings.providers.fred_api_key else None
    )
    census_client = CensusClient(settings.providers.census_api_key)
    bls_client = BlsClient(settings.providers.bls_api_key)
    fhfa_client = FhfaClient(fred_client) if fred_client else None
    umich_client = UMichClient()

    stats = {
        "rows_written": 0,
        "series": {},
        "requested_range": {"start": start.isoformat(), "end": end.isoformat()},
        "geo_targets": [target.__dict__ for target in targets],
        "skipped": [],
        "series_errors": [],
    }
    coverage_notes: List[str] = []
    collected: Dict[Tuple[str, str], List[NormalizedObservation]] = defaultdict(list)

    def store_observations(meta: SeriesMeta, geo: GeoRecord, observations: List[NormalizedObservation]):
        key = (meta.series_code, geo.geo_id)
        if observations:
            collected[key].extend(observations)
            stats["series"].setdefault(meta.series_code, 0)
            stats["series"][meta.series_code] += len(observations)

    logger.info("Starting ingestion for %d series across %d geo targets", len(series_meta), len(targets))

    try:
        for target in targets:
            target_geo = db.get_geo(target.geo_id)
            for source, metas in providers.items():
                if target.geo_level not in {"CITY", "COUNTY", "MSA", "MICRO", "STATE", "US", "TRACT"}:
                    continue

                eligible_metas = [
                    meta for meta in metas if target.geo_level in meta.coverage_level.split("|")
                ]
                if not eligible_metas:
                    continue

                logger.debug("Fetching %d %s series for %s", len(eligible_metas), source, target.geo_id)

                overrides = db.get_geo_overrides([m.series_id for m in eligible_metas], target_geo.geo_id)

                def _skip(meta: SeriesMeta, reason: str) -> None:
                    stats["skipped"].append({"series": meta.series_code, "geo_id": target_geo.geo_id, "reason": reason})
                    logger.warning("Skipping {} for {} {}: {}", meta.series_code, target_geo.geo_level, target_geo.geo_id, reason)

                def _fetch_one(meta: SeriesMeta, provider: str, client, code: str) -> None:
                    frequency = args.freq or meta.frequency
                    key = (provider, code, start, end, frequency, target_geo.geo_id, meta.series_code)
                    if key not in _FETCH_MEMO:
                        _FETCH_MEMO[key] = client.fetch_series(
                            meta.series_code,
                            code,
                            geo_id=target_geo.geo_id,
                            geo_level=target_geo.geo_level,
                            start=start,
                            end=end,
                            units=meta.units,
                            seasonal=meta.seasonal,
                            frequency=frequency,
                        )
                    store_observations(meta, target_geo, _FETCH_MEMO[key])

                if source in {"FRED", "SPCS", "BEA"}:
                    if not fred_client:
                        raise RuntimeError("FRED client unavailable")
                    for meta in eligible_metas:
                        code, reason = resolve_code(meta, "FRED", target_geo, overrides)
                        if not code:
                            _skip(meta, reason)
                            continue
                        try:
                            _fetch_one(meta, "FRED", fred_client, code)
                        except Exception as exc:  # one bad series must not sink the geography
                            stats["series_errors"].append({"series": meta.series_code, "geo_id": target_geo.geo_id, "code": code, "error": str(exc)[:300]})
                            logger.error("FRED fetch failed for {} ({}) at {}: {}", meta.series_code, code, target_geo.geo_id, exc)

                elif source == "FHFA":
                    if not fhfa_client:
                        raise RuntimeError("FHFA client requires FRED support")
                    for meta in eligible_metas:
                        freq = args.freq or meta.frequency
                        observations = fhfa_client.fetch(
                            meta,
                            target_geo,
                            start=start,
                            end=end,
                            frequency=freq,
                        )
                        store_observations(meta, target_geo, observations)

                elif source == "ACS":
                    subset = {meta.series_code: meta for meta in eligible_metas}
                    observations = census_client.fetch_acs_series(subset, target_geo, start, end)
                    for meta in eligible_metas:
                        obs = [row for row in observations if row.series_code == meta.series_code]
                        store_observations(meta, target_geo, obs)

                elif source == "BPS":
                    subset = {meta.series_code: meta for meta in eligible_metas}
                    observations = census_client.fetch_bps_series(subset, target_geo, start, end)
                    for meta in eligible_metas:
                        obs = [row for row in observations if row.series_code == meta.series_code]
                        store_observations(meta, target_geo, obs)

                elif source == "BLS":
                    batch = []
                    for meta in eligible_metas:
                        code, reason = resolve_code(meta, "BLS", target_geo, overrides)
                        if not code:
                            _skip(meta, reason)
                            continue
                        batch.append((meta, code))
                    todo = [(m.series_code, c, target_geo.geo_id, target_geo.geo_level, m.units, m.seasonal)
                            for m, c in batch if ("BLS", c, start, end) not in _FETCH_MEMO]
                    try:
                        if todo:
                            for code, obs in bls_client.fetch_many(todo, start, end).items():
                                _FETCH_MEMO[("BLS", code, start, end)] = obs
                    except Exception as exc:
                        for m, c in batch:
                            stats["series_errors"].append({"series": m.series_code, "geo_id": target_geo.geo_id, "code": c, "error": str(exc)[:300]})
                        logger.error("BLS batch failed at {}: {}", target_geo.geo_id, exc)
                    for m, c in batch:
                        obs = _FETCH_MEMO.get(("BLS", c, start, end))
                        if obs is None:
                            continue
                        if not obs:
                            _skip(m, f"BLS has no data for {c}")
                        store_observations(m, target_geo, [o for o in obs if start <= o.date <= end])

                elif source == "UMICH":
                    # National only. Until 2026-09-29 no branch existed for this source,
                    # so the three sentiment series stopped at 2026-03 and nothing said so.
                    if target_geo.geo_level != "US":
                        continue
                    wanted = {m.series_code: m for m in eligible_metas}
                    try:
                        key = ("UMICH", tuple(sorted(wanted)))
                        if key not in _FETCH_MEMO:
                            obs = []
                            if "UMCSENT" in wanted:
                                obs += umich_client.fetch_composite("UMCSENT")
                            if {"UMICC", "UMICE"} & set(wanted):
                                obs += umich_client.fetch_components("UMICC", "UMICE")
                            if "UMICH_INFL_1Y" in wanted or "UMICH_INFL_5Y" in wanted:
                                obs += umich_client.fetch_inflation_expectations("UMICH_INFL_1Y", "UMICH_INFL_5Y")
                            _FETCH_MEMO[key] = [o for o in obs if start <= o.date <= end]
                        for meta in eligible_metas:
                            store_observations(meta, target_geo, [o for o in _FETCH_MEMO[key] if o.series_code == meta.series_code])
                    except Exception as exc:
                        stats["series_errors"].append({"series": ",".join(wanted), "geo_id": "US", "error": str(exc)[:300]})
                        logger.error("UMich fetch failed: {}", exc)

                else:
                    logger.warning("No client configured for source %s", source)

        # Fallback coverage: map city to nearest parent when unsupported
        base_target = targets[0]
        base_geo_level = base_target.geo_level
        base_geo_id = base_target.geo_id

        for meta in series_meta.values():
            coverage_set = set(meta.coverage_level.split("|"))
            if base_geo_level in coverage_set:
                continue
            fallback = None
            for target in targets[1:]:
                if target.geo_level in coverage_set:
                    fallback = target
                    break
            if not fallback:
                continue

            fallback_key = (meta.series_code, fallback.geo_id)
            base_key = (meta.series_code, base_geo_id)
            if fallback_key not in collected or not collected[fallback_key]:
                continue

            note = f"{base_geo_level} unavailable; using {fallback.geo_level}"
            coverage_notes.append(note)

            synthesized: List[NormalizedObservation] = []
            for obs in collected[fallback_key]:
                synthesized.append(
                    NormalizedObservation(
                        series_code=obs.series_code,
                        geo_id=base_geo_id,
                        geo_level=base_geo_level,
                        date=obs.date,
                        value=obs.value,
                        units=obs.units,
                        seasonal=obs.seasonal,
                        source=obs.source,
                        revision_tag=obs.revision_tag,
                        coverage_note=note,
                    )
                )
            collected[base_key].extend(synthesized)
            stats["series"].setdefault(meta.series_code, 0)
            stats["series"][meta.series_code] += len(synthesized)

        if args.dry_run:
            logger.info("Dry run complete: {} rows prepared", sum(len(v) for v in collected.values()))
            return stats

        fetch_params = {
            "geo_level": base_geo_level,
            "geo_id": base_geo_id,
            "series_keys": series_codes,
            "start": start.isoformat(),
            "end": end.isoformat(),
            "freq": args.freq,
            "geo_hierarchy": hierarchy_payload,
        }
        source_summary = {source: [meta.series_code for meta in metas] for source, metas in providers.items()}

        job_id = db.insert_fetch_job(fetch_params, sources=source_summary, project_id=args.project_id)
        ingestion_id = None

        try:
            for (series_code, geo_id), observations in collected.items():
                meta = series_meta[series_code]
                rows_written = db.upsert_market_data(meta, observations)
                stats["rows_written"] += rows_written

            ingestion_id = db.insert_ai_ingestion_history(
                project_id=args.project_id,
                package_name="market_ingest_v1",
                params=fetch_params,
                stats=stats,
                coverage_notes=coverage_notes,
            )
            db.finalize_fetch_job(job_id, "succeeded", stats, None, ingestion_id)
            logger.success(
                "Ingestion succeeded: %d rows written across %d series (job_id=%s, ingestion_id=%s)",
                stats["rows_written"],
                len(series_meta),
                job_id,
                ingestion_id,
            )
            return stats
        except Exception as exc:
            logger.exception("Ingestion failed")
            db.finalize_fetch_job(job_id, "failed", stats, str(exc), ingestion_id)
            raise
    finally:
        db.close()


if __name__ == "__main__":
    main(sys.argv[1:])
