-- Rollback for 20260929_pending_mutations_replay_no_expiry.up.sql
UPDATE landscape.pending_mutations
   SET expires_at = created_at + INTERVAL '1 hour'
 WHERE expires_at IS NULL;

ALTER TABLE landscape.pending_mutations
    ALTER COLUMN expires_at SET DEFAULT (now() + '01:00:00'::interval),
    ALTER COLUMN expires_at SET NOT NULL;

ALTER TABLE landscape.pending_mutations
    DROP COLUMN IF EXISTS replay_tool_input,
    DROP COLUMN IF EXISTS replay_tool_name;
