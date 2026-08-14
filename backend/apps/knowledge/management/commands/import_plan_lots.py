"""
Roll a plat's lots up into parcels, from the command line.

Off the request cycle deliberately: reading a seven-sheet plat takes about ten
seconds, far too long to hold a browser open. This is also the first thing in
this arc that writes derived data into tbl_parcel — a table the financial
engine and the disposition model both read — so it runs by hand, under a
person, and it **prints what it would do and stops** unless --commit is given.

The derive step is not landed yet. Until it is, this reads its input from a
JSON file: the lots as some other process measured them. That keeps the seam
honest — this command groups, checks and stores, and does not pretend to have
measured anything.

    manage.py import_plan_lots \\
        --project 8 \\
        --lots red_valley_lots.json \\
        --source-doc "P6475 PHASE 1 PLAT_R9 1-21-25.pdf" \\
        --stage 60 \\
        --expected-counts '{"1": 83, "2": 87, "3": 51, "4": 65}'

Add --commit to write. Each lot in the JSON looks like:

    {"number": 101, "area_sqft": 5000.0,
     "ring_3857": [[x, y], ...],
     "frontage_ft": 42.0, "width_ft": 42.0, "depth_ft": 120.0,
     "page": 4, "source": "read"}

Session: LSCMD-PLATPARCELS-0814-MK12
"""

import json

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

from apps.knowledge.services.plan_geometry.parcel_rollup import (
    DerivedLot,
    group_into_parcels,
    write_rollup,
)


class Command(BaseCommand):
    help = "Group a plat's lots into parcels and store the outlines."

    def add_arguments(self, parser):
        parser.add_argument("--project", type=int, required=True)
        parser.add_argument(
            "--lots", required=True, help="JSON file holding the derive result"
        )
        parser.add_argument(
            "--source-doc", required=True, help="The drawing these lots came from"
        )
        parser.add_argument(
            "--stage", type=int, required=True, help="PlanStage integer, e.g. 60"
        )
        parser.add_argument(
            "--expected-counts",
            default=None,
            help='Parcel key sheet tally, e.g. \'{"1": 83, "2": 87}\'',
        )
        parser.add_argument("--confidence", type=float, default=None)
        parser.add_argument(
            "--commit",
            action="store_true",
            help="Actually write. Without this the command reports and stops.",
        )

    def handle(self, *args, **options):
        lots = self._load_lots(options["lots"])
        expected = self._load_expected(options["expected_counts"])

        grouping = group_into_parcels(lots, expected_counts=expected)

        for check in grouping.checks:
            self.stdout.write(f"  [ok] {check}")

        if not grouping.grouped:
            # Not the operator doing anything wrong — it is the module
            # declining to guess, which is the behaviour we want.
            raise CommandError(
                f"Refusing to group these lots: {grouping.reason}. "
                f"{len(grouping.ungrouped)} lots left untouched."
            )

        self.stdout.write(self.style.SUCCESS(grouping.summary()))
        for parcel in grouping.parcels:
            self.stdout.write(
                f"    parcel {parcel.number}: {parcel.lot_count} lots, "
                f"{parcel.outlines_recovered} outlines, "
                f"{parcel.frontage_ft} ft, {parcel.acres} ac, "
                f"typical {parcel.lot_width}x{parcel.lot_depth}"
            )

        if not options["commit"]:
            self.stdout.write(
                self.style.WARNING("Dry run — nothing written. Pass --commit to write.")
            )
            return

        with transaction.atomic(), connection.cursor() as cursor:
            result = write_rollup(
                cursor,
                project_id=options["project"],
                grouping=grouping,
                source_doc=options["source_doc"],
                stage=options["stage"],
                confidence=options["confidence"],
            )

        self.stdout.write(self.style.SUCCESS(result.summary()))
        for number, parcel_id in sorted(result.parcel_ids.items()):
            self.stdout.write(
                f"    parcel {number} -> tbl_parcel.parcel_id {parcel_id}"
            )

    # ------------------------------------------------------------------ input

    def _load_lots(self, path: str) -> list:
        try:
            with open(path) as handle:
                raw = json.load(handle)
        except (OSError, json.JSONDecodeError) as exc:
            raise CommandError(f"Could not read {path}: {exc}") from exc

        if not isinstance(raw, list):
            raise CommandError("The lots file must hold a JSON list.")

        lots = []
        for i, item in enumerate(raw):
            try:
                lots.append(
                    DerivedLot(
                        number=int(item["number"]),
                        area_sqft=float(item["area_sqft"]),
                        ring_3857=item.get("ring_3857"),
                        frontage_ft=_maybe_float(item.get("frontage_ft")),
                        width_ft=_maybe_float(item.get("width_ft")),
                        depth_ft=_maybe_float(item.get("depth_ft")),
                        page=_maybe_int(item.get("page")),
                        source=item.get("source", "read"),
                    )
                )
            except (KeyError, TypeError, ValueError) as exc:
                raise CommandError(f"Lot {i} in {path} is malformed: {exc}") from exc

        self.stdout.write(f"Read {len(lots)} lots from {path}.")
        return lots

    def _load_expected(self, raw):
        if not raw:
            return None
        try:
            return {int(k): int(v) for k, v in json.loads(raw).items()}
        except (json.JSONDecodeError, AttributeError, TypeError, ValueError) as exc:
            raise CommandError(f"--expected-counts is not valid JSON: {exc}") from exc


def _maybe_float(value):
    return None if value is None else float(value)


def _maybe_int(value):
    return None if value is None else int(value)
