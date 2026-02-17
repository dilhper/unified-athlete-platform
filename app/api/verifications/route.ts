import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    if (!type) {
      return NextResponse.json({ error: 'type query param is required' }, { status: 400 })
    }

    if (type === 'achievement') {
      const result = await query(
        `SELECT * FROM achievements WHERE status = $1 ORDER BY created_at DESC`,
        [status || 'pending']
      )
      return NextResponse.json({ verifications: result.rows })
    }

    if (type === 'certification') {
      const result = await query(
        `SELECT * FROM certifications WHERE status = $1 ORDER BY created_at DESC`,
        [status || 'pending']
      )
      return NextResponse.json({ verifications: result.rows })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch verifications' }, { status: 500 })
  }
}
