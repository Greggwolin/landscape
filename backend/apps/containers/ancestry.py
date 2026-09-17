"""Where a division SITS in the project's hierarchy, and what it is called.

One home for two things every budget reader needs and nobody had:

1. **Ancestry.** A budget line hangs off ONE division, which may sit at any
   tier. Most sit on a phase; the occasional line belongs to a single parcel.
   A report that groups by the line's own division therefore shows that parcel
   as a peer of the phases instead of inside its phase total — the defect
   Gregg reported on 2026-09-17. ``DIVISION_ANCESTRY_CTE`` gives every division
   its ancestor at each tier, so a rollup can ask for "by phase" and get an
   answer that includes the parcel-level lines.

2. **A member's NAME.** Members are numbers; the word in front comes from the
   level, which is renameable in project setup. ``tbl_division.display_name``
   holds a string baked when the row was created, so project 9's level-1 rows
   still read "Area 1" under a level the user has since called Village, and its
   level-3 rows read "Parcel 1.101" under a level already called Parcel.
   ``compose_member_label`` strips the stale word and puts the CURRENT level
   label in front — the same rule the renderer's ``composeMember`` follows.

The hierarchy is three tiers deep by construction (tbl_project_config carries
exactly tier_1..tier_3 labels), so ancestry is two self-joins rather than a
recursive walk.
"""

from __future__ import annotations

import logging
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_TIER_LABELS = {1: 'Level 1', 2: 'Level 2', 3: 'Level 3'}

# The baked-in level word at the front of a stored name: letters up to the
# first digit. "Parcel 1.101" -> "1.101"; "Riverbend" is untouched because it
# has no digit to stop at.
_LEADING_WORDS = re.compile(r'^[A-Za-z][A-Za-z\s&/\-]*?\s*(?=[\d])')


def member_number(display_name: Optional[str], code: Optional[str],
                  division_id: int) -> str:
    """The member's identifier, with any baked-in level name removed.

    ``Area 1`` -> ``1`` · ``Parcel 1.101`` -> ``1.101`` · ``1.1`` -> ``1.1``

    A name with no digits at all is a genuine name rather than a numbered
    member (someone called a village "Riverbend"), and is returned untouched.
    """
    raw = (display_name or '').strip()
    if raw:
        stripped = _LEADING_WORDS.sub('', raw).strip()
        return stripped or raw
    return (code or f'#{division_id}').strip()


def compose_member_label(level_label: Optional[str],
                         display_name: Optional[str],
                         code: Optional[str],
                         division_id: int) -> str:
    """A member as the screen names it: its level's label plus its number.

    ``('Phase', '1.2', 'PHASE-22', 629)`` -> ``Phase 1.2``.
    """
    number = member_number(display_name, code, division_id)
    if re.search(r'\d', number) and level_label:
        return f'{level_label} {number}'
    return number


def natural_key(text: Optional[str]):
    """Sort ``1.10`` after ``1.9`` and ``Village 10`` after ``Village 9``."""
    return [(0, int(tok), '') if tok.isdigit() else (1, 0, tok.lower())
            for tok in re.split(r'(\d+)', text or '') if tok]


def tier_labels(cursor, project_id: int) -> Dict[int, str]:
    """The project's own level names, by tier, with neutral fallbacks.

    Reads config directly rather than through ``fetch_project_levels`` because
    a rollup must be able to name the level a DISABLED tier sits at: turning a
    level off in setup does not detach the budget lines already hanging on it.
    """
    labels = dict(DEFAULT_TIER_LABELS)
    cursor.execute(
        """
        SELECT tier_1_label, tier_2_label, tier_3_label
        FROM landscape.tbl_project_config
        WHERE project_id = %s
        """, [project_id])
    row = cursor.fetchone()
    if row:
        for idx, tier in enumerate((1, 2, 3)):
            if row[idx]:
                labels[tier] = row[idx]
    return labels


# Every division with its ancestor at each tier. Written as a CTE body so a
# caller can splice it into its own query:
#
#     WITH """ + DIVISION_ANCESTRY_CTE + """
#     SELECT ... FROM landscape.core_fin_fact_budget b
#     JOIN division_ancestry a ON a.division_id = b.division_id
#
# A division is its own ancestor at its own tier, which is what lets a caller
# ask for "the tier-2 id" and get the phase itself for a phase-level line and
# the parent phase for a parcel-level one.
DIVISION_ANCESTRY_CTE = """
division_ancestry AS (
    SELECT
        d.division_id,
        d.project_id,
        d.tier,
        CASE d.tier WHEN 1 THEN d.division_id
                    WHEN 2 THEN p.division_id
                    WHEN 3 THEN g.division_id END            AS tier1_id,
        CASE d.tier WHEN 1 THEN d.display_name
                    WHEN 2 THEN p.display_name
                    WHEN 3 THEN g.display_name END           AS tier1_name,
        CASE d.tier WHEN 1 THEN d.division_code
                    WHEN 2 THEN p.division_code
                    WHEN 3 THEN g.division_code END          AS tier1_code,
        CASE d.tier WHEN 2 THEN d.division_id
                    WHEN 3 THEN p.division_id END            AS tier2_id,
        CASE d.tier WHEN 2 THEN d.display_name
                    WHEN 3 THEN p.display_name END           AS tier2_name,
        CASE d.tier WHEN 2 THEN d.division_code
                    WHEN 3 THEN p.division_code END          AS tier2_code,
        CASE d.tier WHEN 3 THEN d.division_id END            AS tier3_id,
        CASE d.tier WHEN 3 THEN d.display_name END           AS tier3_name,
        CASE d.tier WHEN 3 THEN d.division_code END          AS tier3_code,
        d.display_name,
        d.division_code
    FROM landscape.tbl_division d
    LEFT JOIN landscape.tbl_division p ON p.division_id = d.parent_division_id
    LEFT JOIN landscape.tbl_division g ON g.division_id = p.parent_division_id
)
"""


