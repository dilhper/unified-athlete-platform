import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const result = await query('SELECT * FROM achievements WHERE id = $1', [id])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Achievement not found' }, { status: 404 })
    }

    return NextResponse.json({ achievement: result.rows[0] })
  } catch (error) {
    console.error('Error fetching achievement:', error)
    return NextResponse.json({ error: 'Failed to fetch achievement' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const body = await req.json()
    const { status, verifiedBy, title, description, category, date, evidence, attachments } = body || {}

    // Build dynamic update query
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (status !== undefined) {
      values.push(status)
      updates.push(`status = $${paramIndex++}`)
    }
    if (verifiedBy !== undefined) {
      values.push(verifiedBy)
      updates.push(`verified_by = $${paramIndex++}`)
    }
    if (title !== undefined) {
      values.push(title)
      updates.push(`title = $${paramIndex++}`)
    }
    if (description !== undefined) {
      values.push(description)
      updates.push(`description = $${paramIndex++}`)
    }
    if (category !== undefined) {
      values.push(category)
      updates.push(`category = $${paramIndex++}`)
    }
    if (date !== undefined) {
      values.push(date)
      updates.push(`date = $${paramIndex++}`)
    }
    if (evidence !== undefined) {
      values.push(evidence)
      updates.push(`evidence = $${paramIndex++}`)
    }
    if (attachments !== undefined) {
      values.push(attachments)
      updates.push(`attachments = $${paramIndex++}`)
    }

    // Auto-set verified_date when status changes from pending
    if (status && status !== 'pending') {
      updates.push(`verified_date = NOW()`)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    values.push(id)
    const result = await query(
      `UPDATE achievements SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Achievement not found' }, { status: 404 })
    }

    return NextResponse.json({ achievement: result.rows[0] })
  } catch (error) {
    console.error('Error updating achievement:', error)
    return NextResponse.json({ error: 'Failed to update achievement' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const result = await query('DELETE FROM achievements WHERE id = $1 RETURNING id', [id])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Achievement not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Achievement deleted successfully' })
  } catch (error) {
    console.error('Error deleting achievement:', error)
    return NextResponse.json({ error: 'Failed to delete achievement' }, { status: 500 })
  }
}
