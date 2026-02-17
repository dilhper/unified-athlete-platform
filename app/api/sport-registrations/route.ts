import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse } from '@/lib/authz'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get('athleteId')
    const coachId = searchParams.get('coachId')
    const sport = searchParams.get('sport')
    const status = searchParams.get('status')

    const conditions: string[] = []
    const values: any[] = []

    if (athleteId) {
      values.push(athleteId)
      conditions.push(`athlete_id = $${values.length}`)
    }
    if (coachId) {
      values.push(coachId)
      conditions.push(`coach_id = $${values.length}`)
    }
    if (sport) {
      values.push(sport)
      conditions.push(`sport = $${values.length}`)
    }
    if (status) {
      values.push(status)
      conditions.push(`status = $${values.length}`)
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await query(
      `SELECT * FROM sport_registrations ${whereClause} ORDER BY created_at DESC`,
      values
    )

    return NextResponse.json({ registrations: result.rows })
  } catch (error) {
    console.error('Error fetching sport registrations:', error)
    return NextResponse.json({ error: 'Failed to fetch sport registrations' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // RBAC: Only athletes can register for sports
    const user = await requirePermission('APPLY_TO_OPPORTUNITY');

    const body = await request.json()
    const { athleteId, coachId, sport, priority } = body || {}

    // Verify athlete is registering for themselves
    if (athleteId !== user.id) {
      return NextResponse.json(
        { error: 'You can only register for yourself' },
        { status: 403 }
      );
    }

    if (!athleteId || !coachId || !sport || !priority) {
      return NextResponse.json(
        { error: 'athleteId, coachId, sport, and priority are required' },
        { status: 400 }
      )
    }

    const existing = await query(
      `SELECT id FROM sport_registrations WHERE athlete_id = $1 AND sport = $2`,
      [athleteId, sport]
    )

    if (existing.rowCount > 0) {
      return NextResponse.json({ error: 'Already registered for this sport' }, { status: 400 })
    }

    const id = randomUUID()
    const result = await query(
      `INSERT INTO sport_registrations (
        id, athlete_id, coach_id, sport, priority, status, created_at
      ) VALUES ($1,$2,$3,$4,$5,'pending',NOW())
      RETURNING *`,
      [id, athleteId, coachId, sport, priority]
    )

    return NextResponse.json({ registration: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Error creating sport registration:', error)
    return authErrorToResponse(error)
  }
}
