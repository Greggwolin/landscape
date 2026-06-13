"""
Backfill latitude/longitude on rows that have an address but no coordinates (FB-317).

Default target is tbl_project (the only table with a real coverage gap as of
2026-06-12 — comp tables are already fully geocoded). Designed to be safe to
re-run: only touches rows where coordinates are NULL.

Usage:
    python manage.py backfill_geocoding [--table tbl_project] [--limit N] [--dry-run]

Rate-limited by the underlying Nominatim provider (1 req/sec), so large
backfills take roughly one second per geocodable row.
"""

from django.core.management.base import BaseCommand
from django.db import connection

from apps.location_intelligence.services.geocode_provider import (
    geocode_address,
    build_project_address,
)


class Command(BaseCommand):
    help = 'Backfill missing lat/long coordinates by geocoding stored addresses (FB-317).'

    def add_arguments(self, parser):
        parser.add_argument('--table', default='tbl_project',
                            help='Target table (default tbl_project).')
        parser.add_argument('--limit', type=int, default=None,
                            help='Max rows to process this run.')
        parser.add_argument('--dry-run', action='store_true',
                            help='Geocode and report, but do not write.')

    def handle(self, *args, **opts):
        table = opts['table']
        limit = opts['limit']
        dry_run = opts['dry_run']

        if table != 'tbl_project':
            # Comp tables use a flat `address`/`city`/`state`/`zip` shape and
            # are already fully geocoded; this command's project path is the
            # only one wired for now. Extend here if a comp gap appears.
            self.stderr.write(self.style.ERROR(
                f'Only tbl_project is supported today (got {table!r}). '
                'Comp tables had zero coverage gaps as of 2026-06-12.'
            ))
            return

        sql = """
            SELECT project_id, street_address, project_address, city, state, zip_code
            FROM landscape.tbl_project
            WHERE (latitude IS NULL OR longitude IS NULL)
        """
        if limit:
            sql += f' LIMIT {int(limit)}'

        with connection.cursor() as cur:
            cur.execute(sql)
            rows = cur.fetchall()

        self.stdout.write(f'{len(rows)} project row(s) need geocoding.')
        ok = skipped = failed = 0

        for pid, street, paddr, city, state, zip_code in rows:
            address = build_project_address(
                street_address=street, project_address=paddr,
                city=city, state=state, zip_code=zip_code,
            )
            if not address:
                skipped += 1
                self.stdout.write(f'  project {pid}: no geocodable address — skipped')
                continue

            res = geocode_address(address)
            if res.get('latitude') is None:
                failed += 1
                self.stdout.write(self.style.WARNING(
                    f'  project {pid}: {address!r} → no match ({res.get("error")})'
                ))
                continue

            self.stdout.write(
                f'  project {pid}: {address!r} → '
                f'({res["latitude"]:.5f}, {res["longitude"]:.5f}) '
                f'conf={res.get("confidence")}'
            )
            if not dry_run:
                with connection.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE landscape.tbl_project
                        SET latitude = %s, longitude = %s,
                            geocoding_confidence = %s,
                            geocoded_at = NOW(),
                            geocoded_by_service = %s
                        WHERE project_id = %s
                        """,
                        [res['latitude'], res['longitude'],
                         res.get('confidence'), res.get('provider'), pid],
                    )
            ok += 1

        verb = 'would geocode' if dry_run else 'geocoded'
        self.stdout.write(self.style.SUCCESS(
            f'Done. {verb} {ok}, skipped {skipped} (no address), failed {failed} (no match).'
        ))
