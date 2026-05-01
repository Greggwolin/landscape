-- Rollback for 20260501_user_scenario_vocab.up.sql
-- The migration runner skips this file in normal apply (only *.up.sql runs).
-- Manual invocation only.

SET search_path TO landscape, public;

DROP INDEX IF EXISTS landscape.idx_user_scenario_vocab_recency;
DROP INDEX IF EXISTS landscape.idx_user_scenario_vocab_lookup;
DROP TABLE IF EXISTS landscape.tbl_user_scenario_vocab;
