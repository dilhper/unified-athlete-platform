import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const result = await query(
      `SELECT 
        u.id, u.name, u.email, u.phone, u.role, u.athlete_type, u.location, u.sport, u.specialty, u.specialization,
        u.years_of_experience, u.is_admin, u.profile_verified, u.profile_pending_verification, u.created_at,
        json_agg(
          json_build_object(
            'id', ds.id,
            'documentType', ds.document_type,
            'fileName', ds.original_filename,
            'filePath', ds.file_path,
            'submittedAt', ds.submitted_at,
            'status', ds.status,
            'rejectionReason', ds.rejection_reason
          ) ORDER BY ds.submitted_at DESC
        ) FILTER (WHERE ds.id IS NOT NULL) as documents
       FROM users u
       LEFT JOIN document_submissions ds ON u.id = ds.user_id
       WHERE u.registration_verified = false AND u.registration_rejected = false
       GROUP BY u.id, u.name, u.email, u.phone, u.role, u.athlete_type, u.location, u.sport, u.specialty, u.specialization,
                u.years_of_experience, u.is_admin, u.profile_verified, u.profile_pending_verification, u.created_at
       ORDER BY u.created_at DESC`
    )

    return NextResponse.json({ registrations: result.rows })
  } catch (error: any) {
    console.error('Error fetching registrations:', error)
    return NextResponse.json({ error: 'Failed to fetch registrations', details: error.message }, { status: 500 })
  }
}
