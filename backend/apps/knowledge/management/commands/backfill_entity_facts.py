"""
Backfill Entity-Fact tables from existing project data.

Populates knowledge_entities and knowledge_facts from:
1. tbl_project assumption-like fields (discount_rate, cap_rate, etc.)
2. tbl_project_assumption records (if any exist)

Usage:
    # Dry run on specific project
    ./venv/bin/python manage.py backfill_entity_facts --project-id=9 --dry-run

    # Backfill specific project
    ./venv/bin/python manage.py backfill_entity_facts --project-id=9

    # Backfill all projects
    ./venv/bin/python manage.py backfill_entity_facts
"""
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import connection

from apps.knowledge.services.fact_service import FactService


# Fields on tbl_project that should become Entity-Facts
PROJECT_ASSUMPTION_FIELDS = [
    # Valuation
    ('discount_rate_pct', 'valuation'),
    ('cost_of_capital_pct', 'valuation'),
    ('cap_rate_current', 'valuation'),
    ('cap_rate_proforma', 'valuation'),
    # Vacancy
    ('current_vacancy_rate', 'vacancy'),
    ('proforma_vacancy_rate', 'vacancy'),
    # Income
    ('current_noi', 'income'),
    ('proforma_noi', 'income'),
    ('current_gpr', 'income'),
    ('proforma_gpr', 'income'),
    ('current_egi', 'income'),
    ('proforma_egi', 'income'),
    ('current_gpi', 'income'),
    ('proforma_gpi', 'income'),
    ('current_other_income', 'income'),
    ('proforma_other_income', 'income'),
    # Expenses
    ('current_opex', 'expense'),
    ('proforma_opex', 'expense'),
    # Pricing
    ('asking_price', 'pricing'),
    ('price_per_unit', 'pricing'),
    ('price_per_sf', 'pricing'),
    ('acquisition_price', 'pricing'),
    # Planning
    ('planning_efficiency', 'planning'),
    ('market_velocity_annual', 'planning'),
]


