import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'

export type UserRole = 'athlete' | 'coach' | 'specialist' | 'official'

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.email) {
    return null
  }

  const result = await query(
    `SELECT id, email, name, role, avatar, bio, sport, specialization, rating, profile_verified 
     FROM users WHERE email = $1`,
    [session.user.email]
  )

  if (result.rowCount === 0) return null
  
  const row = result.rows[0]
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    avatar: row.avatar,
    image: row.avatar,
    bio: row.bio,
    sport: row.sport,
    specialization: row.specialization,
    rating: row.rating,
    profileVerified: row.profile_verified,
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
      user: null,
    }
  }

  return { user, error: null }
}

export async function requireRole(allowedRoles: string[]) {
  const { user, error } = await requireAuth()
  
  if (error) {
    return { user: null, error }
  }

  if (!allowedRoles.includes(user!.role)) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      ),
      user: null,
    }
  }

  return { user, error: null }
}
