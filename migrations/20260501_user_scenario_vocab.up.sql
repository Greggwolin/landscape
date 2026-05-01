-- ============================================================================
-- Migration: 20260501_user_scenario_vocab.up.sql
-- Purpose:   Per-user vocabulary mapping for the chat-driven compositional UI.
--            Lets Landscaper learn how each user phrases canonical concepts
--            (e.g., "T12" / "last year's expenses" / "Year 1 proforma" → an
--            operating-statement scenario discriminator).
--
--            First domain: operating_statement_scenario. Pattern is universal —
--            future domains (cap_rate, growth_rate, hold_period, etc.) reuse
--            this same table.
--
-- Refs:      Landscape app/SPEC-OS-DiscriminatorAware-DA-2026-05-01.md §2.5
--            Memory: project_user_vocab_learning.md
--            Memory: feedback_surface_assumption_choices.md
--            Schema precedent: landscape.opex_label_mapping
--
-- Idempotent:
--   - Table / index use IF NOT EXISTS.
--   - UNIQUE constraint named explicitly so re-runs are safe.
-- ============================================================================

SET search_path TO landscape, public;

-- ────────────────────────────────────────────────────────────────────────────
-- tbl_user_scenario_vocab
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS landscape.tbl_user_scenario_vocab (
    vocab_id            BIGSERIAL    PRIMARY KEY,
    user_id             INTEGER      NOT NULL,
    resolution_domain   VARCHAR(64)  NOT NULL,
    source_phrase       TEXT         NOT NULL,
    normalized_phrase   TEXT         NOT NULL,
    resolved_value      TEXT         NOT NULL,
    times_used          INTEGER      NOT NULL DEFAULT 1,
    last_confirmed_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    context_note        TEXT         NULL,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_scenario_vocab UNIQUE (user_id, resolution_domain, normalized_phrase)
);

COMMENT ON TABLE landscape.tbl_user_scenario_vocab IS
  'Per-user phrasing → canonical-value mappings. First domain is operating_statement_scenario; pattern is universal across domains (cap rate, growth rate, hold period, etc.).';
COMMENT ON COLUMN landscape.tbl_user_scenario_vocab.resolution_domain IS
  'Namespace for the mapping. Examples: operating_statement_scenario, cap_rate, growth_rate, hold_period, exit_assumption.';
COMMENT ON COLUMN landscape.tbl_user_scenario_vocab.normalized_phrase IS
  'Lowercased, alphanumeric+space, deduplicated form of source_phrase. Used for lookup; matches the _normalize_label pattern in opex_utils.py.';
COMMENT ON COLUMN landscape.tbl_user_scenario_vocab.resolved_value IS
  'Canonical value the phrase maps to. For operating_statement_scenario this is a statement_discriminator string (T-12, T12, T3_ANNUALIZED, CURRENT_PRO_FORMA, BROKER_PRO_FORMA, or year string).';
COMMENT ON COLUMN landscape.tbl_user_scenario_vocab.context_note IS
  'Optional free-text note captured at confirmation time. Useful for "user picked this when project had no true T-12 on file" so soft re-confirms can be more grounded.';

CREATE INDEX IF NOT EXISTS idx_user_scenario_vocab_lookup
  ON landscape.tbl_user_scenario_vocab (user_id, resolution_domain, normalized_phrase);

CREATE INDEX IF NOT EXISTS idx_user_scenario_vocab_recency
  ON landscape.tbl_user_scenario_vocab (user_id, last_confirmed_at DESC);
