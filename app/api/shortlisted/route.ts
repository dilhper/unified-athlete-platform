import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const conditions: string[] = []
    const values: any[] = []

    if (status) {
      values.push(status)
      conditions.push(`status = $${values.length}`)
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await query(
      `SELECT * FROM shortlisted ${whereClause} ORDER BY created_at DESC`,
      values
    )

    return NextResponse.json({ shortlisted: result.rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch shortlisted' }, { status: 500 })
  }
}
