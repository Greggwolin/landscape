"""RPT_18: Cash Flow — Annual.

Unified proforma renderer (annual columns). Sourced from the unified cash-flow
engine — the legacy direction-flag budget query is gone. Thin preset; all grid
logic lives in proforma_base.
"""

from .proforma_base import ProformaReportBase


class CashFlowAnnualGenerator(ProformaReportBase):
    report_code = 'RPT_18'
    report_name = 'Cash Flow — Annual'
    preview_granularity = 'year'
    pdf_granularity = 'year'
    group_by_phase = False
