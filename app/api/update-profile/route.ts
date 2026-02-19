import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { query } from '@/lib/db'

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userResult = await query(
      `SELECT id FROM users WHERE email = $1`,
      [session.user.email]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = userResult.rows[0].id
    const body = await request.json()
    const { phone, name } = body

    // Validate phone if provided
    if (phone !== undefined && phone !== null) {
      if (typeof phone !== 'string' || (phone.trim() && !/^[\d\s\-+()]+$/.test(phone))) {
        return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
      }
    }

    // Build update query dynamically
    const updates = []
    const params = []
    let paramCount = 1

    if (phone !== undefined) {
      updates.push(`phone = $${paramCount}`)
      params.push(phone || null)
      paramCount++
    }

    if (name !== undefined && name !== null) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      }
      updates.push(`name = $${paramCount}`)
      params.push(name.trim())
      paramCount++
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    params.push(userId)

    // Update user
    const updateQuery = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, name, phone, role, avatar, created_at
    `

    const result = await query(updateQuery, params)

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: result.rows[0],
      message: 'Profile updated successfully'
    })
  } catch (error: any) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update profile' },
      { status: 500 }
    )
  }
}
