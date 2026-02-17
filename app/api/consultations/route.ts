import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse } from '@/lib/authz'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const athleteId = searchParams.get('athleteId')
    const specialistId = searchParams.get('specialistId')

    if (!athleteId && !specialistId) {
      return NextResponse.json(
        { error: 'athleteId or specialistId query param is required' },
        { status: 400 }
      )
    }

    if (athleteId) {
      const result = await query(
        `SELECT * FROM consultations WHERE athlete_id = $1 ORDER BY created_at DESC`,
        [athleteId]
      )
      return NextResponse.json({ consultations: result.rows })
    }

    const result = await query(
      `SELECT * FROM consultations WHERE specialist_id = $1 ORDER BY created_at DESC`,
      [specialistId]
    )
    return NextResponse.json({ consultations: result.rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch consultations' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // RBAC: Only specialists can create consultations
    const user = await requirePermission('CREATE_CONSULTATION');

    const body = await req.json()
    const { athleteId, specialistId, date, time, notes } = body || {}

    // Verify specialist is creating consultation for themselves
    if (specialistId !== user.id) {
      return NextResponse.json(
        { error: 'You can only create consultations for yourself' },
        { status: 403 }
      );
    }

    if (!athleteId || !specialistId || !date || !time) {
      return NextResponse.json(
        { error: 'athleteId, specialistId, date, and time are required' },
        { status: 400 }
      )
    }

    const id = randomUUID()

    const result = await query(
      `INSERT INTO consultations (
        id,
        athlete_id,
        specialist_id,
        date,
        time,
        status,
        notes,
        created_at
      ) VALUES ($1,$2,$3,$4,$5,'pending',$6,NOW())
      RETURNING *`,
      [id, athleteId, specialistId, date, time, notes || null]
    )

    return NextResponse.json({ consultation: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error(error)
    return authErrorToResponse(error)
  }
}