def _budget_rollup_sql(level: int) -> str:
    """Budget totals grouped at ``level``, rolling deeper lines up into it.

    A line BELOW the level rolls up (a parcel line lands in its phase). A line
    ABOVE it cannot be pushed down without inventing an allocation, so it keeps
    its own row and says which tier it is on — visible and honest rather than
    silently folded into one of the members below it or dropped.
    """
    return f"""
        WITH {DIVISION_ANCESTRY_CTE}
        SELECT
            COALESCE(a.tier{level}_id, a.division_id)      AS group_division_id,
            COALESCE(a.tier{level}_name, a.display_name)   AS group_name,
            COALESCE(a.tier{level}_code, a.division_code)  AS group_code,
            CASE WHEN a.tier{level}_id IS NOT NULL THEN {level}
                 ELSE a.tier END                           AS group_tier,
            COUNT(*)                                       AS row_count,
            COUNT(*) FILTER (WHERE a.tier > {level})       AS rolled_up_row_count,
            COALESCE(SUM(f.amount), 0)                     AS total_amount
        FROM landscape.core_fin_fact_budget f
        LEFT JOIN division_ancestry a ON a.division_id = f.division_id
        WHERE f.project_id = %s
        GROUP BY 1, 2, 3, 4
        ORDER BY total_amount DESC
    """


def summarize_rollup(records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Percent-of-total, the grand total and the top-two concentration.

    Pure: no database. Shares are computed off the grand total of the rows
    handed in, so a caller cannot quote a percentage of a different set than
    the one it is showing.
    """
    grand_total = sum(float(r.get('total_amount') or 0) for r in records)
    line_item_count = sum(int(r.get('row_count') or 0) for r in records)
    for record in records:
        record['total_amount'] = float(record.get('total_amount') or 0)
        record['row_count'] = int(record.get('row_count') or 0)
        share = (record['total_amount'] / grand_total * 100) if grand_total else 0.0
        record['percent_of_total'] = round(share, 1)
    top_two_total = sum(r['total_amount'] for r in records[:2])
    return {
        'grand_total': grand_total,
        'line_item_count': line_item_count,
        'top_two_total': top_two_total,
        'top_two_percent_of_total': round(
            (top_two_total / grand_total * 100) if grand_total else 0.0, 1),
    }


def fetch_budget_rollup_by_level(project_id: int, level: int) -> Dict[str, Any]:
    """Budget totals by hierarchy level, with deeper lines rolled up into it.

    ``level`` is 1, 2 or 3 — the project's own levels, whatever it calls them.
    Every record carries the member's composed label ("Phase 1.2"), its total,
    its share, and how many of its lines were rolled up from below, so a report
    can say so rather than leaving the reader to wonder where a parcel went.
    """
    from django.db import connection

    if level not in (1, 2, 3):
        raise ValueError(f'level must be 1, 2 or 3 (got {level!r})')

    with connection.cursor() as cursor:
        labels = tier_labels(cursor, project_id)
        cursor.execute(_budget_rollup_sql(level), [project_id])
        columns = [col[0] for col in cursor.description]
        records = [dict(zip(columns, row)) for row in cursor.fetchall()]

    for record in records:
        tier = record.get('group_tier')
        if record.get('group_division_id') is None:
            record['group_label'] = 'Unassigned'
        else:
            record['group_label'] = compose_member_label(
                labels.get(tier), record.get('group_name'),
                record.get('group_code'), record['group_division_id'])
        record['rolled_up_row_count'] = int(record.get('rolled_up_row_count') or 0)
        # True when this row is NOT at the requested level -- a line sitting
        # above it, kept visible rather than allocated downward.
        record['above_level'] = tier is not None and tier < level

    summary = summarize_rollup(records)
    return {
        'level': level,
        'level_label': labels.get(level, DEFAULT_TIER_LABELS[level]),
        'records': records,
        **summary,
    }


def expand_division_scope(project_id: int,
                          division_ids: Optional[List[int]]) -> Optional[List[int]]:
    """A chosen set of divisions PLUS everything underneath them.

    A filter names the members the reader picked — "Phase 1.2" — but a budget
    line may hang off a member below one of them, and a plain
    ``division_id = ANY(chosen)`` drops that line silently. Filtered totals
    then disagree with unfiltered ones by exactly the amount nobody can see.

    Returns the ids unchanged when nothing is selected (no filter at all), and
    never widens UPWARD: picking a phase must not pull in its whole village.
    """
    from django.db import connection

    if not division_ids:
        return division_ids

    chosen = [int(d) for d in division_ids]
    with connection.cursor() as cursor:
        cursor.execute(
            f"""
            WITH {DIVISION_ANCESTRY_CTE}
            SELECT a.division_id
            FROM division_ancestry a
            WHERE a.project_id = %s
              AND (a.division_id = ANY(%s)
                   OR a.tier1_id = ANY(%s)
                   OR a.tier2_id = ANY(%s))
            """,
            [project_id, chosen, chosen, chosen],
        )
        found = [row[0] for row in cursor.fetchall()]

    # Union rather than replacement: an id that resolves to nothing (deleted,
    # or belonging to another project) stays in the list so the query it feeds
    # returns nothing for it, rather than silently becoming an unfiltered run.
    return sorted(set(chosen) | set(found))
