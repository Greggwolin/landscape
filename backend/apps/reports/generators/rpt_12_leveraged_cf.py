"""RPT_12: Leveraged Cash Flow.

Unified proforma renderer (annual columns, no phase grouping). All grid logic
lives in proforma_base; this is a thin preset. Data comes from the unified
cash-flow routing, so it works for every property type.
"""

from .proforma_base import ProformaReportBase


class LeveragedCashFlowGenerator(ProformaReportBase):
    report_code = 'RPT_12'
    report_name = 'Leveraged Cash Flow'
    preview_granularity = 'year'
    pdf_granularity = 'year'
    group_by_phase = False
