"""RPT_19: Cash Flow by Phase.

Unified proforma renderer with phase grouping. LAND multi-phase projects break
revenue / cost line items out per tier-2 phase (lineItems carry containerLabel
from the engine). Income / single-phase projects have no phase decomposition,
so they render as a single stream with an honest note — per-phase income splits
are not fabricated. Thin preset; all grid logic lives in proforma_base.
"""

from .proforma_base import ProformaReportBase


class CashFlowByPhaseGenerator(ProformaReportBase):
    report_code = 'RPT_19'
    report_name = 'Cash Flow by Phase'
    preview_granularity = 'year'
    pdf_granularity = 'year'
    group_by_phase = True

    def _notes(self, envelope):
        has_phase = any(
            li.get('containerLabel')
            for s in envelope.get('sections', [])
            for li in (s.get('lineItems') or [])
        )
        if not has_phase:
            return [
                'This project has no phase decomposition (single-phase or income '
                'property); the cash flow is shown as a single stream.'
            ]
        return []
