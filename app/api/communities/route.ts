import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse } from '@/lib/authz'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const result = await query(
      `SELECT * FROM communities ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    )

    const totalResult = await query('SELECT COUNT(*)::int AS total FROM communities')

    return NextResponse.json({
      communities: result.rows,
      pagination: {
        total: totalResult.rows[0]?.total ?? 0,
        limit,
        offset,
        hasMore: offset + limit < (totalResult.rows[0]?.total ?? 0),
      },
    })
  } catch (error) {
    console.error('Error fetching communities:', error)
    return NextResponse.json({ error: 'Failed to fetch communities' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // RBAC: Only officials or coaches can create communities
    const user = await requirePermission('CREATE_COMMUNITY');

    const body = await request.json()
    const { name, description, creatorId, memberIds = [] } = body || {}

    // Verify user is creating community for themselves
    if (creatorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only create communities for yourself' },
        { status: 403 }
      );
    }

    if (!name || !creatorId) {
      return NextResponse.json({ error: 'name and creatorId are required' }, { status: 400 })
    }

    const id = randomUUID()
    const members = Array.from(new Set([creatorId, ...memberIds]))

    const result = await query(
      `INSERT INTO communities (
        id,
        name,
        description,
        creator_id,
        member_ids,
        created_at
      ) VALUES ($1,$2,$3,$4,$5,NOW())
      RETURNING *`,
      [id, name, description || null, creatorId, members]
    )

    return NextResponse.json({ community: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Error creating community:', error)
    return authErrorToResponse(error)
  }
}