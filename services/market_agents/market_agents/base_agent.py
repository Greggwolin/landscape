"""
Base class for all market intelligence agents.

Every agent:
  1. Resolves geo targets for each metro area
  2. Fetches data from its source(s)
  3. Writes to the normalized time-series tables via market_ingest
  4. Logs activity to Discord #market-intel-log
  5. Returns a run summary dict for the orchestrator
"""

from __future__ import annotations

import time
import traceback
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from loguru import logger
from market_ingest.db import Database, GeoRecord
from market_ingest.geo import GeoResolver, GeoTarget
from market_ingest.normalize import NormalizedObservation

from .config import AgentConfig, MetroArea, get_config
from .discord import log_agent_error, log_agent_finish, log_agent_start


@dataclass
class RunResult:
    """Summary of a single agent run for one metro area."""
    agent_name: str
    metro: str
    rows_written: int = 0
    series_fetched: int = 0
    errors: List[str] = field(default_factory=list)
    elapsed_sec: float = 0.0
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None


class BaseAgent(ABC):
    """
    Abstract base for overnight market intelligence agents.

    Subclasses implement:
      - name (property)  — human-readable agent name (e.g. "FRED")
      - series_codes()   — list of series codes this agent is responsible for
      - fetch_for_geo()  — the actual data fetching logic per geo target
    """

    def __init__(self, config: Optional[AgentConfig] = None):
        self.config = config or get_config()
        self._db: Optional[Database] = None
        self._geo_resolver: Optional[GeoResolver] = None

    # ── Abstract interface ───────────────────────────────────────────

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable agent name for logging."""
        ...

    @abstractmethod
    def series_codes(self) -> List[str]:
        """Series codes this agent will fetch."""
        ...

    @abstractmethod
    def fetch_for_geo(
        self,
        targets: List[GeoTarget],
        series_meta: Dict,
        start: date,
        end: date,
    ) -> List[NormalizedObservation]:
        """
        Fetch data for a resolved set of geo targets.

        Args:
            targets: Expanded geo chain (CITY → COUNTY → MSA → STATE → US)
            series_meta: Dict of series_code → SeriesMeta from DB
            start/end: Date range to fetch

        Returns:
            List of NormalizedObservation ready for DB upsert.
        """
        ...

    # ── Lifecycle ────────────────────────────────────────────────────

    @property
    def db(self) -> Database:
        if self._db is None:
            self._db = Database(self.config.database_url)
        return self._db

    @property
    def geo_resolver(self) -> GeoResolver:
        if self._geo_resolver is None:
            self._geo_resolver = GeoResolver(self.db)
        return self._geo_resolver

    def close(self):
        if self._db is not None:
            self._db.close()
            self._db = None
            self._geo_resolver = None

    # ── Main run loop ────────────────────────────────────────────────

    def run(
        self,
        metros: Optional[List[MetroArea]] = None,
        start: Optional[date] = None,
        end: Optional[date] = None,
    ) -> List[RunResult]:
        """
        Execute a full run across all configured metro areas.

        Default date range: last 365 days → today.
        """
        metros = metros or self.config.metro_areas
        end = end or date.today()
        start = start or (end - timedelta(days=365))

        results: List[RunResult] = []

        for metro in metros:
            result = self._run_one_metro(metro, start, end)
            results.append(result)

        return results

    def _run_one_metro(self, metro: MetroArea, start: date, end: date) -> RunResult:
        """Run agent for a single metro area."""
        result = RunResult(
            agent_name=self.name,
            metro=metro.name,
            started_at=datetime.utcnow(),
        )
        t0 = time.monotonic()

        log_agent_start(self.name, metro.name, len(self.series_codes()))

        try:
            # 1. Resolve geo hierarchy
            base_geo = self.geo_resolver.resolve_from_city_label(metro.city_label)
            targets = self.geo_resolver.expand_targets(base_geo)

            # 2. Load series metadata from DB
            codes = self.series_codes()
            series_meta = self.db.get_series_metadata(codes)
            missing = set(codes) - set(series_meta.keys())
            if missing:
                logger.warning(
                    "[%s] Missing series metadata for: %s — skipping those",
                    self.name, ", ".join(sorted(missing)),
                )

            result.series_fetched = len(series_meta)

            # 3. Fetch observations
            observations = self.fetch_for_geo(targets, series_meta, start, end)

            # 4. Upsert to DB
            if observations:
                for meta in series_meta.values():
                    batch = [o for o in observations if o.series_code == meta.series_code]
                    if batch:
                        rows = self.db.upsert_market_data(meta, batch)
                        result.rows_written += rows

            logger.info(
                "[{}] {}: {} rows written for {} series",
                self.name, metro.name, result.rows_written, result.series_fetched,
            )

        except Exception as exc:
            err_msg = f"{type(exc).__name__}: {exc}"
            result.errors.append(err_msg)
            logger.error("[{}] {} failed: {}", self.name, metro.name, err_msg)
            log_agent_error(self.name, metro.name, err_msg)

        finally:
            result.elapsed_sec = time.monotonic() - t0
            result.finished_at = datetime.utcnow()

            if not result.errors:
                log_agent_finish(
                    self.name, metro.name, result.rows_written, result.elapsed_sec
                )

        return result

    # ── Convenience ──────────────────────────────────────────────────

    def run_standalone(self):
        """Entry point for running a single agent from CLI."""
        logger.info("Starting standalone run for {}", self.name)
        try:
            results = self.run()
            total_rows = sum(r.rows_written for r in results)
            total_errors = sum(len(r.errors) for r in results)
            logger.info(
                "%s complete: %d total rows, %d errors across %d metros",
                self.name, total_rows, total_errors, len(results),
            )
            return results
        finally:
            self.close()
