-- BM1 / BM2 (2026-09-29): confirmed Landscaper proposals now replay the tool
-- that made them; proposals no longer expire (Gregg, option 1c).
-- Backward compatible: older code always supplies expires_at and ignores the
-- new columns.
ALTER TABLE landscape.pending_mutations
    ADD COLUMN IF NOT EXISTS replay_tool_name  TEXT,
    ADD COLUMN IF NOT EXISTS replay_tool_input JSONB;

ALTER TABLE landscape.pending_mutations
    ALTER COLUMN expires_at DROP NOT NULL,
    ALTER COLUMN expires_at DROP DEFAULT;

COMMENT ON COLUMN landscape.pending_mutations.replay_tool_name IS
    'Tool that created this proposal; re-run with propose_only=False on confirm. NULL = not replayable.';
COMMENT ON COLUMN landscape.pending_mutations.expires_at IS
    'NULL = never expires (default since 2026-09-29).';
