import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(_req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const result = await query('SELECT * FROM consultations WHERE id = $1', [id])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 })
    }

    return NextResponse.json({ consultation: result.rows[0] })
  } catch (error) {
    console.error('Error fetching consultation:', error)
    return NextResponse.json({ error: 'Failed to fetch consultation' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const body = await req.json()
    const { status, notes } = body || {}

    if (!status && notes === undefined) {
      return NextResponse.json({ error: 'status or notes is required' }, { status: 400 })
    }

    const result = await query(
      `UPDATE consultations
       SET status = COALESCE($2, status),
           notes = COALESCE($3, notes)
       WHERE id = $1
       RETURNING *`,
      [id, status || null, notes ?? null]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 })
    }

    return NextResponse.json({ consultation: result.rows[0] })
  } catch (error) {
    console.error('Error updating consultation:', error)
    return NextResponse.json({ error: 'Failed to update consultation' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const result = await query('DELETE FROM consultations WHERE id = $1 RETURNING id', [id])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Consultation deleted successfully' })
  } catch (error) {
    console.error('Error deleting consultation:', error)
    return NextResponse.json({ error: 'Failed to delete consultation' }, { status: 500 })
  }
}
