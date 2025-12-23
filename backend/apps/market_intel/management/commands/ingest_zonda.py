"""Django management command for Zonda data ingestion.

Usage:
    python manage.py ingest_zonda --file "Zonda Dec2025.xlsx" --dry-run
    python manage.py ingest_zonda --file "Zonda Dec2025.xlsx"
    python manage.py ingest_zonda --file "Zonda Dec2025.xlsx" --effective-date 2025-12-15
"""

from datetime import datetime
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from pathlib import Path


class Command(BaseCommand):
    help = 'Ingest Zonda subdivision survey data into unified market intelligence schema'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            required=True,
            help='Path to Zonda Excel file'
        )
        parser.add_argument(
            '--effective-date',
            type=lambda s: datetime.strptime(s, '%Y-%m-%d').date(),
            default=None,
            help='Effective date (YYYY-MM-DD). If not specified, parsed from Survey Quarter column.'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Parse and validate without persisting to database'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output including sample records'
        )

    def handle(self, *args, **options):
        filepath = options['file']
        effective_date = options['effective_date']
        dry_run = options['dry_run']
        verbose = options['verbose']

        # Validate file exists
        if not Path(filepath).exists():
            raise CommandError(f"File not found: {filepath}")

        self.stdout.write(f"Ingesting Zonda file: {filepath}")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - no data will be persisted"))

        try:
            # Import here to avoid circular imports
            from tools.market_ingest.zonda import ingest_zonda_file, parse_zonda_file

            # Ensure Django's database connection is ready
            connection.ensure_connection()
            db_connection = connection.connection

            result = ingest_zonda_file(
                filepath=filepath,
                effective_date=effective_date,
                dry_run=dry_run,
                connection=db_connection,
            )

            # Output results
            self.stdout.write("")
            self.stdout.write("=" * 60)
            self.stdout.write("ZONDA INGESTION RESULTS")
            self.stdout.write("=" * 60)

            metadata = result.get('metadata', {})
            self.stdout.write(f"File Format: {metadata.get('file_format', 'unknown')}")
            self.stdout.write(f"Effective Date: {metadata.get('effective_date', 'unknown')}")
            self.stdout.write(f"Survey Period: {metadata.get('survey_period', 'N/A')}")
            self.stdout.write(f"Total Rows in File: {metadata.get('total_rows', 0)}")
            self.stdout.write(f"Records Parsed: {result.get('records_parsed', 0)}")

            if not dry_run:
                self.stdout.write(f"Records Inserted: {result.get('records_inserted', 0)}")
                self.stdout.write(f"Records Updated: {result.get('records_updated', 0)}")
            else:
                self.stdout.write(self.style.WARNING("(Dry run - no records persisted)"))

            # Show sample data if verbose
            if verbose and not dry_run:
                self._show_sample_data()

            self.stdout.write("=" * 60)
            self.stdout.write(self.style.SUCCESS("Ingestion complete!"))

        except Exception as e:
            raise CommandError(f"Ingestion failed: {e}")

    def _show_sample_data(self):
        """Show sample of ingested data."""
        from apps.market_intel.models import MktNewHomeProject

        self.stdout.write("")
        self.stdout.write("Sample records (first 5):")
        self.stdout.write("-" * 40)

        projects = MktNewHomeProject.objects.order_by('-ingestion_timestamp')[:5]
        for p in projects:
            self.stdout.write(
                f"  {p.project_name} | {p.city} | {p.lot_width_ft}ft | "
                f"${p.price_avg:,.0f if p.price_avg else 'N/A'} | "
                f"{p.sales_rate_monthly or 'N/A'}/mo"
            )
