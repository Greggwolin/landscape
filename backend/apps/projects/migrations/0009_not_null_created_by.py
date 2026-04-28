"""
Migration: Enforce NOT NULL on tbl_project.created_by_id.

Bug 5 fix follow-up. The JWT verification fix (src/lib/auth.ts, 2026-04-06)
closes the front-door forgery path, but the legacy NULL-owner bypass in
userOwnsProject — `if (ownerId IS NULL) return true` — was a second
footgun: any future code path that inserted a project without setting
created_by_id would create a globally-writable row.

Discovery on 2026-04-06 confirmed 0 NULL rows in prod at migration time.
This migration locks in the invariant at the DB level so the bypass can
never re-surface via a missed code path.

Reverse: drops the NOT NULL constraint. The application-layer deny in
userOwnsProject still holds after reverse, so a revert does not re-open
the bypass — it just allows NULLs to sneak back in.
"""

from django.db import migrations


FORWARD_SQL = """
-- Pre-check guard: fail loudly if any NULL rows exist. Discovery confirmed
-- 0 rows on 2026-04-06 — anything new here means a regression happened
-- between discovery and apply, and we want to stop before the constraint
-- errors with a cryptic message.
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count
    FROM landscape.tbl_project
    WHERE created_by_id IS NULL;

    IF null_count > 0 THEN
        RAISE EXCEPTION
            '[0009_not_null_created_by] Cannot apply NOT NULL: % projects have NULL created_by_id. Backfill required before this migration can run.',
            null_count;
    END IF;
END $$;

ALTER TABLE landscape.tbl_project
    ALTER COLUMN created_by_id SET NOT NULL;
"""

REVERSE_SQL = """
ALTER TABLE landscape.tbl_project
    ALTER COLUMN created_by_id DROP NOT NULL;
"""


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0008_add_plain_password_field'),
    ]

    operations = [
        migrations.RunSQL(
            sql=FORWARD_SQL,
            reverse_sql=REVERSE_SQL,
        ),
    ]
