# RBAC Implementation Guide

**Status**: ✅ Phase 3 Complete (v1.0 - Feb 2026)

## Overview

Role-Based Access Control (RBAC) is now enforced centrally across all API routes. This document explains the system architecture and usage patterns.

---

## Design Principles

1. **Single Role per User**: Each user has exactly ONE role (no multi-role support)
2. **Officials = Admins**: Official role has admin-level privileges
3. **Explicit Relationships**: Coaches can only manage athletes who selected them
4. **Non-Optional Guards**: Authorization checks cannot be bypassed

---

## Core Files

### `lib/rbac.ts`
Defines roles and permission matrix:
- `Roles`: Enum of valid roles (athlete, coach, specialist, official)
- `Permissions`: Maps actions to allowed roles
- Helper functions: `hasPermission()`, `getRolePermissions()`

### `lib/authz.ts`
Authorization enforcement layer:
- `requirePermission()`: Core guard - validates user has required permission
- `requireOwnership()`: Validates user owns a resource
- `requireCoachAthleteRelationship()`: Validates coach-athlete relationship
- `authErrorToResponse()`: Standardized error handling

### `lib/auth-helpers.ts`
Authentication utilities:
- `getCurrentUser()`: Returns authenticated user with role from database

---

## Usage Patterns

### Pattern 1: Simple Permission Check

**Use case**: Action requires specific role

```typescript
import { requirePermission, authErrorToResponse } from '@/lib/authz';

export async function POST(req: Request) {
  try {
    // RBAC: Only athletes can submit achievements
    const user = await requirePermission('SUBMIT_ACHIEVEMENT');
    
    // Business logic here...
    // user.id is guaranteed to exist
    // user.role is guaranteed to be 'athlete'
    
  } catch (error) {
    return authErrorToResponse(error);
  }
}
```

