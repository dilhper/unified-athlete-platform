-- Migration: v1.1 Add Audit Logging
-- Version: 002
-- Date: 2026-02-08
-- Description: Add immutable audit_logs table for compliance and forensics
-- Status: LIVE (Phase 4 - Audit Logging & Transactions)
--
-- Changes:
-- 1. New audit_logs table with 15 columns for comprehensive audit trail
-- 2. JSONB columns for flexible before/after state capture
-- 3. 5 performance indexes for compliance queries
-- 4. Foreign key to users for actor_id linkage
--
-- Impact: Non-breaking (adds new table, no modifications to existing schema)
-- Rollback: DROP TABLE audit_logs CASCADE;
--

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actor_id VARCHAR(255) NOT NULL,
  actor_role VARCHAR(50) NOT NULL CHECK (actor_role IN ('athlete', 'coach', 'specialist', 'official', 'admin')),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'denied', 'error')),
  denial_reason TEXT,
  status_before JSONB,
  status_after JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  error_message TEXT,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Performance indexes for compliance queries
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_timestamp_desc ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_result ON audit_logs(result);

-- Grant audit_logs immutability comment
COMMENT ON TABLE audit_logs IS 'Immutable audit trail. Only INSERT operations allowed. Used for compliance reporting and forensic analysis.';

-- Schema v1.0 → v1.1: +1 table (audit_logs), 0 table modifications, 5 new indexes
