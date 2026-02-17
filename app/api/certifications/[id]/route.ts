import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(_req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const result = await query('SELECT * FROM certifications WHERE id = $1', [id])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 })
    }

    return NextResponse.json({ certification: result.rows[0] })
  } catch (error) {
    console.error('Error fetching certification:', error)
    return NextResponse.json({ error: 'Failed to fetch certification' }, { status: 500 })
  }
}

export async function PATCH(req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const body = await req.json()
    const { status, verifiedBy } = body || {}

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    const result = await query(
      `UPDATE certifications
       SET status = $2,
           verified_by = COALESCE($3, verified_by),
           verified_date = CASE WHEN $2 IS NOT NULL AND $2 <> 'pending' THEN NOW() ELSE verified_date END
       WHERE id = $1
       RETURNING *`,
      [id, status, verifiedBy || null]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 })
    }

    return NextResponse.json({ certification: result.rows[0] })
  } catch (error) {
    console.error('Error updating certification:', error)
    return NextResponse.json({ error: 'Failed to update certification' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params
    const result = await query('DELETE FROM certifications WHERE id = $1 RETURNING id', [id])

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Certification not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Certification deleted successfully' })
  } catch (error) {
    console.error('Error deleting certification:', error)
    return NextResponse.json({ error: 'Failed to delete certification' }, { status: 500 })
  }
}
