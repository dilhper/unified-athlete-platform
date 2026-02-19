import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse } from '@/lib/authz'

export async function GET(req: Request) {
  try {
    const user = await requirePermission('VIEW_NOTIFICATIONS')
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam, 10) : null

    if (userId && userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const targetUserId = userId || user.id

    const result = await query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       ${limit ? 'LIMIT $2' : ''}`,
      limit ? [targetUserId, limit] : [targetUserId]
    )

    return NextResponse.json({ notifications: result.rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // Any authenticated user can create notifications for themselves.
    // Officials can broadcast to others.
    const user = await requirePermission('VIEW_NOTIFICATIONS');

    const body = await req.json()
    const { userId, type, title, message, actionUrl } = body || {}

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'userId, type, title, and message are required' },
        { status: 400 }
      )
    }

    if (user.role !== 'official' && userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const id = randomUUID()

    const result = await query(
      `INSERT INTO notifications (
        id,
        user_id,
        type,
        title,
        message,
        read,
        action_url,
        created_at
      ) VALUES ($1,$2,$3,$4,$5,false,$6,NOW())
      RETURNING *`,
      [id, userId, type, title, message, actionUrl || null]
    )

    return NextResponse.json({ notification: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error(error)
    return authErrorToResponse(error)
  }
}
