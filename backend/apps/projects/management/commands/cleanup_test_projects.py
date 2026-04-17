"""
Management command to clean up test agent projects.

Deletes all projects whose name starts with AGENT_TEST_ (the prefix used
by the test agent framework).  Uses dynamic FK enumeration via pg_constraint
so it never fails on newly-added tables.

Usage:
    python manage.py cleanup_test_projects          # dry run
    python manage.py cleanup_test_projects --confirm # actual delete
    python manage.py cleanup_test_projects --ids 830 831 --confirm  # specific IDs
"""

from django.core.management.base import BaseCommand
from django.db import connection

TEST_PREFIX = 'AGENT_TEST_'


def _discover_fk_chain(cursor):
    """
    Discover all tables with FKs to landscape.tbl_project, plus their
    grandchildren.  Returns (grandchildren, direct_fks) where each entry
    is (schema.table, fk_column).  Grandchildren include the parent info
    needed for subquery deletes.
    """
    # Direct children of tbl_project
    cursor.execute("""
        SELECT
            cn.nspname  AS child_schema,
            cc.relname  AS child_table,
            a.attname   AS child_column
        FROM pg_constraint c
        JOIN pg_class      cc ON cc.oid = c.conrelid
        JOIN pg_namespace  cn ON cn.oid = cc.relnamespace
        JOIN pg_class      pc ON pc.oid = c.confrelid
        JOIN pg_namespace  pn ON pn.oid = pc.relnamespace
        JOIN pg_attribute  a  ON a.attrelid = c.conrelid
                              AND a.attnum = ANY(c.conkey)
        WHERE c.contype   = 'f'
          AND pn.nspname  = 'landscape'
          AND pc.relname  = 'tbl_project'
        ORDER BY cn.nspname, cc.relname
    """)
    direct_fks = [(f'{r[0]}.{r[1]}', r[2]) for r in cursor.fetchall()]

    # Grandchildren: tables with FK into any direct child
    grandchildren = []
    for schema_table, _ in direct_fks:
        parts = schema_table.split('.')
        if len(parts) != 2:
            continue
        cursor.execute("""
            SELECT
                cn.nspname, cc.relname, a.attname, pc.relname
            FROM pg_constraint c
            JOIN pg_class      cc ON cc.oid = c.conrelid
            JOIN pg_namespace  cn ON cn.oid = cc.relnamespace
            JOIN pg_class      pc ON pc.oid = c.confrelid
            JOIN pg_namespace  pn ON pn.oid = pc.relnamespace
            JOIN pg_attribute  a  ON a.attrelid = c.conrelid
                                  AND a.attnum = ANY(c.conkey)
            WHERE c.contype   = 'f'
              AND pn.nspname  = %s
              AND pc.relname  = %s
        """, [parts[0], parts[1]])

        for gc_row in cursor.fetchall():
            grandchildren.append((
                f'{gc_row[0]}.{gc_row[1]}',   # gc table
                gc_row[2],                      # gc fk column
                schema_table,                   # parent table
            ))

    return grandchildren, direct_fks


