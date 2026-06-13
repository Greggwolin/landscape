"""
FB-317 — add geocoding columns to landscape.tbl_project.

tbl_project is an unmanaged model (Meta.managed = False), so a plain AddField
migration would emit no DDL. We use SeparateDatabaseAndState: RunSQL performs
the actual ALTER (idempotent via IF NOT EXISTS so it's safe alongside the
backfill/tool that already reference these columns), while state_operations
keep Django's model state in sync with the five new model fields.

Railway applies this on deploy via its release command (`manage.py migrate`),
which runs before gunicorn serves the new code — so the columns exist before
the updated model reads them.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0009_not_null_created_by'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        ALTER TABLE landscape.tbl_project
                            ADD COLUMN IF NOT EXISTS latitude double precision,
                            ADD COLUMN IF NOT EXISTS longitude double precision,
                            ADD COLUMN IF NOT EXISTS geocoding_confidence double precision,
                            ADD COLUMN IF NOT EXISTS geocoded_at timestamptz,
                            ADD COLUMN IF NOT EXISTS geocoded_by_service varchar(32);
                    """,
                    reverse_sql="""
                        ALTER TABLE landscape.tbl_project
                            DROP COLUMN IF EXISTS latitude,
                            DROP COLUMN IF EXISTS longitude,
                            DROP COLUMN IF EXISTS geocoding_confidence,
                            DROP COLUMN IF EXISTS geocoded_at,
                            DROP COLUMN IF EXISTS geocoded_by_service;
                    """,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name='project', name='latitude',
                    field=models.FloatField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='project', name='longitude',
                    field=models.FloatField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='project', name='geocoding_confidence',
                    field=models.FloatField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='project', name='geocoded_at',
                    field=models.DateTimeField(blank=True, null=True),
                ),
                migrations.AddField(
                    model_name='project', name='geocoded_by_service',
                    field=models.CharField(blank=True, max_length=32, null=True),
                ),
            ],
        ),
    ]
