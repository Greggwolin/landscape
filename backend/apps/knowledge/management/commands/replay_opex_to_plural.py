"""
Replay operating expenses into tbl_operating_expenses for a project.

Useful for Project 42 validation to eliminate split-brain between
tbl_operating_expense (singular) and tbl_operating_expenses (plural).
"""

from django.core.management.base import BaseCommand
from django.db import connection
from apps.knowledge.services.extraction_writer import ExtractionWriter
import csv
import sys


class Command(BaseCommand):
    help = "Replay operating expenses into tbl_operating_expenses for a project (default: 42)"

    def add_arguments(self, parser):
        parser.add_argument(
            '--project-id',
            type=int,
            default=42,
            help='Project ID to replay OpEx for'
        )

    def handle(self, *args, **options):
        project_id = options['project_id']
        writer = ExtractionWriter(project_id=project_id)

        before_rows = self._fetch_plural_rows(project_id)
        self.stdout.write(f"Before rows in tbl_operating_expenses for project {project_id}: {len(before_rows)}")

        # Pull rows from singular table
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT expense_category, category_name, amount
                FROM landscape.tbl_operating_expense
                WHERE project_id = %s
            """, [project_id])
            singular_rows = cursor.fetchall()

        mapped = 0
        unmapped = []
        for row in singular_rows:
            expense_category, category_name, amount = row
            label = category_name or expense_category
            success, msg = writer.write_opex_entry(label, amount, selector={'category': label})
            if success:
                mapped += 1
            else:
                unmapped.append((label, amount, msg))
                self.stderr.write(f"Unmapped: {label} amount={amount} msg={msg}")

        after_rows = self._fetch_plural_rows(project_id)
        self.stdout.write(f"After rows in tbl_operating_expenses for project {project_id}: {len(after_rows)}")
        self.stdout.write(f"Mapped {mapped} rows; Unmapped {len(unmapped)}")

        self.stdout.write("\nDiff (CSV) after replay:")
        writer_csv = csv.writer(sys.stdout)
        writer_csv.writerow(['expense_category', 'expense_type', 'annual_amount', 'account_id', 'category_id'])
        for r in after_rows:
            writer_csv.writerow(r)

        self.stdout.write("\nOperations hierarchy payload (SQL-equivalent to API):")
        hierarchy_rows = self._fetch_operations_payload(project_id)
        writer_csv = csv.writer(sys.stdout)
        writer_csv.writerow(['account_number', 'account_name', 'annual_amount', 'category_id'])
        for h in hierarchy_rows:
            writer_csv.writerow(h)

        if unmapped:
            self.stderr.write("Unmapped line items detected. See above for details.")

    def _fetch_plural_rows(self, project_id):
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT expense_category, expense_type, annual_amount, account_id, category_id
                FROM landscape.tbl_operating_expenses
                WHERE project_id = %s
                ORDER BY expense_category, expense_type
            """, [project_id])
            return cursor.fetchall()

    def _fetch_operations_payload(self, project_id):
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    c.account_number,
                    c.category_name,
                    oe.annual_amount,
                    c.category_id
                FROM landscape.core_unit_cost_category c
                JOIN landscape.core_category_lifecycle_stages cls
                    ON c.category_id = cls.category_id
                LEFT JOIN landscape.tbl_operating_expenses oe
                    ON oe.category_id = c.category_id
                   AND oe.project_id = %s
                WHERE cls.activity = 'Operations'
                ORDER BY c.sort_order
            """, [project_id])
            return cursor.fetchall()
