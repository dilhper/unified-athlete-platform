import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const result = await query(
      `SELECT id, name, email, specialization, specialty, created_at
       FROM users
       WHERE role = 'specialist'
         AND profile_pending_verification = true
         AND profile_verified = false
       ORDER BY created_at DESC`
    )

    return NextResponse.json({ specialists: result.rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch pending specialists' }, { status: 500 })
  }
}
