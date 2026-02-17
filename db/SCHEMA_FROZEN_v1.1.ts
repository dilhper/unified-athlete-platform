/**
 * Database Schema Version Control
 * 
 * FROZEN MARKER: v1.2 (Feb 17, 2026)
 * Status: Production-grade with auth tokens
 * Last Updated: February 17, 2026
 * 
 * SCHEMA VERSIONING REQUIREMENTS:
 * All changes to db/schema.sql MUST follow this process:
 * 1. Increment version (v1.1 → v1.2)
 * 2. Update this file with new version
 * 3. Document change in MODIFICATION section below
 * 4. Create timestamped migration script in db/migrations/
 * 5. Test with seed.sql
 * 6. Coordinate deployment across API routes
 * 
 * Current Schema (v1.2):
 * - 17 production tables
 * - 1 audit logging table
 * - 1 auth tokens table (NEW - v1.2)
 * - Full RBAC support
 * - Immutable audit trail
 * - All constraints and relationships defined
 */

export const SCHEMA_VERSION = "1.2";

export const SCHEMA_INFO = {
  version: "1.2",
  frozenDate: "2026-02-17",
  status: "PRODUCTION_READY_WITH_AUTH_TOKENS",
  architecture: "SQL-only (no ORM)",
  tables: 18,
  indices: 27,
};

export const MODIFICATIONS = {
  "1.0": {
    date: "2026-02-08",
    description: "Initial frozen schema - 15 tables, all constraints, SQL-only",
    tables: [
      "users",
      "achievements",
      "certifications",
      "communities",
      "consultations",
      "daily_training_forms",
      "messages",
      "medical_referrals",
      "notifications",
      "opportunities",
      "physiotherapy_appointments",
      "physiotherapy_slots",
      "sport_registrations",
      "training_plan_pause_requests",
      "training_plans",
      "training_sessions",
    ],
  },
  "1.1": {
    date: "2026-02-08",
    description: "Phase 4: Added audit_logs table for compliance and forensics",
    newTables: ["audit_logs"],
    rationale:
      "Support immutable audit trail for all permission checks and state mutations",
    impact:
      "All write operations (POST/PUT/DELETE) will log to audit_logs for compliance",
    impactedPhase: "Phase 4.4+ (all routes updated with audit logging)",
  },
  "1.2": {
    date: "2026-02-17",
    description: "Added email verification + password reset token storage",
    newTables: ["auth_tokens"],
    newColumns: ["users.email_verified"],
    rationale:
      "Enable industry-standard email verification and password reset flows",
    impact:
      "Registration now creates verification tokens; password resets use hashed tokens",
    impactedPhase: "Phase 6.1+ (Auth hardening)",
  },
};

export const NEXT_PHASES = {
  "Phase 5": "Migration Discipline - Schema change process and versioning",
  "Phase 6":
    "Security Hardening - Rate limiting, session timeout, data encryption",
  "Phase 7": "Performance & Compliance - Caching, monitoring, legal defensibility",
};

/**
 * FROZEN: No modifications allowed without version bump and documentation.
 * Contact system architect before making any schema changes.
 */
