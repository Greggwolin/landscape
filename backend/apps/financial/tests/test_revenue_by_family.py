"""Revenue split by land-use family (QV, 2026-10-13).

The rollup must add up to the engine's own headline totals on both bases, so
Landscaper can quote a split that reconciles to whatever headline it quotes.
Pure function: no database.
"""
from apps.financial.services.land_dev_cashflow_service import LandDevCashFlowService

SALES = [
    {'familyName': 'Residential', 'typeCode': 'SFD', 'units': 100, 'rawUnits': 100, 'acres': 20.0,
     'grossRevenue': 110.0, 'netRevenue': 90.0, 'storedGrossProceeds': 100.0, 'storedNetProceeds': 85.0},
    {'familyName': 'Residential', 'typeCode': 'MF', 'units': 50, 'rawUnits': 50, 'acres': 5.0,
     'grossRevenue': 55.0, 'netRevenue': 50.0, 'storedGrossProceeds': 50.0, 'storedNetProceeds': 48.0},
    # Acreage-priced: the engine floors 'units' at 1 for period maths; the rollup must not count it.
    {'familyName': 'Commercial', 'typeCode': 'RET', 'units': 1, 'rawUnits': 0, 'acres': 10.0,
     'grossRevenue': 35.0, 'netRevenue': 34.0, 'storedGrossProceeds': 30.0, 'storedNetProceeds': 29.0},
]


def test_rows_add_up_to_both_headline_bases():
    rows = LandDevCashFlowService._rollup_revenue_by_family(SALES)
    assert [r['familyName'] for r in rows] == ['Residential', 'Commercial']  # largest first
    assert sum(r['modeledGrossRevenue'] for r in rows) == 200.0
    assert sum(r['modeledNetRevenue'] for r in rows) == 174.0
    assert sum(r['storedGrossProceeds'] for r in rows) == 180.0
    assert sum(r['storedNetProceeds'] for r in rows) == 162.0


def test_shares_are_percent_of_the_matching_basis():
    res, com = LandDevCashFlowService._rollup_revenue_by_family(SALES)
    assert res['modeledGrossSharePct'] == 82.5 and com['modeledGrossSharePct'] == 17.5
    assert res['storedGrossSharePct'] == 83.3 and com['storedGrossSharePct'] == 16.7
    assert res['storedNetSharePct'] == 82.1 and com['storedNetSharePct'] == 17.9


def test_units_acres_and_type_codes():
    res, com = LandDevCashFlowService._rollup_revenue_by_family(SALES)
    assert res['units'] == 150 and res['acres'] == 25.0 and res['typeCodes'] == ['MF', 'SFD']
    assert com['units'] == 0 and com['acres'] == 10.0 and com['parcelCount'] == 1


def test_missing_family_is_unassigned_and_empty_input_is_empty():
    rows = LandDevCashFlowService._rollup_revenue_by_family(
        [{'grossRevenue': 1.0, 'netRevenue': 1.0}])
    assert rows[0]['familyName'] == 'Unassigned' and rows[0]['modeledGrossSharePct'] == 100.0
    assert LandDevCashFlowService._rollup_revenue_by_family([]) == []
