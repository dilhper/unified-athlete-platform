import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse } from '@/lib/authz'
import { withTransaction, TransactionClient } from '@/lib/transaction'
import { logAudit } from '@/lib/audit'

export async function GET() {
  try {
    const result = await query(`SELECT * FROM opportunities ORDER BY created_at DESC`)
    return NextResponse.json({ opportunities: result.rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // RBAC: Only officials can create opportunities
    const user = await requirePermission('CREATE_OPPORTUNITY');

    const body = await req.json()
    const {
      title,
      type,
      description,
      organization,
      amount,
      sport,
      deadline,
      eligibility,
    } = body || {}

    if (!title || !type || !description || !organization || !deadline) {
      return NextResponse.json(
        { error: 'title, type, description, organization, and deadline are required' },
        { status: 400 }
      )
    }

    const id = randomUUID()

    // Execute opportunity creation in transaction with audit logging
    const txResult = await withTransaction(async (tx: TransactionClient) => {
      const result = await tx.query(
        `INSERT INTO opportunities (
          id,
          title,
          type,
          description,
          organization,
          amount,
          sport,
          deadline,
          eligibility,
          created_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
        RETURNING *`,
        [id, title, type, description, organization, amount || null, sport || null, deadline, eligibility || null]
      );

      // Log successful opportunity creation
      logAudit({
        actorId: user.id,
        actorRole: 'official',
        action: 'RESOURCE_CREATED',
        resourceType: 'opportunity',
        resourceId: id,
        result: 'success',
        statusAfter: {
          title,
          type,
          organization,
          deadline,
        },
      });

      return result.rows[0];
    }, 'create-opportunity');

    if (!txResult.success || !txResult.data) {
      logAudit({
        actorId: user.id,
        actorRole: 'official',
        action: 'ERROR_OCCURRED',
        resourceType: 'opportunity',
        resourceId: id,
        result: 'error',
        errorMessage: txResult.error?.message,
      });
      return NextResponse.json({ error: txResult.error?.message || 'Opportunity creation failed' }, { status: 500 })
    }

    return NextResponse.json({ opportunity: txResult.data }, { status: 201 })
  } catch (error) {
    console.error(error)
    return authErrorToResponse(error)
  }
}
