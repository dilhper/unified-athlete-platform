import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(_req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const result = await query('SELECT * FROM notifications WHERE id = $1', [id])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    return NextResponse.json({ notification: result.rows[0] })
  } catch (error) {
    console.error('Error fetching notification:', error)
    return NextResponse.json({ error: 'Failed to fetch notification' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const body = await req.json()
    const { read } = body || {}

    if (typeof read !== 'boolean') {
      return NextResponse.json({ error: 'read must be a boolean value' }, { status: 400 })
    }

    const result = await query(
      `UPDATE notifications
       SET read = $2
       WHERE id = $1
       RETURNING *`,
      [id, read]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    return NextResponse.json({ notification: result.rows[0] })
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const result = await query('DELETE FROM notifications WHERE id = $1 RETURNING id', [id])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Notification deleted successfully' })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 })
  }
}
