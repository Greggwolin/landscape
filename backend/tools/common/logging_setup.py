"""Shared logging configuration for ingestion tools."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional


def setup_logging(
    log_dir: str | Path,
    log_filename: str = "tool.log",
    level: int = logging.INFO,
    console: bool = True,
) -> None:
    """Configure logging with file and optional console output.

    Args:
        log_dir: Directory to store log files (will be created if needed).
        log_filename: Name of the log file.
        level: Logging level (default INFO).
        console: Whether to also log to console (default True).
    """
    logs_path = Path(log_dir)
    logs_path.mkdir(parents=True, exist_ok=True)
    log_file = logs_path / log_filename

    handlers = [logging.FileHandler(log_file)]
    if console:
        handlers.append(logging.StreamHandler())

    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(message)s",
        handlers=handlers,
    )
