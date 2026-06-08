"""RPT_17: Monthly Project Cash Flow.

Unified proforma renderer with actual monthly columns. The shared renderer
chooses orientation and paginates the month columns horizontally (repeating the
Item + Total columns on each page), so the PDF shows real months rather than an
annual roll-up. Sourced from the unified cash-flow engine — the legacy
direction-flag budget query is gone. Thin preset; all grid logic lives in
proforma_base.
"""

from .proforma_base import ProformaReportBase


class CashFlowMonthlyGenerator(ProformaReportBase):
    report_code = 'RPT_17'
    report_name = 'Monthly Project Cash Flow'
    preview_granularity = 'month'
    pdf_granularity = 'month'
    group_by_phase = False
