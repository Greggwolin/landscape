"""
Data migration to set global default benchmarks for sale calculations.

This migration creates initial global benchmarks for transaction costs and growth rates
that will be used as default values when creating new projects.
"""

from django.db import migrations


def create_global_benchmarks(apps, schema_editor):
    """Create global default benchmarks."""
    db_alias = schema_editor.connection.alias

    # Use raw SQL since the models are unmanaged
    with schema_editor.connection.cursor() as cursor:
        # Insert growth rate benchmarks if they don't exist
        cursor.execute("""
            INSERT INTO landscape.tbl_sale_benchmarks
            (scope_level, benchmark_type, benchmark_name, rate_pct, description, is_active, created_at, updated_at)
            VALUES
            ('global', 'custom', 'Cost Inflation', 0.0300, 'Global default cost inflation rate', true, NOW(), NOW())
            ON CONFLICT DO NOTHING;
        """)

        cursor.execute("""
            INSERT INTO landscape.tbl_sale_benchmarks
            (scope_level, benchmark_type, benchmark_name, rate_pct, description, is_active, created_at, updated_at)
            VALUES
            ('global', 'custom', 'General Inflation', 0.0250, 'Global default general inflation rate', true, NOW(), NOW())
            ON CONFLICT DO NOTHING;
        """)

        # Insert transaction cost benchmarks
        cursor.execute("""
            INSERT INTO landscape.tbl_sale_benchmarks
            (scope_level, benchmark_type, benchmark_name, rate_pct, description, is_active, created_at, updated_at)
            VALUES
            ('global', 'legal', 'Legal Fees', 0.0050, 'Global default legal fees (0.5% of sale price)', true, NOW(), NOW())
            ON CONFLICT DO NOTHING;
        """)

        cursor.execute("""
            INSERT INTO landscape.tbl_sale_benchmarks
            (scope_level, benchmark_type, benchmark_name, rate_pct, description, is_active, created_at, updated_at)
            VALUES
            ('global', 'commission', 'Sales Commission', 0.0300, 'Global default sales commission (3% of sale price)', true, NOW(), NOW())
            ON CONFLICT DO NOTHING;
        """)

        cursor.execute("""
            INSERT INTO landscape.tbl_sale_benchmarks
            (scope_level, benchmark_type, benchmark_name, rate_pct, description, is_active, created_at, updated_at)
            VALUES
            ('global', 'closing', 'Closing Costs', 0.0100, 'Global default closing costs (1% of sale price)', true, NOW(), NOW())
            ON CONFLICT DO NOTHING;
        """)

        cursor.execute("""
            INSERT INTO landscape.tbl_sale_benchmarks
            (scope_level, benchmark_type, benchmark_name, rate_pct, description, is_active, created_at, updated_at)
            VALUES
            ('global', 'title_insurance', 'Title Insurance', 0.0075, 'Global default title insurance (0.75% of sale price)', true, NOW(), NOW())
            ON CONFLICT DO NOTHING;
        """)


def reverse_global_benchmarks(apps, schema_editor):
    """Remove global default benchmarks."""
    with schema_editor.connection.cursor() as cursor:
        cursor.execute("""
            DELETE FROM landscape.tbl_sale_benchmarks
            WHERE scope_level = 'global'
            AND benchmark_name IN (
                'Cost Inflation', 'General Inflation', 'Legal Fees',
                'Sales Commission', 'Closing Costs', 'Title Insurance'
            );
        """)


class Migration(migrations.Migration):
    dependencies = [
        ('sales_absorption', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_global_benchmarks, reverse_global_benchmarks),
    ]
