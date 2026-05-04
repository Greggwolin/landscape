"""
Management command to seed discriminator-tagged operating-expense fixture
data + unit data for workflow test scenarios (S16 onward).

Why this exists
---------------
The Landscaper tool that writes opex (`update_operating_expenses`) does
NOT accept a `statement_discriminator` — that field is set automatically
during document extraction. Workflow tests that exercise the
discriminator-honesty + vocabulary-learning behavior shipped May 1 need
projects with pre-tagged opex data (CURRENT_PRO_FORMA, BROKER_PRO_FORMA,
T-12, etc.) without going through the extraction pipeline.

This command is the side-channel: a test-only seeder that writes
discriminator-tagged opex rows + unit rows directly. The companion to
`cleanup_test_projects` — same scope (test projects only by default),
same convention (`AGENT_TEST_` name prefix).

Safety
------
By default refuses to run on any project whose name does NOT start with
`AGENT_TEST_`. Pass `--allow-real-project` to override (use only in dev
fixture replays; never in CI / nightly).

Idempotency
-----------
Within a project, the command:
  - Deletes existing fixture-seeded opex rows for the given discriminator
    (filtered by `source = 'test_fixture'`) before inserting new ones, so
    re-runs produce the same end state without accumulating duplicates.
  - Uses `ON CONFLICT DO UPDATE` on units so re-runs converge.
  - The `--set-active-discriminator` flag is idempotent (UPDATE).

Usage
-----
    python manage.py seed_test_opex_fixture \\
        --project-id 901 \\
        --discriminator CURRENT_PRO_FORMA \\
        --units-json '{"count": 60, "bedrooms": 1, "bathrooms": 1.0, "square_feet": 700, "market_rent": 1500}' \\
        --opex-json '[{"category": "Real Estate Taxes", "annual_amount": 80000}, {"category": "Insurance", "annual_amount": 25000}]' \\
        --set-active-discriminator

Output (stdout, single JSON line for test-harness consumption)
--------------------------------------------------------------
    {"success": true, "project_id": 901, "project_name": "AGENT_TEST_S16_CPF_Source",
     "discriminator": "CURRENT_PRO_FORMA", "units_inserted": 60, "opex_inserted": 10,
     "active_discriminator_set": true}
"""

import json

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction


# Source tag written into tbl_operating_expenses.source for every row this
# command inserts. Used as the WHERE filter on the pre-insert delete so we
# never touch real extraction or user-entered rows on accident.
FIXTURE_SOURCE_TAG = 'test_fixture'

TEST_PREFIX = 'AGENT_TEST_'


