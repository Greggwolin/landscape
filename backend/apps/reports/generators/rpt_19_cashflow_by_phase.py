"""RPT_19: Cash Flow by Phase generator.

Property-type-agnostic. Revenue and costs come from the unified cash-flow
routing (``apps.financial.services.cashflow_routing``) — NOT from parcel-sale
assumptions — so income properties render correct revenue, not blanks.

- LAND: one row per tier-2 phase division, computed by re-running the land
  engine filtered to that division (``container_ids``). A reconciling
  "Unphased / project-level" row absorbs any amount not attributable to a
  single phase so the table totals always tie to the project-level schedule.
- Income (MF/OFF/RET/IND/HTL/MXU): the income engine emits a single stream
  with no phase decomposition, so the whole asset is shown as one honestly
  labelled row (per-phase income splits are out of scope until the engine
  supports ``container_ids``).
"""

from .preview_base import PreviewBaseGenerator
from apps.financial.services.cashflow_routing import (
    fetch_cashflow_schedule,
    leveraged_cashflow_summary,
    INCOME_PROPERTY_TYPE_CODES,
)


class CashFlowByPhaseGenerator(PreviewBaseGenerator):
    report_code = 'RPT_19'
    report_name = 'Cash Flow by Phase'

    def generate_preview(self) -> dict:
        project = self.get_project()
        ptype = (project.get('project_type_code') or '').upper()

        result = {
            'title': 'Cash Flow by Phase',
            'subtitle': project.get('project_name', ''),
            'message': '',
            'sections': [],
        }

        try:
            if ptype == 'LAND':
                rows, note = self._land_by_phase()
            elif ptype in INCOME_PROPERTY_TYPE_CODES:
                rows, note = self._income_whole_asset(project)
            else:
                result['message'] = (
                    f'Cash flow by phase is not available for project type '
                    f'{ptype or "(unknown)"}.'
                )
                return result
        except RuntimeError as err:
            result['message'] = f'Cash flow could not be generated: {err}'
            return result

        if not rows:
            result['message'] = (
                'No cash flow schedule available for this project.'
            )
            return result

        total_in = sum(r['inflows'] for r in rows)
        total_out = sum(r['outflows'] for r in rows)
        total_net = sum(r['net_cf'] for r in rows)

        sections = [self.make_kpi_section('Phase Summary', [
            self.make_kpi_card('Phases', str(len(rows))),
            self.make_kpi_card('Total Inflows', self.fmt_currency(total_in)),
            self.make_kpi_card('Total Outflows', self.fmt_currency(total_out)),
            self.make_kpi_card('Net Cash Flow', self.fmt_currency(total_net)),
        ])]

        columns = [
            {'key': 'phase_name', 'label': 'Phase', 'align': 'left'},
            {'key': 'inflows', 'label': 'Inflows', 'align': 'right', 'format': 'currency'},
            {'key': 'outflows', 'label': 'Outflows', 'align': 'right', 'format': 'currency'},
            {'key': 'net_cf', 'label': 'Net Cash Flow', 'align': 'right', 'format': 'currency'},
            {'key': 'pct', 'label': '% of Total', 'align': 'right', 'format': 'percentage'},
        ]

        display_rows = [{
            'phase_name': r['phase_name'],
            'inflows': r['inflows'],
            'outflows': r['outflows'],
            'net_cf': r['net_cf'],
            'pct': self.safe_div(abs(r['net_cf']), abs(total_net) if total_net else 1) * 100,
        } for r in rows]

        totals = {
            'inflows': total_in,
            'outflows': total_out,
            'net_cf': total_net,
            'pct': 100.0,
        }
        sections.append(self.make_table_section('Cash Flow by Phase', columns, display_rows, totals))

        if note:
            sections.append(self.make_text_section('Note', note))

        result['sections'] = sections
        result.pop('message', None)
        return result

    # ── helpers ─────────────────────────────────────────────────────────────

    @staticmethod
    def _row_from_summary(name: str, summary: dict) -> dict:
        """Build a phase row from a leveraged_cashflow_summary result.

        Inflows include sale reversion; outflows are costs + financing +
        lotbank (already signed negative). net == inflows + outflows.
        """
        inflows = summary['totalNetRevenue'] + summary['reversion']
        outflows = summary['totalCosts'] + summary['totalFinancing'] + summary['totalLotbank']
        return {
            'phase_name': name,
            'inflows': inflows,
            'outflows': outflows,
            'net_cf': inflows + outflows,
        }

    def _land_by_phase(self):
        phases = self.execute_query("""
            SELECT division_id, display_name
            FROM landscape.tbl_division
            WHERE project_id = %s AND tier = 2
            ORDER BY display_name
        """, [self.project_id])

        # Project-level total (authoritative horizon, used to reconcile).
        total_env = fetch_cashflow_schedule(self.project_id, include_financing=True)
        total = leveraged_cashflow_summary(total_env)

        rows = []
        sum_in = sum_out = 0.0
        for ph in phases:
            env = fetch_cashflow_schedule(
                self.project_id, include_financing=True,
                container_ids=[ph['division_id']],
            )
            s = leveraged_cashflow_summary(env)
            row = self._row_from_summary(ph['display_name'] or f"Division {ph['division_id']}", s)
            sum_in += row['inflows']
            sum_out += row['outflows']
            rows.append(row)

        # Reconcile: anything not captured by a single phase (project-level
        # budget, unphased parcels) lands in a transparent remainder row so the
        # report ties to the project schedule rather than silently dropping it.
        rem_in = total['totalNetRevenue'] + total['reversion'] - sum_in
        rem_out = (total['totalCosts'] + total['totalFinancing'] + total['totalLotbank']) - sum_out
        if abs(rem_in) >= 1 or abs(rem_out) >= 1:
            rows.append({
                'phase_name': 'Unphased / project-level',
                'inflows': rem_in,
                'outflows': rem_out,
                'net_cf': rem_in + rem_out,
            })

        note = None
        if not rows:
            note = 'No phase divisions found for this land project.'
        return rows, note

    def _income_whole_asset(self, project):
        env = fetch_cashflow_schedule(self.project_id, include_financing=True)
        s = leveraged_cashflow_summary(env)
        if not s['rows']:
            return [], None
        name = f"{project.get('project_name', 'Whole asset')} — whole asset (single stream)"
        rows = [self._row_from_summary(name, s)]
        note = (
            'Income properties are modeled as a single cash-flow stream; the '
            'engine does not yet decompose income by phase, so the whole asset '
            'is shown as one row.'
        )
        return rows, note
