import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse } from '@/lib/authz'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get('athleteId')
    const planId = searchParams.get('planId')
    const status = searchParams.get('status')

    const conditions: string[] = []
    const values: any[] = []

    if (athleteId) {
      values.push(athleteId)
      conditions.push(`athlete_id = $${values.length}`)
    }
    if (planId) {
      values.push(planId)
      conditions.push(`plan_id = $${values.length}`)
    }
    if (status) {
      values.push(status)
      conditions.push(`status = $${values.length}`)
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await query(
      `SELECT * FROM training_plan_pause_requests ${whereClause} ORDER BY created_at DESC`,
      values
    )

    return NextResponse.json({ requests: result.rows })
  } catch (error) {
    console.error('Error fetching pause requests:', error)
    return NextResponse.json({ error: 'Failed to fetch pause requests' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // RBAC: Only athletes can request training plan pauses
    const user = await requirePermission('REQUEST_TRAINING_PAUSE');

    const body = await request.json()
    const { planId, athleteId, coachId, reason, description, needsMedicalReferral, attachments } = body || {}

    // Verify athlete is requesting for themselves
    if (athleteId !== user.id) {
      return NextResponse.json(
        { error: 'You can only request pauses for yourself' },
        { status: 403 }
      );
    }

    if (!planId || !athleteId || !coachId || !reason) {
      return NextResponse.json(
        { error: 'planId, athleteId, coachId, and reason are required' },
        { status: 400 }
      )
    }

    const existing = await query(
      `SELECT id FROM training_plan_pause_requests WHERE plan_id = $1 AND athlete_id = $2 AND status = 'pending'`,
      [planId, athleteId]
    )

    if (existing.rowCount > 0) {
      return NextResponse.json(
        { error: 'You already have a pending pause request for this plan' },
        { status: 400 }
      )
    }

    const id = randomUUID()
    const result = await query(
      `INSERT INTO training_plan_pause_requests (
        id, athlete_id, plan_id, coach_id, reason, description, needs_medical_referral, status, attachments, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8,NOW())
      RETURNING *`,
      [
        id,
        athleteId,
        planId,
        coachId,
        reason,
        description || null,
        !!needsMedicalReferral,
        Array.isArray(attachments) ? attachments : null,
      ]
    )

    return NextResponse.json({ request: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Error creating pause request:', error)
    return authErrorToResponse(error)
  }
}
