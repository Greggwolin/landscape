"""Signals for the Landscaper app."""

from __future__ import annotations

import logging
from datetime import datetime

from django.core.management import call_command

logger = logging.getLogger(__name__)


def export_schema_after_migrate(sender, **kwargs):
    """Auto-export rich schema after migrations complete."""
    try:
        call_command("export_rich_schema")
    except Exception as exc:
        logger.warning(
            "Schema export failed after migrations: %s",
            exc,
            exc_info=True,
        )
        return

    today = datetime.utcnow().strftime("%Y-%m-%d")
    print(f"Schema export updated: docs/schema/landscape_rich_schema_{today}.json")
