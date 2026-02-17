import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse } from '@/lib/authz'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const communityId = searchParams.get('communityId')

    if (!userId && !communityId) {
      return NextResponse.json(
        { error: 'userId or communityId query param is required' },
        { status: 400 }
      )
    }

    if (communityId) {
      const result = await query(
        `SELECT * FROM messages WHERE community_id = $1 ORDER BY timestamp DESC`,
        [communityId]
      )
      return NextResponse.json({ messages: result.rows })
    }

    const result = await query(
      `SELECT * FROM messages
       WHERE sender_id = $1 OR receiver_id = $1
       ORDER BY timestamp DESC`,
      [userId]
    )

    return NextResponse.json({ messages: result.rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // RBAC: Any authenticated user can send messages
    const user = await requirePermission('SEND_MESSAGE');

    const body = await req.json()
    const { senderId, receiverId, communityId, content, attachments } = body || {}

    // Verify sender is authenticated user
    if (senderId !== user.id) {
      return NextResponse.json(
        { error: 'You can only send messages as yourself' },
        { status: 403 }
      );
    }

    if (!senderId || !content) {
      return NextResponse.json(
        { error: 'senderId and content are required' },
        { status: 400 }
      )
    }

    const id = randomUUID()

    const result = await query(
      `INSERT INTO messages (
        id,
        sender_id,
        receiver_id,
        community_id,
        content,
        attachments,
        timestamp
      ) VALUES ($1,$2,$3,$4,$5,$6,NOW())
      RETURNING *`,
      [id, senderId, receiverId || null, communityId || null, content, attachments || null]
    )

    return NextResponse.json({ message: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error(error)
    return authErrorToResponse(error)
  }
}