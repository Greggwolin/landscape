"""
Render-report-as-artifact tool — one Landscaper tool that exposes every
existing server-side report generator (20+ today) as a unified artifact.

Why this exists: when Landscaper composes a tabular artifact via the
generic create_artifact tool, the entire schema lives in the LLM's
tool_use output and is bounded by the model's max_tokens limit. Large
rent rolls / cash flows / comp grids exceed that budget and the response
gets truncated mid-tool-use. This tool removes the LLM from the row
composition path entirely — the report generator (already used by the
PDF and Excel exporters) builds the full schema server-side, the
adapter converts it to artifact-block format, and the model just names
which report it wants.

Pattern: report preview dict is the canonical data form. PDF, Excel,
and the chat-side artifact panel are three presentations over the same
data. No new per-report tools — adding a future report to the system
makes it automatically available here through the generator_router.

LF-USERDASH-0514 Phase 3.5.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from ..tool_executor import register_tool

logger = logging.getLogger(__name__)


@register_tool('render_report_as_artifact')
def render_report_as_artifact_tool(
    tool_input: Dict[str, Any] = None,
    project_id: int = None,
    user_id: str = None,
    thread_id: Any = None,
    **kwargs,
) -> Dict[str, Any]:
    """
    Render any registered report (RPT_01 through RPT_20+) as an artifact.

    Args:
        tool_input: {
            report_code: str (required)  — e.g. 'RPT_07' for Rent Roll
            project_id: int (optional override; used for cross-project reads
                            from the home dashboard — must match a real
                            estate project the user has access to)
        }
        project_id: kwarg from executor (real or null on home dashboard)
        thread_id: kwarg from executor
        user_id:  kwarg from executor

    Returns:
        Standard `show_artifact` envelope on success:
            { success: True, action: 'show_artifact', artifact_id, title, ... }
        Or a structured error envelope on failure / unknown report code.
    """
    # LF-USERDASH-0514 diagnostic: model has been calling this tool with
    # what looks like empty input despite the schema enum. Log the raw
    # arrivals so we can see whether (a) tool_input is genuinely {}, (b)
    # the model is sending fields at the wrong nesting level (kwargs), or
    # (c) the field is present under a different key name.
    logger.info(
        "[render_report] entry — tool_input=%r project_id=%r kwargs_keys=%r",
        tool_input,
        project_id,
        list(kwargs.keys()),
    )

    tool_input = tool_input or kwargs.get('tool_input', {})

    # Defensive: if the model sent report_code at the top level (kwargs)
    # instead of inside tool_input, recover it. Same for project_id.
    if not isinstance(tool_input, dict):
        tool_input = {}
    if 'report_code' not in tool_input and 'report_code' in kwargs:
        tool_input['report_code'] = kwargs['report_code']
    if 'project_id' not in tool_input and 'project_id' in kwargs and project_id is None:
        tool_input['project_id'] = kwargs['project_id']

    report_code = (tool_input.get('report_code') or '').strip()

    logger.info(
        "[render_report] resolved — report_code=%r tool_input_keys=%r",
        report_code,
        list(tool_input.keys()),
    )

    if not report_code:
        logger.warning(
            "[render_report] missing report_code — returning 'required' error. "
            "tool_input=%r kwargs=%r",
            tool_input,
            {k: v for k, v in kwargs.items() if k != 'tool_input'},
        )
        return {
            'success': False,
            'error': "report_code is required (e.g. 'RPT_07' for Rent Roll).",
        }

    # Resolve project_id — tool_input override wins so cross-project reads
    # from the home dashboard work. The executor's cross-project guard
    # already promoted project_id by the time we get here, but defend
    # against direct callers.
    pid_raw = tool_input.get('project_id') if tool_input.get('project_id') is not None else project_id
    if pid_raw is None:
        return {
            'success': False,
            'error': (
                'project_id is required. From the home dashboard, resolve the '
                'project name via list_projects_summary first, then pass the '
                'matching project_id in this tool\'s input.'
            ),
        }
    try:
        pid = int(pid_raw)
    except (TypeError, ValueError):
        return {
            'success': False,
            'error': f"project_id must be an integer; got {pid_raw!r}.",
        }

    # --- Dispatch to the generator ----------------------------------------
    try:
        from apps.reports.generator_router import get_report_generator
    except Exception as exc:
        logger.exception("Failed to import generator_router")
        return {
            'success': False,
            'error': f"Report generator router unavailable: {exc}",
        }

    generator = get_report_generator(report_code, pid)
    if generator is None:
        return {
            'success': False,
            'error': (
                f"No report generator registered for '{report_code}'. Call "
                f"list_available_reports to see valid report_code values."
            ),
        }

    # --- Run the preview generator ----------------------------------------
    try:
        preview = generator.generate_preview()
    except Exception as exc:
        logger.exception(f"generate_preview failed for {report_code} / project {pid}")
        return {
            'success': False,
            'error': f"Report generator '{report_code}' failed: {exc}",
        }

    if not isinstance(preview, dict):
        return {
            'success': False,
            'error': (
                f"Report generator '{report_code}' returned an unexpected "
                f"shape (expected dict, got {type(preview).__name__})."
            ),
        }

    # --- Convert preview → artifact schema --------------------------------
    try:
        from apps.reports.artifact_adapter import (
            preview_to_artifact_schema,
            preview_title,
        )
    except Exception as exc:
        logger.exception("Failed to import artifact_adapter")
        return {
            'success': False,
            'error': f"Artifact adapter unavailable: {exc}",
        }

    schema = preview_to_artifact_schema(preview)
    fallback_title = getattr(generator, 'report_name', '') or report_code
    title = preview_title(preview, fallback=fallback_title)

    # --- Register the artifact --------------------------------------------
    try:
        from apps.artifacts.services import create_artifact_record
    except Exception as exc:
        logger.exception("Failed to import create_artifact_record")
        return {
            'success': False,
            'error': f"Artifact service unavailable: {exc}",
        }

    # Dedup on (project, report_code) so re-running the same report updates
    # the existing artifact in place instead of duplicating. Each project
    # gets one canonical slot per report type. LF-USERDASH-0514 follows the
    # same pattern get_project_profile uses (dedup_key='').
    try:
        envelope = create_artifact_record(
            title=title,
            schema=schema,
            project_id=pid,
            thread_id=thread_id,
            user_id=user_id,
            tool_name='render_report_as_artifact',
            params_json={
                'report_code': report_code,
                'project_id': pid,
            },
            dedup_key=report_code,
        )
    except Exception as exc:
        logger.exception(f"create_artifact_record failed for {report_code}")
        return {
            'success': False,
            'error': f"Artifact registration failed: {exc}",
        }

    if not envelope.get('success'):
        return envelope

    # Augment with title for the inline chat-card extractor (it reads
    # result.title to label the card; otherwise falls back to "Artifact #N").
    return {**envelope, 'title': title}
