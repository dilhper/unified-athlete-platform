# Deployment Coordination Guide

**Phase 5: Multi-Service Deployment Strategy**

## Overview

This guide ensures safe, coordinated deployments when schema changes affect multiple services, APIs, or teams.

---

## Deployment Checklist

### Pre-Deployment (24 hours before)

- [ ] **Code Review**: All PRs with schema changes approved
- [ ] **Migration Tested**: Verified on staging database
- [ ] **Compatibility Check**: Confirm old/new code both work with new schema
- [ ] **Team Notification**: Notify all teams of deployment window
- [ ] **Backup**: Production database backup created (if major change)
- [ ] **Rollback Plan**: Document rollback SQL and timeline
- [ ] **Monitoring**: Set up alerts for post-deployment errors

### Deployment Window (Off-Peak Hours)

**Timeline: T-30 min to T+60 min**

#### T-30: Pre-Flight Checks
```bash
# 1. Confirm all systems healthy
curl https://api.platform.com/health

# 2. Verify migration is ready
SELECT COUNT(*) as pending_migrations FROM migration_registry 
WHERE status = 'pending' AND applied = false;

# 3. Confirm backup created
ls -lh /backups/uap_db_backup_*.dump | tail -1
```

#### T-15: Notify Teams
```
📢 DEPLOYMENT STARTING IN 15 MINUTES
- Schema migration: v1.1 → v1.2
- Expected duration: 10 minutes
- No downtime expected
- Rollback ready: [version v1.1]
```

#### T-5: Application Code Deployment
```bash
# 1. Pull latest code from main branch
git pull origin main

# 2. Build application
npm run build

# 3. Deploy to production (blue-green or rolling)
npm run deploy:prod
```

#### T-0: Run Migrations
```bash
# 1. Initialize migration tracking (if first time)
npm run migrate:init

# 2. Run all pending migrations
npm run migrate:prod

# 3. Verify success
psql -U uap_user -d uap_db -c "SELECT version, status FROM schema_migrations ORDER BY version DESC LIMIT 3;"
```

#### T+10: Post-Deployment Verification
```bash
# 1. Health checks
curl https://api.platform.com/health

# 2. Schema verification
psql -U uap_user -d uap_db -c "\d new_table"

# 3. Application tests
npm run test:smoke

# 4. Check error rates
curl https://monitoring.platform.com/api/errors?last=5m
```

#### T+30: Stability Confirmation
```
✅ DEPLOYMENT COMPLETE
- All migrations applied successfully
- No errors in application logs
- Health checks passing
- Error rate: normal
```

---

## Service Coordination Matrix

### Scenario 1: Single Service Deployment (Simple)

**When:** Schema changes only affect one API service

**Process:**
1. Deploy code to service (includes schema compatibility)
2. Run migrations
3. Verify health checks
4. Done

**Timeline:** 15 minutes

### Scenario 2: Multi-Service Deployment (Complex)

**When:** Schema changes used by multiple services/APIs

**Order of Deployment:**
1. **Core Database Layer** - Deploy migrations first
2. **API Services** - Deploy in dependency order
3. **Frontend** - Deploy if UI changes needed
4. **Workers** - Deploy if background jobs affected

**Timeline:** 45 minutes

**Example:**
```
T+0    Deploy API v1.2 (with schema compatibility)
T+5    Run schema migrations (v1.1 → v1.2)
T+10   Deploy Worker v1.2 (consumes new schema)
T+15   Deploy Frontend v1.2 (shows new UI)
T+20   Verify all services healthy
T+25   Monitor error rates
```

### Scenario 3: Breaking Changes (Risky)

**When:** New schema incompatible with old code

**Process:**
1. Deploy new code first (not active yet)
2. Run migrations
3. Activate new code version
4. Monitor for errors

**Timeline:** 30 minutes

**Requires:** Feature flags to activate new code path after migration

---

## Communication Templates

### Pre-Deployment Announcement

```
Subject: Database Schema Deployment - [Date] [Time] UTC

Team,

We have a planned schema migration on [date] from [time] to [time+15m] UTC.

**What's Changing:**
- Adding [table/columns]
- [Impact on APIs/services]

**Timeline:**
- T-30: Backup verification
- T-0: Application deployment
- T+5: Schema migration
- T+20: Full verification

**What to Do:**
- NO ACTION REQUIRED for most teams
- [Service Team] - verify integration with new schema
- Questions? Slack #devops-alerts

**Rollback Plan:**
If issues occur, we can rollback to v1.1 in ~15 minutes.
```

### Post-Deployment Report

```
Subject: ✅ Deployment Complete - Schema v1.1 → v1.2

Deployment Results:
✅ Code deployed to all services
✅ Schema migration completed (5.2 seconds)
✅ All health checks passing
✅ Error rates normal
✅ No customer impact

Migration Details:
- Version: v1.2
- Changes: Added audit_logs table
- Rollback: Available until [date/time]

Questions? Reply or ping @devops
```

