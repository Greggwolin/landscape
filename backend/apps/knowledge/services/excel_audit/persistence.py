"""
tbl_excel_audit / tbl_excel_audit_finding upsert helpers.

The audit pipeline phases (4-7) each contribute one column / row set to
these tables. Persistence is opportunistic — if the migration hasn't been
applied yet, we log a warning and continue. Audit tools should never
fail because storage is unavailable; the in-memory result is still
returned to the caller.

Schema lives in `migrations/20260425_excel_audit_tables.sql`.

  tbl_excel_audit
    audit_id              serial PK
    doc_id                int FK core_doc.doc_id, unique (one row per doc)
    project_id            int nullable
    tier                  text  ('flat'|'assumption_heavy'|'full_model')
    waterfall_class       jsonb (Phase 4 output)
    replication           jsonb (Phase 5 output)
    sources_uses          jsonb (Phase 6 output)
    trust_score           numeric(5,2) nullable (Phase 7)
    report_html_path      text nullable (Phase 7)
    created_at            timestamptz default now()
    updated_at            timestamptz default now()

  tbl_excel_audit_finding
    finding_id            serial PK
    audit_id              int FK tbl_excel_audit.audit_id
    phase                 text  ('phase_4'|'phase_5'|'phase_5b'|'phase_6'|'phase_7')
    severity              text  ('critical'|'high'|'medium'|'low')
    category              text
    sheet_cell            text nullable
    message               text
    feeds_outputs         boolean default false
    created_at            timestamptz default now()

Both tables live in `landscape` schema (search_path is set in db connection).
"""

import logging
import json
from typing import Dict, List, Optional

from django.db import connection, OperationalError, ProgrammingError

logger = logging.getLogger(__name__)


# Column names that map directly to phase JSON output keys
PHASE_TO_COLUMN = {
    "phase_4": "waterfall_class",
    "phase_5": "replication",
    "phase_5b": "replication",   # debt replication merges into the same column
    "phase_6": "sources_uses",
}


def upsert_audit_phase(
    doc_id: int,
    phase: str,
    payload: Dict,
    project_id: Optional[int] = None,
    tier: Optional[str] = None,
    findings: Optional[List[Dict]] = None,
) -> Optional[int]:
    """
    Insert or update one phase's contribution to tbl_excel_audit, plus
    any associated findings. Returns audit_id, or None if the table is
    missing (migration not applied yet).

    Idempotent — re-running the same phase overwrites the prior payload
    for that doc.
    """
    if phase not in PHASE_TO_COLUMN and phase != "phase_7":
        logger.warning("upsert_audit_phase unknown phase=%s doc_id=%s", phase, doc_id)
        return None

    # Phase 7 writes trust_score + report_html_path, not a JSONB column.
    # Phase 4-6 write JSONB.
    try:
        with connection.cursor() as cur:
            audit_id = _ensure_audit_row(cur, doc_id, project_id, tier)
            if audit_id is None:
                return None

            if phase == "phase_7":
                cur.execute(
                    """
                    UPDATE landscape.tbl_excel_audit
                       SET trust_score = %s,
                           report_html_path = %s,
                           updated_at = now()
                     WHERE audit_id = %s
                    """,
                    [
                        payload.get("trust_score"),
                        payload.get("report_html_path"),
                        audit_id,
                    ],
                )
            else:
                col = PHASE_TO_COLUMN[phase]
                # For phase_5b we MERGE into existing replication payload
                # rather than overwriting — debt sits alongside waterfall.
                if phase == "phase_5b":
                    cur.execute(
                        f"""
                        UPDATE landscape.tbl_excel_audit
                           SET {col} = COALESCE({col}, '{{}}'::jsonb) || %s::jsonb,
                               updated_at = now()
                         WHERE audit_id = %s
                        """,
                        [json.dumps({"debt": payload}), audit_id],
                    )
                else:
                    cur.execute(
                        f"""
                        UPDATE landscape.tbl_excel_audit
                           SET {col} = %s::jsonb,
                               updated_at = now()
                         WHERE audit_id = %s
                        """,
                        [json.dumps(payload), audit_id],
                    )

            if findings:
                _insert_findings(cur, audit_id, phase, findings)

            return audit_id

    except (OperationalError, ProgrammingError) as e:
        # Table doesn't exist — migration not yet applied. Don't crash.
        logger.warning(
            "excel_audit persistence unavailable (migration not applied?) "
            "doc_id=%s phase=%s error=%s",
            doc_id, phase, e,
        )
        return None
    except Exception:
        logger.exception(
            "excel_audit upsert failed doc_id=%s phase=%s", doc_id, phase
        )
        return None


def _ensure_audit_row(cur, doc_id: int, project_id: Optional[int], tier: Optional[str]) -> Optional[int]:
    """
    Return the audit_id for `doc_id`, creating a row if none exists.
    Updates project_id / tier on existing rows if either is newly provided.
    """
    cur.execute(
        """
        SELECT audit_id, project_id, tier
          FROM landscape.tbl_excel_audit
         WHERE doc_id = %s
        """,
        [doc_id],
    )
    row = cur.fetchone()

    if row is None:
        cur.execute(
            """
            INSERT INTO landscape.tbl_excel_audit (doc_id, project_id, tier)
            VALUES (%s, %s, %s)
            RETURNING audit_id
            """,
            [doc_id, project_id, tier],
        )
        return cur.fetchone()[0]

    audit_id, existing_project_id, existing_tier = row
    if (project_id and existing_project_id != project_id) or (tier and existing_tier != tier):
        cur.execute(
            """
            UPDATE landscape.tbl_excel_audit
               SET project_id = COALESCE(%s, project_id),
                   tier = COALESCE(%s, tier),
                   updated_at = now()
             WHERE audit_id = %s
            """,
            [project_id, tier, audit_id],
        )
    return audit_id


def _insert_findings(cur, audit_id: int, phase: str, findings: List[Dict]) -> None:
    """
    Replace findings for this phase + audit (delete-then-insert pattern so
    re-runs don't duplicate findings).
    """
    cur.execute(
        """
        DELETE FROM landscape.tbl_excel_audit_finding
         WHERE audit_id = %s AND phase = %s
        """,
        [audit_id, phase],
    )
    for f in findings:
        cur.execute(
            """
            INSERT INTO landscape.tbl_excel_audit_finding
                (audit_id, phase, severity, category, sheet_cell, message, feeds_outputs)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            [
                audit_id,
                phase,
                f.get("severity", "low"),
                f.get("category", "general"),
                f.get("sheet_cell"),
                f.get("message", ""),
                bool(f.get("feeds_outputs", False)),
            ],
        )
