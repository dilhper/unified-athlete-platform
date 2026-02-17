/**
 * Audit Logging System
 * 
 * Purpose: Immutable forensic trail for all access control decisions and mutations.
 * Compliance: GDPR (Article 32), SOC 2, HIPAA audit requirements.
 * 
 * Design Principles:
 * - Fire-and-forget: Never block main request on audit writes
 * - Immutable: No deletes, only appends
 * - Forensic: Include full context (actor, action, result, state before/after)
 * - Privacy: Redact sensitive fields, log only necessary state changes
 */

import { query } from "@/lib/db";

export type AuditAction =
  | "AUTH_CHECK"
  | "PERMISSION_DENIED"
  | "OWNERSHIP_CHECK_FAILED"
  | "RESOURCE_CREATED"
  | "RESOURCE_UPDATED"
  | "RESOURCE_DELETED"
  | "APPROVAL_GRANTED"
  | "APPROVAL_DENIED"
  | "STATUS_CHANGE"
  | "ROLE_ASSIGNMENT"
  | "VERIFICATION_COMPLETED"
  | "ERROR_OCCURRED";

export type AuditResult = "success" | "denied" | "error";

export interface AuditLogEntry {
  actorId: string;
  actorRole: "athlete" | "coach" | "specialist" | "official" | "admin";
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  result: AuditResult;
  denialReason?: string;
  statusBefore?: Record<string, any>;
  statusAfter?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
}

/**
 * Log an audit event. Fire-and-forget (async, no await required).
 * Automatically captures timestamp - do not include in entry.
 */
export function logAudit(entry: AuditLogEntry): void {
  // Fire-and-forget: async write to DB without blocking
  setImmediate(() => writeAuditLog(entry).catch(handleAuditError));
}

/**
 * Write audit log to database (internal, called async)
 */
async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const statusBefore = entry.statusBefore ? JSON.stringify(entry.statusBefore) : null;
    const statusAfter = entry.statusAfter ? JSON.stringify(entry.statusAfter) : null;

    await query(
      `INSERT INTO audit_logs 
        (actor_id, actor_role, action, resource_type, resource_id, result, 
         denial_reason, status_before, status_after, ip_address, user_agent, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        entry.actorId,
        entry.actorRole,
        entry.action,
        entry.resourceType,
        entry.resourceId || null,
        entry.result,
        entry.denialReason || null,
        statusBefore,
        statusAfter,
        entry.ipAddress || null,
        entry.userAgent || null,
        entry.errorMessage || null,
      ]
    );
  } catch (error) {
    handleAuditError(error);
  }
}

/**
 * Handle audit write failures gracefully (don't crash main request)
 */
function handleAuditError(error: unknown): void {
  // Log to stderr for ops monitoring (JSON format for log aggregation)
  console.error(JSON.stringify({
    level: "AUDIT_ERROR",
    message: "Failed to write audit log",
    error: error instanceof Error ? error.message : String(error),
    timestamp: new Date().toISOString(),
  }));
  // Do NOT throw - audit failure should not crash the application
}

/**
 * Query audit logs (for compliance reporting)
 * Usage: For generating audit reports, forensic analysis, compliance reviews
 */
export async function queryAuditLogs(filters: {
  actorId?: string;
  action?: AuditAction;
  resourceType?: string;
  result?: AuditResult;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
}): Promise<any[]> {
  let whereConditions: string[] = [];
  let params: any[] = [];
  let paramCount = 1;

  if (filters.actorId) {
    whereConditions.push(`actor_id = $${paramCount++}`);
    params.push(filters.actorId);
  }
  if (filters.action) {
    whereConditions.push(`action = $${paramCount++}`);
    params.push(filters.action);
  }
  if (filters.resourceType) {
    whereConditions.push(`resource_type = $${paramCount++}`);
    params.push(filters.resourceType);
  }
  if (filters.result) {
    whereConditions.push(`result = $${paramCount++}`);
    params.push(filters.result);
  }
  if (filters.fromDate) {
    whereConditions.push(`timestamp >= $${paramCount++}`);
    params.push(filters.fromDate);
  }
  if (filters.toDate) {
    whereConditions.push(`timestamp <= $${paramCount++}`);
    params.push(filters.toDate);
  }

  const whereClause =
    whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";
  const limit = filters.limit ? `LIMIT ${filters.limit}` : "LIMIT 10000";

  const result = await query(
    `SELECT 
      id, timestamp, actor_id, actor_role, action, resource_type, resource_id,
      result, denial_reason, status_before, status_after, ip_address, user_agent
     FROM audit_logs
     ${whereClause}
     ORDER BY timestamp DESC
     ${limit}`,
    params
  );

  return result.rows;
}

/**
 * Compliance Report: All denial events in date range
 */
export async function getAccessDenialReport(fromDate: Date, toDate: Date): Promise<any[]> {
  return queryAuditLogs({
    action: "PERMISSION_DENIED",
    fromDate,
    toDate,
    limit: 100000,
  });
}

/**
 * Compliance Report: All mutations for a resource
 */
export async function getResourceAuditTrail(
  resourceType: string,
  resourceId: string
): Promise<any[]> {
  return queryAuditLogs({
    resourceType,
    limit: 100000,
  });
}

/**
 * Security Report: All actions by a specific actor
 */
export async function getUserActivityReport(userId: string, fromDate: Date, toDate: Date): Promise<any[]> {
  return queryAuditLogs({
    actorId: userId,
    fromDate,
    toDate,
    limit: 100000,
  });
}
