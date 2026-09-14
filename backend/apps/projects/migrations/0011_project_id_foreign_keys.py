"""Migration 0011: give the project-scoped tables a real foreign key.

Twenty-four tables in the ``landscape`` schema carry a ``project_id`` column
with no foreign key to ``tbl_project``. That is how 1,556 rows came to be
stranded across 107 project ids that no longer exist — residue of deletions
going back months, discovered on 2026-09-14 and swept the same day. Nothing
prevented the next one. This adds the constraint to seventeen of them, with
``ON DELETE CASCADE`` so the database maintains the invariant itself rather
than relying on a Python walker remembering every table.

MEASURED BEFORE WRITING, ON THE LIVE DATABASE
----------------------------------------------
Every one of the twenty-four was counted for rows whose ``project_id`` matches
no project. **All seventeen below are clean**, so every constraint here
validates without touching a row; the DDL was applied inside a rolled-back
transaction on 2026-09-14 to prove it before this file was written, and a land
project and a multifamily project were then both deleted (and rolled back)
through the app's own delete path with the constraints in place.

SEVEN TABLES ARE DELIBERATELY EXCLUDED, AND THE REASONS ARE NOT THE SAME
------------------------------------------------------------------------
* ``core_fin_growth_rate_sets`` (16 rows of 20) and ``land_use_pricing`` (2 of
  24) carry **project_id 0 or 1 as a platform sentinel**. There is no project 0
  and no project 1, so a foreign key would reject exactly the rows whose
  deletion destroyed the app's starter library of growth curves this morning
  (D-2026-09-14-SENTINEL). Making these referential means either creating
  sentinel project rows or moving the convention off ``project_id`` onto a
  column of its own. That is a design decision, not a migration, and it is
  Gregg's.

* ``bak_costofsale_sweep_0724``, ``bak_exit_cap_land_20260914`` and
  ``tbl_lease_archive_20260506`` are **backups**. A cascade would let deleting a
  project destroy its own backup — and ``bak_exit_cap_land_20260914`` is the
  only route back from the exit-cap rates cleared on 2026-09-14. Backups are
  decoupled on purpose.

* ``mutation_audit_log`` is the **audit trail**. An audit record that
  disappears with the thing it audits is not an audit record.

* ``tester_feedback_deprecated`` is deprecated and named so.

Those seven will keep accumulating rows that match no project, and for five of
them that is the intent rather than an oversight. Any future orphan sweep must
still exclude the sentinels — see the counting rule in
``outputs/_verify_handoff.sh``.
"""

from django.db import migrations

TABLES = [
    'dms_project_doc_types',
    'doc_processing_queue',
    'knowledge_sessions',
    'landscaper_chat_embedding',
    'market_assumptions',
    'planning_doc',
    'tbl_alpha_feedback',
    'tbl_excel_audit',
    'tbl_extraction_job',
    'tbl_extraction_log',
    'tbl_feedback',
    'tbl_narrative_version',
    'tbl_parcel',
    'tbl_phase',
    'tbl_report_history',
    'tbl_user_grid_preference',
    'tbl_waterfall_tier',
]

ADD = '\n'.join(
    f'ALTER TABLE landscape.{t} '
    f'DROP CONSTRAINT IF EXISTS {t}_project_id_fkey;\n'
    f'ALTER TABLE landscape.{t} '
    f'ADD CONSTRAINT {t}_project_id_fkey '
    f'FOREIGN KEY (project_id) REFERENCES landscape.tbl_project(project_id) '
    f'ON DELETE CASCADE;'
    for t in TABLES
)

DROP = '\n'.join(
    f'ALTER TABLE landscape.{t} '
    f'DROP CONSTRAINT IF EXISTS {t}_project_id_fkey;'
    for t in TABLES
)


class Migration(migrations.Migration):
    dependencies = [
        ('projects', '0010_add_geocoding_columns_to_project'),
    ]

    operations = [
        migrations.RunSQL(sql=ADD, reverse_sql=DROP),
    ]
