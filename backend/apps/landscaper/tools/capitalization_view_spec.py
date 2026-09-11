"""The EQUITY artifact's VIEW SPECIFICATION.

Parity slice CAP2 (2026-09-11), corrected the same day.

WHAT THIS IS, AND WHAT IT IS NOT
--------------------------------
Gregg, 2026-09-11: *"The equity waterfall was its own tab with the inputs at the
top that would update when various assumptions were modified. Debt was handled on
a completely different tab."* He is right, and the retired code says so — the old
interface had `capitalization/equity/page.tsx` and `capitalization/debt/page.tsx`
as two separate screens with nothing in common.

So this artifact is **Equity**, not "Capitalization". It carries the capital stack
and the distribution waterfall, which belong together because the tiers divide out
what the stack put in. **Debt is a different artifact that does not exist yet** —
no builder, no surface. The old debt screen held loan cards (amount, rate,
interest-only months, amortisation, term), summary cards (total commitment,
outstanding balance, weighted rate, monthly payment) and a leveraged cash flow.

WHAT THE OLD EQUITY TAB HAD THAT THIS DOES NOT, YET
---------------------------------------------------
Read out of `ad3eff84^` rather than remembered:
  * Three figures across the top: total equity committed, equity DEPLOYED, and
    remaining to deploy. This artifact shows returns instead — deployment is not
    in the engine's summary.
  * An equity PARTNERS table, one row per partner. This has one row for LP and
    one for GP.
  * A waterfall TYPE switch — IRR, equity multiple, or both.
  * Inputs at the top that re-run the results when changed. The platform already
    does this half: a committed edit rebuilds the schema through the same builder,
    so results redraw. What is missing is the ability to make the edit at all.

WHAT THIS SLICE DOES NOT DO, AND WHY
------------------------------------
It does not make anything writable, and that is a finding rather than an
omission. The column definitions on this artifact mark hurdle, the splits, the
promote and the contributed amounts as editable — but **no row carries a write
pointer**, so none of them can actually be typed into. The renderer gates on the
pointer, never on the flag, so today every cell here reads read-only. Correctly.

The reason is one line in the engine: ``calculate_project_waterfall`` selects
tier_number, tier_name, the hurdles and the splits from ``tbl_waterfall_tier``
and **not** ``tier_id``. Without the row's own id a pointer cannot be built
honestly, and inventing one would put a write on a row nobody identified. The
capital-stack amounts have the same problem from the other end — they arrive as
``lp_equity`` / ``gp_equity`` on the engine's project summary, and which row of
which table they came from is not established here.

Surfacing the id is a change inside a shared calculation service with several
callers, so it gets its own slice and its own read of what consumes those rows.
Recorded in ``next_actions.md`` 2026-09-11.

BUILT FROM THE SCHEMA
---------------------
Same as sales and cash flow: one source of rows, so a rendered cell and any
pointer it later acquires cannot disagree.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

CAPITALIZATION_CONFIG_KEY = 'capitalization_view_config'


def build_capitalization_view_config(
    *,
    project_id: int,
    project_name: Optional[str],
    schema: Dict[str, Any],
) -> Dict[str, Any]:
    """The specification the renderer draws from, read off the schema."""
    blocks = {b.get('id'): b for b in schema.get('blocks', [])}
    kpis = blocks.get('cap_kpis', {})
    stack = blocks.get('cap_stack', {})
    waterfall = blocks.get('cap_waterfall', {})

    def table(block: Dict[str, Any], note: Optional[str] = None) -> Dict[str, Any]:
        return {
            'title': block.get('title') or '',
            'note': note,
            'columns': [
                {'key': c['key'], 'label': c.get('label'), 'align': c.get('align', 'left'),
                 # Marked calculated only where the column is a DERIVED FIGURE —
                 # not editable and right-aligned, which is how every schedule
                 # here carries money and rates. An identity or label column is
                 # also not editable, and greying it like a formula would say
                 # something untrue about where the number came from.
                 **({'kind': 'computed'}
                    if c.get('editable') is False and c.get('align') == 'right'
                    else {})}
                for c in block.get('columns', [])
            ],
            'rows': [
                {'id': r['id'], 'cells': dict(r.get('cells', {}))}
                for r in block.get('rows', [])
            ],
        }

    title = f'{project_name} — Equity' if project_name else 'Equity'
    return {
        'topic': 'equity',
        'kicker': 'Equity',
        'title': title,
        'source_label': 'the waterfall engine and this project’s deal terms',
        'binding': {'state': 'live', 'label': 'live'},
        'kpis': [
            {'label': p.get('label'), 'value': p.get('value')}
            for p in kpis.get('pairs', [])
        ],
        'stack': table(
            stack,
            note='What each partner put in. Share is calculated from the total.',
        ),
        'waterfall': table(
            waterfall,
            note='The terms are the deal; the distributions are what the engine '
                 'divides out from them. Distributions are never typed in.',
        ),
        # Said once, in the specification, so the screen can tell the reader why
        # nothing here takes an edit yet instead of leaving them clicking.
        'read_only_reason': (
            'Editing is not wired up on this surface yet — the waterfall engine '
            'does not return the id of the row each tier came from, so a change '
            'would have nowhere safe to land.'
        ),
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'project_id': project_id,
    }
