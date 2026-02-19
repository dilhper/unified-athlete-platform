import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse } from '@/lib/authz'

export async function GET(req: Request) {
  try {
    const user = await requirePermission('VIEW_MESSAGES')
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
      const communityResult = await query(
        'SELECT member_ids FROM communities WHERE id = $1',
        [communityId]
      )

      if (communityResult.rowCount === 0) {
        return NextResponse.json({ error: 'Community not found' }, { status: 404 })
      }

      const memberIds = communityResult.rows[0].member_ids || []
      if (!memberIds.includes(user.id)) {
        return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 })
      }

      const result = await query(
        `SELECT m.id,
                m.sender_id,
                m.community_id,
                m.content,
                m.attachments,
                m.timestamp,
                u.name AS sender_name,
                u.avatar AS sender_avatar
         FROM messages m
         JOIN users u ON u.id = m.sender_id
         WHERE m.community_id = $1
         ORDER BY m.timestamp ASC`,
        [communityId]
      )

      const messages = result.rows.map((row) => ({
        id: row.id,
        senderId: row.sender_id,
        communityId: row.community_id,
        content: row.content,
        attachments: row.attachments,
        createdAt: row.timestamp,
        sender: {
          id: row.sender_id,
          name: row.sender_name,
          avatar: row.sender_avatar,
        },
      }))

      return NextResponse.json({ messages })
    }

    if (!userId) {
      return NextResponse.json({ error: 'userId query param is required' }, { status: 400 })
    }

    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await query(
      `SELECT m.id,
              m.sender_id,
              m.receiver_id,
              m.content,
              m.attachments,
              m.timestamp,
              u.name AS sender_name,
              u.avatar AS sender_avatar
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.sender_id = $1 OR m.receiver_id = $1
       ORDER BY m.timestamp ASC`,
      [userId]
    )

    const messages = result.rows.map((row) => ({
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      content: row.content,
      attachments: row.attachments,
      createdAt: row.timestamp,
      sender: {
        id: row.sender_id,
        name: row.sender_name,
        avatar: row.sender_avatar,
      },
    }))

    return NextResponse.json({ messages })
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

    if (communityId) {
      const communityResult = await query(
        'SELECT member_ids FROM communities WHERE id = $1',
        [communityId]
      )

      if (communityResult.rowCount === 0) {
        return NextResponse.json({ error: 'Community not found' }, { status: 404 })
      }

      const memberIds = communityResult.rows[0].member_ids || []
      if (!memberIds.includes(user.id)) {
        return NextResponse.json({ error: 'Not a member of this community' }, { status: 403 })
      }
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
      RETURNING id, sender_id, receiver_id, community_id, content, attachments, timestamp`,
      [id, senderId, receiverId || null, communityId || null, content, attachments || null]
    )

    const senderResult = await query(
      'SELECT id, name, avatar FROM users WHERE id = $1',
      [senderId]
    )

    const sender = senderResult.rows[0] || { id: senderId, name: 'Unknown', avatar: null }

    return NextResponse.json({
      message: {
        id: result.rows[0].id,
        senderId: result.rows[0].sender_id,
        receiverId: result.rows[0].receiver_id,
        communityId: result.rows[0].community_id,
        content: result.rows[0].content,
        attachments: result.rows[0].attachments,
        createdAt: result.rows[0].timestamp,
        sender,
      },
    }, { status: 201 })
  } catch (error) {
    console.error(error)
    return authErrorToResponse(error)
  }
}