class Command(BaseCommand):
    help = (
        'Seed discriminator-tagged operating-expense + unit fixture data '
        'on a test project. Used by S16+ workflow scenarios that need '
        'pre-tagged opex data without going through extraction.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--project-id', type=int, required=True,
            help='Target project_id. Must exist and be active.',
        )
        parser.add_argument(
            '--discriminator', type=str, required=True,
            help=(
                'statement_discriminator value to tag opex rows with. Common '
                'values: CURRENT_PRO_FORMA, BROKER_PRO_FORMA, T-12, T12, '
                'T3_ANNUALIZED, POST_RENO_PRO_FORMA, default, or a year '
                'string like "2023".'
            ),
        )
        parser.add_argument(
            '--units-json', type=str, default=None,
            help=(
                'JSON object describing units to seed. Schema: '
                '{"count": int, "bedrooms": int, "bathrooms": float, '
                '"square_feet": int, "market_rent": number, "current_rent": '
                'number, "unit_type": "1BR/1BA"}. Defaults: bedrooms=1, '
                'bathrooms=1.0, square_feet=700, market_rent=1500, '
                'current_rent=market_rent. Unit numbers auto-generated as '
                '"U001..U0NN". Pass null/omit to skip unit seeding.'
            ),
        )
        parser.add_argument(
            '--opex-json', type=str, default=None,
            help=(
                'JSON array of opex rows. Schema per row: '
                '{"category": str, "annual_amount": number, '
                '"category_id": int|null, "expense_type": str|null}. '
                'Pass null/omit to skip opex seeding.'
            ),
        )
        parser.add_argument(
            '--set-active-discriminator', action='store_true',
            help=(
                'Also set tbl_project.active_opex_discriminator to the '
                '--discriminator value. Useful when the test scenario '
                "expects the project's pinned scenario to match the seeded "
                'data.'
            ),
        )
        parser.add_argument(
            '--allow-real-project', action='store_true',
            help=(
                'Permit running on projects whose name does NOT start with '
                f'{TEST_PREFIX}. Use only for fixture replays in dev. '
                'Never in CI / nightly.'
            ),
        )

    def handle(self, *args, **opts):
        pid = opts['project_id']
        discriminator = opts['discriminator']
        allow_real = opts['allow_real_project']
        set_active = opts['set_active_discriminator']

        # ── Safety: project must exist + be a test project (or override) ──
        with connection.cursor() as cur:
            cur.execute(
                """
                SELECT project_name
                FROM landscape.tbl_project
                WHERE project_id = %s AND is_active = true
                """,
                [pid],
            )
            row = cur.fetchone()

        if not row:
            raise CommandError(f'Project {pid} not found or inactive')

        project_name = row[0]
        if not (project_name or '').startswith(TEST_PREFIX) and not allow_real:
            raise CommandError(
                f'Project {pid} ({project_name!r}) does not have the '
                f'{TEST_PREFIX} prefix. Refusing to seed fixture data on a '
                f'real project. Pass --allow-real-project if intentional.'
            )

        # ── Parse JSON inputs ──────────────────────────────────────────
        units_payload = self._parse_json_arg(opts['units_json'], '--units-json')
        opex_payload = self._parse_json_arg(opts['opex_json'], '--opex-json')

        if opex_payload is not None and not isinstance(opex_payload, list):
            raise CommandError('--opex-json must be a JSON array')

        # ── Seed in a single transaction so partial failure rolls back ──
        units_inserted = 0
        opex_inserted = 0
        opex_deleted = 0

        with transaction.atomic(), connection.cursor() as cur:
            if units_payload:
                units_inserted = self._seed_units(cur, pid, units_payload)

            if opex_payload:
                opex_deleted, opex_inserted = self._seed_opex(
                    cur, pid, discriminator, opex_payload,
                )

            if set_active:
                cur.execute(
                    """
                    UPDATE landscape.tbl_project
                    SET active_opex_discriminator = %s, updated_at = NOW()
                    WHERE project_id = %s
                    """,
                    [discriminator, pid],
                )

        # ── Single-line JSON output for the test harness to consume ─────
        result = {
            'success': True,
            'project_id': pid,
            'project_name': project_name,
            'discriminator': discriminator,
            'units_inserted': units_inserted,
            'opex_inserted': opex_inserted,
            'opex_deleted_for_idempotency': opex_deleted,
            'active_discriminator_set': bool(set_active),
        }
        self.stdout.write(json.dumps(result))

    # ──────────────────────────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────────────────────────
    @staticmethod
    def _parse_json_arg(raw, arg_name):
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError as e:
            raise CommandError(f'Invalid {arg_name}: {e}')

    @staticmethod
    def _seed_units(cur, project_id, units):
        count = int(units.get('count', 60))
        if count <= 0:
            return 0
        bedrooms = int(units.get('bedrooms', 1))
        bathrooms = float(units.get('bathrooms', 1.0))
        sqft = int(units.get('square_feet', 700))
        market_rent = float(units.get('market_rent', 1500))
        current_rent = float(units.get('current_rent', market_rent))
        unit_type = units.get('unit_type') or f'{bedrooms}BR/{int(bathrooms)}BA'

        unit_numbers = [f'U{i + 1:03d}' for i in range(count)]

        cur.execute(
            """
            INSERT INTO landscape.tbl_multifamily_unit
                (project_id, unit_number, unit_type, bedrooms, bathrooms,
                 square_feet, market_rent, current_rent, occupancy_status,
                 created_at, updated_at)
            SELECT
                %s,
                unnest(%s::text[]),
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                'occupied',
                NOW(), NOW()
            ON CONFLICT (project_id, unit_number) DO UPDATE SET
                unit_type = EXCLUDED.unit_type,
                bedrooms = EXCLUDED.bedrooms,
                bathrooms = EXCLUDED.bathrooms,
                square_feet = EXCLUDED.square_feet,
                market_rent = EXCLUDED.market_rent,
                current_rent = EXCLUDED.current_rent,
                updated_at = NOW()
            """,
            [
                project_id,
                unit_numbers,
                unit_type,
                bedrooms,
                bathrooms,
                sqft,
                market_rent,
                current_rent,
            ],
        )
        return count

    @staticmethod
    def _seed_opex(cur, project_id, discriminator, rows):
        # Idempotency: drop any prior fixture-seeded rows for THIS project
        # AND THIS discriminator. The source filter prevents touching real
        # extraction or user-entered rows.
        cur.execute(
            """
            DELETE FROM landscape.tbl_operating_expenses
            WHERE project_id = %s
              AND statement_discriminator = %s
              AND source = %s
            """,
            [project_id, discriminator, FIXTURE_SOURCE_TAG],
        )
        deleted_count = cur.rowcount or 0

        inserted_count = 0
        for entry in rows:
            if not isinstance(entry, dict):
                continue
            category = entry.get('category') or entry.get('expense_category')
            annual = entry.get('annual_amount') or entry.get('amount')
            if not category or annual is None:
                continue
            try:
                annual_num = float(annual)
            except (TypeError, ValueError):
                continue

            category_id = entry.get('category_id')
            # Default to 'OTHER' — the safe catch-all in the table's
            # expense_type CHECK constraint
            # ({CAM, TAXES, INSURANCE, MANAGEMENT, UTILITIES, REPAIRS, OTHER}).
            # 'OPERATING' is NOT in the allow-list and trips the constraint.
            expense_type = entry.get('expense_type', 'OTHER')

            cur.execute(
                """
                INSERT INTO landscape.tbl_operating_expenses
                    (project_id, expense_category, expense_type, annual_amount,
                     is_recoverable, recovery_rate,
                     escalation_type, escalation_rate, start_period,
                     payment_frequency, notes, calculation_basis,
                     is_auto_calculated, category_id, statement_discriminator,
                     source, value_source, created_at, updated_at)
                VALUES (%s, %s, %s, %s,
                        FALSE, 1.0,
                        'FIXED_PERCENT', 0.03, 1,
                        'MONTHLY', NULL, 'FIXED_AMOUNT',
                        FALSE, %s, %s,
                        %s, %s, NOW(), NOW())
                """,
                [
                    project_id,
                    category,
                    expense_type,
                    annual_num,
                    category_id,
                    discriminator,
                    FIXTURE_SOURCE_TAG,
                    # value_source must be one of {ai_extraction, user_manual,
                    # benchmark, import} per the column's CHECK constraint.
                    # 'import' is the closest semantic match for programmatic
                    # fixture seeding.
                    'import',
                ],
            )
            inserted_count += 1

        return deleted_count, inserted_count
