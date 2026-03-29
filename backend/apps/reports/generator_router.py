"""
Routes report_code to the appropriate generator class.
Returns None if generator is not yet implemented.

All generators inherit from PreviewBaseGenerator and implement generate_preview().
"""

import logging
import importlib

logger = logging.getLogger(__name__)

# Lazy import map: report_code → (module_path, class_name)
# Module paths are relative to the Django project root (backend/).
GENERATOR_REGISTRY = {
    # Universal reports
    'RPT_01': ('apps.reports.generators.rpt_01_sources_and_uses', 'SourcesAndUsesGenerator'),
    'RPT_02': ('apps.reports.generators.rpt_02_debt_summary', 'DebtSummaryGenerator'),
    'RPT_03': ('apps.reports.generators.rpt_03_loan_budget', 'LoanBudgetPreviewGenerator'),
    'RPT_04': ('apps.reports.generators.rpt_04_equity_waterfall', 'EquityWaterfallGenerator'),
    'RPT_05': ('apps.reports.generators.rpt_05_assumptions_summary', 'AssumptionsSummaryGenerator'),
    'RPT_06': ('apps.reports.generators.rpt_06_project_summary', 'ProjectSummaryGenerator'),

    # MF / Income Property reports
    'RPT_07':  ('apps.reports.generators.rpt_07b_rent_roll_detail', 'RentRollDetailGenerator'),
    'RPT_07a': ('apps.reports.generators.rpt_07a_rent_roll_standard', 'RentRollStandardGenerator'),
    'RPT_07b': ('apps.reports.generators.rpt_07b_rent_roll_detail', 'RentRollDetailGenerator'),
    'RPT_08': ('apps.reports.generators.rpt_08_unit_mix', 'UnitMixGenerator'),
    'RPT_09': ('apps.reports.generators.rpt_09_operating_statement', 'OperatingStatementGenerator'),
    'RPT_10': ('apps.reports.generators.rpt_10_direct_cap', 'DirectCapGenerator'),
    'RPT_11': ('apps.reports.generators.rpt_11_sales_comparison', 'SalesComparisonGenerator'),
    'RPT_12': ('apps.reports.generators.rpt_12_leveraged_cf', 'LeveragedCashFlowGenerator'),
    'RPT_13': ('apps.reports.generators.rpt_13_dcf_returns', 'DCFReturnsGenerator'),

    # Land Development reports
    'RPT_14': ('apps.reports.generators.rpt_14_parcel_table', 'ParcelTableGenerator'),
    'RPT_15': ('apps.reports.generators.rpt_15_budget_cost_summary', 'BudgetCostSummaryGenerator'),
    'RPT_16': ('apps.reports.generators.rpt_16_sales_schedule', 'SalesScheduleGenerator'),
    'RPT_17': ('apps.reports.generators.rpt_17_cashflow_monthly', 'CashFlowMonthlyGenerator'),
    'RPT_18': ('apps.reports.generators.rpt_18_cashflow_annual', 'CashFlowAnnualGenerator'),
    'RPT_19': ('apps.reports.generators.rpt_19_cashflow_by_phase', 'CashFlowByPhaseGenerator'),
    'RPT_20': ('apps.reports.generators.rpt_20_budget_vs_actual', 'BudgetVsActualGenerator'),
}


def get_report_generator(report_code: str, project_id: int):
    """
    Return an instantiated generator for the given report code,
    or None if no generator exists yet.

    Args:
        report_code: e.g. 'RPT_01'
        project_id: integer project ID

    Returns:
        PreviewBaseGenerator instance or None
    """
    registry_entry = GENERATOR_REGISTRY.get(report_code)
    if registry_entry is None:
        return None

    module_path, class_name = registry_entry

    try:
        module = importlib.import_module(module_path)
        generator_class = getattr(module, class_name)
        return generator_class(project_id=project_id)
    except (ImportError, AttributeError) as e:
        logger.warning(f"Generator not available for {report_code}: {e}")
        return None
