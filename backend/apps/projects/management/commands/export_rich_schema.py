"""Django management command to export comprehensive "rich schema" from Neon PostgreSQL.

Exports complete schema metadata including tables, columns, views, indexes,
constraints, foreign keys, triggers, and routines with full definitions.

Usage:
    python manage.py export_rich_schema
    python manage.py export_rich_schema --schema public
"""

import json
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = 'Export comprehensive schema metadata to JSON file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--schema',
            default='landscape',
            help='PostgreSQL schema to export (default: landscape)'
        )
        parser.add_argument(
            '--output-dir',
            default='docs/schema',
            help='Output directory relative to project root (default: docs/schema)'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed progress output'
        )

    def handle(self, *args, **options):
        schema_name = options['schema']
        output_dir = options['output_dir']
        verbose = options['verbose']

        # Resolve output directory (relative to project root, which is backend's parent)
        project_root = Path(settings.BASE_DIR).parent
        output_path = project_root / output_dir
        output_path.mkdir(parents=True, exist_ok=True)

        self.stdout.write(f"Exporting schema: {schema_name}")
        self.stdout.write(f"Output directory: {output_path}")

        # Get database host for reference (no secrets)
        db_host = self._get_safe_db_host()

        # Get current date for filename
        today = datetime.utcnow().strftime('%Y-%m-%d')

        # Collect all schema data
        schema_data = {
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "database": db_host,
            "schema": schema_name,
            "tables": [],
            "views": [],
            "indexes": [],
            "constraints": [],
            "foreign_keys": [],
            "triggers": [],
            "routines": [],
        }

        # Execute queries and populate schema_data
        if verbose:
            self.stdout.write("Fetching tables and columns...")
        schema_data["tables"] = self._get_tables_columns(schema_name)
        self.stdout.write(f"  Tables: {len(schema_data['tables'])}")

        if verbose:
            self.stdout.write("Fetching constraints...")
        schema_data["constraints"] = self._get_constraints(schema_name)
        self.stdout.write(f"  Constraints: {len(schema_data['constraints'])}")

        if verbose:
            self.stdout.write("Fetching foreign keys...")
        schema_data["foreign_keys"] = self._get_foreign_keys(schema_name)
        self.stdout.write(f"  Foreign Keys: {len(schema_data['foreign_keys'])}")

        if verbose:
            self.stdout.write("Fetching indexes...")
        schema_data["indexes"] = self._get_indexes(schema_name)
        self.stdout.write(f"  Indexes: {len(schema_data['indexes'])}")

        if verbose:
            self.stdout.write("Fetching views...")
        schema_data["views"] = self._get_views(schema_name)
        self.stdout.write(f"  Views: {len(schema_data['views'])}")

        if verbose:
            self.stdout.write("Fetching triggers...")
        schema_data["triggers"] = self._get_triggers(schema_name)
        self.stdout.write(f"  Triggers: {len(schema_data['triggers'])}")

        if verbose:
            self.stdout.write("Fetching routines...")
        schema_data["routines"] = self._get_routines(schema_name)
        self.stdout.write(f"  Routines: {len(schema_data['routines'])}")

        # Write JSON file with date in filename
        json_filename = f"{schema_name}_rich_schema_{today}.json"
        json_path = output_path / json_filename
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(schema_data, f, indent=2, default=str)
        self.stdout.write(self.style.SUCCESS(f"Wrote: {json_path}"))

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Schema export complete!"))
        self._show_file_summary(json_path)

    def _get_safe_db_host(self):
        """Extract database host without exposing secrets."""
        try:
            db_url = getattr(settings, 'DATABASE_URL', None)
            if db_url:
                parsed = urlparse(db_url)
                return parsed.hostname or "unknown"
            # Fallback to Django settings
            return settings.DATABASES.get('default', {}).get('HOST', 'unknown')
        except Exception:
            return "unknown"

    def _get_tables_columns(self, schema_name):
        """Get all tables with their columns and metadata."""
        sql = """
            SELECT
                c.table_name,
                c.column_name,
                c.ordinal_position,
                c.data_type,
                c.character_maximum_length,
                c.numeric_precision,
                c.numeric_scale,
                c.is_nullable,
                c.column_default,
                pgd.description as column_comment
            FROM information_schema.columns c
            LEFT JOIN pg_catalog.pg_statio_all_tables st
                ON c.table_schema = st.schemaname AND c.table_name = st.relname
            LEFT JOIN pg_catalog.pg_description pgd
                ON pgd.objoid = st.relid AND pgd.objsubid = c.ordinal_position
            WHERE c.table_schema = %s
            ORDER BY c.table_name, c.ordinal_position
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [schema_name])
            rows = cursor.fetchall()

        # Group columns by table
        tables = {}
        for row in rows:
            table_name = row[0]
            if table_name not in tables:
                tables[table_name] = {
                    "object_type": "table",
                    "table_name": table_name,
                    "columns": []
                }
            tables[table_name]["columns"].append({
                "column_name": row[1],
                "ordinal_position": row[2],
                "data_type": row[3],
                "character_maximum_length": row[4],
                "numeric_precision": row[5],
                "numeric_scale": row[6],
                "is_nullable": row[7],
                "column_default": row[8],
                "column_comment": row[9]
            })

        # Return sorted list
        return sorted(tables.values(), key=lambda x: x["table_name"])

    def _get_constraints(self, schema_name):
        """Get all constraints (PK, Unique, Check)."""
        sql = """
            SELECT
                tc.table_name,
                tc.constraint_name,
                tc.constraint_type,
                pg_get_constraintdef(pgc.oid) as constraint_definition
            FROM information_schema.table_constraints tc
            JOIN pg_catalog.pg_constraint pgc
                ON tc.constraint_name = pgc.conname
            JOIN pg_catalog.pg_namespace pn
                ON pgc.connamespace = pn.oid AND pn.nspname = %s
            WHERE tc.table_schema = %s
            ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [schema_name, schema_name])
            rows = cursor.fetchall()

        return [
            {
                "object_type": "constraint",
                "table_name": row[0],
                "constraint_name": row[1],
                "constraint_type": row[2],
                "constraint_definition": row[3]
            }
            for row in rows
        ]

    def _get_foreign_keys(self, schema_name):
        """Get all foreign key relationships."""
        sql = """
            SELECT
                tc.table_name,
                tc.constraint_name,
                kcu.column_name,
                ccu.table_name AS referenced_table,
                ccu.column_name AS referenced_column,
                rc.update_rule,
                rc.delete_rule
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
                ON tc.constraint_name = ccu.constraint_name
                AND tc.table_schema = ccu.table_schema
            JOIN information_schema.referential_constraints rc
                ON tc.constraint_name = rc.constraint_name
                AND tc.table_schema = rc.constraint_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = %s
            ORDER BY tc.table_name, tc.constraint_name
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [schema_name])
            rows = cursor.fetchall()

        return [
            {
                "object_type": "foreign_key",
                "table_name": row[0],
                "constraint_name": row[1],
                "column_name": row[2],
                "referenced_table": row[3],
                "referenced_column": row[4],
                "update_rule": row[5],
                "delete_rule": row[6]
            }
            for row in rows
        ]

    def _get_indexes(self, schema_name):
        """Get all indexes with definitions."""
        sql = """
            SELECT
                tablename as table_name,
                indexname as index_name,
                indexdef as index_definition
            FROM pg_indexes
            WHERE schemaname = %s
            ORDER BY tablename, indexname
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [schema_name])
            rows = cursor.fetchall()

        return [
            {
                "object_type": "index",
                "table_name": row[0],
                "index_name": row[1],
                "index_definition": row[2]
            }
            for row in rows
        ]

    def _get_views(self, schema_name):
        """Get all views with full definitions."""
        sql = """
            SELECT
                v.viewname as view_name,
                pg_get_viewdef(c.oid, true) as view_definition
            FROM pg_views v
            JOIN pg_class c ON v.viewname = c.relname
            JOIN pg_namespace n ON c.relnamespace = n.oid AND n.nspname = %s
            WHERE v.schemaname = %s
            ORDER BY viewname
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [schema_name, schema_name])
            rows = cursor.fetchall()

        return [
            {
                "object_type": "view",
                "view_name": row[0],
                "view_definition": row[1]
            }
            for row in rows
        ]

    def _get_triggers(self, schema_name):
        """Get all triggers with full definitions."""
        sql = """
            SELECT
                tgname as trigger_name,
                relname as table_name,
                pg_get_triggerdef(t.oid) as trigger_definition
            FROM pg_trigger t
            JOIN pg_class c ON t.tgrelid = c.oid
            JOIN pg_namespace n ON c.relnamespace = n.oid
            WHERE n.nspname = %s AND NOT t.tgisinternal
            ORDER BY relname, tgname
        """

        with connection.cursor() as cursor:
            cursor.execute(sql, [schema_name])
            rows = cursor.fetchall()

        return [
            {
                "object_type": "trigger",
                "trigger_name": row[0],
                "table_name": row[1],
                "trigger_definition": row[2]
            }
            for row in rows
        ]

    def _get_routines(self, schema_name):
        """Get all functions/procedures with full definitions.

        Note: Aggregate functions are excluded because pg_get_functiondef()
        doesn't work on them. We identify them by prokind='a' in pg_proc.
        """
        # First get all non-aggregate functions with full definitions
        sql_functions = """
            SELECT
                p.proname as routine_name,
                pg_get_function_arguments(p.oid) as arguments,
                pg_get_function_result(p.oid) as return_type,
                pg_get_functiondef(p.oid) as routine_definition,
                'function' as routine_type
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = %s
              AND p.prokind != 'a'  -- Exclude aggregate functions
            ORDER BY p.proname
        """

        # Get aggregate functions separately (without pg_get_functiondef)
        sql_aggregates = """
            SELECT
                p.proname as routine_name,
                pg_get_function_arguments(p.oid) as arguments,
                pg_get_function_result(p.oid) as return_type,
                NULL as routine_definition,
                'aggregate' as routine_type
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = %s
              AND p.prokind = 'a'  -- Only aggregate functions
            ORDER BY p.proname
        """

        routines = []

        with connection.cursor() as cursor:
            # Get regular functions
            cursor.execute(sql_functions, [schema_name])
            for row in cursor.fetchall():
                routines.append({
                    "object_type": "routine",
                    "routine_name": row[0],
                    "arguments": row[1],
                    "return_type": row[2],
                    "routine_definition": row[3],
                    "routine_type": row[4]
                })

            # Get aggregates
            cursor.execute(sql_aggregates, [schema_name])
            for row in cursor.fetchall():
                routines.append({
                    "object_type": "routine",
                    "routine_name": row[0],
                    "arguments": row[1],
                    "return_type": row[2],
                    "routine_definition": row[3],  # Will be None for aggregates
                    "routine_type": row[4]
                })

        # Sort by routine_name for deterministic output
        return sorted(routines, key=lambda x: x["routine_name"])

    def _show_file_summary(self, json_path):
        """Show summary of generated file with size."""
        self.stdout.write("")
        self.stdout.write("Generated file:")
        self.stdout.write("-" * 60)

        if json_path.exists():
            size = json_path.stat().st_size
            self.stdout.write(f"  {json_path.name}: {self._format_size(size)}")

    def _format_size(self, size_bytes):
        """Format file size in human-readable format."""
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f} KB"
        else:
            return f"{size_bytes / (1024 * 1024):.1f} MB"
