-- ============================================================
-- Migration 004: Make audit_logs.transaction_id nullable
-- Allows logging non-transaction actions like role changes
-- ============================================================

ALTER TABLE audit_logs
  ALTER COLUMN transaction_id DROP NOT NULL;
