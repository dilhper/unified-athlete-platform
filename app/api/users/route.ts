import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { query } from '@/lib/db'

// GET /api/users - List all users
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const conditions: string[] = []
    const values: any[] = []

    if (role) {
      values.push(role)
      conditions.push(`role = $${values.length}`)
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const usersResult = await query(
      `SELECT id, email, name, role, avatar, bio, sport, specialization, rating,
              profile_verified, created_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    )

    const totalResult = await query(
      `SELECT COUNT(*)::int AS total FROM users ${whereClause}`,
      values
    )

    return NextResponse.json({
      users: usersResult.rows,
      pagination: {
        total: totalResult.rows[0]?.total ?? 0,
        limit,
        offset,
        hasMore: offset + limit < (totalResult.rows[0]?.total ?? 0),
      },
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST /api/users - Create a new user
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      email,
      name,
      role,
      avatar,
      bio,
      sport,
      specialization,
    } = body

    if (!email || !name || !role) {
      return NextResponse.json(
        { error: 'Email, name, and role are required' },
        { status: 400 }
      )
    }

    const existing = await query('SELECT id FROM users WHERE email = $1', [email])
    if (existing.rowCount > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    const id = randomUUID()
    const result = await query(
      `INSERT INTO users (
        id, email, name, role, avatar, bio, sport, specialization, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
      RETURNING id, email, name, role, avatar, bio, sport, specialization, rating, profile_verified, created_at`,
      [id, email, name, role, avatar || null, bio || null, sport || null, specialization || null]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}