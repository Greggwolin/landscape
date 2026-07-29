"""
Regression test for the improvement-offset cost-escalation (CB11/CB12).

The bug: SaleCalculationService.calculate_sale_proceeds escalates the improvement
offset by the cost-inflation rate ONLY when ``sale_period`` is present in
parcel_data. Two recalc call sites (batch_recalculate_assumptions and — on the
CB9 branch — recalculate_one_assumption) omitted it, silently flattening every
parcel to the $1,300/FF benchmark and overstating gross by ~6% ($24.9M on the
demo deal).

These pure-logic tests lock the escalated basis so it cannot silently regress:
  * WITH sale_period, the offset per FF is escalated ABOVE the $1,300 benchmark
    and RISES with the period (a later-selling parcel carries a larger offset).
  * WITHOUT sale_period, the offset stays FLAT at the benchmark — the exact
    wrong basis the recalc must never produce.

The benchmark lookup + UOM gross are the only DB touches; they are patched so
this runs without a database (SimpleTestCase). The recalc wrappers' "raise when
sale_period is missing" behaviour is exercised live in §15.2.
"""
from __future__ import annotations

from decimal import Decimal
from unittest import mock

from django.test import SimpleTestCase

from apps.sales_absorption.services import SaleCalculationService

_BENCH = 1300.0          # $/FF project improvement-offset benchmark
_GPP = 15_360_000.0      # mocked gross parcel price (UOM calc)
_LOT_W, _UNITS = 50, 128  # FF = 6400


def _calc(sale_period):
    parcel = {
        'parcel_id': 1, 'project_id': 9, 'type_code': 'SFD', 'product_code': '50x125',
        'lot_width': _LOT_W, 'units_total': _UNITS, 'acres_gross': 0,
    }
    if sale_period is not None:
        parcel['sale_period'] = sale_period
    pricing = {'price_per_unit': 100000.0, 'unit_of_measure': 'FF', 'growth_rate': 0.03,
               'pricing_effective_date': '2026-01-01'}
    benchmarks = {'improvement_offset': {'amount_per_uom': _BENCH, 'uom': 'FF', 'source': 'project'}}
    with mock.patch.object(SaleCalculationService, 'get_benchmarks_for_parcel', return_value=benchmarks), \
         mock.patch('apps.sales_absorption.services.UOMCalculationService.calculate_gross_value', return_value=_GPP):
        return SaleCalculationService.calculate_sale_proceeds(
            parcel_data=parcel, pricing_data=pricing, sale_date='2030-03-01',
            overrides=None, cost_inflation_rate=0.03,
        )


def _offset_per_ff(calc):
    return calc['improvement_offset_total'] / (_LOT_W * _UNITS)


class OffsetEscalation(SimpleTestCase):
    def test_with_period_offset_is_escalated_above_benchmark(self):
        c = _calc(sale_period=24)
        self.assertGreater(_offset_per_ff(c), _BENCH,
                           "offset must be escalated above the $1,300/FF benchmark when sale_period is present")

    def test_offset_rises_with_period(self):
        early = _offset_per_ff(_calc(sale_period=12))
        late = _offset_per_ff(_calc(sale_period=60))
        self.assertGreater(late, early,
                           "a later-selling parcel must carry a larger (more-escalated) offset")

    def test_without_period_offset_is_flat_benchmark(self):
        # The exact wrong basis: no sale_period -> flat $1,300/FF, no escalation.
        c = _calc(sale_period=None)
        self.assertAlmostEqual(_offset_per_ff(c), _BENCH, places=2,
                               msg="without sale_period the offset flattens to the benchmark — the CB11/CB12 bug")

    def test_flat_basis_overstates_gross(self):
        # Escalation lowers gross (offset is subtracted); the flat basis overstates it.
        gross_escalated = _calc(sale_period=24)['gross_sale_proceeds']
        gross_flat = _calc(sale_period=None)['gross_sale_proceeds']
        self.assertLess(gross_escalated, gross_flat,
                        "escalated basis must yield a LOWER gross than the flat basis (flat overstates the deal)")
