"""Django management command for HBACA permit data ingestion.

Usage:
    python manage.py ingest_hbaca --file "HBACA_Permits_Master.xlsx" --dry-run
    python manage.py ingest_hbaca --file "2025_SF_Permits_-_11_Nov.xlsx"
    python manage.py ingest_hbaca --file "permits.xlsx" --type master
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from pathlib import Path


class Command(BaseCommand):
    help = 'Ingest HBACA permit data into unified market intelligence schema'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            required=True,
            help='Path to HBACA Excel file'
        )
        parser.add_argument(
            '--type',
            choices=['master', 'monthly'],
            default=None,
            help='File type (auto-detected if not specified)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Parse and validate without persisting to database'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output'
        )

    def handle(self, *args, **options):
        filepath = options['file']
        file_type = options['type']
        dry_run = options['dry_run']
        verbose = options['verbose']

        # Validate file exists
        if not Path(filepath).exists():
            raise CommandError(f"File not found: {filepath}")

        self.stdout.write(f"Ingesting HBACA file: {filepath}")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - no data will be persisted"))

        try:
            from tools.market_ingest.hbaca import ingest_hbaca_file

            # Ensure Django's database connection is ready
            connection.ensure_connection()
            db_connection = connection.connection

            result = ingest_hbaca_file(
                filepath=filepath,
                file_type=file_type,
                dry_run=dry_run,
                connection=db_connection if not dry_run else None,
            )

            # Output results
            self.stdout.write("")
            self.stdout.write("=" * 60)
            self.stdout.write("HBACA INGESTION RESULTS")
            self.stdout.write("=" * 60)

            metadata = result.get('metadata', {})
            self.stdout.write(f"File Type: {metadata.get('file_type', 'unknown')}")
            self.stdout.write(f"Date Range: {metadata.get('date_range_start')} to {metadata.get('date_range_end')}")
            self.stdout.write(f"Jurisdictions: {metadata.get('jurisdiction_count', 0)}")
            self.stdout.write(f"Records Parsed: {result.get('records_parsed', 0)}")

            if not dry_run:
                self.stdout.write(f"Records Inserted: {result.get('records_inserted', 0)}")
                self.stdout.write(f"Records Updated: {result.get('records_updated', 0)}")
            else:
                self.stdout.write(self.style.WARNING("(Dry run - no records persisted)"))

            # Show jurisdictions if verbose
            if verbose:
                self.stdout.write("")
                self.stdout.write("Jurisdictions found:")
                for j in sorted(metadata.get('jurisdictions', [])):
                    self.stdout.write(f"  - {j}")

            # Show sample data if verbose and not dry run
            if verbose and not dry_run:
                self._show_summary()

            self.stdout.write("=" * 60)
            self.stdout.write(self.style.SUCCESS("Ingestion complete!"))

        except Exception as e:
            raise CommandError(f"Ingestion failed: {e}")

    def _show_summary(self):
        """Show summary of permit data."""
        from django.db import connection as db_conn

        self.stdout.write("")
        self.stdout.write("Recent permit totals by jurisdiction (latest year):")
        self.stdout.write("-" * 40)

        sql = """
            SELECT jurisdiction_name,
                   EXTRACT(YEAR FROM permit_month) as year,
                   SUM(permits_sf) as total
            FROM landscape.mkt_permit_history
            WHERE permit_month >= DATE_TRUNC('year', CURRENT_DATE - INTERVAL '1 year')
            GROUP BY jurisdiction_name, EXTRACT(YEAR FROM permit_month)
            ORDER BY total DESC
            LIMIT 10
        """

        with db_conn.cursor() as cursor:
            cursor.execute(sql)
            rows = cursor.fetchall()
            for row in rows:
                self.stdout.write(f"  {row[0]}: {int(row[2]):,} ({int(row[1])})")
