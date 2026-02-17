# Database Migration Guide

**Phase 5: Migration Discipline - Schema Change Process and Versioning**

## Overview

This guide documents how to manage database schema migrations in the Unified Athlete Platform. Migrations are versioned SQL scripts that evolve the database schema in a controlled, auditable way.

**Key Principles:**
- **Sequential versioning**: Migrations execute in order (001, 002, 003...)
- **Immutable history**: All completed migrations are tracked and never re-run
- **Atomic transactions**: Each migration succeeds or fails completely
- **Audit trail**: Every migration is logged in `schema_migrations` table
- **One-way**: Currently no automatic rollback (manual rollback if needed)

---

## Migration Files Structure

```
db/
├── migrations/
│   ├── 001_v1.0_initial_schema.sql       ✅ Baseline schema
│   ├── 002_v1.1_add_audit_logs.sql       ✅ Audit logging
│   ├── 003_v1.2_feature_x.sql            ⏳ Future
│   └── README.md                          (This guide)
├── schema.sql                             (Human-readable schema reference)
├── seed.sql                               (Sample data)
└── patch_*.sql                            (Emergency patches - separate process)
```

---

## Migration Lifecycle

### 1. Creating a New Migration

**File naming convention:**
```
NNN_vX.Y_description.sql
```

Where:
- `NNN` = Sequential 3-digit version (001, 002, 003...)
- `vX.Y` = Semantic version (v1.0, v1.1, v1.2...)
- `description` = Brief change description (snake_case)

**Example:** `003_v1.2_add_user_preferences.sql`

### 2. Writing Migration SQL

**Template:**
```sql
-- Migration: [Title]
-- Version: NNN
-- Date: [YYYY-MM-DD]
-- Description: [What changed and why]
-- Status: [DRAFT|TESTING|LIVE|DEPRECATED]
--
-- Changes:
-- 1. [Change 1]
-- 2. [Change 2]
--
-- Impact: [Breaking|Non-breaking] ([affected tables])
-- Rollback: [Rollback SQL]
--

-- Your SQL here
CREATE TABLE new_table (...);
CREATE INDEX idx_new_table ON new_table(...);

-- Schema vX.Y → vX.Z: [Summary of changes]
```

**Guidelines:**
- Use `IF NOT EXISTS` / `IF EXISTS` for idempotency
- Add indexes for new columns used in queries
- Include foreign keys with `ON DELETE CASCADE` or `ON DELETE SET NULL`
- Comment on complex changes
- Add rollback SQL in the header as reference

### 3. Testing Migration

**Local Development:**
```bash
# 1. Run on development database
npm run migrate:dev

# 2. Verify schema was updated
psql -U uap_user -d uap_db -c "\d+ new_table"

# 3. Verify indexes exist
psql -U uap_user -d uap_db -c "\d new_table"

# 4. Run application tests
npm test
```

**Staging Environment:**
```bash
# 1. Deploy code to staging
git push origin feature/new-migration

# 2. Run migrations on staging DB
npm run migrate:staging

# 3. Run integration tests
npm run test:integration

# 4. Verify audit logs
SELECT * FROM schema_migrations WHERE status = 'completed' ORDER BY applied_at DESC;
```

### 4. Pre-Deployment Checklist

Before deploying migration to production:

- [ ] Migration file named correctly (NNN_vX.Y_description.sql)
- [ ] Tested on development database
- [ ] Tested on staging database
- [ ] All indexes added for new columns
- [ ] Foreign keys defined with proper ON DELETE behavior
- [ ] Rollback SQL documented in migration header
- [ ] Application code updated to use new schema
- [ ] No DOWN migrations needed (one-way only)
- [ ] Migration tested with concurrent loads (if applicable)
- [ ] Documentation updated in this guide

### 5. Deployment

**Manual Deployment:**
```bash
# 1. Backup production database (CRITICAL)
pg_dump -U uap_user -d uap_db -Fc > uap_db_backup_$(date +%Y%m%d_%H%M%S).dump

# 2. Deploy application code
git pull origin main
npm run build

# 3. Run pending migrations
npm run migrate:prod

# 4. Verify migration success
SELECT * FROM schema_migrations WHERE status = 'completed' ORDER BY applied_at DESC LIMIT 3;

# 5. Run smoke tests
npm run test:smoke
```

**Monitoring After Deployment:**
```bash
# Check migration status
SELECT version, name, applied_at, duration_ms FROM schema_migrations ORDER BY applied_at DESC LIMIT 1;

# Verify no failed migrations
SELECT * FROM schema_migrations WHERE status = 'failed';

# Monitor application error rates
curl http://localhost:3000/api/health
```

### 6. Rollback (Emergency Only)

**If migration causes issues:**

```sql
-- 1. Get last successful migration version
SELECT version FROM schema_migrations WHERE status = 'completed' ORDER BY applied_at DESC LIMIT 1;

-- 2. Manually execute rollback SQL from migration header
DROP TABLE new_table CASCADE;

-- 3. Mark migration as failed in tracking
UPDATE schema_migrations SET status = 'failed', error_message = '[reason]' WHERE version = '003';

-- 4. Deploy previous application version
git checkout v1.1
npm run build
```

**Coordinate with team:**
- Notify on-call engineer
- Document incident in Slack
- Plan fix for next migration
- Do NOT re-run same migration version

---

## Audit Tracking

All migrations are automatically tracked in `schema_migrations` table:

```sql
SELECT version, name, applied_at, duration_ms, status
FROM schema_migrations
ORDER BY applied_at DESC;

-- Example output:
-- version | name                      | applied_at           | duration_ms | status
-- --------|---------------------------|----------------------|-------------|----------
-- 002     | v1.1_add_audit_logs       | 2026-02-08 10:30:00 | 245         | completed
-- 001     | v1.0_initial_schema       | 2026-02-08 09:15:00 | 1200        | completed
```

