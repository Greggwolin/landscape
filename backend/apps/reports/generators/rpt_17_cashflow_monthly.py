"""RPT_17: Monthly Project Cash Flow.

Unified proforma renderer. Monthly preview; the PDF rolls up to annual columns
(96 monthly columns do not fit a page). Sourced from the unified cash-flow
engine — the legacy direction-flag budget query is gone. Thin preset; all grid
logic lives in proforma_base.
"""

from .proforma_base import ProformaReportBase


class CashFlowMonthlyGenerator(ProformaReportBase):
    report_code = 'RPT_17'
    report_name = 'Monthly Project Cash Flow'
    preview_granularity = 'month'
    pdf_granularity = 'year'
    group_by_phase = False
