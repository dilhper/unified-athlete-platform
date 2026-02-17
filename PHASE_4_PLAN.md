# Phase 4 — Transactions + Audit Logging (Scope & Implementation Plan)

**Status**: Ready to start  
**Est. Effort**: 6-8 hours  
**Priority**: HIGH (Compliance + Data Integrity)

---

## Why Phase 4 Matters

Right now:
- ✅ RBAC prevents unauthorized actions (authentication + authorization)
- ❌ But there's no record of what happened (no audit trail)
- ❌ And multi-step workflows could partially fail (no transactions)

**Real-world problem:**
```
Coach approves training plan pause
  → Athlete gets updated
  → Notification should be sent
  → Audit log should record it

But if notification fails, athlete is marked paused but notification never sent.
Who knows? Nobody.
```

Phase 4 fixes this by:
1. **Transactions**: All-or-nothing operations
2. **Audit Logs**: Complete record of every action
3. **Compliance**: Legal defensibility

---

## What Gets Built

### 1. Audit Logs Table

**New SQL Table:**
```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT NOW(),
  actor_id VARCHAR(255) NOT NULL,      -- Who did it
  actor_role VARCHAR(50) NOT NULL,     -- Their role
  action VARCHAR(100) NOT NULL,        -- What they did (VERIFY_ACHIEVEMENT, etc)
  resource_type VARCHAR(100),          -- What resource (achievements, opportunities, etc)
  resource_id VARCHAR(255),            -- Which specific resource
  result VARCHAR(20),                  -- success / denied / error
  deny_reason TEXT,                    -- Why it was denied (if applicable)
  status_before JSONB,                 -- Previous state
  status_after JSONB,                  -- New state
  ip_address VARCHAR(50),              -- Request IP
  user_agent TEXT,                     -- Browser/client info
  FOREIGN KEY (actor_id) REFERENCES users(id)
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_action ON audit_logs(action);
```

**Example rows:**
```
| actor_id | action | resource | result | reason |
|----------|--------|----------|--------|--------|
| user123 | APPROVE_REGISTRATION | users | success | NULL |
| user456 | VERIFY_ACHIEVEMENT | achievements | denied | Insufficient permission |
| user789 | CREATE_OPPORTUNITY | opportunities | success | NULL |
```

### 2. Audit Logging Helper

**New File: `lib/audit.ts`**

```typescript
import { query } from "@/lib/db";

export async function logAudit(
  actorId: string,
  actorRole: string,
  action: string,
  resourceType: string,
  resourceId: string,
  result: "success" | "denied" | "error",
  denialReason?: string,
  before?: any,
  after?: any,
  ipAddress?: string
) {
  await query(
    `INSERT INTO audit_logs (
      actor_id, actor_role, action, resource_type, resource_id,
      result, deny_reason, status_before, status_after,
      ip_address, timestamp
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
    [
      actorId, actorRole, action, resourceType, resourceId,
      result, denialReason || null,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
      ipAddress || null
    ]
  );
}
```

### 3. Transactional Wrapper

**New File: `lib/transaction.ts`**

```typescript
import { getClient } from "@/lib/db";

