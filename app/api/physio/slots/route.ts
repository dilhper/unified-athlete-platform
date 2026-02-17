import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse } from '@/lib/authz'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const specialistId = searchParams.get('specialistId')
    const available = searchParams.get('available')

    const conditions: string[] = []
    const values: any[] = []

    if (specialistId) {
      values.push(specialistId)
      conditions.push(`specialist_id = $${values.length}`)
    }
    if (available) {
      values.push(available === 'true')
      conditions.push(`available = $${values.length}`)
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await query(
      `SELECT * FROM physiotherapy_slots ${whereClause} ORDER BY date ASC, time ASC`,
      values
    )

    return NextResponse.json({ slots: result.rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch slots' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // RBAC: Only specialists can create physiotherapy slots
    const user = await requirePermission('MANAGE_PHYSIOTHERAPY_SLOTS');

    const body = await req.json()
    const { specialistId, date, time, duration } = body || {}

    // Verify specialist is creating slots for themselves
    if (specialistId !== user.id) {
      return NextResponse.json(
        { error: 'You can only create slots for yourself' },
        { status: 403 }
      );
    }

    if (!specialistId || !date || !time || !duration) {
      return NextResponse.json(
        { error: 'specialistId, date, time, and duration are required' },
        { status: 400 }
      )
    }

    const id = randomUUID()

    const result = await query(
      `INSERT INTO physiotherapy_slots (
        id,
        specialist_id,
        date,
        time,
        duration,
        available,
        created_at
      ) VALUES ($1,$2,$3,$4,$5,true,NOW())
      RETURNING *`,
      [id, specialistId, date, time, duration]
    )

    return NextResponse.json({ slot: result.rows[0] })
  } catch (error) {
    console.error(error)
    return authErrorToResponse(error)
  }
}
