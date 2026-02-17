import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse } from '@/lib/authz'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const planId = searchParams.get('planId')

    if (!planId) {
      return NextResponse.json({ error: 'planId query param is required' }, { status: 400 })
    }

    const result = await query(
      `SELECT * FROM training_sessions WHERE plan_id = $1 ORDER BY date ASC`,
      [planId]
    )

    return NextResponse.json({ sessions: result.rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // RBAC: Only coaches can create training sessions
    const user = await requirePermission('CREATE_TRAINING_SESSION');

    const body = await req.json()
    const { planId, name, date, mode, duration, notes, description, attachments } = body || {}

    if (!planId || !name || !date || !mode) {
      return NextResponse.json(
        { error: 'planId, name, date, and mode are required' },
        { status: 400 }
      )
    }

    const id = randomUUID()

    const result = await query(
      `INSERT INTO training_sessions (
        id,
        plan_id,
        name,
        date,
        mode,
        duration,
        notes,
        description,
        attachments,
        created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
      RETURNING *`,
      [id, planId, name, date, mode, duration || null, notes || null, description || null, attachments || null]
    )

    return NextResponse.json({ session: result.rows[0] })
  } catch (error) {
    console.error(error)
    return authErrorToResponse(error)
  }
}
