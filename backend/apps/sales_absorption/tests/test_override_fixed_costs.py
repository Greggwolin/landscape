"""
Regression test for override precedence on transaction costs (CB13).

The bug: calculate_sale_proceeds' override branch set every *_fixed to None, so
whenever ANY override was present (e.g. a commission override) the fixed
legal/closing/title benchmarks fell back to a zero rate — dropping ~$50k/parcel.

These pure-logic tests lock the intended precedence:
  * a benchmark expressed as a fixed_amount SURVIVES an override of another cost,
  * an override replaces ONLY the cost it names.
Benchmarks + UOM gross are mocked so this runs without a DB (SimpleTestCase).
"""
from __future__ import annotations

from decimal import Decimal
from unittest import mock

from django.test import SimpleTestCase

from apps.sales_absorption.services import SaleCalculationService

_GPP = 5_000_000.0

# Fixed legal/closing/title; commission as a rate.
_BENCH = {
    'legal': {'rate': 0, 'fixed_amount': 20000.0, 'source': 'global'},
    'closing': {'rate': 0, 'fixed_amount': 10000.0, 'source': 'global'},
    'title_insurance': {'rate': 0, 'fixed_amount': 20000.0, 'source': 'global'},
    'commission': {'rate': 0.03, 'fixed_amount': None, 'source': 'global'},
    'improvement_offset': {'amount_per_uom': 0, 'uom': 'EA', 'source': 'global'},
}


def _calc(overrides):
    parcel = {'parcel_id': 1, 'project_id': 9, 'type_code': 'SFD', 'product_code': 'X',
              'lot_width': 0, 'units_total': 10, 'acres_gross': 0, 'sale_period': 12}
    pricing = {'price_per_unit': 500000.0, 'unit_of_measure': 'EA', 'growth_rate': 0.0,
               'pricing_effective_date': '2026-01-01'}
    with mock.patch.object(SaleCalculationService, 'get_benchmarks_for_parcel', return_value=_BENCH), \
         mock.patch('apps.sales_absorption.services.UOMCalculationService.calculate_gross_value', return_value=_GPP):
        return SaleCalculationService.calculate_sale_proceeds(
            parcel_data=parcel, pricing_data=pricing, sale_date='2030-03-01',
            overrides=overrides, cost_inflation_rate=0.03,
        )


class OverridePrecedence(SimpleTestCase):
    def test_fixed_costs_survive_when_no_override(self):
        c = _calc(overrides=None)
        self.assertEqual(c['legal_amount'], 20000.0)
        self.assertEqual(c['closing_cost_amount'], 10000.0)
        self.assertEqual(c['title_insurance_amount'], 20000.0)

    def test_fixed_costs_survive_a_commission_override(self):
        # The exact bug: an override of commission must NOT zero the fixed costs.
        c = _calc(overrides={'commission_pct': 0.02})
        self.assertEqual(c['legal_amount'], 20000.0, "legal fixed benchmark dropped by a commission override (CB13 bug)")
        self.assertEqual(c['closing_cost_amount'], 10000.0)
        self.assertEqual(c['title_insurance_amount'], 20000.0)
        # and the commission override still applied
        self.assertAlmostEqual(c['commission_amount'], _GPP * 0.02, places=2)

    def test_override_replaces_only_the_named_cost(self):
        # Overriding legal to a rate replaces legal only; closing/title keep fixed.
        c = _calc(overrides={'legal_pct': 0.01})
        self.assertAlmostEqual(c['legal_amount'], _GPP * 0.01, places=2)
        self.assertEqual(c['closing_cost_amount'], 10000.0)
        self.assertEqual(c['title_insurance_amount'], 20000.0)
