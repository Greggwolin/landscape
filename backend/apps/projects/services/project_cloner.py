"""
Project Cloning Service

Deep-clones a project and all related data for a new user.
Used for provisioning demo projects for alpha testers.
"""

import logging
from typing import Dict
from django.db import transaction, connection
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class ProjectCloner:
    """
    Deep-clones a project and all related data for a new user.

    The cloning process:
    1. Clone the project record itself
    2. Clone hierarchy tables (area -> phase -> parcel for LAND)
    3. Clone financial data (budget, actual, opex)
    4. Clone property-type-specific data (unit types for MF, etc.)
    5. Clone documents (metadata only, files stay in UploadThing)
    6. Clone configuration and settings

    All operations are wrapped in a transaction for atomicity.
    """

    def __init__(self):
        # Maps old IDs to new IDs for each table type
        self.id_maps: Dict[str, Dict[int, int]] = {}

    def _reset_maps(self):
        """Reset ID maps for a new clone operation."""
        self.id_maps = {
            'project': {},
            'area': {},
            'phase': {},
            'parcel': {},
            'division': {},
            'unit_type': {},
            'document': {},
        }

    @transaction.atomic
    def clone_project(
        self,
        source_project_id: int,
        target_user,
        name_suffix: str = "(Demo)"
    ):
        """
        Clone a project with all related tables.

        Args:
            source_project_id: ID of project to clone
            target_user: User who will own the clone
            name_suffix: Appended to project name

        Returns:
            The newly created Project instance
        """
        from apps.projects.models import Project

        self._reset_maps()

        # 1. Clone the project itself
        source = Project.objects.get(project_id=source_project_id)
        logger.info(f"Cloning project {source_project_id} ({source.project_name}) for user {target_user.username}")

        new_project = self._clone_project_record(source, target_user, name_suffix)
        self.id_maps['project'][source_project_id] = new_project.project_id
        logger.info(f"Created new project {new_project.project_id}: {new_project.project_name}")

        # 2. Clone hierarchy based on project type
        project_type = (source.project_type_code or '').upper()

        if project_type == 'LAND':
            # Land projects use area -> phase -> parcel hierarchy
            self._clone_areas(source_project_id, new_project.project_id)
            self._clone_phases(source_project_id, new_project.project_id)
            self._clone_parcels(source_project_id, new_project.project_id)

        # Clone divisions (used by both project types)
        self._clone_divisions(source_project_id, new_project.project_id)

        # 3. Clone financial data
        self._clone_budget_items(source_project_id, new_project.project_id)
        self._clone_fin_fact_budget(source_project_id, new_project.project_id)
        self._clone_operating_expenses(source_project_id, new_project.project_id)

        # 4. Clone property-type-specific data
        if project_type in ['MF', 'MULTIFAMILY']:
            self._clone_multifamily_property(source_project_id, new_project.project_id)
            self._clone_unit_types(source_project_id, new_project.project_id)
            self._clone_rent_roll_units(source_project_id, new_project.project_id)
            self._clone_rent_comparables(source_project_id, new_project.project_id)
            self._clone_value_add_assumptions(source_project_id, new_project.project_id)
            self._clone_income_approach(source_project_id, new_project.project_id)
            self._clone_operations_user_inputs(source_project_id, new_project.project_id)

        # 5. Clone valuation data
        self._clone_sales_comparables(source_project_id, new_project.project_id)

        # 6. Clone documents (metadata only)
        self._clone_documents(source_project_id, new_project.project_id)

        # 7. Clone project config and settings
        self._clone_project_config(source_project_id, new_project.project_id)
        self._clone_project_settings(source_project_id, new_project.project_id)

        logger.info(f"Successfully cloned project {source_project_id} -> {new_project.project_id}")
        return new_project

    def _clone_project_record(self, source, target_user, name_suffix: str):
        """Clone the project record itself."""
        from apps.projects.models import Project

        # Get all field values from source, excluding pk and auto fields
        new_project = Project()

        # Copy all fields except the ones we need to modify
        exclude_fields = {'project_id', 'created_at', 'updated_at', 'created_by', 'created_by_id'}

        for field in Project._meta.get_fields():
            if field.name in exclude_fields:
                continue
            if hasattr(field, 'attname') and not field.primary_key:
                try:
                    value = getattr(source, field.attname)
                    setattr(new_project, field.attname, value)
                except AttributeError:
                    pass

        # Set the modified fields
        new_project.project_name = f"{source.project_name} {name_suffix}"
        new_project.created_by = target_user
        new_project.created_at = timezone.now()
        new_project.updated_at = timezone.now()

        new_project.save()
        return new_project

    def _clone_areas(self, source_project_id: int, new_project_id: int):
        """Clone tbl_area records for land projects."""
        with connection.cursor() as cursor:
            # Get source areas
            cursor.execute("""
                SELECT area_id, area_alias, area_no
                FROM landscape.tbl_area
                WHERE project_id = %s
                ORDER BY area_no
            """, [source_project_id])

            rows = cursor.fetchall()
            for row in rows:
                old_id, area_alias, area_no = row

                cursor.execute("""
                    INSERT INTO landscape.tbl_area (project_id, area_alias, area_no)
                    VALUES (%s, %s, %s)
                    RETURNING area_id
                """, [new_project_id, area_alias, area_no])

                new_id = cursor.fetchone()[0]
                self.id_maps['area'][old_id] = new_id

        logger.info(f"Cloned {len(self.id_maps['area'])} areas")

    def _clone_phases(self, source_project_id: int, new_project_id: int):
        """Clone tbl_phase records, updating area_id references."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT phase_id, area_id, phase_name, phase_no, label, description,
                       phase_status, phase_start_date, phase_completion_date
                FROM landscape.tbl_phase
                WHERE project_id = %s
                ORDER BY phase_no
            """, [source_project_id])

            rows = cursor.fetchall()
            for row in rows:
                (old_id, old_area_id, phase_name, phase_no, label, description,
                 phase_status, phase_start_date, phase_completion_date) = row

                # Map old area_id to new area_id
                new_area_id = self.id_maps['area'].get(old_area_id)

                cursor.execute("""
                    INSERT INTO landscape.tbl_phase
                    (project_id, area_id, phase_name, phase_no, label, description,
                     phase_status, phase_start_date, phase_completion_date)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING phase_id
                """, [new_project_id, new_area_id, phase_name, phase_no, label, description,
                      phase_status, phase_start_date, phase_completion_date])

                new_id = cursor.fetchone()[0]
                self.id_maps['phase'][old_id] = new_id

        logger.info(f"Cloned {len(self.id_maps['phase'])} phases")

    def _clone_parcels(self, source_project_id: int, new_project_id: int):
        """Clone tbl_parcel records, updating area_id and phase_id references."""
        with connection.cursor() as cursor:
            # Get column names for tbl_parcel (excluding parcel_id)
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'landscape'
                AND table_name = 'tbl_parcel'
                AND column_name != 'parcel_id'
                ORDER BY ordinal_position
            """)
            columns = [row[0] for row in cursor.fetchall()]

            # Build dynamic query
            select_cols = ', '.join(columns)
            cursor.execute(f"""
                SELECT parcel_id, {select_cols}
                FROM landscape.tbl_parcel
                WHERE project_id = %s
                ORDER BY parcel_id
            """, [source_project_id])

            rows = cursor.fetchall()
            col_idx = {col: i + 1 for i, col in enumerate(columns)}  # +1 because parcel_id is first

            for row in rows:
                old_id = row[0]
                values = list(row[1:])

                # Update foreign key references
                if 'project_id' in col_idx:
                    values[col_idx['project_id'] - 1] = new_project_id
                if 'area_id' in col_idx and values[col_idx['area_id'] - 1]:
                    values[col_idx['area_id'] - 1] = self.id_maps['area'].get(values[col_idx['area_id'] - 1])
                if 'phase_id' in col_idx and values[col_idx['phase_id'] - 1]:
                    values[col_idx['phase_id'] - 1] = self.id_maps['phase'].get(values[col_idx['phase_id'] - 1])

                placeholders = ', '.join(['%s'] * len(columns))
                insert_cols = ', '.join(columns)

                cursor.execute(f"""
                    INSERT INTO landscape.tbl_parcel ({insert_cols})
                    VALUES ({placeholders})
                    RETURNING parcel_id
                """, values)

                new_id = cursor.fetchone()[0]
                self.id_maps['parcel'][old_id] = new_id

        logger.info(f"Cloned {len(self.id_maps['parcel'])} parcels")

    def _clone_divisions(self, source_project_id: int, new_project_id: int):
        """Clone tbl_division records preserving parent-child hierarchy."""
        with connection.cursor() as cursor:
            # Temporarily disable the outdated trigger that references old column names
            cursor.execute(
                "ALTER TABLE landscape.tbl_division DISABLE TRIGGER trigger_validate_container_parent"
            )

            try:
                # Get all divisions ordered by tier (parents first)
                cursor.execute("""
                    SELECT division_id, parent_division_id, tier, division_code,
                           display_name, sort_order, attributes, is_active
                    FROM landscape.tbl_division
                    WHERE project_id = %s
                    ORDER BY tier, division_id
                """, [source_project_id])

                rows = cursor.fetchall()

                # Clone level by level to handle parent references
                for row in rows:
                    (old_id, old_parent_id, tier, division_code,
                     display_name, sort_order, attributes, is_active) = row

                    # Map parent_id if it exists
                    new_parent_id = None
                    if old_parent_id:
                        new_parent_id = self.id_maps['division'].get(old_parent_id)

                    cursor.execute("""
                        INSERT INTO landscape.tbl_division
                        (project_id, parent_division_id, tier, division_code,
                         display_name, sort_order, attributes, is_active, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                        RETURNING division_id
                    """, [new_project_id, new_parent_id, tier, division_code,
                          display_name, sort_order, attributes, is_active])

                    new_id = cursor.fetchone()[0]
                    self.id_maps['division'][old_id] = new_id
            finally:
                # Re-enable the trigger
                cursor.execute(
                    "ALTER TABLE landscape.tbl_division ENABLE TRIGGER trigger_validate_container_parent"
                )

        logger.info(f"Cloned {len(self.id_maps['division'])} divisions")

    def _clone_budget_items(self, source_project_id: int, new_project_id: int):
        """Clone tbl_budget_items records."""
        self._clone_simple_table(
            'tbl_budget_items',
            'budget_item_id',
            source_project_id,
            new_project_id,
            'project_id'
        )

    def _clone_fin_fact_budget(self, source_project_id: int, new_project_id: int):
        """Clone core_fin_fact_budget records."""
        self._clone_simple_table(
            'core_fin_fact_budget',
            'fact_id',
            source_project_id,
            new_project_id,
            'project_id'
        )

    def _clone_operating_expenses(self, source_project_id: int, new_project_id: int):
        """Clone tbl_operating_expense records."""
        self._clone_simple_table(
            'tbl_operating_expense',
            'expense_id',
            source_project_id,
            new_project_id,
            'project_id'
        )

    def _clone_multifamily_property(self, source_project_id: int, new_project_id: int):
        """Clone tbl_multifamily_property record."""
        self._clone_simple_table(
            'tbl_multifamily_property',
            'multifamily_property_id',
            source_project_id,
            new_project_id,
            'project_id'
        )

    def _clone_unit_types(self, source_project_id: int, new_project_id: int):
        """Clone tbl_multifamily_unit_type records."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'landscape'
                AND table_name = 'tbl_multifamily_unit_type'
                AND column_name != 'unit_type_id'
                ORDER BY ordinal_position
            """)
            columns = [row[0] for row in cursor.fetchall()]

            select_cols = ', '.join(columns)
            cursor.execute(f"""
                SELECT unit_type_id, {select_cols}
                FROM landscape.tbl_multifamily_unit_type
                WHERE project_id = %s
                ORDER BY unit_type_id
            """, [source_project_id])

            rows = cursor.fetchall()
            col_idx = {col: i + 1 for i, col in enumerate(columns)}

            for row in rows:
                old_id = row[0]
                values = list(row[1:])

                if 'project_id' in col_idx:
                    values[col_idx['project_id'] - 1] = new_project_id

                placeholders = ', '.join(['%s'] * len(columns))
                insert_cols = ', '.join(columns)

                cursor.execute(f"""
                    INSERT INTO landscape.tbl_multifamily_unit_type ({insert_cols})
                    VALUES ({placeholders})
                    RETURNING unit_type_id
                """, values)

                new_id = cursor.fetchone()[0]
                self.id_maps['unit_type'][old_id] = new_id

        logger.info(f"Cloned {len(self.id_maps['unit_type'])} unit types")

    def _clone_rent_roll_units(self, source_project_id: int, new_project_id: int):
        """Clone tbl_rent_roll_unit records, updating unit_type_id references."""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'landscape'
                AND table_name = 'tbl_rent_roll_unit'
                AND column_name != 'rent_roll_id'
                ORDER BY ordinal_position
            """)
            columns = [row[0] for row in cursor.fetchall()]

            if not columns:
                return

            select_cols = ', '.join(columns)
            cursor.execute(f"""
                SELECT rent_roll_id, {select_cols}
                FROM landscape.tbl_rent_roll_unit
                WHERE project_id = %s
                ORDER BY rent_roll_id
            """, [source_project_id])

            rows = cursor.fetchall()
            if not rows:
                return

            col_idx = {col: i + 1 for i, col in enumerate(columns)}
            count = 0

            for row in rows:
                values = list(row[1:])

                if 'project_id' in col_idx:
                    values[col_idx['project_id'] - 1] = new_project_id
                if 'unit_type_id' in col_idx and values[col_idx['unit_type_id'] - 1]:
                    values[col_idx['unit_type_id'] - 1] = self.id_maps['unit_type'].get(
                        values[col_idx['unit_type_id'] - 1]
                    )

                placeholders = ', '.join(['%s'] * len(columns))
                insert_cols = ', '.join(columns)

                cursor.execute(f"""
                    INSERT INTO landscape.tbl_rent_roll_unit ({insert_cols})
                    VALUES ({placeholders})
                """, values)
                count += 1

        logger.info(f"Cloned {count} rent roll units")

    def _clone_rent_comparables(self, source_project_id: int, new_project_id: int):
        """Clone tbl_rent_comparable records."""
        self._clone_simple_table(
            'tbl_rent_comparable',
            'comparable_id',
            source_project_id,
            new_project_id,
            'project_id'
        )

    def _clone_sales_comparables(self, source_project_id: int, new_project_id: int):
        """Clone tbl_sales_comparables records."""
        self._clone_simple_table(
            'tbl_sales_comparables',
            'comparable_id',
            source_project_id,
            new_project_id,
            'project_id'
        )

    def _clone_value_add_assumptions(self, source_project_id: int, new_project_id: int):
        """Clone tbl_value_add_assumptions record."""
        self._clone_simple_table(
            'tbl_value_add_assumptions',
            'value_add_id',
            source_project_id,
            new_project_id,
            'project_id'
        )

    def _clone_income_approach(self, source_project_id: int, new_project_id: int):
        """Clone tbl_income_approach record."""
        self._clone_simple_table(
            'tbl_income_approach',
            'income_approach_id',
            source_project_id,
            new_project_id,
            'project_id'
        )

    def _clone_operations_user_inputs(self, source_project_id: int, new_project_id: int):
        """Clone tbl_operations_user_inputs records."""
        self._clone_simple_table(
            'tbl_operations_user_inputs',
            'input_id',
            source_project_id,
            new_project_id,
            'project_id'
        )

    def _clone_documents(self, source_project_id: int, new_project_id: int):
        """
        Clone document metadata (core_doc).
        Files remain in UploadThing - we just copy the references.
        """
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'landscape'
                AND table_name = 'core_doc'
                AND column_name NOT IN ('doc_id', 'created_at', 'updated_at')
                ORDER BY ordinal_position
            """)
            columns = [row[0] for row in cursor.fetchall()]

            if not columns:
                return

            select_cols = ', '.join(columns)
            cursor.execute(f"""
                SELECT doc_id, {select_cols}
                FROM landscape.core_doc
                WHERE project_id = %s
                ORDER BY doc_id
            """, [source_project_id])

            rows = cursor.fetchall()
            if not rows:
                return

            col_idx = {col: i + 1 for i, col in enumerate(columns)}
            count = 0

            for row in rows:
                old_id = row[0]
                values = list(row[1:])

                if 'project_id' in col_idx:
                    values[col_idx['project_id'] - 1] = new_project_id

                placeholders = ', '.join(['%s'] * len(columns))
                insert_cols = ', '.join(columns)

                cursor.execute(f"""
                    INSERT INTO landscape.core_doc ({insert_cols}, created_at, updated_at)
                    VALUES ({placeholders}, NOW(), NOW())
                    RETURNING doc_id
                """, values)

                new_id = cursor.fetchone()[0]
                self.id_maps['document'][old_id] = new_id
                count += 1

        logger.info(f"Cloned {count} documents")

    def _clone_project_config(self, source_project_id: int, new_project_id: int):
        """Clone tbl_project_config record (1:1 with project_id as PK)."""
        self._clone_1to1_table(
            'tbl_project_config',
            source_project_id,
            new_project_id
        )

    def _clone_project_settings(self, source_project_id: int, new_project_id: int):
        """Clone tbl_project_settings record (1:1 with project_id as PK)."""
        self._clone_1to1_table(
            'tbl_project_settings',
            source_project_id,
            new_project_id
        )

    def _clone_1to1_table(
        self,
        table_name: str,
        source_project_id: int,
        new_project_id: int
    ):
        """
        Clone a 1:1 table where project_id is the primary key.
        """
        with connection.cursor() as cursor:
            # Get column names excluding timestamps
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'landscape'
                AND table_name = %s
                AND column_name NOT IN ('created_at', 'updated_at')
                ORDER BY ordinal_position
            """, [table_name])

            columns = [row[0] for row in cursor.fetchall()]
            if not columns:
                return

            # Check if source record exists
            select_cols = ', '.join(columns)
            cursor.execute(f"""
                SELECT {select_cols}
                FROM landscape.{table_name}
                WHERE project_id = %s
            """, [source_project_id])

            row = cursor.fetchone()
            if not row:
                return

            col_idx = {col: i for i, col in enumerate(columns)}
            values = list(row)

            # Update project_id to new value
            if 'project_id' in col_idx:
                values[col_idx['project_id']] = new_project_id

            placeholders = ', '.join(['%s'] * len(columns))
            insert_cols = ', '.join(columns)

            try:
                cursor.execute(f"""
                    INSERT INTO landscape.{table_name} ({insert_cols})
                    VALUES ({placeholders})
                """, values)
                logger.info(f"Cloned 1 record from {table_name}")
            except Exception as e:
                logger.warning(f"Failed to clone {table_name}: {e}")

    def _clone_simple_table(
        self,
        table_name: str,
        pk_column: str,
        source_project_id: int,
        new_project_id: int,
        project_column: str = 'project_id'
    ):
        """
        Generic method to clone a simple table with project_id reference.
        Does not handle foreign key references to other cloned tables.
        """
        with connection.cursor() as cursor:
            # Get column names
            cursor.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'landscape'
                AND table_name = %s
                AND column_name NOT IN (%s, 'created_at', 'updated_at')
                ORDER BY ordinal_position
            """, [table_name, pk_column])

            columns = [row[0] for row in cursor.fetchall()]
            if not columns:
                return 0

            # Check if table has data for this project
            select_cols = ', '.join(columns)
            cursor.execute(f"""
                SELECT {select_cols}
                FROM landscape.{table_name}
                WHERE {project_column} = %s
            """, [source_project_id])

            rows = cursor.fetchall()
            if not rows:
                return 0

            col_idx = {col: i for i, col in enumerate(columns)}
            count = 0

            for row in rows:
                values = list(row)

                # Update project_id
                if project_column in col_idx:
                    values[col_idx[project_column]] = new_project_id

                placeholders = ', '.join(['%s'] * len(columns))
                insert_cols = ', '.join(columns)

                try:
                    cursor.execute(f"""
                        INSERT INTO landscape.{table_name} ({insert_cols})
                        VALUES ({placeholders})
                    """, values)
                    count += 1
                except Exception as e:
                    logger.warning(f"Failed to clone row in {table_name}: {e}")

            logger.info(f"Cloned {count} records from {table_name}")
            return count

    def provision_demo_projects(self, user) -> bool:
        """
        Clone both demo projects for a new alpha tester.
        Called on first login.

        Returns True if provisioning was successful or already done.
        """
        if user.demo_projects_provisioned:
            logger.info(f"User {user.username} already has demo projects provisioned")
            return True

        demo_ids = getattr(settings, 'DEMO_PROJECT_IDS', {})

        if not demo_ids:
            logger.warning("DEMO_PROJECT_IDS not configured in settings")
            return False

        try:
            cloned_projects = []

            # Clone Chadron (multifamily)
            chadron_id = demo_ids.get('chadron')
            if chadron_id:
                cloned = self.clone_project(
                    chadron_id,
                    user,
                    name_suffix=f"(Demo - {user.username})"
                )
                cloned_projects.append(cloned)
                logger.info(f"Cloned Chadron -> {cloned.project_id} for user {user.username}")

            # Clone Peoria Lakes (land)
            peoria_id = demo_ids.get('peoria_lakes')
            if peoria_id:
                cloned = self.clone_project(
                    peoria_id,
                    user,
                    name_suffix=f"(Demo - {user.username})"
                )
                cloned_projects.append(cloned)
                logger.info(f"Cloned Peoria Lakes -> {cloned.project_id} for user {user.username}")

            # Mark user as provisioned
            user.demo_projects_provisioned = True
            user.save(update_fields=['demo_projects_provisioned'])

            logger.info(f"Successfully provisioned {len(cloned_projects)} demo projects for {user.username}")
            return True

        except Exception as e:
            logger.error(f"Failed to provision demo projects for {user.username}: {e}", exc_info=True)
            raise
