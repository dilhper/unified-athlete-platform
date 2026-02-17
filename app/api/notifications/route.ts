import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse } from '@/lib/authz'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId query param is required' }, { status: 400 })
    }

    const result = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    )

    return NextResponse.json({ notifications: result.rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // RBAC: Only officials can create notifications
    const user = await requirePermission('BROADCAST_NOTIFICATION');

    const body = await req.json()
    const { userId, type, title, message, actionUrl } = body || {}

    if (!userId || !type || !title || !message) {
      return NextResponse.json(
        { error: 'userId, type, title, and message are required' },
        { status: 400 }
      )
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
