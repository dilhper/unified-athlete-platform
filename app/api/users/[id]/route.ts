import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(_req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const result = await query('SELECT * FROM users WHERE id = $1', [id])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user: result.rows[0] })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function PUT(req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const body = await req.json()
    const {
      name,
      email,
      avatar,
      bio,
      sport,
      specialization,
      rating,
      profileVerified,
      profilePendingVerification,
      documents,
    } = body || {}

    const result = await query(
      `UPDATE users
       SET name = COALESCE($2, name),
           email = COALESCE($3, email),
           avatar = COALESCE($4, avatar),
           bio = COALESCE($5, bio),
           sport = COALESCE($6, sport),
           specialization = COALESCE($7, specialization),
           rating = COALESCE($8, rating),
           profile_verified = COALESCE($9, profile_verified),
           profile_pending_verification = COALESCE($10, profile_pending_verification),
           documents = COALESCE($11, documents),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        name ?? null,
        email ?? null,
        avatar ?? null,
        bio ?? null,
        sport ?? null,
        specialization ?? null,
        rating ?? null,
        profileVerified ?? null,
        profilePendingVerification ?? null,
        documents ?? null,
      ]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user: result.rows[0] })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}