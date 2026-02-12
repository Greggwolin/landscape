"""
Migration 0048: Add sales comparable contacts table.

Creates landscape.tbl_sales_comp_contacts for structured broker/buyer/seller contacts.
"""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('financial', '0047_sales_comps_property_rights_and_constraint'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE TABLE IF NOT EXISTS landscape.tbl_sales_comp_contacts (
                    contact_id SERIAL PRIMARY KEY,
                    comparable_id INTEGER NOT NULL,
                    role VARCHAR(50) NOT NULL,
                    name VARCHAR(255),
                    company VARCHAR(255),
                    phone VARCHAR(50),
                    email VARCHAR(255),
                    is_verification_source BOOLEAN NOT NULL DEFAULT FALSE,
                    verification_date DATE,
                    sort_order INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    CONSTRAINT fk_sales_comp_contacts_comparable
                        FOREIGN KEY (comparable_id)
                        REFERENCES landscape.tbl_sales_comparables (comparable_id)
                        ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_comp_contacts_comparable
                    ON landscape.tbl_sales_comp_contacts (comparable_id);
            """,
            reverse_sql="""
                DROP TABLE IF EXISTS landscape.tbl_sales_comp_contacts;
            """,
        ),
    ]
