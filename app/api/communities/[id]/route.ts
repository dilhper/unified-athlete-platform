import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(_req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const result = await query('SELECT * FROM communities WHERE id = $1', [id])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 })
    }

    return NextResponse.json({ community: result.rows[0] })
  } catch (error) {
    console.error('Error fetching community:', error)
    return NextResponse.json({ error: 'Failed to fetch community' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const body = await req.json()
    const { name, description, memberIds } = body || {}

    const result = await query(
      `UPDATE communities
       SET name = COALESCE($2, name),
           description = COALESCE($3, description),
           member_ids = COALESCE($4, member_ids)
       WHERE id = $1
       RETURNING *`,
      [id, name ?? null, description ?? null, memberIds ?? null]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 })
    }

    return NextResponse.json({ community: result.rows[0] })
  } catch (error) {
    console.error('Error updating community:', error)
    return NextResponse.json({ error: 'Failed to update community' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const result = await query('DELETE FROM communities WHERE id = $1 RETURNING id', [id])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Community deleted successfully' })
  } catch (error) {
    console.error('Error deleting community:', error)
    return NextResponse.json({ error: 'Failed to delete community' }, { status: 500 })
  }
}