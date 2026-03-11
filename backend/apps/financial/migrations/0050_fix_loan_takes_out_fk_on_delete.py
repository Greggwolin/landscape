"""
Migration 0050: Fix tbl_loan takes_out_loan_id FK to use ON DELETE SET NULL.

The FK was created without an ON DELETE rule (defaulting to NO ACTION),
which blocks deletion of any loan that is referenced by another loan's
takes_out_loan_id. The Django model specifies on_delete=models.SET_NULL,
so this migration brings the DB constraint into alignment.
"""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('financial', '0049_expand_adjustment_type_constraint'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE landscape.tbl_loan
                    DROP CONSTRAINT IF EXISTS tbl_loan_takes_out_loan_id_fkey;

                ALTER TABLE landscape.tbl_loan
                    ADD CONSTRAINT tbl_loan_takes_out_loan_id_fkey
                    FOREIGN KEY (takes_out_loan_id)
                    REFERENCES landscape.tbl_loan(loan_id)
                    ON DELETE SET NULL;
            """,
            reverse_sql="""
                ALTER TABLE landscape.tbl_loan
                    DROP CONSTRAINT IF EXISTS tbl_loan_takes_out_loan_id_fkey;

                ALTER TABLE landscape.tbl_loan
                    ADD CONSTRAINT tbl_loan_takes_out_loan_id_fkey
                    FOREIGN KEY (takes_out_loan_id)
                    REFERENCES landscape.tbl_loan(loan_id);
            """,
        ),
    ]
