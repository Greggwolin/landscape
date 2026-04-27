"""
Phase 7 — Trust score aggregator + report header builder.

Per the canonical excel-model-audit skill (§Phase 7):

    Trust score is a property-type-aware weighted coverage metric. Each
    component contributes a fractional score (0.0-1.0); the score is a
    weighted sum, rendered as 0-100.

    | Component                       | Standard | Land Dev | Valuation |
    |---------------------------------|----------|----------|-----------|
    | Sheet classification            |   10%    |   15%    |    15%    |
    | Assumption extraction           |   25%    |   30%    |    25%    |
    | Waterfall classification        |   10%    |    5%    |     5%    |
    | Python replication              |   25%    |   20%    |    20%    |
    | Formula integrity + range audit |   15%    |   15%    |    15%    |
    | S&U balance                     |   15%    |   15%    |    20%    |

This module reads from `tbl_excel_audit` (whatever phases have been persisted
so far) and aggregates them into a single trust score. It does NOT re-run
phases — the caller is responsible for ensuring relevant phases have been
executed first.

Phase 5 (Python replication) is currently NOT IMPLEMENTED. When the
replication column is empty, the replication component returns 0.0 and the
caller is informed via the `phase_5_status` field. The score caps at 75% of
the achievable total in that case (replication weight is 20-25% across all
profiles).

Output shape:
    trust_score          float   (0-100, rounded to 2 decimals)
    components           dict    (per-component {weight, raw_score, contribution})
    profile              str     ('standard' | 'land_dev' | 'valuation')
    phase_5_status       str     ('not_run' | 'completed' | 'failed')
    rationale            str
    headline_status      str     ('verified' | 'partial' | 'cannot_verify')
"""

import json
import logging
from typing import Any, Dict, Optional

from django.db import connection, OperationalError, ProgrammingError

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Weight profiles (per skill §Phase 7)
# ─────────────────────────────────────────────────────────────────────────────


