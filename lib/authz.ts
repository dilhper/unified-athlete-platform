/**
 * Authorization Guards - RBAC Enforcement Layer
 * 
 * CRITICAL: These functions are NON-OPTIONAL for protected routes
 * All API routes handling sensitive data MUST call requirePermission()
 * 
 * FROZEN: v1.0 (Feb 2026)
 */

import { getCurrentUser } from "@/lib/auth-helpers";
import { Permissions, type Permission, type Role } from "@/lib/rbac";
import { query } from "@/lib/db";

/**
 * Authorization Error Types
 */
export class AuthenticationError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class OwnershipError extends Error {
  constructor(message = "Resource access denied") {
    super(message);
    this.name = "OwnershipError";
  }
}

/**
 * CORE GUARD: Require user to have specific permission
 * 
 * @throws AuthenticationError if user not logged in
 * @throws AuthorizationError if user lacks required permission
 * @returns Authenticated user object with role
 */
export async function requirePermission(permission: Permission) {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthenticationError();
  }

  const allowedRoles = Permissions[permission];
  const userRole = user.role as Role;

  if (!allowedRoles.includes(userRole)) {
    throw new AuthorizationError(
      `Permission '${permission}' requires one of: ${allowedRoles.join(", ")}`
    );
  }

  return user;
}

/**
 * OWNERSHIP GUARD: Verify user owns a resource
 * 
 * Use this AFTER requirePermission for resource-level checks
 * Example: Coach has permission to update training plans (role check ✓)
 *          But can only update plans for THEIR athletes (ownership check ✓)
 * 
 * @param table - Database table name
 * @param resourceId - Resource ID to check
 * @param ownerColumn - Column name that stores owner ID
 * @param userId - User ID to verify ownership
 * @throws OwnershipError if user doesn't own resource
 */
export async function requireOwnership(
  table: string,
  resourceId: string,
  ownerColumn: string,
  userId: string
) {
  const result = await query(
    `SELECT 1 FROM ${table} WHERE id = $1 AND ${ownerColumn} = $2`,
    [resourceId, userId]
  );

  if (result.length === 0) {
    throw new OwnershipError(
      `User ${userId} does not own ${table} resource ${resourceId}`
    );
  }
}

/**
 * RELATIONSHIP GUARD: Verify coach-athlete relationship exists
 * 
 * Used when coaches need to access athlete data
 * Only allows access if athlete selected this coach
 * 
 * @param coachId - Coach user ID
 * @param athleteId - Athlete user ID
 * @throws OwnershipError if relationship doesn't exist
 */
export async function requireCoachAthleteRelationship(
  coachId: string,
  athleteId: string
) {
  // Check if this athlete has selected this coach
  // This could be via training_plans or a dedicated coach_athletes table
  const result = await query(
    `SELECT 1 FROM training_plans 
     WHERE coach_id = $1 
     AND EXISTS (
       SELECT 1 FROM training_plan_athletes 
       WHERE plan_id = training_plans.id 
       AND athlete_id = $2
     )
     LIMIT 1`,
    [coachId, athleteId]
  );

  if (result.length === 0) {
    throw new OwnershipError(
      `Coach ${coachId} does not have a relationship with athlete ${athleteId}`
    );
  }
}

/**
 * SPECIALIST RELATIONSHIP GUARD: Verify specialist-client relationship
 * 
 * @param specialistId - Specialist user ID
 * @param clientId - Client/athlete user ID
 * @throws OwnershipError if relationship doesn't exist
 */
export async function requireSpecialistClientRelationship(
  specialistId: string,
  clientId: string
) {
  // Check via consultations or physiotherapy appointments
  const result = await query(
    `SELECT 1 FROM consultations 
     WHERE specialist_id = $1 AND athlete_id = $2
     LIMIT 1`,
    [specialistId, clientId]
  );

  if (result.length === 0) {
    throw new OwnershipError(
      `Specialist ${specialistId} does not have a relationship with client ${clientId}`
    );
  }
}

/**
 * ERROR HANDLER: Convert auth errors to HTTP responses
 * 
 * Use this in API route catch blocks to standardize error handling
 */
export function authErrorToResponse(err: unknown): Response {
  if (err instanceof AuthenticationError) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  if (err instanceof AuthorizationError) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  if (err instanceof OwnershipError) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // Re-throw unknown errors
  throw err;
}
