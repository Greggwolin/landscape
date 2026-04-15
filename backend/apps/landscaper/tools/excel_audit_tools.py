"""
Excel Model Audit tools for Landscaper.

Wraps the `knowledge.services.excel_audit` pipeline so any chat thread
(pre-project or project-scoped) can classify and audit an uploaded
.xlsx/.xlsm file.

Tools implemented in this module:
  1. classify_excel_file(doc_id)      - Phase 0, three-tier classification
  2. run_structural_scan(doc_id)      - Phase 1, sheet inventory + named ranges
  3. run_formula_integrity(doc_id)    - Phase 2, error cells + broken refs +
                                         range consistency (Check 2e)
  4. extract_assumptions(doc_id)      - Phase 3, labeled inputs -> staging

Future turns add: classify_waterfall, replicate_waterfall, replicate_debt,
verify_sources_uses, compute_trust_score, generate_audit_report.
"""

import logging
from contextlib import contextmanager
from typing import Optional

from ..tool_executor import register_tool
from apps.knowledge.services import excel_audit as xa
from apps.knowledge.services.excel_audit.loader import (
    UnsupportedFileError,
    cleanup,
)

logger = logging.getLogger(__name__)


def _coerce_doc_id(doc_id, kwargs):
    if not doc_id:
        tool_input = kwargs.get("tool_input", {}) or {}
        doc_id = tool_input.get("doc_id")
    if not doc_id:
        return None, {"ok": False, "error": "doc_id is required"}
    try:
        return int(doc_id), None
    except (TypeError, ValueError):
        return None, {"ok": False, "error": f"doc_id must be an integer, got {doc_id!r}"}


def _resolve_project_id(kwargs) -> Optional[int]:
    pid = kwargs.get("project_id")
    if pid:
        try:
            return int(pid)
        except (TypeError, ValueError):
            pass
    ctx = kwargs.get("project_context", {}) or {}
    pid = ctx.get("project_id")
    if pid:
        try:
            return int(pid)
        except (TypeError, ValueError):
            pass
    return None


@contextmanager
def _open_workbook(doc_id_int: int):
    """
    Load once, hand over both workbooks, guarantee tmp cleanup.
    """
    tmp_path = None
    values_wb = formulas_wb = None
    try:
        values_wb, formulas_wb, tmp_path = xa.load_workbook_from_doc(doc_id_int)
        yield values_wb, formulas_wb
    finally:
        # openpyxl workbooks don't strictly need close() but be tidy
        for wb in (values_wb, formulas_wb):
            try:
                if wb is not None:
                    wb.close()
            except Exception:
                pass
        if tmp_path:
            cleanup(tmp_path)


def _error_envelope(doc_id_int: int, exc: Exception) -> dict:
    if isinstance(exc, UnsupportedFileError):
        return {"ok": False, "doc_id": doc_id_int, "error": str(exc)}
    return {"ok": False, "doc_id": doc_id_int, "error": f"{type(exc).__name__}: {exc}"}


# ─────────────────────────────────────────────────────────────────────────────
# Tool 1: classify_excel_file (Phase 0)
# ─────────────────────────────────────────────────────────────────────────────


@register_tool("classify_excel_file")
def classify_excel_file(doc_id: int = None, **kwargs):
    """
    Three-tier classification: flat / assumption_heavy / full_model.
    Always the first audit call after an Excel upload.
    """
    doc_id_int, err = _coerce_doc_id(doc_id, kwargs)
    if err:
        return err
    try:
        with _open_workbook(doc_id_int) as (values_wb, formulas_wb):
            result = xa.classify(values_wb, formulas_wb)
        result.update({"ok": True, "doc_id": doc_id_int, "error": None})
        return result
    except Exception as e:
        logger.exception("classify_excel_file failed doc_id=%s", doc_id_int)
        return _error_envelope(doc_id_int, e)


# ─────────────────────────────────────────────────────────────────────────────
# Tool 2: run_structural_scan (Phase 1)
# ─────────────────────────────────────────────────────────────────────────────


@register_tool("run_structural_scan")
def run_structural_scan(doc_id: int = None, **kwargs):
    """
    Sheet inventory, named ranges, external links, hidden sheets.
    Read-only. Run after classification to decide whether to proceed.
    """
    doc_id_int, err = _coerce_doc_id(doc_id, kwargs)
    if err:
        return err
    try:
        with _open_workbook(doc_id_int) as (values_wb, formulas_wb):
            result = xa.structural_scan(values_wb, formulas_wb)
        result.update({"ok": True, "doc_id": doc_id_int})
        return result
    except Exception as e:
        logger.exception("run_structural_scan failed doc_id=%s", doc_id_int)
        return _error_envelope(doc_id_int, e)


# ─────────────────────────────────────────────────────────────────────────────
# Tool 3: run_formula_integrity (Phase 2)
# ─────────────────────────────────────────────────────────────────────────────


@register_tool("run_formula_integrity")
def run_formula_integrity(doc_id: int = None, **kwargs):
    """
    Formula integrity checks:
      2a error cells, 2b broken refs, 2c hardcoded overrides,
      2e range consistency (critical — catches truncated SUM/XIRR).
    Returns a findings list with Sheet!Cell refs and severity.
    """
    doc_id_int, err = _coerce_doc_id(doc_id, kwargs)
    if err:
        return err
    try:
        with _open_workbook(doc_id_int) as (values_wb, formulas_wb):
            result = xa.formula_integrity_check(values_wb, formulas_wb)
        result.update({"ok": True, "doc_id": doc_id_int})
        return result
    except Exception as e:
        logger.exception("run_formula_integrity failed doc_id=%s", doc_id_int)
        return _error_envelope(doc_id_int, e)


# ─────────────────────────────────────────────────────────────────────────────
# Tool 4: extract_assumptions (Phase 3)
# ─────────────────────────────────────────────────────────────────────────────


@register_tool("extract_assumptions", is_mutation=True)
def extract_assumptions(doc_id: int = None, **kwargs):
    """
    Extract labeled input values from the workbook into
    ai_extraction_staging as pending rows.

    If no project_id is available (pre-project chat), extractions are
    returned inline but NOT staged — the Workbench has nothing to attach
    them to until the chat is promoted.
    """
    doc_id_int, err = _coerce_doc_id(doc_id, kwargs)
    if err:
        return err
    project_id = _resolve_project_id(kwargs)
    try:
        with _open_workbook(doc_id_int) as (values_wb, _formulas_wb):
            result = xa.extract_assumptions(
                values_wb,
                doc_id=doc_id_int,
                project_id=project_id,
                write_to_staging=bool(project_id),
            )
        result.update({"ok": True, "doc_id": doc_id_int, "project_id": project_id})
        return result
    except Exception as e:
        logger.exception("extract_assumptions failed doc_id=%s", doc_id_int)
        return _error_envelope(doc_id_int, e)
