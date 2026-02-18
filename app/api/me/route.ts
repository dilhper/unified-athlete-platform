import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'

// GET /api/me - Get current authenticated user
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Fetch full user data from database
    const result = await query(
      `SELECT 
        id, email, phone, name, role, avatar, bio, sport, specialization, specialty,
        rating, profile_verified, profile_pending_verification, created_at,
        athlete_type, school_club, date_of_birth, national_ranking, district, training_place,
        years_of_experience, location, documents, email_verified, is_admin
       FROM users 
       WHERE email = $1 OR phone = $1`,
      [session.user.email]
    )

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user: result.rows[0] })
  } catch (error) {
    console.error('Error fetching current user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    )
  }
}
