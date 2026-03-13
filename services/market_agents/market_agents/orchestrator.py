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
    Instantiate all enabled agents.

    For now, only FRED. Others will be added as built:
      - PermitAgent
      - CensusAgent
      - BlsAgent
      - NewsClipperAgent
      - AcademicAgent
      - BrokerReaderAgent
      - TransactionTrackerAgent
    """
    from .agents.fred_agent import FredAgent

    config = get_config()
    agents: List[BaseAgent] = []

    if config.fred_api_key:
        agents.append(FredAgent(config))
    else:
        logger.warning("FRED_API_KEY not set — FRED agent disabled")

    # Future agents go here as they're built
    # if config.census_api_key:
    #     agents.append(CensusAgent(config))
    # ...

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
    Start APScheduler loop:
      - 6 PM: kick off agents
      - 6 AM: send digest (agents should be done by then)

    The scheduler runs indefinitely until killed.
    """
    from apscheduler.schedulers.blocking import BlockingScheduler

    config = get_config()
    scheduler = BlockingScheduler()

    # Run agents at 6 PM daily
    scheduler.add_job(
        run_once_and_digest,
        "cron",
        hour=config.start_hour,
        minute=0,
        id="overnight_run",
        name="Overnight Market Intelligence Run",
    )

    logger.info(
        "Scheduler started — agents will run daily at %d:00",
        config.start_hour,
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
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None):
    args = parse_args(argv)

    if args.loop:
        start_scheduler()
    else:
        run_once_and_digest()


if __name__ == "__main__":
    main(sys.argv[1:])
