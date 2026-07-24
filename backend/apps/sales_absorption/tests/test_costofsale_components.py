"""SS4 — cost-of-sale component repopulation + write-path guard.

Session: LSCMD-SS-COSTOFSALE-REPOP-0724.

Two regressions are locked here:

1. Part A (DB round-trip): the ``backfill_costofsale_components`` command splits the
   flat transaction-cost lump already sitting in ``total_transaction_costs`` back into
   the itemized ``legal_amount`` / ``closing_cost_amount`` / ``title_insurance_amount``
   columns — net-neutral. After it runs the components are non-NULL and sum to the lump
   (minus commission), while net and the lump are byte-identical. Re-running is a no-op.

2. Part B (write-path source guard): the bulk what-if save path in
   ``recalculate_sfd_parcels`` must persist the three component columns. This is the
   exact path that silently dropped them (SS3), so we assert the columns are present in
   both the INSERT list and the ON CONFLICT update.
"""
import datetime
from decimal import Decimal
from io import StringIO

import pytest
from django.core.management import call_command

from apps.sales_absorption.models import Parcel, ParcelSaleAssumption, SaleBenchmark

PROJECT_ID = 999001  # isolated synthetic project


def _seed_global_benchmarks():
    """Firm Transaction Costs library: flat legal/closing/title + a percent commission."""
    SaleBenchmark.objects.create(
        scope_level="global", benchmark_type="legal", fixed_amount=Decimal("20000"),
        is_active=True,
    )
    SaleBenchmark.objects.create(
        scope_level="global", benchmark_type="closing", fixed_amount=Decimal("10000"),
        is_active=True,
    )
    SaleBenchmark.objects.create(
        scope_level="global", benchmark_type="title_insurance", fixed_amount=Decimal("20000"),
        is_active=True,
    )
    SaleBenchmark.objects.create(
        scope_level="global", benchmark_type="commission", rate_pct=Decimal("0.0300"),
        is_active=True,
    )


def _seed_parcel_with_null_components():
    """A parcel-sale row shaped like project 9's: lump present, components NULL.

    gross 1,000,000 · commission 30,000 (3%) · flat 50,000 → lump 80,000 · net 920,000.
    """
    parcel = Parcel.objects.create(
        project_id=PROJECT_ID, type_code="SFD", product_code="50x125",
        parcel_code="T.001", units_total=10,
    )
    ParcelSaleAssumption.objects.create(
        parcel_id=parcel.parcel_id,
        sale_date=datetime.date(2028, 3, 1),
        gross_sale_proceeds=Decimal("1000000.00"),
        commission_amount=Decimal("30000.00"),
        legal_amount=None, closing_cost_amount=None, title_insurance_amount=None,
        total_transaction_costs=Decimal("80000.00"),
        net_sale_proceeds=Decimal("920000.00"),
    )
    return parcel


@pytest.mark.django_db
def test_backfill_populates_components_net_neutral():
    _seed_global_benchmarks()
    parcel = _seed_parcel_with_null_components()

    before = ParcelSaleAssumption.objects.get(parcel_id=parcel.parcel_id)
    net_before = before.net_sale_proceeds
    lump_before = before.total_transaction_costs
    assert before.legal_amount is None

    out = StringIO()
    call_command("backfill_costofsale_components", project_id=PROJECT_ID, commit=True, stdout=out)

    row = ParcelSaleAssumption.objects.get(parcel_id=parcel.parcel_id)

    # Components now populated from the library ...
    assert row.legal_amount == Decimal("20000.00")
    assert row.closing_cost_amount == Decimal("10000.00")
    assert row.title_insurance_amount == Decimal("20000.00")

    # ... and they sum to the flat portion already inside the lump.
    components = row.legal_amount + row.closing_cost_amount + row.title_insurance_amount
    assert components == row.total_transaction_costs - row.commission_amount

    # Hard gate: net and lump are byte-identical — the backfill moved no dollars.
    assert row.net_sale_proceeds == net_before
    assert row.total_transaction_costs == lump_before


@pytest.mark.django_db
def test_backfill_is_idempotent():
    _seed_global_benchmarks()
    parcel = _seed_parcel_with_null_components()

    call_command("backfill_costofsale_components", project_id=PROJECT_ID, commit=True)
    first = ParcelSaleAssumption.objects.get(parcel_id=parcel.parcel_id)

    out = StringIO()
    call_command("backfill_costofsale_components", project_id=PROJECT_ID, commit=True, stdout=out)
    second = ParcelSaleAssumption.objects.get(parcel_id=parcel.parcel_id)

    assert "Idempotent no-op" in out.getvalue()
    assert second.legal_amount == first.legal_amount
    assert second.net_sale_proceeds == first.net_sale_proceeds


def test_bulk_save_path_persists_components():
    """Part B guard: the bulk what-if save SQL must carry the three component columns,
    so a future edit can't silently re-drop them (the SS3 defect).

    Scoped to the bulk-INSERT block (anchored on its unique 'TRUE BULK INSERT' comment
    through the ``ON CONFLICT`` update) so it can't be satisfied by the separate full
    upsert elsewhere in the module.
    """
    import inspect
    from apps.sales_absorption import views

    module_src = inspect.getsource(views)
    start = module_src.index("TRUE BULK INSERT")
    # End at the ON CONFLICT update tail of this specific statement.
    end = module_src.index("updated_at = NOW()", start)
    block = module_src[start:end]

    for col in ("legal_amount", "closing_cost_amount", "title_insurance_amount"):
        # Present in both the INSERT column list and the ON CONFLICT update.
        assert block.count(col) >= 2, f"{col} missing from bulk save INSERT/ON CONFLICT"
        assert f"{col} = EXCLUDED.{col}" in block, f"{col} not updated on ON CONFLICT"
