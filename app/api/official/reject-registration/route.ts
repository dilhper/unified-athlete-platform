import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse, AuthenticationError, AuthorizationError } from '@/lib/authz'
import { withTransaction, TransactionClient } from '@/lib/transaction'
import { logAudit } from '@/lib/audit'

export async function POST(req: Request) {
  try {
    // RBAC: Only officials can reject registrations
    const user = await requirePermission('REJECT_REGISTRATION');

    const body = await req.json()
    const { userId, officialId, reason } = body || {}

    // Verify official is rejecting with their own ID
    if (officialId !== user.id) {
      logAudit({
        actorId: user.id,
        actorRole: 'official',
        action: 'PERMISSION_DENIED',
        resourceType: 'registration',
        resourceId: userId,
        result: 'denied',
        denialReason: 'Official ID mismatch',
      });
      return NextResponse.json(
        { error: 'You can only reject registrations with your own official ID' },
        { status: 403 }
      );
    }

    if (!userId || !officialId || !reason) {
      return NextResponse.json({ error: 'userId, officialId, and reason are required' }, { status: 400 })
    }

    // Execute rejection in transaction with audit logging
    const txResult = await withTransaction(async (tx: TransactionClient) => {
      // Get current user state before rejection
      const before = await tx.queryOne(
        `SELECT id, registration_verified, registration_rejected, profile_verified FROM users WHERE id = $1`,
        [userId]
      );

      if (!before) {
        throw new Error('User not found');
      }

      // Perform rejection
      const result = await tx.query(
        `UPDATE users
         SET registration_verified = false,
             registration_rejected = true,
             rejection_reason = $3,
             verified_by = $2,
             verified_at = NOW(),
             profile_pending_verification = false
         WHERE id = $1
         RETURNING *`,
        [userId, officialId, reason]
      );

      // Log rejection with before/after state
      logAudit({
        actorId: user.id,
        actorRole: 'official',
        action: 'APPROVAL_DENIED',
        resourceType: 'registration',
        resourceId: userId,
        result: 'success',
        denialReason: reason,
        statusBefore: {
          registration_verified: before.registration_verified,
          registration_rejected: before.registration_rejected,
          profile_verified: before.profile_verified,
        },
        statusAfter: {
          registration_verified: false,
          registration_rejected: true,
          profile_verified: false,
        },
      });

      return result.rows[0];
    }, 'reject-registration');

    if (!txResult.success || !txResult.data) {
      logAudit({
        actorId: user.id,
        actorRole: 'official',
        action: 'ERROR_OCCURRED',
        resourceType: 'registration',
        resourceId: userId,
        result: 'error',
        errorMessage: txResult.error?.message,
      });
      return NextResponse.json({ error: txResult.error?.message || 'Rejection failed' }, { status: 500 })
    }

    return NextResponse.json({ user: txResult.data })
  } catch (error) {
    console.error('Rejection error:', error)
    
    // Handle specific auth errors
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: 'Not authenticated', details: error.message }, { status: 401 })
    }
    
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: 'Not authorized', details: error.message }, { status: 403 })
    }
    
    // Handle other errors with detailed logging
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Full error details:', { error, message: errorMessage, stack: error instanceof Error ? error.stack : 'No stack' })
    
    return NextResponse.json(
      { error: 'Rejection failed', details: errorMessage },
      { status: 500 }
    )
  }
}
