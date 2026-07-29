"""
Regression test for improvement-offset resolution BY UNIT OF MEASURE (CB14).

Two failure modes the old code had, both locked out here:
  * wrong-unit application — a $/FF rate multiplied by a count of units,
  * silent zero — a UOM mismatch treated as a deliberate $0.

These pure-logic tests exercise calculate_sale_proceeds' point-of-multiplication
guard (the benchmark lookup itself is UOM-filtered and is covered live in §15.2).
Even if a mismatched benchmark reaches the calculator, it must REFUSE (explicit
status) rather than multiply by the wrong denominator; a matching benchmark
applies; a per-FF offset with no frontage refuses. get_benchmarks_for_parcel and
the UOM gross are mocked so this runs without a DB (SimpleTestCase).
"""
from __future__ import annotations

from decimal import Decimal
from unittest import mock

from django.test import SimpleTestCase

from apps.sales_absorption.services import SaleCalculationService

_GPP = 10_000_000.0


def _calc(offset_bm, *, uom, lot_width, units, absent=None):
    benchmarks = {}
    if offset_bm is not None:
        benchmarks['improvement_offset'] = offset_bm
    elif absent is not None:
        benchmarks['improvement_offset_absent'] = absent
    parcel = {'parcel_id': 1, 'project_id': 9, 'type_code': 'X', 'product_code': 'Y',
              'lot_width': lot_width, 'units_total': units, 'acres_gross': 0, 'sale_period': 12}
    pricing = {'price_per_unit': 100000.0, 'unit_of_measure': uom, 'growth_rate': 0.0,
               'pricing_effective_date': '2026-01-01'}
    with mock.patch.object(SaleCalculationService, 'get_benchmarks_for_parcel', return_value=benchmarks), \
         mock.patch('apps.sales_absorption.services.UOMCalculationService.calculate_gross_value', return_value=_GPP):
        return SaleCalculationService.calculate_sale_proceeds(
            parcel_data=parcel, pricing_data=pricing, sale_date='2030-03-01',
            overrides=None, cost_inflation_rate=0.03)


_FF_BM = {'amount_per_uom': 1300.0, 'uom': 'FF', 'source': 'project'}
_UNIT_BM = {'amount_per_uom': 5000.0, 'uom': 'EA', 'source': 'project'}


class OffsetUomResolution(SimpleTestCase):
    # ── a matching benchmark applies, multiplying by the RIGHT denominator ────
    def test_ff_benchmark_applies_to_ff_parcel(self):
        c = _calc(_FF_BM, uom='FF', lot_width=50, units=100)  # frontage 5000
        self.assertEqual(c['improvement_offset_status'], 'applied')
        # escalated 1300/FF × 5000 FF (offset > base rate × frontage)
        self.assertGreater(c['improvement_offset_total'], 1300 * 5000)

    def test_unit_benchmark_applies_to_unit_parcel(self):
        c = _calc(_UNIT_BM, uom='EA', lot_width=0, units=200)
        self.assertEqual(c['improvement_offset_status'], 'applied')
        self.assertGreater(c['improvement_offset_total'], 5000 * 200)  # escalated × 200 units

    # ── the core guard: a feet rate is NEVER multiplied by a count of doors ───
    def test_ff_benchmark_refuses_on_unit_parcel(self):
        c = _calc(_FF_BM, uom='EA', lot_width=0, units=200)
        self.assertEqual(c['improvement_offset_status'], 'no_offset_benchmark_for_uom')
        self.assertEqual(c['improvement_offset_total'], 0.0)  # refused, not multiplied

    def test_unit_benchmark_refuses_on_ff_parcel(self):
        c = _calc(_UNIT_BM, uom='FF', lot_width=50, units=100)
        self.assertEqual(c['improvement_offset_status'], 'no_offset_benchmark_for_uom')
        self.assertEqual(c['improvement_offset_total'], 0.0)

    # ── per-FF offset requires derivable frontage, else refuse (not width=0×) ─
    def test_ff_benchmark_refuses_without_frontage(self):
        c = _calc(_FF_BM, uom='FF', lot_width=0, units=100)  # no lot_width -> no frontage
        self.assertEqual(c['improvement_offset_status'], 'frontage_unavailable')
        self.assertEqual(c['improvement_offset_total'], 0.0)

    # ── absence is surfaced, never a silent zero ──────────────────────────────
    def test_no_benchmark_for_uom_is_flagged_not_zeroed(self):
        c = _calc(None, uom='EA', lot_width=0, units=200, absent='wrong_uom')
        self.assertEqual(c['improvement_offset_status'], 'no_offset_benchmark_for_uom')
        self.assertEqual(c['improvement_offset_total'], 0.0)

    def test_no_offset_configured_at_all(self):
        c = _calc(None, uom='EA', lot_width=0, units=200, absent='none')
        self.assertEqual(c['improvement_offset_status'], 'no_offset_benchmark')
        self.assertEqual(c['improvement_offset_total'], 0.0)