class Command(BaseCommand):
    help = 'Backfill Entity-Fact tables from existing project data'

    def add_arguments(self, parser):
        parser.add_argument(
            '--project-id',
            type=int,
            default=None,
            help='Only backfill this specific project'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without doing it'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed output'
        )

    def handle(self, *args, **options):
        project_id = options.get('project_id')
        dry_run = options.get('dry_run')
        verbose = options.get('verbose')

        self.stdout.write("=" * 60)
        self.stdout.write("Entity-Fact Backfill")
        self.stdout.write("=" * 60)

        if dry_run:
            self.stdout.write(self.style.WARNING("[DRY RUN MODE]"))

        # Get projects to process
        projects = self._get_projects(project_id)
        self.stdout.write(f"\nFound {len(projects)} project(s) to process")

        total_entities = 0
        total_facts = 0
        errors = []

        for project in projects:
            self.stdout.write(f"\n--- Project {project['project_id']}: {project['project_name']} ---")

            try:
                entity_count, fact_count = self._backfill_project(
                    project, dry_run=dry_run, verbose=verbose
                )
                total_entities += entity_count
                total_facts += fact_count
            except Exception as e:
                errors.append({
                    'project_id': project['project_id'],
                    'error': str(e)
                })
                self.stdout.write(self.style.ERROR(f"  ERROR: {e}"))

        # Summary
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.SUCCESS("Backfill Complete!"))
        self.stdout.write(f"  Projects processed: {len(projects)}")
        self.stdout.write(f"  Entities created/updated: {total_entities}")
        self.stdout.write(f"  Facts created: {total_facts}")

        if errors:
            self.stdout.write(self.style.WARNING(f"\nErrors ({len(errors)}):"))
            for err in errors:
                self.stdout.write(f"  - Project {err['project_id']}: {err['error']}")

    def _get_projects(self, project_id=None):
        """Fetch projects to backfill."""
        query = """
            SELECT project_id, project_name, project_type_code, city, state,
                   jurisdiction_city, jurisdiction_state, property_subtype,
                   jurisdiction_county
            FROM landscape.tbl_project
            WHERE is_active = true
        """
        params = []

        if project_id:
            query += " AND project_id = %s"
            params.append(project_id)

        query += " ORDER BY project_id"

        with connection.cursor() as cursor:
            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]

    def _backfill_project(self, project, dry_run=False, verbose=False):
        """Backfill Entity-Facts for a single project."""
        project_id = project['project_id']
        fact_service = FactService(user_id=None)  # System backfill

        entity_count = 0
        fact_count = 0

        # 1. Get assumption-like fields from tbl_project
        project_fields = self._get_project_fields(project_id)

        for field_name, category in PROJECT_ASSUMPTION_FIELDS:
            value = project_fields.get(field_name)
            if value is not None:
                if verbose or dry_run:
                    self.stdout.write(f"  {field_name}: {value} ({category})")

                if not dry_run:
                    fact = fact_service.create_assumption_fact(
                        project_id=project_id,
                        assumption_key=field_name,
                        value=value,
                        source_type='import',  # Backfilled from existing data
                        source_id=None,
                        confidence_score=Decimal('1.00'),
                        project_name=project.get('project_name'),
                        project_type_code=project.get('project_type_code'),
                        city=project.get('city') or project.get('jurisdiction_city'),
                        state=project.get('state') or project.get('jurisdiction_state'),
                    )
                    if fact:
                        fact_count += 1
                else:
                    fact_count += 1  # Count for dry run

        # 2. Get records from tbl_project_assumption (if any)
        assumption_records = self._get_assumption_records(project_id)

        for record in assumption_records:
            if verbose or dry_run:
                self.stdout.write(
                    f"  [assumption] {record['assumption_key']}: {record['assumption_value']} "
                    f"(type={record['assumption_type']})"
                )

            if not dry_run:
                # Map assumption_type to source_type
                source_type = self._map_source_type(record.get('assumption_type'))
                confidence = Decimal(str(record.get('confidence_score') or 1.0))

                fact = fact_service.create_assumption_fact(
                    project_id=project_id,
                    assumption_key=record['assumption_key'],
                    value=record['assumption_value'],
                    source_type=source_type,
                    source_id=record.get('source_doc_id'),
                    confidence_score=confidence,
                    project_name=project.get('project_name'),
                    project_type_code=project.get('project_type_code'),
                    city=project.get('city') or project.get('jurisdiction_city'),
                    state=project.get('state') or project.get('jurisdiction_state'),
                )
                if fact:
                    fact_count += 1
            else:
                fact_count += 1

        # Entity is created implicitly by fact_service
        if fact_count > 0:
            entity_count = 1

        self.stdout.write(f"  Created {fact_count} fact(s)")
        return entity_count, fact_count

    def _get_project_fields(self, project_id):
        """Get assumption-like fields from tbl_project."""
        field_names = [f[0] for f in PROJECT_ASSUMPTION_FIELDS]
        fields_sql = ', '.join(field_names)

        query = f"SELECT {fields_sql} FROM landscape.tbl_project WHERE project_id = %s"

        with connection.cursor() as cursor:
            cursor.execute(query, [project_id])
            row = cursor.fetchone()
            if row:
                return dict(zip(field_names, row))
            return {}

    def _get_assumption_records(self, project_id):
        """Get records from tbl_project_assumption."""
        query = """
            SELECT assumption_key, assumption_value, assumption_type,
                   source_doc_id, confidence_score
            FROM landscape.tbl_project_assumption
            WHERE project_id = %s
        """

        with connection.cursor() as cursor:
            cursor.execute(query, [project_id])
            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]

    def _map_source_type(self, assumption_type):
        """Map assumption_type values to Entity-Fact source_type."""
        mapping = {
            'extracted': 'document_extract',
            'user': 'user_input',
            'calculated': 'calculation',
            'ai': 'ai_inference',
            'market': 'market_data',
            'default': 'import',
        }
        return mapping.get(assumption_type, 'import')