---

## Rollback Procedures

### Quick Rollback (< 15 minutes)

```bash
# 1. Revert application to previous version
git checkout v1.1
npm run build
npm run deploy:prod

# 2. Keep schema as-is (new tables are backward compatible)
# OR manually rollback specific tables

# 3. Verify service health
curl https://api.platform.com/health
```

### Full Rollback with Schema Reset (> 30 minutes)

```bash
# 1. Restore from backup
pg_restore -U uap_user -d uap_db /backups/uap_db_backup_20260208_100000.dump

# 2. Redeploy previous application version
git checkout v1.1
npm run build
npm run deploy:prod

# 3. Verify
curl https://api.platform.com/health
```

### Emergency Contacts

- **Database:** @db-oncall
- **Platform Engineering:** @platform-team
- **Incident Commander:** @incident-commander
- **Escalation:** @tech-lead

---

## Monitoring During Deployment

### Key Metrics to Watch

1. **Application Error Rate**
   - Alert if: > 1% error rate for 2 minutes
   - Target: < 0.1%

2. **Database Connection Pool**
   - Alert if: > 80% capacity
   - Target: 30-50% utilization

3. **Query Performance**
   - Alert if: 95th percentile latency > 500ms
   - Target: < 100ms p95

4. **Schema Migration Duration**
   - Alert if: > 30 seconds per migration
   - Target: < 10 seconds

### Monitoring Dashboards

```bash
# Real-time error tracking
tail -f /var/log/app/prod.log | grep ERROR

# Database performance
psql -U uap_user -d uap_db -c "
  SELECT query, mean_exec_time FROM pg_stat_statements 
  WHERE query LIKE '%audit_logs%' ORDER BY mean_exec_time DESC;"

# Connection pool status
psql -U uap_user -d uap_db -c "
  SELECT count(*) as active, max_conn FROM pg_stat_activity, 
  (SELECT setting::int as max_conn FROM pg_settings WHERE name = 'max_connections') s;"
```

---

## Risk Mitigation

### High-Risk Changes

**Criteria:**
- Modifying existing columns
- Deleting tables
- Changing primary keys
- Renaming critical tables

**Mitigations:**
1. Create new column, migrate data, then deprecate old
2. Test extensively on staging
3. Deploy during business hours with full team present
4. Have rollback ready in < 5 minutes
5. Monitor for 24 hours post-deployment

### Low-Risk Changes

**Criteria:**
- Adding new columns with defaults
- Adding new tables
- Adding indexes
- Updating comments

**Mitigations:**
1. Standard deployment process
2. Off-peak hour deployment acceptable
3. Rollback not required (backward compatible)
4. Monitor for 1 hour post-deployment

---

## Team Responsibilities

### Database Team
- [ ] Create and test migration
- [ ] Verify backup exists
- [ ] Run migrations in production
- [ ] Monitor for errors
- [ ] Document changes

### Backend Team
- [ ] Update API code for new schema
- [ ] Test integration with new schema
- [ ] Review breaking changes
- [ ] Prepare rollback code

### Ops/DevOps Team
- [ ] Coordinate deployment timing
- [ ] Monitor infrastructure
- [ ] Execute deployments
- [ ] Handle incidents

### Frontend Team (if applicable)
- [ ] Update UI for new features
- [ ] Test with new API schema
- [ ] Deploy after backend ready

---

## Deployment Log Template

```
Date: 2026-02-08
Time: 02:00 UTC - 02:30 UTC
Status: ✅ SUCCESSFUL

Pre-Deployment:
- Backup verified: uap_db_backup_20260208_015000.dump
- Code ready: v1.2
- Team notified: Yes

Migration:
- Version: v1.1 → v1.2
- Duration: 5.2 seconds
- Status: Completed
- Changes: +1 table (audit_logs), +5 indexes

Post-Deployment:
- Error rate: 0.05% (normal)
- API latency p95: 95ms (normal)
- Health checks: All passing
- Issues: None

Rollback Status: Available until 2026-02-10

Notes:
- Deployment executed smoothly
- All services responding normally
- No customer impact
```

---

## Incident Response

If issues occur during deployment:

### 1. Detect Issue (T+0 to T+5)
```
Alert triggered: Error rate > 1%
Investigation: Check application logs
```

### 2. Communicate (T+5)
```
Slack: @channel Issue detected during deployment, investigating
Response: Ops + Database teams mobilize
```

### 3. Decide: Rollback or Fix (T+10)
```
Option A: Rollback (10 minutes)
Option B: Fix forward (30 minutes)
Decision: Rollback if unclear
```

### 4. Execute Rollback (T+10)
```
git checkout v1.1
npm run deploy:prod
Monitor error rate
```

### 5. Post-Mortem (Next Day)
```
- What went wrong?
- How do we prevent it?
- Update procedures
```

---

**Last Updated:** 2026-02-08  
**Status:** LIVE  
**Next:** Coordinate Phase 6 deployments using this guide
