-- Migration 027: Acquisition event deposit/conditional fields
-- Created: 2025-11-21
-- Purpose: Add deposit-specific and conditional flags to landscape.tbl_acquisition for the unified acquisition ledger

BEGIN;

-- Add deposit-specific fields
ALTER TABLE landscape.tbl_acquisition
  ADD COLUMN IF NOT EXISTS is_deposit_refundable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_goes_hard_date date NULL;

-- Add conditional flag for non-deposit events
ALTER TABLE landscape.tbl_acquisition
  ADD COLUMN IF NOT EXISTS is_conditional boolean NOT NULL DEFAULT false;

COMMIT;
