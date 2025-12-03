#!/usr/bin/env python3
"""
Test script to verify sale calculations match Excel model
Using the global benchmarks created:
- 3 transaction cost items totaling 1.75%
- 1 commission item at 3%
"""

import sys
import os
import django

# Add the backend directory to the path
sys.path.insert(0, '/Users/5150east/landscape/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from decimal import Decimal
from apps.sales_absorption.services import SaleCalculationService

# Test case from Excel model (Scottsdale example)
# 128 SFD lots @ 50 FF each = 6,400 total front feet
# Base price: $2,400/FF, 3% growth, 26 periods
test_data = {
    'parcel_data': {
        'units_total': 128,
        'lot_width': 50,  # 50 front feet per lot
        'acres_gross': 32,
        'type_code': 'SFD',
        'product_code': 'SFD_50',
        'project_id': 9,
        'sale_period': 26  # 26 months from base to sale
    },
    'pricing_data': {
        'price_per_unit': 2400,  # $2,400 per front foot
        'unit_of_measure': 'FF',  # Front Feet (not EA)
        'growth_rate': 0.03,
        'pricing_effective_date': '2024-01-01'
    },
    'sale_date': '2026-03-01'
}

print("=" * 80)
print("TESTING SALE CALCULATIONS WITH NEW BENCHMARKS")
print("=" * 80)
print()
print("Test Scenario:")
print(f"  Units: {test_data['parcel_data']['units_total']} SFD lots @ {test_data['parcel_data']['lot_width']} FF each")
total_ff = test_data['parcel_data']['units_total'] * test_data['parcel_data']['lot_width']
print(f"  Total Front Feet: {total_ff:,} FF")
print(f"  Base Price: ${test_data['pricing_data']['price_per_unit']}/FF")
print(f"  Growth Rate: {test_data['pricing_data']['growth_rate'] * 100}% annual")
print(f"  Sale Period: {test_data['parcel_data']['sale_period']} months")
print()

# Run the calculation
result = SaleCalculationService.calculate_sale_proceeds(
    parcel_data=test_data['parcel_data'],
    pricing_data=test_data['pricing_data'],
    sale_date=test_data['sale_date']
)

print("-" * 80)
print("PRICE ESCALATION:")
print("-" * 80)
print(f"Base Price per Unit:     ${result['base_price_per_unit']:,.2f}")
print(f"Inflated Price per Unit: ${result['inflated_price_per_unit']:,.2f}")
print(f"Growth Rate:             {result['inflation_rate'] * 100:.2f}%")
print()

print("-" * 80)
print("GROSS CALCULATIONS:")
print("-" * 80)
print(f"Gross Parcel Price:      ${result['gross_parcel_price']:,.2f}")
print(f"  ({total_ff:,} FF × ${result['inflated_price_per_unit']:,.2f}/FF)")
print()

print("-" * 80)
print("IMPROVEMENT OFFSET:")
print("-" * 80)
print(f"Improvement Offset/UOM:  ${result['improvement_offset_per_uom']:,.2f}")
print(f"Improvement Offset Total: ${result['improvement_offset_total']:,.2f}")
print(f"Source:                   {result['improvement_offset_source']}")
print()

print("-" * 80)
print("NET SALE PRICE (after improvement offset):")
print("-" * 80)
gross_sale_proceeds = result['gross_sale_proceeds']
print(f"Gross Sale Proceeds:     ${gross_sale_proceeds:,.2f}")
print(f"  (Gross Parcel Price - Improvement Offset)")
print()

print("-" * 80)
print("TRANSACTION COSTS (applied to Net Sale Price):")
print("-" * 80)

# Commission
if result.get('commission_is_fixed'):
    print(f"Commission (Fixed):      ${result['commission_amount']:,.2f}")
else:
    print(f"Commission ({result['commission_pct'] * 100:.2f}%):       ${result['commission_amount']:,.2f}")
    print(f"  (${gross_sale_proceeds:,.2f} × {result['commission_pct'] * 100:.2f}%)")

# Closing costs
if result.get('closing_cost_is_fixed'):
    print(f"Closing Costs (Fixed):   ${result['closing_cost_amount']:,.2f}")
else:
    print(f"Closing Costs ({result['closing_cost_pct'] * 100:.2f}%):  ${result['closing_cost_amount']:,.2f}")
    print(f"  (${gross_sale_proceeds:,.2f} × {result['closing_cost_pct'] * 100:.2f}%)")

# Legal
if result.get('legal_is_fixed'):
    print(f"Legal (Fixed):           ${result['legal_amount']:,.2f}")
else:
    print(f"Legal ({result['legal_pct'] * 100:.2f}%):             ${result['legal_amount']:,.2f}")
    print(f"  (${gross_sale_proceeds:,.2f} × {result['legal_pct'] * 100:.2f}%)")

# Title Insurance
if result.get('title_insurance_is_fixed'):
    print(f"Title Insurance (Fixed): ${result['title_insurance_amount']:,.2f}")
else:
    print(f"Title Insurance ({result['title_insurance_pct'] * 100:.2f}%): ${result['title_insurance_amount']:,.2f}")
    print(f"  (${gross_sale_proceeds:,.2f} × {result['title_insurance_pct'] * 100:.2f}%)")

print()
total_transaction_costs = (
    result['commission_amount'] +
    result['closing_cost_amount'] +
    result['legal_amount'] +
    result['title_insurance_amount']
)
total_pct = (
    result['commission_pct'] * 100 +
    result['closing_cost_pct'] * 100 +
    result['legal_pct'] * 100 +
    result['title_insurance_pct'] * 100
)
print(f"Total Transaction Costs: ${total_transaction_costs:,.2f}")
print(f"  (Total: {total_pct:.2f}% of Net Sale Price)")
print()

print("-" * 80)
print("NET PROCEEDS:")
print("-" * 80)
print(f"Net Sale Proceeds:       ${result['net_sale_proceeds']:,.2f}")
print(f"  (Net Sale Price - Total Transaction Costs)")
print()

print("-" * 80)
print("EXPECTED VALUES FROM EXCEL:")
print("-" * 80)
print("Inflated Price:          $2,560.97")
print("Gross Parcel Price:      $327,804.16")
print("Improvement Offset:      (depends on SFD offset benchmark)")
print("Commission (3%):         Applied to Net Sale Price")
print("Closing Costs (1.75%):   Applied to Net Sale Price")
print()

print("=" * 80)
print("VERIFICATION:")
print("=" * 80)
expected_inflated = 2560.97
actual_inflated = result['inflated_price_per_unit']
diff = abs(expected_inflated - actual_inflated)

if diff < 0.01:
    print(f"✅ Inflated Price matches Excel: ${actual_inflated:,.2f}")
else:
    print(f"❌ Inflated Price differs from Excel:")
    print(f"   Expected: ${expected_inflated:,.2f}")
    print(f"   Actual:   ${actual_inflated:,.2f}")
    print(f"   Diff:     ${diff:,.2f}")

print()
print("Transaction costs should be:")
print(f"  Commission: 3.00% of Net Sale Price")
print(f"  Closing:    {result['closing_cost_pct'] * 100:.2f}% of Net Sale Price")
print(f"  Legal:      {result['legal_pct'] * 100:.2f}% of Net Sale Price")
print(f"  Title:      {result['title_insurance_pct'] * 100:.2f}% of Net Sale Price")
print(f"  TOTAL:      {total_pct:.2f}% (should be 4.75%)")
print()

if abs(total_pct - 4.75) < 0.01:
    print("✅ Total transaction cost % matches expected 4.75%")
else:
    print(f"❌ Total transaction cost % differs:")
    print(f"   Expected: 4.75%")
    print(f"   Actual:   {total_pct:.2f}%")
print()
print("=" * 80)
