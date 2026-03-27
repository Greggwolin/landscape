"""
Data migration: Update data_readiness flags for all 20 report generators.

All generators now have real SQL queries with graceful degradation
(return helpful messages when underlying data doesn't exist).

Readiness logic:
- 'ready': generator queries tables that exist in the core schema and
  will return meaningful data for most projects.
- 'partial': generator queries tables that may not be populated yet
  (e.g., tbl_cash_flow_projection, tbl_income_dcf) but the SQL is
  complete and the generator handles empty results gracefully.
"""

from django.db import migrations


READINESS_UPDATES = {
    # Capital structure — depend on equity/loan tables (usually populated)
    'RPT_01': 'ready',       # Sources & Uses — equity partners + loans + budget
    'RPT_02': 'ready',       # Debt Summary — tbl_loan
    'RPT_03': 'ready',       # Loan Budget — budget categories
    'RPT_04': 'partial',     # Equity Waterfall — tbl_equity_investor + tbl_equity_waterfall_tier

    # Underwriting / Executive
    'RPT_05': 'ready',       # Assumptions Summary — project + parcels + loans + units
    'RPT_06': 'ready',       # Project Summary — project + parcels/units

    # Income property
    'RPT_07': 'ready',       # Rent Roll — tbl_multifamily_unit + lease
    'RPT_08': 'ready',       # Unit Mix — tbl_multifamily_unit
    'RPT_09': 'ready',       # Operating Statement — units + income approach + expenses
    'RPT_10': 'ready',       # Direct Cap — income approach + units
    'RPT_11': 'ready',       # Sales Comparison — tbl_sales_comparables (already ready)

    # Valuation / DCF — depend on projection tables
    'RPT_12': 'partial',     # Leveraged Cash Flow — tbl_cash_flow_projection
    'RPT_13': 'partial',     # DCF Returns — tbl_income_dcf + tbl_cash_flow_projection

    # Land development
    'RPT_14': 'ready',       # Parcel Inventory — tbl_parcel + tbl_phase (already ready)
    'RPT_15': 'ready',       # Budget Cost Summary — budget + actuals
    'RPT_16': 'partial',     # Sales Schedule — tbl_sale_absorption
    'RPT_17': 'partial',     # Cash Flow Monthly — budget with period_date
    'RPT_18': 'partial',     # Cash Flow Annual — budget with period_date
    'RPT_19': 'partial',     # Cash Flow by Phase — budget with container_id
    'RPT_20': 'ready',       # Budget vs. Actual — budget + actuals
}


def update_readiness(apps, schema_editor):
    ReportDefinition = apps.get_model('reports', 'ReportDefinition')
    for code, readiness in READINESS_UPDATES.items():
        ReportDefinition.objects.filter(report_code=code).update(
            data_readiness=readiness
        )


def revert_readiness(apps, schema_editor):
    # Revert to original values from 0005
    ORIGINAL = {
        'RPT_01': 'partial', 'RPT_02': 'not_ready', 'RPT_03': 'not_ready',
        'RPT_04': 'partial', 'RPT_05': 'partial', 'RPT_06': 'partial',
        'RPT_07': 'ready', 'RPT_08': 'ready', 'RPT_09': 'ready',
        'RPT_10': 'ready', 'RPT_11': 'ready', 'RPT_12': 'not_ready',
        'RPT_13': 'partial', 'RPT_14': 'ready', 'RPT_15': 'partial',
        'RPT_16': 'not_ready', 'RPT_17': 'partial', 'RPT_18': 'partial',
        'RPT_19': 'partial', 'RPT_20': 'partial',
    }
    ReportDefinition = apps.get_model('reports', 'ReportDefinition')
    for code, readiness in ORIGINAL.items():
        ReportDefinition.objects.filter(report_code=code).update(
            data_readiness=readiness
        )


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0005_seed_report_definitions'),
    ]

    operations = [
        migrations.RunPython(update_readiness, revert_readiness),
    ]
