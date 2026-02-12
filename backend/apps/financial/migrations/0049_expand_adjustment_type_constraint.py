"""
Migration 0049: Expand sales comp adjustment type check constraint.

Adds additional adjustment_type values needed by the SalesComp detail modal.
"""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('financial', '0048_add_sales_comp_contacts'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE landscape.tbl_sales_comp_adjustments
                    DROP CONSTRAINT IF EXISTS check_adjustment_type;

                ALTER TABLE landscape.tbl_sales_comp_adjustments
                    ADD CONSTRAINT check_adjustment_type CHECK (
                        adjustment_type IN (
                            'location',
                            'physical_age',
                            'physical_condition',
                            'physical_unit_mix',
                            'physical_size',
                            'physical_building_sf',
                            'physical_stories',
                            'physical_lot_size',
                            'market_conditions',
                            'financing',
                            'sale_conditions',
                            'property_rights',
                            'other'
                        )
                    );
            """,
            reverse_sql="""
                ALTER TABLE landscape.tbl_sales_comp_adjustments
                    DROP CONSTRAINT IF EXISTS check_adjustment_type;

                ALTER TABLE landscape.tbl_sales_comp_adjustments
                    ADD CONSTRAINT check_adjustment_type CHECK (
                        adjustment_type IN (
                            'location',
                            'physical_age',
                            'physical_condition',
                            'physical_unit_mix',
                            'market_conditions',
                            'financing',
                            'other'
                        )
                    );
            """,
        ),
    ]
