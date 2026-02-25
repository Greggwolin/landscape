"""
Migration: Create tbl_analysis_draft table.

Staging area for conversational project creation. Holds deal inputs
before user commits to a full project via Landscaper.
"""

from django.db import migrations


FORWARD_SQL = """
-- Guard: skip if table already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'landscape'
          AND table_name = 'tbl_analysis_draft'
    ) THEN

        CREATE TABLE landscape.tbl_analysis_draft (
            draft_id        BIGSERIAL PRIMARY KEY,
            user_id         BIGINT NOT NULL,
            draft_name      VARCHAR(200),

            -- Inferred taxonomy (may be null until Landscaper determines them)
            property_type   VARCHAR(50),
            perspective     VARCHAR(50),
            purpose         VARCHAR(50),
            value_add_enabled BOOLEAN DEFAULT FALSE,

            -- Core data
            inputs          JSONB NOT NULL DEFAULT '{}'::jsonb,
            calc_snapshot   JSONB DEFAULT '{}'::jsonb,

            -- Location (extracted from user input)
            address         TEXT,
            city            VARCHAR(100),
            state           VARCHAR(50),
            zip_code        VARCHAR(20),
            latitude        NUMERIC(10, 7),
            longitude       NUMERIC(10, 7),

            -- Linkage
            chat_thread_id  BIGINT,
            converted_project_id BIGINT,

            -- Lifecycle
            status          VARCHAR(20) NOT NULL DEFAULT 'active',

            -- Audit
            created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

            -- Constraints
            CONSTRAINT chk_draft_status CHECK (status IN ('active', 'converted', 'archived')),
            CONSTRAINT chk_draft_perspective CHECK (perspective IS NULL OR perspective IN ('INVESTMENT', 'DEVELOPMENT')),
            CONSTRAINT chk_draft_purpose CHECK (purpose IS NULL OR purpose IN ('VALUATION', 'UNDERWRITING')),
            CONSTRAINT chk_draft_property_type CHECK (property_type IS NULL OR property_type IN ('MF', 'LAND', 'OFF', 'RET', 'IND', 'HTL', 'MXU'))
        );

        -- Indexes
        CREATE INDEX idx_draft_user_status ON landscape.tbl_analysis_draft (user_id, status);
        CREATE INDEX idx_draft_updated ON landscape.tbl_analysis_draft (updated_at DESC);
        CREATE INDEX idx_draft_inputs ON landscape.tbl_analysis_draft USING gin (inputs);

        -- Trigger for updated_at (uses existing function)
        CREATE TRIGGER trg_draft_updated_at
            BEFORE UPDATE ON landscape.tbl_analysis_draft
            FOR EACH ROW
            EXECUTE FUNCTION landscape.update_updated_at_column();

        -- Comments
        COMMENT ON TABLE landscape.tbl_analysis_draft IS 'Staging area for conversational project creation. Holds deal inputs before user commits to a full project.';
        COMMENT ON COLUMN landscape.tbl_analysis_draft.inputs IS 'JSONB blob of all parsed assumptions: revenue, expenses, debt, equity, growth rates, etc.';
        COMMENT ON COLUMN landscape.tbl_analysis_draft.calc_snapshot IS 'Latest calculation results (NOI, value, returns) for display during conversation.';

    END IF;
END $$;
"""

REVERSE_SQL = """
DROP TABLE IF EXISTS landscape.tbl_analysis_draft CASCADE;
"""


class Migration(migrations.Migration):

    dependencies = [
        ('projects', '0006_intelligence_tables'),
    ]

    operations = [
        migrations.RunSQL(
            sql=FORWARD_SQL,
            reverse_sql=REVERSE_SQL,
        ),
    ]