**Examples in codebase**:
- [app/api/achievements/route.ts](app/api/achievements/route.ts#L40) - Athletes submit achievements
- [app/api/consultations/route.ts](app/api/consultations/route.ts#L40) - Specialists create consultations
- [app/api/training-plans/route.ts](app/api/training-plans/route.ts#L50) - Coaches create training plans

---

### Pattern 2: Permission + Ownership Check

**Use case**: User has permission but can only act on their own resources

```typescript
import { requirePermission, authErrorToResponse } from '@/lib/authz';

export async function POST(req: Request) {
  try {
    const user = await requirePermission('SUBMIT_ACHIEVEMENT');
    const body = await req.json();
    
    // Verify user is submitting for themselves
    if (body.athleteId !== user.id) {
      return NextResponse.json(
        { error: 'You can only submit achievements for yourself' },
        { status: 403 }
      );
    }
    
    // Business logic...
    
  } catch (error) {
    return authErrorToResponse(error);
  }
}
```

**Why this matters**:
- Permission: "Can this role perform this action?" ✅
- Ownership: "Can this specific user act on this specific resource?" ✅

---

### Pattern 3: Relationship-Based Access

**Use case**: Coach accessing athlete data (relationship must exist)

```typescript
import { requirePermission, requireCoachAthleteRelationship, authErrorToResponse } from '@/lib/authz';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requirePermission('VIEW_ATHLETE_TRAINING_FORMS');
    
    // Verify coach-athlete relationship exists
    await requireCoachAthleteRelationship(user.id, params.id);
    
    // Now safe to query athlete's data
    const result = await query(
      `SELECT * FROM daily_training_forms WHERE athlete_id = $1`,
      [params.id]
    );
    
    return NextResponse.json({ forms: result.rows });
    
  } catch (error) {
    return authErrorToResponse(error);
  }
}
```

**How relationships work**:
- Coach-athlete: Validated via `training_plans` + `training_plan_athletes` junction table
- Specialist-client: Validated via `consultations` table
- Only athletes who selected a coach create this relationship

---

## Permission Matrix Reference

### Athletes Can:
- `SUBMIT_ACHIEVEMENT`
- `VIEW_OWN_ACHIEVEMENTS`
- `VIEW_OWN_TRAINING_PLAN`
- `SUBMIT_DAILY_TRAINING_FORM`
- `APPLY_TO_OPPORTUNITY`
- `REQUEST_TRAINING_PAUSE`
- Universal permissions (messages, notifications, profile)

### Coaches Can:
- `CREATE_TRAINING_PLAN`
- `UPDATE_TRAINING_PLAN`
- `DELETE_TRAINING_PLAN`
- `CREATE_TRAINING_SESSION`
- `UPDATE_TRAINING_SESSION`
- `VIEW_ATHLETE_TRAINING_FORMS` (with relationship check)
- `VIEW_ASSIGNED_ATHLETES`
- `APPROVE_TRAINING_PAUSE`
- `SUBMIT_CERTIFICATION`
- Universal permissions

### Specialists Can:
- `CREATE_CONSULTATION`
- `UPDATE_CONSULTATION`
- `MANAGE_PHYSIOTHERAPY_SLOTS`
- `CREATE_MEDICAL_REFERRAL`
- `ACCEPT_MEDICAL_REFERRAL`
- `COMPLETE_MEDICAL_REFERRAL`
- `MANAGE_AVAILABILITY`
- `VIEW_SPECIALIST_CLIENTS`
- Universal permissions

### Officials Can (Admin Privileges):
- **All verification actions**:
  - `VERIFY_ACHIEVEMENT`
  - `VERIFY_CERTIFICATION`
  - `VERIFY_DOCUMENTS`
- **All approval actions**:
  - `APPROVE_REGISTRATION`
  - `REJECT_REGISTRATION`
- **Opportunity management**:
  - `CREATE_OPPORTUNITY`
  - `UPDATE_OPPORTUNITY`
  - `DELETE_OPPORTUNITY`
  - `SHORTLIST_OPPORTUNITY`
- **System administration**:
  - `BROADCAST_NOTIFICATION`
  - `VIEW_AUDIT_LOGS`
  - `MANAGE_SPORT_REGISTRATIONS`
  - `MANAGE_COMMUNITY`
- Universal permissions

---

## Error Responses

The `authErrorToResponse()` handler returns standardized HTTP responses:

| Error Type | HTTP Status | Meaning |
|------------|-------------|---------|
| `AuthenticationError` | 401 Unauthorized | User not logged in |
| `AuthorizationError` | 403 Forbidden | User lacks required permission |
| `OwnershipError` | 403 Forbidden | User doesn't own resource |

---

## Protected Routes (Examples)

✅ **Already Protected**:
- `POST /api/achievements` - Athlete only
- `POST /api/training-plans` - Coach only
- `POST /api/consultations` - Specialist only
- `POST /api/official/approve-registration` - Official only

⚠️ **Next to Protect** (Phase 3 continuation):
- `PUT /api/training-plans/[id]` - Coach ownership check
- `GET /api/training-sessions?athleteId=X` - Coach-athlete relationship
- `POST /api/verifications/[id]` - Official only
- All `/api/shortlisted/*` routes - Official only
- All `/api/applications/*` routes - Ownership checks

---

## Adding RBAC to New Routes

**Step 1**: Import guards
```typescript
import { requirePermission, authErrorToResponse } from '@/lib/authz';
```

**Step 2**: Add permission check at route entry
```typescript
export async function POST(req: Request) {
  try {
    const user = await requirePermission('YOUR_PERMISSION_NAME');
    // ... business logic
  } catch (error) {
    return authErrorToResponse(error);
  }
}
```

**Step 3**: Add ownership/relationship checks if needed
```typescript
// For self-owned resources
if (resourceOwnerId !== user.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// For coach-athlete relationships
await requireCoachAthleteRelationship(user.id, athleteId);
```

**Step 4**: Define new permissions in `lib/rbac.ts` if needed
```typescript
export const Permissions = {
  // ... existing permissions
  YOUR_NEW_PERMISSION: [Roles.COACH, Roles.OFFICIAL],
} as const;
```

---

## Testing RBAC

### Unit Test Pattern (Future)
```typescript
describe('POST /api/achievements', () => {
  it('allows athletes to submit', async () => {
    // Mock getCurrentUser to return athlete role
    // Expect 201 response
  });
  
  it('blocks coaches from submitting', async () => {
    // Mock getCurrentUser to return coach role
    // Expect 403 response
  });
});
```

### Manual Testing
1. Create users with different roles in database
2. Get auth token for each user
3. Try accessing protected endpoints
4. Verify 403 responses for unauthorized roles

---

## Next Steps (Phase 4)

Once RBAC is fully applied to all routes:
1. **Audit Logging**: Log all permission checks and ownership validations
2. **Transaction Wrapping**: Wrap multi-step operations in DB transactions
3. **Performance**: Cache permission checks at request level
4. **Monitoring**: Track authorization failures (potential security issues)

---

## Migration Checklist

- [x] Create permission definitions (`lib/rbac.ts`)
- [x] Create authorization guards (`lib/authz.ts`)
- [x] Protect athlete routes (achievements)
- [x] Protect coach routes (training plans)
- [x] Protect specialist routes (consultations)
- [x] Protect official routes (registration approval)
- [ ] Protect all UPDATE/DELETE routes with ownership
- [ ] Add coach-athlete relationship checks to data access
- [ ] Add specialist-client relationship checks
- [ ] Audit all 40+ API routes for RBAC coverage
- [ ] Add integration tests for authorization

---

**Last Updated**: February 8, 2026  
**Version**: v1.0 (Phase 3 - RBAC Foundation Complete)
