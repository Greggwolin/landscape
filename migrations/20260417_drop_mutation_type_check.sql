-- Drop pending_mutations.mutation_type CHECK constraint entirely.
--
-- The CHECK acted as a DB-level enum for mutation types, but new types
-- (create_project, and inevitably others) require a migration every time.
-- Application-level validation in MutationService._execute_mutation already
-- raises on unknown types via the else branch — the CHECK is redundant
-- and a maintenance trap.
--
-- Discovered during S6 calibration: create_project routed through
-- MutationService.create_proposal but the CHECK rejected the INSERT.

-- UP
BEGIN;

ALTER TABLE landscape.pending_mutations
  DROP CONSTRAINT IF EXISTS pending_mutations_mutation_type_check;

COMMIT;

-- DOWN (rollback — re-creates the original CHECK with all known types at time of drop)
-- BEGIN;
-- ALTER TABLE landscape.pending_mutations
--   ADD CONSTRAINT pending_mutations_mutation_type_check
--   CHECK (mutation_type IN (
--     'field_update', 'bulk_update', 'opex_upsert', 'rental_comp_upsert',
--     'assumption_upsert', 'rent_roll_batch', 'comparable_upsert',
--     'comparable_delete', 'capital_stack_upsert', 'capital_stack_delete',
--     'budget_upsert', 'budget_delete', 'unit_delete', 'override_toggle',
--     'revert', 'create_project'
--   ));
-- COMMIT;