WEIGHT_PROFILES: Dict[str, Dict[str, float]] = {
    "standard": {
        "sheet_classification": 0.10,
        "assumption_extraction": 0.25,
        "waterfall_classification": 0.10,
        "python_replication": 0.25,
        "formula_integrity": 0.15,
        "sources_uses_balance": 0.15,
    },
    "land_dev": {
        "sheet_classification": 0.15,
        "assumption_extraction": 0.30,
        "waterfall_classification": 0.05,
        "python_replication": 0.20,
        "formula_integrity": 0.15,
        "sources_uses_balance": 0.15,
    },
    "valuation": {
        "sheet_classification": 0.15,
        "assumption_extraction": 0.25,
        "waterfall_classification": 0.05,
        "python_replication": 0.20,
        "formula_integrity": 0.15,
        "sources_uses_balance": 0.20,
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# Public entry point
# ─────────────────────────────────────────────────────────────────────────────


def compute(doc_id: int, profile: str = "standard") -> Dict[str, Any]:
    """
    Aggregate persisted phase outputs into a single trust score.

    Args:
        doc_id:  core_doc.doc_id of the audited workbook.
        profile: weight profile — 'standard' | 'land_dev' | 'valuation'.

    Returns:
        Trust score envelope (see module docstring).

    If the audit row doesn't exist (no phases run yet), returns trust_score=0
    with `headline_status='cannot_verify'`. The caller can decide whether to
    treat that as an error or a state.
    """
    if profile not in WEIGHT_PROFILES:
        profile = "standard"

    audit_row = _fetch_audit_row(doc_id)
    if audit_row is None:
        return {
            "trust_score": 0.0,
            "components": {},
            "profile": profile,
            "phase_5_status": "not_run",
            "rationale": (
                "No audit row exists for this doc_id. Run classify_excel_file "
                "first, then the rest of the audit pipeline."
            ),
            "headline_status": "cannot_verify",
        }

    weights = WEIGHT_PROFILES[profile]
    components: Dict[str, Dict[str, float]] = {}

    # ── Sheet classification (Phase 0/1) ──
    sheet_score = _score_sheet_classification(audit_row)
    components["sheet_classification"] = _component(weights["sheet_classification"], sheet_score)

    # ── Assumption extraction (Phase 3) ──
    assump_score = _score_assumption_extraction(doc_id)
    components["assumption_extraction"] = _component(weights["assumption_extraction"], assump_score)

    # ── Waterfall classification (Phase 4) ──
    wf_score = _score_waterfall_classification(audit_row.get("waterfall_class"))
    components["waterfall_classification"] = _component(weights["waterfall_classification"], wf_score)

    # ── Python replication (Phase 5) — NOT YET IMPLEMENTED ──
    replication = audit_row.get("replication")
    if replication and isinstance(replication, dict):
        rep_score, phase_5_status = _score_python_replication(replication)
    else:
        rep_score = 0.0
        phase_5_status = "not_run"
    components["python_replication"] = _component(weights["python_replication"], rep_score)

    # ── Formula integrity + range audit (Phase 2 + 2e + 2f) ──
    integ_score = _score_formula_integrity(doc_id, audit_row)
    components["formula_integrity"] = _component(weights["formula_integrity"], integ_score)

    # ── Sources & Uses balance (Phase 6) ──
    su_score = _score_sources_uses(audit_row.get("sources_uses"))
    components["sources_uses_balance"] = _component(weights["sources_uses_balance"], su_score)

    trust_score = round(sum(c["contribution"] for c in components.values()) * 100.0, 2)

    headline_status = _headline_status(components, phase_5_status, trust_score)
    rationale = _build_rationale(components, phase_5_status, profile)

    return {
        "trust_score": trust_score,
        "components": components,
        "profile": profile,
        "phase_5_status": phase_5_status,
        "rationale": rationale,
        "headline_status": headline_status,
    }


def _component(weight: float, raw_score: float) -> Dict[str, float]:
    raw = max(0.0, min(1.0, raw_score))
    return {
        "weight": round(weight, 4),
        "raw_score": round(raw, 4),
        "contribution": round(weight * raw, 4),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Per-component scoring
# ─────────────────────────────────────────────────────────────────────────────


def _score_sheet_classification(audit_row: Dict[str, Any]) -> float:
    """
    1.0 if tier is one of the three known tiers (flat / assumption_heavy /
    full_model). 0.0 otherwise.
    """
    tier = audit_row.get("tier")
    if tier in ("flat", "assumption_heavy", "full_model"):
        return 1.0
    return 0.0


def _score_assumption_extraction(doc_id: int) -> float:
    """
    Coverage-based: count assumption staging rows for this doc_id, scale
    against an expected baseline. 50+ assumptions = 1.0, 0 = 0.0, linear in
    between.
    """
    try:
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*) FROM landscape.ai_extraction_staging
                 WHERE doc_id = %s
                   AND extraction_type = 'excel_audit_assumption'
                """,
                [doc_id],
            )
            count = cur.fetchone()[0] or 0
    except (OperationalError, ProgrammingError) as e:
        logger.warning("trust_score: assumption count query failed: %s", e)
        return 0.0
    # Scale: 0 → 0.0, 10 → 0.5, 50+ → 1.0
    if count >= 50:
        return 1.0
    if count <= 0:
        return 0.0
    return min(1.0, count / 50.0)


def _score_waterfall_classification(waterfall_class: Optional[Dict[str, Any]]) -> float:
    """
    1.0 if waterfall_type is recognized AND tier_count >= 1.
    0.5 if classified but tier_count == 0 (recognized but empty).
    0.0 if not run.
    """
    if not waterfall_class or not isinstance(waterfall_class, dict):
        return 0.0
    wf_type = waterfall_class.get("waterfall_type")
    if not wf_type or wf_type == "none":
        return 0.0
    tier_count = waterfall_class.get("tier_count") or 0
    if tier_count == 0:
        return 0.5
    return 1.0


def _score_python_replication(replication: Dict[str, Any]) -> tuple:
    """
    Per skill §Phase 7: All cells match = 100%, >80% = 75%, >50% = 50%,
    could not replicate (VBA/unsupported) = 0%.

    Returns (score, status_string).
    """
    if not replication or not isinstance(replication, dict):
        return 0.0, "not_run"
    status = replication.get("status")
    if status == "failed":
        return 0.0, "failed"
    matched = replication.get("cells_matched") or 0
    total = replication.get("cells_total") or 0
    if total == 0:
        return 0.0, "not_run"
    pct = matched / total
    if pct >= 1.0:
        return 1.0, "completed"
    if pct >= 0.8:
        return 0.75, "completed"
    if pct >= 0.5:
        return 0.5, "completed"
    return 0.0, "completed"


def _score_formula_integrity(doc_id: int, audit_row: Dict[str, Any]) -> float:
    """
    Score from Phase 2 + 2f findings persisted under phase_4 / phase_5 /
    integrity slot. Uses tbl_excel_audit_finding for severity counts.

    1.0 = no findings or all cosmetic.
    0.5 = some high-severity findings but verdict is MIXED or all-quarantined.
    0.0 = critical findings reaching headline outputs.

    This is a coarse proxy; refines once Phase 2 gets its own persistence
    column (currently findings live in tbl_excel_audit_finding only).
    """
    try:
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT severity, feeds_outputs, COUNT(*)
                  FROM landscape.tbl_excel_audit_finding f
                  JOIN landscape.tbl_excel_audit a ON f.audit_id = a.audit_id
                 WHERE a.doc_id = %s
                 GROUP BY severity, feeds_outputs
                """,
                [doc_id],
            )
            rows = cur.fetchall()
    except (OperationalError, ProgrammingError):
        return 0.5  # neutral when data unavailable

    critical_feeds = sum(c for sev, fo, c in rows if sev == "critical" and fo)
    high_feeds = sum(c for sev, fo, c in rows if sev == "high" and fo)
    if critical_feeds > 0:
        return 0.0
    if high_feeds > 0:
        return 0.5
    return 1.0


def _score_sources_uses(sources_uses: Optional[Dict[str, Any]]) -> float:
    """
    1.0 if balanced (delta < $1).
    0.5 if minor imbalance ($1-100).
    0.0 if major imbalance (>$100) or block not located.
    """
    if not sources_uses or not isinstance(sources_uses, dict):
        return 0.0
    if sources_uses.get("balanced") is True:
        return 1.0
    delta = sources_uses.get("delta")
    if delta is None:
        return 0.0
    if delta <= 100.0:
        return 0.5
    return 0.0


# ─────────────────────────────────────────────────────────────────────────────
# Headline + rationale
# ─────────────────────────────────────────────────────────────────────────────


def _headline_status(components: Dict[str, Dict[str, float]], phase_5_status: str, trust_score: float) -> str:
    """
    'verified'        — Python replication completed AND trust ≥ 80
    'partial'         — Some phases populated; trust score above floor
    'cannot_verify'   — Trust score is effectively zero (no phases produced anything)

    Earlier draft used `n_complete >= 3` for the partial threshold, which
    misfired on perfectly normal partial runs (e.g., an audit where Phase 5
    is deferred — only 2-3 components score because half the weight is
    locked behind replication). Score-based thresholds are more honest:
    if there's a meaningful trust score, the audit IS partial, full stop.
    """
    if phase_5_status == "completed" and trust_score >= 80.0:
        return "verified"
    # 5 points of trust = anything beyond just the sheet classifier firing
    if trust_score >= 5.0:
        return "partial"
    return "cannot_verify"


def _build_rationale(components: Dict[str, Dict[str, float]], phase_5_status: str, profile: str) -> str:
    parts = []
    if phase_5_status == "not_run":
        parts.append(
            "Python replication (Phase 5) has not been run — trust score is "
            "capped until the model's math is independently verified."
        )
    elif phase_5_status == "failed":
        parts.append("Python replication failed; the model's math could not be confirmed.")
    elif phase_5_status == "completed":
        rep = components.get("python_replication", {})
        if rep.get("raw_score", 0) >= 1.0:
            parts.append("Python matches Excel — model math verified.")
        elif rep.get("raw_score", 0) > 0:
            parts.append("Python replication partial — some output cells did not match.")

    contributions = sorted(components.items(), key=lambda kv: kv[1]["contribution"], reverse=True)
    top = contributions[0] if contributions else None
    if top and top[1]["contribution"] > 0:
        parts.append(f"Largest contribution: {top[0].replace('_', ' ')} ({top[1]['contribution'] * 100:.1f}%).")

    parts.append(f"Profile: {profile}.")
    return " ".join(parts)


# ─────────────────────────────────────────────────────────────────────────────
# DB read
# ─────────────────────────────────────────────────────────────────────────────


def _fetch_audit_row(doc_id: int) -> Optional[Dict[str, Any]]:
    """
    Read tbl_excel_audit row for this doc_id. Returns dict or None if no row
    exists OR the table is missing (migration not applied).

    JSONB columns are normalized to Python dicts here. Some psycopg adapter
    configurations return JSONB as raw strings rather than parsed dicts; the
    score functions all check `isinstance(x, dict)`, so an unparsed string
    silently scores 0. Parse once at read time.
    """
    try:
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT audit_id, doc_id, project_id, tier,
                       waterfall_class, replication, sources_uses,
                       trust_score, report_html_path
                  FROM landscape.tbl_excel_audit
                 WHERE doc_id = %s
                """,
                [doc_id],
            )
            row = cur.fetchone()
            if row is None:
                return None
            cols = [d[0] for d in cur.description]
            row_dict = dict(zip(cols, row))
            for jsonb_col in ("waterfall_class", "replication", "sources_uses"):
                v = row_dict.get(jsonb_col)
                if isinstance(v, str):
                    try:
                        row_dict[jsonb_col] = json.loads(v)
                    except (json.JSONDecodeError, TypeError):
                        row_dict[jsonb_col] = None
            return row_dict
    except (OperationalError, ProgrammingError) as e:
        logger.warning("trust_score: tbl_excel_audit not available: %s", e)
        return None
