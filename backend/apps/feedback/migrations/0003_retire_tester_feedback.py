"""
LSCMD-FBUNIFY-0613-qz — retire TesterFeedback from Django's model state.

The tester_feedback table was renamed to tester_feedback_deprecated by the raw
SQL migration migrations/20260613_feedback_unify.up.sql. Django still carried the
TesterFeedback model in its migration state; this migration removes it from
state ONLY (no database operation) so:

  - `makemigrations --check` stays clean now that models.py dropped the model, and
  - Railway's deploy `migrate` does NOT emit a DROP TABLE against the (now
    renamed / absent) tester_feedback table.
"""

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('feedback', '0002_extend_feedback_add_changelog'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.DeleteModel(name='TesterFeedback'),
            ],
            database_operations=[],
        ),
    ]
