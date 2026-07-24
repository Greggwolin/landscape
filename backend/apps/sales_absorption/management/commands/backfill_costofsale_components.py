"""
Backfill itemized cost-of-sale components (legal / closing / title) on parcel-sale
rows where the flat transaction-cost total already lives in ``total_transaction_costs``
but the per-component columns were left NULL.

Context (SS3/SS4, LSCMD-SS-COSTOFSALE-REPOP-0724): the bulk what-if save path folded
the three flat transaction-cost factors into ``total_transaction_costs`` (and therefore
into ``net_sale_proceeds``) but never split them back into ``legal_amount`` /
``closing_cost_amount`` / ``title_insurance_amount``. Downstream consumers that read the
component columns (cash-flow breakdown, what-if transaction-cost read) then show
cost-of-sale as $0 even though the money is fully deducted in net.

This command is **net-neutral by design**. It ONLY writes the three component columns.
It never touches ``total_transaction_costs`` or ``net_sale_proceeds``. Per row it resolves
the three factors from the Benchmarks library at runtime (product > project > global
hierarchy — never hardcoded) and asserts:

    legal + closing + title == (total_transaction_costs - commission_amount)

i.e. the components must SPLIT the flat portion already sitting in the lump. If any row
fails the equality the whole batch rolls back — a component is never forced to a value
that would change the lump.

Idempotent: rows whose components are already populated are skipped, so re-running is a
no-op.

Usage:
    python manage.py backfill_costofsale_components --project-id 9              # dry run
    python manage.py backfill_costofsale_components --project-id 9 --commit     # write
"""
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

from apps.sales_absorption.services import SaleCalculationService

# Cent-level tolerance for the per-row equality gate. Flat-dollar factors are exact;
# percentage-based factors can differ by a rounding cent. Anything larger than this is a
# real mismatch and halts the batch rather than silently reshaping the lump.
EQUALITY_TOLERANCE = Decimal("0.01")


def _component_amount(bench: dict, gross: Decimal) -> Decimal:
    """Replicate SaleCalculationService.calculate_parcel_net_proceeds component math:
    a flat ``fixed_amount`` when present, otherwise ``gross * rate``."""
    if not bench:
        return Decimal("0")
    fixed = bench.get("fixed_amount")
    if fixed:
        return Decimal(str(fixed))
    rate = bench.get("rate") or 0
    return gross * Decimal(str(rate))


class Command(BaseCommand):
    help = (
        "Backfill itemized cost-of-sale components (legal/closing/title) that were "
        "folded into total_transaction_costs but left NULL in their own columns. "
        "Net-neutral: only the three component columns are written."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--project-id",
            type=int,
            required=True,
            help="Project whose parcel-sale rows should be backfilled.",
        )
        parser.add_argument(
            "--commit",
            action="store_true",
            help="Persist changes. Without this flag the command is a dry run.",
        )

    def handle(self, *args, **options):
        project_id = options["project_id"]
        do_commit = options["commit"]

        # Candidate rows: components NULL and the flat lump present (Guard 3).
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT psa.parcel_id, p.type_code, p.product_code,
                       psa.gross_sale_proceeds, psa.commission_amount,
                       psa.total_transaction_costs, psa.net_sale_proceeds
                FROM landscape.tbl_parcel_sale_assumptions psa
                JOIN landscape.tbl_parcel p ON p.parcel_id = psa.parcel_id
                WHERE p.project_id = %s
                  AND psa.total_transaction_costs IS NOT NULL
                  AND (psa.legal_amount IS NULL
                       OR psa.closing_cost_amount IS NULL
                       OR psa.title_insurance_amount IS NULL)
                ORDER BY psa.parcel_id
                """,
                [project_id],
            )
            rows = cursor.fetchall()

        if not rows:
            self.stdout.write(
                self.style.SUCCESS(
                    f"No candidate rows for project {project_id} — nothing to backfill "
                    "(already populated or no flat lump). Idempotent no-op."
                )
            )
            return

        planned = []  # (parcel_id, legal, closing, title)
        failures = []

        self.stdout.write(
            f"\nProject {project_id}: {len(rows)} candidate row(s)\n"
            f"{'parcel':>8}  {'legal':>12}  {'closing':>12}  {'title':>12}  "
            f"{'sum':>12}  {'flat(lump-comm)':>16}  {'delta':>10}"
        )
        self.stdout.write("-" * 96)

        for parcel_id, type_code, product_code, gross, commission, lump, net in rows:
            gross = Decimal(str(gross))
            commission = Decimal(str(commission or 0))
            lump = Decimal(str(lump))
            flat_portion = lump - commission

            benchmarks = SaleCalculationService.get_benchmarks_for_parcel(
                project_id, type_code, product_code
            )
            legal = _component_amount(benchmarks.get("legal"), gross)
            closing = _component_amount(benchmarks.get("closing"), gross)
            title = _component_amount(benchmarks.get("title_insurance"), gross)
            components_sum = legal + closing + title
            delta = components_sum - flat_portion

            self.stdout.write(
                f"{parcel_id:>8}  {legal:>12,.2f}  {closing:>12,.2f}  {title:>12,.2f}  "
                f"{components_sum:>12,.2f}  {flat_portion:>16,.2f}  {delta:>10,.2f}"
            )

            if abs(delta) > EQUALITY_TOLERANCE:
                failures.append((parcel_id, components_sum, flat_portion, delta))
            else:
                planned.append((parcel_id, legal, closing, title))

        self.stdout.write("-" * 96)

        if failures:
            for parcel_id, s, f, d in failures:
                self.stderr.write(
                    self.style.ERROR(
                        f"HALT parcel {parcel_id}: library components sum {s:,.2f} "
                        f"!= flat portion {f:,.2f} (delta {d:,.2f}). "
                        "Refusing to force a value that would change the lump."
                    )
                )
            raise CommandError(
                f"{len(failures)} row(s) failed the per-row equality gate. "
                "No rows written."
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"All {len(planned)} row(s) pass the equality gate "
                f"(components sum to the existing flat portion, within {EQUALITY_TOLERANCE})."
            )
        )

        if not do_commit:
            self.stdout.write(
                self.style.WARNING(
                    "DRY RUN — no changes written. Re-run with --commit to persist."
                )
            )
            return

        with transaction.atomic():
            with connection.cursor() as cursor:
                for parcel_id, legal, closing, title in planned:
                    cursor.execute(
                        """
                        UPDATE landscape.tbl_parcel_sale_assumptions
                        SET legal_amount = %s,
                            closing_cost_amount = %s,
                            title_insurance_amount = %s,
                            updated_at = NOW()
                        WHERE parcel_id = %s
                          AND legal_amount IS NULL
                          AND closing_cost_amount IS NULL
                          AND title_insurance_amount IS NULL
                        """,
                        [legal, closing, title, parcel_id],
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f"Committed {len(planned)} row(s) for project {project_id}. "
                "Net and total_transaction_costs untouched."
            )
        )
