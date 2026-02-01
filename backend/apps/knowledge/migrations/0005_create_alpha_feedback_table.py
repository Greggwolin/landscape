from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("knowledge", "0004_add_page_count_to_platform_knowledge"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE TABLE IF NOT EXISTS landscape.tbl_alpha_feedback (
                    id SERIAL PRIMARY KEY,
                    page_context VARCHAR(100),
                    project_id INTEGER,
                    user_id INTEGER,
                    feedback TEXT NOT NULL,
                    status VARCHAR(50) DEFAULT 'new',
                    notes TEXT,
                    submitted_at TIMESTAMP DEFAULT NOW(),
                    created_at TIMESTAMP DEFAULT NOW()
                );

                CREATE INDEX IF NOT EXISTS idx_alpha_feedback_page ON landscape.tbl_alpha_feedback(page_context);
                CREATE INDEX IF NOT EXISTS idx_alpha_feedback_status ON landscape.tbl_alpha_feedback(status);
                CREATE INDEX IF NOT EXISTS idx_alpha_feedback_submitted ON landscape.tbl_alpha_feedback(submitted_at);

                COMMENT ON TABLE landscape.tbl_alpha_feedback IS 'Alpha tester feedback submissions';
            """,
            reverse_sql="DROP TABLE IF EXISTS landscape.tbl_alpha_feedback CASCADE;"
        ),
    ]
