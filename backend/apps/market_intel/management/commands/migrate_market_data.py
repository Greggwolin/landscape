"""Django management command to migrate existing market data to new schema.

Migrates data from:
- market_activity -> mkt_permit_history
- zonda_subdivisions -> mkt_new_home_project (optional)

Usage:
    python manage.py migrate_market_data --dry-run
    python manage.py migrate_market_data --source market_activity
    python manage.py migrate_market_data --source zonda_subdivisions
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import connection


class Command(BaseCommand):
    help = 'Migrate existing market data to unified schema'

    def add_arguments(self, parser):
        parser.add_argument(
            '--source',
            choices=['market_activity', 'zonda_subdivisions', 'all'],
            default='all',
            help='Source table to migrate'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be migrated without making changes'
        )

    def handle(self, *args, **options):
        source = options['source']
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - no data will be migrated"))

        if source in ['market_activity', 'all']:
            self._migrate_market_activity(dry_run)

        if source in ['zonda_subdivisions', 'all']:
            self._migrate_zonda_subdivisions(dry_run)

        self.stdout.write(self.style.SUCCESS("Migration complete!"))

    def _migrate_market_activity(self, dry_run: bool):
        """Migrate market_activity to mkt_permit_history."""
        self.stdout.write("")
        self.stdout.write("Migrating market_activity -> mkt_permit_history")
        self.stdout.write("-" * 40)

        # Check if source table exists and has data
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) FROM landscape.market_activity
                WHERE source = 'HBACA' AND metric_type = 'permits'
            """)
            count = cursor.fetchone()[0]

        self.stdout.write(f"Found {count:,} HBACA permit records to migrate")

        if count == 0:
            self.stdout.write("No records to migrate")
            return

        if dry_run:
            self.stdout.write("(Dry run - skipping actual migration)")
            return

        # Get HBACA source_id
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT source_id FROM landscape.mkt_data_source_registry
                WHERE source_code = 'HBACA'
            """)
            row = cursor.fetchone()
            if not row:
                raise CommandError("HBACA source not found. Run migration first.")
            source_id = row[0]

        # Migrate data
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO landscape.mkt_permit_history (
                    source_id,
                    permit_month,
                    jurisdiction_name,
                    state,
                    cbsa_code,
                    permits_sf,
                    permits_total
                )
                SELECT
                    %s as source_id,
                    DATE_TRUNC('month', period_end_date)::date as permit_month,
                    geography_name as jurisdiction_name,
                    'AZ' as state,
                    38060 as cbsa_code,
                    value as permits_sf,
                    value as permits_total
                FROM landscape.market_activity
                WHERE source = 'HBACA'
                  AND metric_type = 'permits'
                  AND geography_type = 'jurisdiction'
                ON CONFLICT (source_id, permit_month, jurisdiction_name)
                DO UPDATE SET
                    permits_sf = EXCLUDED.permits_sf,
                    permits_total = EXCLUDED.permits_total
                RETURNING record_id
            """, [source_id])

            migrated = cursor.rowcount

        self.stdout.write(self.style.SUCCESS(f"Migrated {migrated:,} records"))

    def _migrate_zonda_subdivisions(self, dry_run: bool):
        """Migrate zonda_subdivisions to mkt_new_home_project."""
        self.stdout.write("")
        self.stdout.write("Migrating zonda_subdivisions -> mkt_new_home_project")
        self.stdout.write("-" * 40)

        # Check if source table exists and has data
        with connection.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM landscape.zonda_subdivisions")
            count = cursor.fetchone()[0]

        self.stdout.write(f"Found {count:,} Zonda records to migrate")

        if count == 0:
            self.stdout.write("No records to migrate")
            return

        if dry_run:
            self.stdout.write("(Dry run - skipping actual migration)")
            return

        # Get ZONDA source_id
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT source_id FROM landscape.mkt_data_source_registry
                WHERE source_code = 'ZONDA'
            """)
            row = cursor.fetchone()
            if not row:
                raise CommandError("ZONDA source not found. Run migration first.")
            source_id = row[0]

        # Migrate data - note this is a simplified mapping
        # The old schema has fewer fields
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO landscape.mkt_new_home_project (
                    source_id,
                    effective_date,
                    source_file,
                    project_name,
                    builder_name,
                    master_plan_name,
                    product_type,
                    product_style,
                    lot_size_sf,
                    lot_width_ft,
                    lot_depth_ft,
                    lot_dimensions,
                    units_sold,
                    units_remaining,
                    unit_size_min_sf,
                    unit_size_max_sf,
                    unit_size_avg_sf,
                    price_min,
                    price_max,
                    price_avg,
                    latitude,
                    longitude,
                    characteristics,
                    cbsa_code
                )
                SELECT
                    %s as source_id,
                    COALESCE(source_date, CURRENT_DATE) as effective_date,
                    source_file,
                    project_name,
                    builder as builder_name,
                    mpc as master_plan_name,
                    property_type as product_type,
                    style as product_style,
                    lot_size_sf,
                    lot_width as lot_width_ft,
                    lot_depth as lot_depth_ft,
                    product_code as lot_dimensions,
                    units_sold,
                    units_remaining,
                    size_min_sf as unit_size_min_sf,
                    size_max_sf as unit_size_max_sf,
                    size_avg_sf as unit_size_avg_sf,
                    price_min,
                    price_max,
                    price_avg,
                    latitude,
                    longitude,
                    special_features as characteristics,
                    38060 as cbsa_code
                FROM landscape.zonda_subdivisions
                ON CONFLICT DO NOTHING
                RETURNING record_id
            """, [source_id])

            migrated = cursor.rowcount

        self.stdout.write(self.style.SUCCESS(f"Migrated {migrated:,} records"))
        self.stdout.write(self.style.NOTICE(
            "Note: Migrated records may lack source_project_id. "
            "Re-import from Zonda full format recommended."
        ))