export async function withTransaction<T>(
  callback: (client: Client) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
```

### 4. Updated Routes with Audit Logging

**Example: Approve Registration Route**

Before (Phase 3):
```typescript
export async function POST(req: Request) {
  try {
    const user = await requirePermission('APPROVE_REGISTRATION');
    const { userId, officialId } = await req.json();

    await query(
      `UPDATE users SET registration_verified = true WHERE id = $1`,
      [userId]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorToResponse(error);
  }
}
```

After (Phase 4):
```typescript
import { logAudit } from "@/lib/audit";
import { withTransaction } from "@/lib/transaction";

export async function POST(req: Request) {
  try {
    const user = await requirePermission('APPROVE_REGISTRATION');
    const { userId, officialId } = await req.json();

    // Get previous state for audit trail
    const before = await query(
      `SELECT * FROM users WHERE id = $1`,
      [userId]
    );

    // Atomic operation: update + audit
    await withTransaction(async (client) => {
      const after = await client.query(
        `UPDATE users SET registration_verified = true WHERE id = $1 RETURNING *`,
        [userId]
      );

      // Log success
      await logAudit(
        user.id,
        user.role,
        'APPROVE_REGISTRATION',
        'users',
        userId,
        'success',
        null,
        before.rows[0],
        after.rows[0]
      );
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Log denial
    if (error instanceof AuthorizationError) {
      await logAudit(
        '(unknown)', // User wasn't authenticated
        '(none)',
        'APPROVE_REGISTRATION',
        'users',
        userId,
        'denied',
        error.message
      );
    }
    return authErrorToResponse(error);
  }
}
```

---

## Implementation Checklist

### Step 1: Schema Update (1 hour)
- [ ] Add audit_logs table to schema.sql
- [ ] Add indexes
- [ ] Create migration SQL file
- [ ] Update SCHEMA_FROZEN_v1.0.ts to v1.1
- [ ] Run seed with new table

### Step 2: Core Libraries (1-2 hours)
- [ ] Create lib/audit.ts (logAudit function)
- [ ] Create lib/transaction.ts (withTransaction wrapper)
- [ ] Update lib/db.ts to export getClient (if not already)
- [ ] Add utility functions (e.g., getClientIp, getUserAgent)

### Step 3: High-Value Routes (2-3 hours)
Start with these (most critical):
- [ ] POST /api/official/approve-registration (regulatory)
- [ ] POST /api/official/reject-registration (regulatory)
- [ ] POST /api/opportunities (official-only creation)
- [ ] POST /api/training-plans (coach workflow)

Then add to remaining routes systematically.

### Step 4: Testing (1-2 hours)
- [ ] Test successful approval → audit log created
- [ ] Test denied request → audit log with reason
- [ ] Test transaction rollback → no partial updates
- [ ] Test with corrupted data → audit captures error
- [ ] Verify audit trail is immutable (no updates/deletes)

### Step 5: Monitoring & Queries (1 hour)
- [ ] Create audit summary query (who did what)
- [ ] Create compliance report query (all approvals)
- [ ] Create investigation query (all actions by user X)
- [ ] Create anomaly detection query (unusual patterns)

---

## Example Queries (After Implementation)

**Who approved registrations today?**
```sql
SELECT actor_id, COUNT(*) FROM audit_logs
WHERE action = 'APPROVE_REGISTRATION'
AND timestamp > NOW() - INTERVAL '1 day'
GROUP BY actor_id;
```

**What happened to athlete X?**
```sql
SELECT * FROM audit_logs
WHERE resource_id = 'athlete_id_123'
ORDER BY timestamp DESC
LIMIT 50;
```

**Find unauthorized attempts:**
```sql
SELECT * FROM audit_logs
WHERE result = 'denied'
AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

**Compliance report: All approvals:**
```sql
SELECT 
  timestamp,
  actor_id,
  action,
  resource_id,
  status_after->>'profile_verified' as verified
FROM audit_logs
WHERE action IN ('APPROVE_REGISTRATION', 'VERIFY_ACHIEVEMENT')
ORDER BY timestamp DESC;
```

---

## After Phase 4

**System will have:**
- ✅ RBAC (who can do what)
- ✅ Audit logs (who did what, when)
- ✅ Transactions (all-or-nothing operations)
- ✅ Compliance documentation (legal defense)

**Then you can proceed to:**
- Phase 5: Migration Discipline
- Phase 6: Security Hardening
- Phase 7: Performance & Compliance

---

## Decision Point

**Ready to build Phase 4?**

This will:
- Add 50-100 lines of infrastructure
- Modify 5-8 route files
- Add audit trail to entire system
- Take 6-8 hours

**Should I proceed?** (Reply: Yes / No)
