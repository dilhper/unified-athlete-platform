import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse, AuthenticationError, AuthorizationError } from '@/lib/authz'
import { withTransaction, TransactionClient } from '@/lib/transaction'
import { logAudit } from '@/lib/audit'

export async function POST(req: Request) {
  try {
    // RBAC: Only officials can approve registrations
    const user = await requirePermission('APPROVE_REGISTRATION');

    const body = await req.json()
    const { userId, officialId } = body || {}

    // Verify official is approving with their own ID
    if (officialId !== user.id) {
      logAudit({
        actorId: user.id,
        actorRole: 'official',
        action: 'APPROVAL_DENIED',
        resourceType: 'registration',
        resourceId: userId,
        result: 'denied',
        denialReason: 'Official ID mismatch',
      });
      return NextResponse.json(
        { error: 'You can only approve registrations with your own official ID' },
        { status: 403 }
      );
    }

    if (!userId || !officialId) {
      return NextResponse.json({ error: 'userId and officialId are required' }, { status: 400 })
    }

    // Execute approval in transaction with audit logging
    const txResult = await withTransaction(async (tx: TransactionClient) => {
      // Get current user state before approval
      const before = await tx.queryOne(
        `SELECT id, registration_verified, registration_rejected, profile_verified FROM users WHERE id = $1`,
        [userId]
      );

      if (!before) {
        throw new Error('User not found');
      }

      const submittedRole = await tx.queryOne(
        `SELECT role FROM document_submissions WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT 1`,
        [userId]
      );

      // Perform approval (also align role to latest submitted role when available)
      const result = await tx.query(
        `UPDATE users
         SET registration_verified = true,
             registration_rejected = false,
             email_verified = true,
             verified_by = $2,
             verified_at = NOW(),
             profile_verified = true,
             profile_pending_verification = false,
             role = COALESCE($3, role)
         WHERE id = $1
         RETURNING *`,
        [userId, officialId, submittedRole?.role || null]
      );

      // Log successful approval with before/after state
      logAudit({
        actorId: user.id,
        actorRole: 'official',
        action: 'APPROVAL_GRANTED',
        resourceType: 'registration',
        resourceId: userId,
        result: 'success',
        statusBefore: {
          registration_verified: before.registration_verified,
          registration_rejected: before.registration_rejected,
          profile_verified: before.profile_verified,
        },
        statusAfter: {
          registration_verified: true,
          registration_rejected: false,
          profile_verified: true,
        },
      });

      return result.rows[0];
    }, 'approve-registration');

    if (!txResult.success || !txResult.data) {
      logAudit({
        actorId: user.id,
        actorRole: 'official',
        action: 'APPROVAL_DENIED',
        resourceType: 'registration',
        resourceId: userId,
        result: 'error',
        errorMessage: txResult.error?.message,
      });
      return NextResponse.json({ error: txResult.error?.message || 'Approval failed' }, { status: 500 })
    }

    return NextResponse.json({ user: txResult.data })
  } catch (error) {
    console.error('Approval error:', error)
    
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
      { error: 'Approval failed', details: errorMessage },
      { status: 500 }
    )
  }
}
