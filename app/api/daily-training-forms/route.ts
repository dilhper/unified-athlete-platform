import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse } from '@/lib/authz'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const athleteId = searchParams.get('athleteId')

    if (!athleteId) {
      return NextResponse.json({ error: 'athleteId query param is required' }, { status: 400 })
    }

    const result = await query(
      `SELECT * FROM daily_training_forms WHERE athlete_id = $1 ORDER BY date DESC`,
      [athleteId]
    )

    return NextResponse.json({ forms: result.rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch forms' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // RBAC: Only athletes can submit daily training forms
    const user = await requirePermission('SUBMIT_DAILY_TRAINING_FORM');

    const body = await req.json()
    const {
      athleteId,
      sessionId,
      date,
      duration,
      intensity,
      mood,
      exercises,
      notes,
      evidence,
      attachments,
    } = body || {}

    // Verify athlete is submitting for themselves
    if (athleteId !== user.id) {
      return NextResponse.json(
        { error: 'You can only submit forms for yourself' },
        { status: 403 }
      );
    }

    if (!athleteId || !sessionId || !date || !duration || !intensity || !mood) {
      return NextResponse.json(
        { error: 'athleteId, sessionId, date, duration, intensity, and mood are required' },
        { status: 400 }
      )
    }

    const id = randomUUID()

    const result = await query(
      `INSERT INTO daily_training_forms (
        id,
        athlete_id,
        session_id,
        date,
        duration,
        intensity,
        exercises,
        mood,
        notes,
        evidence,
        attachments,
        submitted_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
      RETURNING *`,
      [
        id,
        athleteId,
        sessionId,
        date,
        duration,
        intensity,
        exercises || null,
        mood,
        notes || null,
        evidence || null,
        attachments || null,
      ]
    )

    return NextResponse.json({ form: result.rows[0] })
  } catch (error) {
    console.error(error)
    return authErrorToResponse(error)
  }
}
