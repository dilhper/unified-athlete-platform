import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse } from '@/lib/authz'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// GET - Fetch profile change requests
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')
    
    // Athletes can view their own requests, officials can view all
    const user = await requirePermission('UPDATE_OWN_PROFILE');
    
    const conditions: string[] = []
    const values: any[] = []
    
    // If not an official, only show user's own requests
    if (user.role !== 'official') {
      values.push(user.id)
      conditions.push(`user_id = $${values.length}`)
    } else if (userId) {
      values.push(userId)
      conditions.push(`user_id = $${values.length}`)
    }
    
    if (status) {
      values.push(status)
      conditions.push(`status = $${values.length}`)
    }
    
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    
    const result = await query(
      `SELECT pcr.*, 
              u.name as user_name,
              u.email as user_email,
              u.athlete_type,
              u.school_club,
              u.date_of_birth,
              u.national_ranking,
              u.district,
              u.training_place,
              reviewer.name as reviewer_name
       FROM profile_change_requests pcr
       JOIN users u ON pcr.user_id = u.id
       LEFT JOIN users reviewer ON pcr.reviewed_by = reviewer.id
       ${whereClause}
       ORDER BY pcr.created_at DESC`,
      values
    )
    
    return NextResponse.json({ requests: result.rows }, { status: 200 })
  } catch (error) {
    console.error('Error fetching profile change requests:', error)
    return authErrorToResponse(error)
  }
}

// POST - Submit a profile change request
export async function POST(request: Request) {
  try {
    // Only athletes can submit profile change requests
    const user = await requirePermission('UPDATE_OWN_PROFILE');
    
    if (user.role !== 'athlete') {
      return NextResponse.json(
        { error: 'Only athletes can submit profile change requests' },
        { status: 403 }
      )
    }
    
    const formData = await request.formData()
    const reason = formData.get('reason') as string
    const document = formData.get('document') as File | null
    const requestedChangesStr = formData.get('requestedChanges') as string
    
    if (!reason || !requestedChangesStr) {
      return NextResponse.json(
        { error: 'Reason and requested changes are required' },
        { status: 400 }
      )
    }
    
    if (!document) {
      return NextResponse.json(
        { error: 'Supporting document is required for profile changes' },
        { status: 400 }
      )
    }
    
    let requestedChanges: any
    try {
      requestedChanges = JSON.parse(requestedChangesStr)
    } catch (err) {
      return NextResponse.json(
        { error: 'Invalid requested changes format' },
        { status: 400 }
      )
    }
    
    // Save document
    const docsDir = join(process.cwd(), 'public', 'profile-change-documents')
    if (!existsSync(docsDir)) {
      await mkdir(docsDir, { recursive: true })
    }
    
    const fileBuffer = await document.arrayBuffer()
    const filename = `${user.id}-${Date.now()}-${document.name}`
    const filepath = join(docsDir, filename)
    
    await writeFile(filepath, Buffer.from(fileBuffer))
    
    // Create profile change request
    const id = randomUUID()
    const result = await query(
      `INSERT INTO profile_change_requests (
        id, user_id, requested_changes, reason,
        document_path, document_name, document_size, document_mime_type,
        status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW())
      RETURNING *`,
      [
        id,
        user.id,
        JSON.stringify(requestedChanges),
        reason,
        `/profile-change-documents/${filename}`,
        document.name,
        fileBuffer.byteLength,
        document.type
      ]
    )
    
    // Notify officials
    await query(
      `INSERT INTO notifications (id, user_id, type, title, message, read, created_at)
       SELECT gen_random_uuid(), id, 'profile_change_request', 
              'New Profile Change Request',
              $1 || ' has requested to update their profile.',
              false, NOW()
       FROM users WHERE role = 'official'`,
      [user.name]
    )
    
    return NextResponse.json({
      request: result.rows[0],
      message: 'Profile change request submitted successfully'
    }, { status: 201 })
    
  } catch (error) {
    console.error('Error creating profile change request:', error)
    return authErrorToResponse(error)
  }
}
