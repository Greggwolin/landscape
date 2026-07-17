"""Django management command for Maricopa County recorded-sales ingestion.

Usage:
    # Validate parsing + market/non-market classification without writing:
    python manage.py ingest_maricopa_sales \
        --sales-file "SalesAffidavits.txt" \
        --characteristics-file "ResidentialMaster.txt" \
        --parcel-geo-file "Parcels.csv" \
        --dry-run --verbose

    # Live ingest:
    python manage.py ingest_maricopa_sales \
        --sales-file "SalesAffidavits.txt" \
        --characteristics-file "ResidentialMaster.txt" \
        --parcel-geo-file "Parcels.csv"

Run --dry-run first: it validates that the file headers match COLUMN_MAP in
tools/market_ingest/maricopa_sales.py and reports the market vs non-market split
before anything is written.

Session: SM10-COUNTY-SALES-CONNECTOR-0706
"""

from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import connection


class Command(BaseCommand):
    help = "Ingest Maricopa County recorded sales into landscape.mkt_recorded_sales"

    def add_arguments(self, parser):
        parser.add_argument("--sales-file", required=True, help="Sales Affidavits file (R102)")
        parser.add_argument("--characteristics-file", default=None, help="Residential Master file (R116)")
        parser.add_argument("--parcel-geo-file", default=None, help="Parcels GIS attributes (APN + lat/lng)")
        parser.add_argument("--dry-run", action="store_true", help="Parse + classify without writing")
        parser.add_argument("--verbose", action="store_true", help="Show detailed output")

    def handle(self, *args, **options):
        sales_file = options["sales_file"]
        characteristics_file = options["characteristics_file"]
        parcel_geo_file = options["parcel_geo_file"]
        dry_run = options["dry_run"]
        verbose = options["verbose"]

        if not Path(sales_file).exists():
            raise CommandError(f"Sales file not found: {sales_file}")
        for label, path in (("characteristics", characteristics_file), ("parcel-geo", parcel_geo_file)):
            if path and not Path(path).exists():
                raise CommandError(f"{label} file not found: {path}")

        self.stdout.write(f"Ingesting Maricopa County sales: {sales_file}")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - no data will be persisted"))

        try:
            from tools.market_ingest.maricopa_sales import ingest_maricopa_sales

            connection.ensure_connection()
            db_connection = connection.connection

            result = ingest_maricopa_sales(
                sales_path=sales_file,
                characteristics_path=characteristics_file,
                parcel_geo_path=parcel_geo_file,
                dry_run=dry_run,
                connection=db_connection if not dry_run else None,
            )

            self.stdout.write("")
            self.stdout.write("=" * 60)
            self.stdout.write("MARICOPA COUNTY SALES INGESTION RESULTS")
            self.stdout.write("=" * 60)
            self.stdout.write(f"Records parsed:      {result.get('records_parsed', 0):,}")
            self.stdout.write(f"Arm's-length (kept): {result.get('arms_length', 0):,}")
            self.stdout.write(f"Non-market (flagged):{result.get('non_market_flagged', 0):,}")
            self.stdout.write(f"With coordinates:    {result.get('with_coordinates', 0):,}")
            self.stdout.write(f"With year built:     {result.get('with_year_built', 0):,}")

            if not dry_run:
                self.stdout.write(f"Inserted:            {result.get('inserted', 0):,}")
                self.stdout.write(f"Updated:             {result.get('updated', 0):,}")
                self.stdout.write(f"Skipped (no key):    {result.get('skipped', 0):,}")
            else:
                self.stdout.write(self.style.WARNING("(Dry run - no records persisted)"))

            self.stdout.write("=" * 60)
            self.stdout.write(self.style.SUCCESS("Ingestion complete!"))

        except Exception as e:
            raise CommandError(f"Ingestion failed: {e}")
