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
        `SELECT * FROM physiotherapy_appointments WHERE athlete_id = $1 ORDER BY created_at DESC`,
        [athleteId]
      )
      return NextResponse.json({ appointments: result.rows })
    }

    const result = await query(
      `SELECT * FROM physiotherapy_appointments WHERE specialist_id = $1 ORDER BY created_at DESC`,
      [specialistId]
    )
    return NextResponse.json({ appointments: result.rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // RBAC: Only athletes can book physiotherapy appointments
    const user = await requirePermission('SUBMIT_DAILY_TRAINING_FORM');

    const body = await req.json()
    const { athleteId, slotId, reason } = body || {}

    // Verify athlete is booking for themselves
    if (athleteId !== user.id) {
      return NextResponse.json(
        { error: 'You can only book appointments for yourself' },
        { status: 403 }
      );
    }

    if (!athleteId || !slotId) {
      return NextResponse.json(
        { error: 'athleteId and slotId are required' },
        { status: 400 }
      )
    }

    const id = randomUUID()

    const result = await query(
      `INSERT INTO physiotherapy_appointments (
        id,
        athlete_id,
        slot_id,
        reason,
        status,
        created_at
      ) VALUES ($1,$2,$3,$4,'pending',NOW())
      RETURNING *`,
      [id, athleteId, slotId, reason || null]
    )

    return NextResponse.json({ appointment: result.rows[0] })
  } catch (error) {
    console.error(error)
    return authErrorToResponse(error)
  }
}
