"""
Database helpers for Neon/Postgres persistence.
"""

from __future__ import annotations

import json
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

import psycopg2
from loguru import logger
from psycopg2 import extras
from psycopg2.pool import SimpleConnectionPool

from .normalize import NormalizedObservation


@dataclass(frozen=True)
class SeriesMeta:
    series_id: int
    series_code: str
    category: str
    units: Optional[str]
    frequency: Optional[str]
    seasonal: Optional[str]
    source: str
    coverage_level: str
    provider_aliases: Dict[str, str]

    def provider_code(self, provider: str) -> Optional[str]:
        return self.provider_aliases.get(provider)


@dataclass(frozen=True)
class GeoRecord:
    geo_id: str
    geo_level: str
    geo_name: str
    state_fips: Optional[str]
    county_fips: Optional[str]
    place_fips: Optional[str]
    cbsa_code: Optional[str]
    tract_fips: Optional[str]
    parent_geo_id: Optional[str]
    hierarchy: Dict[str, str]


class Database:
    def __init__(self, dsn: str, minconn: int = 1, maxconn: int = 4):
        self.pool = SimpleConnectionPool(minconn, maxconn, dsn=dsn)
        logger.debug("Initialized Neon connection pool (min={}, max={})", minconn, maxconn)

    @contextmanager
    def connection(self):
        conn = self.pool.getconn()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            self.pool.putconn(conn)

    def close(self):
        if self.pool:
            self.pool.closeall()

    # ---- Series metadata helpers -------------------------------------------------

    def get_series_metadata(self, series_codes: Sequence[str]) -> Dict[str, SeriesMeta]:
        if not series_codes:
            return {}
        with self.connection() as conn, conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                  ms.series_id,
                  ms.series_code,
                  ms.category,
                  ms.units,
                  ms.frequency,
                  ms.seasonal,
                  ms.source,
                  ms.coverage_level
                FROM public.market_series ms
                WHERE ms.series_code = ANY(%s)
                  AND ms.is_active = TRUE
                """,
                (list(series_codes),),
            )
            rows = cur.fetchall()

        series_map: Dict[int, SeriesMeta] = {}
        for row in rows:
            series_map[row["series_id"]] = SeriesMeta(
                series_id=row["series_id"],
                series_code=row["series_code"],
                category=row["category"],
                units=row.get("units"),
                frequency=row.get("frequency"),
                seasonal=row.get("seasonal"),
                source=row["source"],
                coverage_level=row["coverage_level"],
                provider_aliases={},
            )

        if not series_map:
            return {}

        with self.connection() as conn, conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT series_id, provider, provider_series_code
                FROM public.series_alias
                WHERE series_id = ANY(%s)
                """,
                (list(series_map.keys()),),
            )
            alias_rows = cur.fetchall()

        code_map: Dict[str, SeriesMeta] = {}
        for alias in alias_rows:
            meta = series_map[alias["series_id"]]
            meta.provider_aliases[alias["provider"]] = alias["provider_series_code"]

        for meta in series_map.values():
            code_map[meta.series_code] = meta

        missing_codes = set(series_codes) - set(code_map.keys())
        if missing_codes:
            logger.warning("Series metadata missing for {}", ", ".join(sorted(missing_codes)))

        return code_map

    # ---- Geo helpers -------------------------------------------------------------

    def get_geo(self, geo_id: str) -> GeoRecord:
        with self.connection() as conn, conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT geo_id, geo_level, geo_name, state_fips, county_fips,
                       place_fips, cbsa_code, tract_fips, parent_geo_id, hierarchy
                FROM public.geo_xwalk
                WHERE geo_id = %s
                """,
                (geo_id,),
            )
            row = cur.fetchone()
        if not row:
            raise KeyError(f"geo_id '{geo_id}' not found in geo_xwalk")
        return GeoRecord(
            geo_id=row["geo_id"],
            geo_level=row["geo_level"],
            geo_name=row["geo_name"],
            state_fips=row.get("state_fips"),
            county_fips=row.get("county_fips"),
            place_fips=row.get("place_fips"),
            cbsa_code=row.get("cbsa_code"),
            tract_fips=row.get("tract_fips"),
            parent_geo_id=row.get("parent_geo_id"),
            hierarchy=row.get("hierarchy") or {},
        )

    def find_city(self, city: str, state_abbr: str) -> GeoRecord:
        with self.connection() as conn, conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT geo_id, geo_level, geo_name, state_fips, county_fips,
                       place_fips, cbsa_code, parent_geo_id, hierarchy
                FROM public.geo_xwalk
                WHERE geo_level = 'CITY'
                  AND lower(usps_city) = lower(%s)
                  AND upper(usps_state) = upper(%s)
                LIMIT 1
                """,
                (city, state_abbr),
            )
            row = cur.fetchone()
        if not row:
            raise KeyError(f"City '{city}, {state_abbr}' not found in geo_xwalk")
        return GeoRecord(
            geo_id=row["geo_id"],
            geo_level=row["geo_level"],
            geo_name=row["geo_name"],
            state_fips=row.get("state_fips"),
            county_fips=row.get("county_fips"),
            place_fips=row.get("place_fips"),
            cbsa_code=row.get("cbsa_code"),
            parent_geo_id=row.get("parent_geo_id"),
            hierarchy=row.get("hierarchy") or {},
        )

    def expand_geo_chain(self, base_geo: GeoRecord) -> List[GeoRecord]:
        """
        Return the macro to micro chain for the provided geography, ensuring
        unique geo_ids in order of CITY -> COUNTY -> MSA -> STATE -> US.
        """

        chain_ids: List[str] = [base_geo.geo_id]
        hierarchy = base_geo.hierarchy or {}

        # Check if hierarchy uses "chain" array format (new format)
        if "chain" in hierarchy and isinstance(hierarchy["chain"], list):
            # Skip the base_geo.geo_id if it's already in chain_ids
            for geo_id in hierarchy["chain"]:
                if geo_id not in chain_ids:
                    chain_ids.append(geo_id)
        else:
            # Fall back to old dict-based hierarchy format
            order = ["county", "msa", "state", "us"]
            for key in order:
                candidate = hierarchy.get(key)
                if isinstance(candidate, dict):
                    candidate = candidate.get("geo_id") or candidate.get("id")
                if candidate and candidate not in chain_ids:
                    chain_ids.append(candidate)

        records: List[GeoRecord] = []
        with self.connection() as conn, conn.cursor(cursor_factory=extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT geo_id, geo_level, geo_name, state_fips, county_fips,
                       place_fips, cbsa_code, tract_fips, parent_geo_id, hierarchy
                FROM public.geo_xwalk
                WHERE geo_id = ANY(%s)
                """,
                (chain_ids,),
            )
            rows = cur.fetchall()

        row_map = {row["geo_id"]: row for row in rows}
        for geo_id in chain_ids:
            row = row_map.get(geo_id)
            if not row:
                logger.warning("Missing geo_xwalk row for {}", geo_id)
                continue
            records.append(
                GeoRecord(
                    geo_id=row["geo_id"],
                    geo_level=row["geo_level"],
                    geo_name=row["geo_name"],
                    state_fips=row.get("state_fips"),
                    county_fips=row.get("county_fips"),
                    place_fips=row.get("place_fips"),
                    cbsa_code=row.get("cbsa_code"),
                    tract_fips=row.get("tract_fips"),
                    parent_geo_id=row.get("parent_geo_id"),
                    hierarchy=row.get("hierarchy") or {},
                )
            )
        return records

    # ---- Persistence -------------------------------------------------------------

    def upsert_market_data(self, series_meta: SeriesMeta, rows: Iterable[NormalizedObservation]) -> int:
        tuples: List[Tuple] = []
        for row in rows:
            tuples.append(
                (
                    series_meta.series_id,
                    row.geo_id,
                    row.date,
                    row.value,
                    row.revision_tag,
                    row.coverage_note,
                )
            )

        if not tuples:
            return 0

        logger.debug(
            "Persisting {} rows into public.market_data for series_id={}",
            len(tuples),
            series_meta.series_id,
        )

        with self.connection() as conn, conn.cursor() as cur:
            extras.execute_values(
                cur,
                """
                INSERT INTO public.market_data (
                  series_id, geo_id, date, value, rev_tag, coverage_note
                )
                VALUES %s
                ON CONFLICT (series_id, geo_id, date)
                DO UPDATE SET
                  value = EXCLUDED.value,
                  rev_tag = EXCLUDED.rev_tag,
                  coverage_note = COALESCE(EXCLUDED.coverage_note, public.market_data.coverage_note)
                """,
                tuples,
            )
        return len(tuples)

    def insert_ai_ingestion_history(
        self,
        project_id: Optional[int],
        package_name: str,
        params: Dict[str, object],
        stats: Dict[str, object],
        coverage_notes: List[str],
    ) -> int:
        documents_payload = {"geo_hierarchy": params.get("geo_hierarchy"), "coverage_notes": coverage_notes}
        ai_analysis_payload = {
            "series_list": params.get("series_keys"),
            "stats": stats,
            "requested_at": datetime.utcnow().isoformat(),
        }
        with self.connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO landscape.ai_ingestion_history (
                  project_id,
                  package_name,
                  documents,
                  ai_analysis,
                  created_by
                )
                VALUES (%s, %s, %s::jsonb, %s::jsonb, %s)
                RETURNING ingestion_id
                """,
                (
                    project_id,
                    package_name,
                    json.dumps(documents_payload),
                    json.dumps(ai_analysis_payload),
                    "system",
                ),
            )
            ingestion_id = cur.fetchone()[0]
        return ingestion_id

    def insert_fetch_job(
        self,
        params: Dict[str, object],
        sources: Optional[Dict[str, object]],
        project_id: Optional[int],
    ) -> int:
        with self.connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO public.market_fetch_job (status, params, sources, stats, ai_ingestion_id)
                VALUES (%s, %s::jsonb, %s::jsonb, %s::jsonb, NULL)
                RETURNING job_id
                """,
                ("running", json.dumps(params), json.dumps(sources or {}), json.dumps({"project_id": project_id})),
            )
            job_id = cur.fetchone()[0]
        return job_id

    def finalize_fetch_job(
        self,
        job_id: int,
        status: str,
        stats: Dict[str, object],
        error_message: Optional[str],
        ingestion_id: Optional[int],
    ) -> None:
        with self.connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                UPDATE public.market_fetch_job
                SET status = %s,
                    stats = %s::jsonb,
                    error = %s,
                    ai_ingestion_id = %s
                WHERE job_id = %s
                """,
                (status, json.dumps(stats), error_message, ingestion_id, job_id),
            )
