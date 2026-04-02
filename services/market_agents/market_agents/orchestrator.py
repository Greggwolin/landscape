"""
Orchestrator — runs market intelligence agents on the 6 PM → 6 AM schedule.

Uses APScheduler to:
  1. Fire each agent sequentially at staggered intervals
  2. Collect run results
  3. Send the morning digest to Discord at 6 AM

Can also be invoked manually for testing:
    poetry run market-agents          # run all agents once, then exit
    poetry run market-agents --loop   # start the APScheduler loop
"""

from __future__ import annotations

import argparse
import sys
import time
from datetime import date, datetime, timedelta
from typing import List, Optional, Sequence

from loguru import logger

from .base_agent import BaseAgent, RunResult
from .config import get_config
from .discord import log_agent_warning, send_digest


def build_agent_roster() -> List[BaseAgent]:
    """
    Instantiate all enabled time-series agents (geo/metro-based).

    These write NormalizedObservation records to public.market_data.
    """
    from .agents.fred_agent import FredAgent
    from .agents.census_bps_agent import CensusBpsAgent
    from .agents.hud_agent import HudAgent

    config = get_config()
    agents: List[BaseAgent] = []

    if config.fred_api_key:
        agents.append(FredAgent(config))
    else:
        logger.warning("FRED_API_KEY not set — FRED agent disabled")

    if config.census_bps_enabled:
        agents.append(CensusBpsAgent(config))
    else:
        logger.info("Census BPS agent disabled")

    if config.hud_enabled and config.hud_api_token:
        agents.append(HudAgent(config))
    elif config.hud_enabled:
        logger.warning("HUD_API_TOKEN not set — HUD agent disabled")
    else:
        logger.info("HUD agent disabled")

    return agents


def build_research_roster() -> list:
    """
    Instantiate all enabled research harvesting agents.

    These run on a separate schedule (early morning) and use a different
    base class (BaseResearchAgent) than the time-series agents.
    They write to landscape.tbl_research_publication / tbl_research_financial_data.
    """
    from .agents.crefc_agent import CREFCAgent
    from .agents.uli_agent import ULIAgent
    from .agents.mba_agent import MBAAgent
    from .agents.kbra_agent import KBRAAgent
    from .agents.trepp_agent import TreppAgent
    from .agents.brokerage_research_agent import BrokerageResearchAgent
    from .agents.construction_cost_agent import ConstructionCostAgent
    from .agents.naiop_agent import NAIOPAgent

    config = get_config()
    agents = []

    # ── Tier 1: High-priority research agents ──

    if config.crefc_harvest_enabled:
        agents.append(CREFCAgent(config))
    else:
        logger.info("CREFC harvest disabled")

    if config.uli_harvest_enabled and config.uli_email and config.uli_password:
        agents.append(ULIAgent(config))
    elif config.uli_harvest_enabled:
        logger.warning("ULI_EMAIL/ULI_PASSWORD not set — ULI agent disabled")
    else:
        logger.info("ULI harvest disabled")

    # ── Tier 2: Lending / CMBS research ──

    if config.mba_harvest_enabled:
        agents.append(MBAAgent(config))
    else:
        logger.info("MBA harvest disabled")

    if config.kbra_harvest_enabled:
        agents.append(KBRAAgent(config))
    else:
        logger.info("KBRA harvest disabled")

    if config.trepp_harvest_enabled:
        agents.append(TreppAgent(config))
    else:
        logger.info("Trepp harvest disabled")

    # ── Tier 3: Brokerage / cost / demand ──

    if config.brokerage_harvest_enabled:
        agents.append(BrokerageResearchAgent(config))
    else:
        logger.info("Brokerage research harvest disabled")

    if config.construction_cost_harvest_enabled:
        agents.append(ConstructionCostAgent(config))
    else:
        logger.info("Construction cost harvest disabled")

    if config.naiop_harvest_enabled:
        agents.append(NAIOPAgent(config))
    else:
        logger.info("NAIOP harvest disabled")

    return agents


def run_all_agents(
    agents: Optional[List[BaseAgent]] = None,
    start: Optional[date] = None,
    end: Optional[date] = None,
) -> List[RunResult]:
    """
    Execute all agents sequentially and return combined results.
    """
    if agents is None:
        agents = build_agent_roster()

    all_results: List[RunResult] = []

    for agent in agents:
        logger.info("=== Running {} ===", agent.name)
        try:
            results = agent.run(start=start, end=end)
            all_results.extend(results)
        except Exception as exc:
            logger.error("Agent {} crashed: {}", agent.name, exc)
            log_agent_warning(agent.name, f"Agent crashed: {exc}")
        finally:
            agent.close()

    return all_results