**Compliance Reports:**
```sql
-- List all migrations in order
SELECT version, name, applied_at FROM schema_migrations WHERE status = 'completed' ORDER BY version;

-- Find slow migrations (>1 second)
SELECT version, name, duration_ms FROM schema_migrations WHERE duration_ms > 1000 ORDER BY duration_ms DESC;

-- Audit failed migrations
SELECT version, name, error_message FROM schema_migrations WHERE status = 'failed';
```

---

## Migration Library API

Located in `lib/migrations.ts`:

### `initializeMigrationTracking()`
Initialize the schema_migrations table (idempotent).

```typescript
await initializeMigrationTracking();
```

### `getCompletedMigrations(): Promise<Migration[]>`
Get all successfully applied migrations.

```typescript
const completed = await getCompletedMigrations();
// Returns: [{ version: '001', name: '...', timestamp, checksum }, ...]
```

### `getPendingMigrations(migrationsDir): Promise<MigrationStatus[]>`
Get all unapplied migrations in the migrations directory.

```typescript
const pending = await getPendingMigrations('./db/migrations');
// Returns: [{ version: '003', name: '...', status: 'pending' }, ...]
```

### `getMigrationStatus(migrationsDir): Promise<MigrationStatus>`
Get complete migration status summary.

```typescript
const status = await getMigrationStatus('./db/migrations');
// Returns: { currentVersion: '002', totalCompleted: 2, totalPending: 1, migrations: [...] }
```

### `runPendingMigrations(migrationsDir): Promise<Result>`
Run all pending migrations in order.

```typescript
const result = await runPendingMigrations('./db/migrations');
// Returns: { successful: 1, failed: 0, errors: [] }
```

---

## Examples

### Example 1: Adding a New Column

**File:** `003_v1.2_add_user_preferences.sql`

```sql
-- Migration: Add user preferences
-- Version: 003
-- Date: 2026-03-15
-- Description: Add notification preferences and theme selection to users table
--
-- Changes:
-- 1. Add preferences column to users table
-- 2. Add theme preference column
-- 3. Add index for queries
--
-- Impact: Non-breaking (new columns with defaults)
-- Rollback: ALTER TABLE users DROP COLUMN notification_preferences, DROP COLUMN theme_preference;
--

ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "push": true}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(20) DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark', 'auto'));

CREATE INDEX IF NOT EXISTS idx_users_theme ON users(theme_preference);

-- Schema v1.1 → v1.2: +2 columns to users, 1 new index
```

### Example 2: Creating a New Table with Relationships

**File:** `004_v1.3_add_user_goals.sql`

```sql
-- Migration: Add user goals tracking
-- Version: 004
-- Date: 2026-04-01
-- Description: New goals table for athletes to track training objectives
--
-- Changes:
-- 1. Create goals table with athlete relationship
-- 2. Add status tracking
-- 3. Add performance indexes
--
-- Impact: Non-breaking (new table)
-- Rollback: DROP TABLE goals CASCADE;
--

CREATE TABLE IF NOT EXISTS goals (
  id VARCHAR(255) PRIMARY KEY,
  athlete_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  goal_type VARCHAR(50) CHECK (goal_type IN ('personal', 'team', 'competition')),
  target_date DATE,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  progress_percentage INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (athlete_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_goals_athlete ON goals(athlete_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_target_date ON goals(target_date);

-- Schema v1.2 → v1.3: +1 table (goals), 3 indexes
```

---

## Deployment Coordination

### Multi-Service Deployments

If this database is shared by multiple services:

1. **Coordinate timing** with all teams
2. **Deploy API first** with new schema support code
3. **Run migrations** during maintenance window
4. **Verify schema** with `\d+ table_name` queries
5. **Deploy other services** that depend on schema changes
6. **Monitor** for 24 hours post-deployment

### Deployment Window

- **Best time**: Off-peak hours (2 AM - 4 AM UTC)
- **Duration**: Typically 5-15 minutes per migration
- **Downtime**: None (database stays available during migration)
- **Rollback time**: 10-20 minutes if needed

---

## Troubleshooting

### Migration Fails to Run

```sql
-- Check schema_migrations table for errors
SELECT * FROM schema_migrations WHERE status = 'failed';

-- Check error messages
SELECT version, error_message FROM schema_migrations WHERE status = 'failed';
```

### Migration Runs Twice

```sql
-- Migrations are idempotent (using IF NOT EXISTS)
-- If you need to reset, manually remove from tracking:
DELETE FROM schema_migrations WHERE version = '003';
-- Then re-run migrations
```

### Rollback Needed

```sql
-- 1. Manually execute rollback SQL
DROP TABLE goals CASCADE;

-- 2. Mark as failed in tracking
UPDATE schema_migrations SET status = 'failed', error_message = 'Rolled back' WHERE version = '004';

-- 3. Deploy previous code version
```

---

## Future Enhancements

Planned improvements for migration system:

- [ ] Automatic down migrations (reverting schema to previous version)
- [ ] Migration validation (dry-run before actual execution)
- [ ] Time-based rollout (staged deployment with verification)
- [ ] Concurrent migration detection (prevent two simultaneous migrations)
- [ ] Performance regression testing (compare query performance before/after)

---

## References

- [PostgreSQL ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/sql-createindex.html)
- [Foreign Keys](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [JSONB Data Type](https://www.postgresql.org/docs/current/datatype-json.html)

---

**Last Updated:** 2026-02-08  
**Version:** 1.0  
**Status:** LIVE  
**Next Phase:** Phase 6 - Security Hardening