class Command(BaseCommand):
    help = 'Delete test agent projects and all dependent rows'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm', action='store_true',
            help='Actually delete (default is dry run)',
        )
        parser.add_argument(
            '--ids', nargs='+', type=int,
            help='Specific project IDs to delete (instead of prefix match)',
        )
        parser.add_argument(
            '--prefix', default=TEST_PREFIX,
            help=f'Project name prefix to match (default: {TEST_PREFIX})',
        )

    def handle(self, *args, **options):
        confirm = options['confirm']
        prefix = options['prefix']

        with connection.cursor() as cursor:
            # Find target projects
            if options['ids']:
                pids = options['ids']
                cursor.execute(
                    'SELECT project_id, project_name FROM landscape.tbl_project '
                    'WHERE project_id = ANY(%s)',
                    [pids],
                )
            else:
                cursor.execute(
                    'SELECT project_id, project_name FROM landscape.tbl_project '
                    'WHERE project_name LIKE %s',
                    [f'{prefix}%'],
                )

            rows = cursor.fetchall()

            if not rows:
                self.stdout.write('No matching projects found.')
                return

            self.stdout.write(f'Found {len(rows)} project(s):')
            for pid, name in rows:
                self.stdout.write(f'  {pid}: {name}')

            pids = [r[0] for r in rows]

            # Discover FK chain dynamically
            grandchildren, direct_fks = _discover_fk_chain(cursor)

            if not confirm:
                self.stdout.write(f'\nDry run — {len(direct_fks)} direct FK tables, '
                                  f'{len(grandchildren)} grandchild entries.')
                self.stdout.write('Add --confirm to delete.\n')
                # Show row counts for direct children
                for table, fk_col in direct_fks:
                    try:
                        cursor.execute(
                            f'SELECT COUNT(*) FROM {table} WHERE {fk_col} = ANY(%s)',
                            [pids],
                        )
                        count = cursor.fetchone()[0]
                        if count > 0:
                            self.stdout.write(f'  {table}: {count} rows')
                    except Exception:
                        pass
                return

            # Phase 1: Delete grandchildren via subquery
            total_deleted = 0
            seen_gc = set()
            for gc_table, gc_fk_col, parent_table in grandchildren:
                key = (gc_table, gc_fk_col)
                if key in seen_gc or gc_table == parent_table:
                    continue
                seen_gc.add(key)

                parent_fk = None
                for dt, dc in direct_fks:
                    if dt == parent_table:
                        parent_fk = dc
                        break
                if not parent_fk:
                    continue

                # Find parent PK
                parent_parts = parent_table.split('.')
                try:
                    cursor.execute("""
                        SELECT a.attname
                        FROM pg_index i
                        JOIN pg_attribute a ON a.attrelid = i.indrelid
                                            AND a.attnum = ANY(i.indkey)
                        JOIN pg_class c ON c.oid = i.indrelid
                        JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE i.indisprimary
                          AND n.nspname = %s AND c.relname = %s
                        LIMIT 1
                    """, [parent_parts[0], parent_parts[1]])
                    pk_row = cursor.fetchone()
                    if not pk_row:
                        continue
                    parent_pk = pk_row[0]
                except Exception:
                    continue

                try:
                    cursor.execute(
                        f'DELETE FROM {gc_table} '
                        f'WHERE {gc_fk_col} IN ('
                        f'  SELECT {parent_pk} FROM {parent_table} '
                        f'  WHERE {parent_fk} = ANY(%s))',
                        [pids],
                    )
                    if cursor.rowcount > 0:
                        self.stdout.write(
                            f'  Deleted {cursor.rowcount} rows from {gc_table} (via {parent_table})')
                        total_deleted += cursor.rowcount
                except Exception as e:
                    self.stderr.write(f'  SKIP gc {gc_table}: {e}')

            # Phase 2: Delete direct children
            for table, fk_col in direct_fks:
                try:
                    cursor.execute(
                        f'DELETE FROM {table} WHERE {fk_col} = ANY(%s)',
                        [pids],
                    )
                    if cursor.rowcount > 0:
                        self.stdout.write(f'  Deleted {cursor.rowcount} rows from {table}')
                        total_deleted += cursor.rowcount
                except Exception as e:
                    self.stderr.write(f'  SKIP {table}: {e}')

            # Phase 3: Delete the projects themselves
            cursor.execute(
                'DELETE FROM landscape.tbl_project WHERE project_id = ANY(%s)',
                [pids],
            )
            proj_deleted = cursor.rowcount
            total_deleted += proj_deleted

            self.stdout.write(
                f'\nTotal: {total_deleted} rows deleted '
                f'({proj_deleted} project(s) + {total_deleted - proj_deleted} dependent rows).')