def compile_digest(results: List[RunResult]) -> dict:
    """Aggregate run results into a digest payload for Discord."""
    agents_summary = {}

    for r in results:
        if r.agent_name not in agents_summary:
            agents_summary[r.agent_name] = {
                "rows": 0,
                "metros": [],
                "errors": 0,
            }
        entry = agents_summary[r.agent_name]
        entry["rows"] += r.rows_written
        entry["metros"].append(r.metro)
        entry["errors"] += len(r.errors)

    total_rows = sum(r.rows_written for r in results)
    all_errors = []
    for r in results:
        for err in r.errors:
            all_errors.append(f"[{r.agent_name}/{r.metro}] {err}")

    return {
        "date": date.today().isoformat(),
        "total_rows": total_rows,
        "agents": agents_summary,
        "highlights": [],  # TODO: populated by The Editor agent later
        "errors": all_errors,
    }


def run_research_agents():
    """Execute all research harvesting agents and log results."""
    from .agents.base_research_agent import HarvestStats

    research_agents = build_research_roster()
    if not research_agents:
        logger.info("No research agents enabled — skipping")
        return

    t0 = time.monotonic()
    logger.info("Starting research harvest at {}", datetime.now().isoformat())

    all_stats = []
    for agent in research_agents:
        logger.info("=== Running research agent: {} ===", agent.name)
        try:
            stats = agent.run()
            all_stats.append((agent.name, stats))
        except Exception as exc:
            logger.error("Research agent {} crashed: {}", agent.name, exc)
            log_agent_warning(agent.name, f"Research agent crashed: {exc}")

    elapsed = time.monotonic() - t0
    total_new = sum(s.publications_new for _, s in all_stats)
    total_errors = sum(len(s.errors) for _, s in all_stats)
    logger.info(
        "Research harvest complete: %d new publications, %d errors in %.1fs",
        total_new, total_errors, elapsed,
    )


def run_once_and_digest():
    """Single execution: run all agents, compile digest, send to Discord."""
    t0 = time.monotonic()
    logger.info("Starting overnight agent run at {}", datetime.now().isoformat())

    results = run_all_agents()
    digest = compile_digest(results)

    send_digest(digest)
    elapsed = time.monotonic() - t0
    logger.info(
        "Run complete: {} total rows in {:.1f}s", digest["total_rows"], elapsed
    )
    return digest


def start_scheduler():
    """
    Start APScheduler loop with staggered cron jobs:

    Time-series agents:
      - 6 PM: FRED + Census BPS + HUD (overnight run)

    Research agents (staggered 5:00 AM – 7:30 AM):
      - 5:00 AM: CREFC + ULI (Tier 1)
      - 5:30 AM: MBA
      - 5:45 AM: KBRA
      - 6:00 AM: Trepp
      - 6:30 AM: Brokerage Research (CBRE/CW/JLL)
      - 7:15 AM: Construction Cost (ENR/RLB)
      - 7:30 AM: NAIOP

    The scheduler runs indefinitely until killed.
    """
    from apscheduler.schedulers.blocking import BlockingScheduler

    config = get_config()
    scheduler = BlockingScheduler()

    # ── Time-series agents at 6 PM daily ──
    scheduler.add_job(
        run_once_and_digest,
        "cron",
        hour=config.start_hour,
        minute=0,
        id="overnight_run",
        name="Overnight Market Intelligence Run",
    )

    # ── Research agents: run all in sequence at research_hour ──
    # For simplicity, the batch runner handles internal ordering.
    # If individual scheduling is desired, uncomment the staggered jobs below.
    scheduler.add_job(
        run_research_agents,
        "cron",
        hour=config.research_hour,
        minute=0,
        id="research_harvest",
        name="Research Publication Harvest",
    )

    logger.info(
        "Scheduler started — time-series agents at %d:00, research agents at %d:00",
        config.start_hour,
        config.research_hour,
    )

    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler shutting down")
        scheduler.shutdown()


# ── CLI ──────────────────────────────────────────────────────────────

def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Landscape Market Intelligence Agents")
    parser.add_argument(
        "--loop",
        action="store_true",
        help="Start the APScheduler loop (default: run once and exit)",
    )
    parser.add_argument(
        "--days-back",
        type=int,
        default=365,
        help="How many days back to fetch (default: 365)",
    )
    parser.add_argument(
        "--research",
        action="store_true",
        help="Run research harvest agents only (ULI, CREFC)",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Run both time-series and research agents",
    )
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None):
    args = parse_args(argv)

    if args.loop:
        start_scheduler()
    elif args.research:
        run_research_agents()
    elif args.all:
        run_once_and_digest()
        run_research_agents()
    else:
        run_once_and_digest()


if __name__ == "__main__":
    main(sys.argv[1:])
