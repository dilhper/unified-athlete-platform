import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse } from '@/lib/authz'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get('athleteId')
    const specialistId = searchParams.get('specialistId')
    const status = searchParams.get('status')
    const urgency = searchParams.get('urgency')

    const conditions: string[] = []
    const values: any[] = []

    if (athleteId) {
      values.push(athleteId)
      conditions.push(`athlete_id = $${values.length}`)
    }
    if (specialistId) {
      values.push(specialistId)
      conditions.push(`specialist_id = $${values.length}`)
    }
    if (status) {
      values.push(status)
      conditions.push(`status = $${values.length}`)
    }
    if (urgency) {
      values.push(urgency)
      conditions.push(`urgency = $${values.length}`)
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await query(
      `SELECT * FROM medical_referrals ${whereClause} ORDER BY created_at DESC`,
      values
    )

    return NextResponse.json({ referrals: result.rows })
  } catch (error) {
    console.error('Error fetching medical referrals:', error)
    return NextResponse.json({ error: 'Failed to fetch medical referrals' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // RBAC: Only specialists can create medical referrals
    const user = await requirePermission('CREATE_MEDICAL_REFERRAL');

    const body = await request.json()
    const { athleteId, specialistId, reason, urgency = 'medium', description } = body || {}

    // Verify specialist is creating referral for themselves
    if (specialistId !== user.id) {
      return NextResponse.json(
        { error: 'You can only create referrals for yourself' },
        { status: 403 }
      );
    }

    if (!athleteId || !specialistId || !reason) {
      return NextResponse.json(
        { error: 'athleteId, specialistId, and reason are required' },
        { status: 400 }
      )
    }

    const id = randomUUID()
    const result = await query(
      `INSERT INTO medical_referrals (
        id, athlete_id, specialist_id, issue, urgency, description, status, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,'pending',NOW())
      RETURNING *`,
      [id, athleteId, specialistId, reason, urgency, description || null]
    )

    return NextResponse.json({ referral: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Error creating medical referral:', error)
    return authErrorToResponse(error)
  }
}
