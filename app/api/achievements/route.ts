import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { query } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const athleteId = searchParams.get('athleteId')
    const status = searchParams.get('status')

    const conditions: string[] = []
    const values: any[] = []

    if (athleteId) {
      values.push(athleteId)
      conditions.push(`athlete_id = $${values.length}`)
    }

    if (status) {
      values.push(status)
      conditions.push(`status = $${values.length}`)
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await query(
      `SELECT * FROM achievements ${whereClause} ORDER BY created_at DESC`,
      values
    )

    return NextResponse.json({ achievements: result.rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch achievements' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { athleteId, title, description, date, category, evidence, attachments } = body || {}

    if (!athleteId || !title || !date || !category) {
      return NextResponse.json(
        { error: 'athleteId, title, date, and category are required' },
        { status: 400 }
      )
    }

    // Verify the athlete exists
    const userCheck = await query('SELECT id, role FROM users WHERE id = $1', [athleteId])
    if (userCheck.rowCount === 0) {
      return NextResponse.json({ error: 'Athlete not found' }, { status: 404 })
    }

    const achievementId = randomUUID()

    const result = await query(
      `INSERT INTO achievements (
        id,
        athlete_id,
        title,
        description,
        date,
        category,
        status,
        evidence,
        attachments,
        created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,NOW())
      RETURNING *`,
      [achievementId, athleteId, title, description || null, date, category, evidence || null, attachments || null]
    )

    return NextResponse.json({ achievement: result.rows[0] })
  } catch (error) {
    console.error('Error creating achievement:', error)
    return NextResponse.json({ error: 'Failed to create achievement' }, { status: 500 })
  }
}
