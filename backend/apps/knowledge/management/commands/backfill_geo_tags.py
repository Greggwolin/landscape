"""
Management command to backfill doc_geo_tag entries from project associations.

For each document associated with a project, copies the project's state/city/county
into doc_geo_tag with geo_source = 'inferred'.

Usage:
    python manage.py backfill_geo_tags
    python manage.py backfill_geo_tags --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Backfill doc_geo_tag entries from project location data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually inserting',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        with connection.cursor() as cursor:
            # Find all documents with project associations that have location data
            cursor.execute("""
                SELECT DISTINCT
                    d.doc_id,
                    p.state,
                    p.city,
                    p.county
                FROM core_doc d
                JOIN tbl_project p ON d.project_id = p.project_id
                WHERE d.deleted_at IS NULL
                  AND d.project_id IS NOT NULL
                  AND (p.state IS NOT NULL OR p.city IS NOT NULL OR p.county IS NOT NULL)
            """)
            rows = cursor.fetchall()

            self.stdout.write(f"Found {len(rows)} documents with project location data")

            created_count = 0
            skipped_count = 0

            for doc_id, state, city, county in rows:
                tags_to_insert = []

                if state and state.strip():
                    tags_to_insert.append(('state', state.strip()))
                if city and city.strip():
                    tags_to_insert.append(('city', city.strip()))
                if county and county.strip():
                    tags_to_insert.append(('county', county.strip()))

                for geo_level, geo_value in tags_to_insert:
                    if dry_run:
                        self.stdout.write(
                            f"  [DRY RUN] Would create: doc_id={doc_id}, "
                            f"{geo_level}={geo_value}"
                        )
                        created_count += 1
                    else:
                        try:
                            cursor.execute("""
                                INSERT INTO doc_geo_tag (doc_id, geo_level, geo_value, geo_source, created_at)
                                VALUES (%s, %s, %s, 'inferred', NOW())
                                ON CONFLICT (doc_id, geo_level, geo_value) DO NOTHING
                            """, [doc_id, geo_level, geo_value])

                            if cursor.rowcount > 0:
                                created_count += 1
                            else:
                                skipped_count += 1
                        except Exception as e:
                            self.stderr.write(
                                f"Error inserting tag for doc {doc_id} "
                                f"({geo_level}={geo_value}): {e}"
                            )

            prefix = "[DRY RUN] " if dry_run else ""
            self.stdout.write(
                self.style.SUCCESS(
                    f"{prefix}Backfill complete: {created_count} tags created, "
                    f"{skipped_count} skipped (already exist)"
                )
            )
