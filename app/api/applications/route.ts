import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse } from '@/lib/authz'
import { withTransaction, TransactionClient } from '@/lib/transaction'
import { logAudit } from '@/lib/audit'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const athleteId = searchParams.get('athleteId')
    const opportunityId = searchParams.get('opportunityId')

    if (!athleteId && !opportunityId) {
      return NextResponse.json(
        { error: 'athleteId or opportunityId query param is required' },
        { status: 400 }
      )
    }

    if (athleteId) {
      const result = await query(
        `SELECT * FROM applications WHERE athlete_id = $1 ORDER BY created_at DESC`,
        [athleteId]
      )
      return NextResponse.json({ applications: result.rows })
    }

    const result = await query(
      `SELECT * FROM applications WHERE opportunity_id = $1 ORDER BY created_at DESC`,
      [opportunityId]
    )
    return NextResponse.json({ applications: result.rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // RBAC: Only athletes can apply to opportunities
    const user = await requirePermission('APPLY_TO_OPPORTUNITY');

    const body = await req.json()
    const { athleteId, opportunityId, status, notes } = body || {}

    // Verify athlete is applying for themselves
    if (athleteId !== user.id) {
      logAudit({
        actorId: user.id,
        actorRole: 'athlete',
        action: 'PERMISSION_DENIED',
        resourceType: 'application',
        resourceId: opportunityId,
        result: 'denied',
        denialReason: 'Cannot apply for another athlete',
      });
      return NextResponse.json(
        { error: 'You can only apply for yourself' },
        { status: 403 }
      );
    }

    if (!athleteId || !opportunityId) {
      return NextResponse.json(
        { error: 'athleteId and opportunityId are required' },
        { status: 400 }
      )
    }

    const id = randomUUID()

    // Execute application submission in transaction with audit logging
    const txResult = await withTransaction(async (tx: TransactionClient) => {
      const result = await tx.query(
        `INSERT INTO applications (
          id,
          athlete_id,
          opportunity_id,
          status,
          notes,
          created_at
        ) VALUES ($1,$2,$3,$4,$5,NOW())
        RETURNING *`,
        [id, athleteId, opportunityId, status || 'submitted', notes || null]
      );

      // Log successful application submission
      logAudit({
        actorId: user.id,
        actorRole: 'athlete',
        action: 'RESOURCE_CREATED',
        resourceType: 'application',
        resourceId: id,
        result: 'success',
        statusAfter: {
          opportunity_id: opportunityId,
          status: status || 'submitted',
        },
      });

      return result.rows[0];
    }, 'apply-to-opportunity');

    if (!txResult.success || !txResult.data) {
      logAudit({
        actorId: user.id,
        actorRole: 'athlete',
        action: 'ERROR_OCCURRED',
        resourceType: 'application',
        resourceId: id,
        result: 'error',
        errorMessage: txResult.error?.message,
      });
      return NextResponse.json({ error: txResult.error?.message || 'Application submission failed' }, { status: 500 })
    }

    return NextResponse.json({ application: txResult.data })
  } catch (error) {
    console.error(error)
    return authErrorToResponse(error)
  }
}
