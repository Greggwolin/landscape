from django.db import migrations


class Migration(migrations.Migration):
    """
    Create doc_processing_queue table used by the knowledge document processor.
    Keeping this as raw SQL to align with the existing queue_ helpers that
    reference the table directly.
    """

    dependencies = [
        ("knowledge", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(
            """
            CREATE TABLE IF NOT EXISTS landscape.doc_processing_queue (
                queue_id BIGSERIAL PRIMARY KEY,
                doc_id BIGINT NOT NULL UNIQUE,
                project_id BIGINT,
                priority INTEGER NOT NULL DEFAULT 0,
                status VARCHAR(50) NOT NULL DEFAULT 'queued',
                attempts INTEGER NOT NULL DEFAULT 0,
                max_attempts INTEGER NOT NULL DEFAULT 3,
                error_message TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                started_at TIMESTAMPTZ,
                completed_at TIMESTAMPTZ
            );

            CREATE INDEX IF NOT EXISTS doc_processing_queue_status_idx
                ON landscape.doc_processing_queue (status);

            CREATE INDEX IF NOT EXISTS doc_processing_queue_priority_idx
                ON landscape.doc_processing_queue (priority DESC, created_at ASC);
            """,
            reverse_sql="""
            DROP TABLE IF EXISTS landscape.doc_processing_queue;
            """,
        ),
    ]
