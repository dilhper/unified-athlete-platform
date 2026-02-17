import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    console.log('Fetching pending documents...')
    const result = await query(
      `SELECT 
        ds.id,
        ds.user_id,
        ds.role,
        ds.document_type,
        ds.file_path,
        ds.original_filename,
        ds.submitted_at,
        ds.status,
        ds.rejection_reason,
        u.email as user_email,
        u.phone as user_phone,
        u.name as user_name,
        u.sport as user_sport
      FROM document_submissions ds
      JOIN users u ON ds.user_id = u.id
      WHERE ds.status = 'pending'
      ORDER BY ds.submitted_at DESC`,
      []
    )

    console.log('Query result:', result.rows.length, 'documents found')
    if (result.rows.length > 0) {
      console.log('First row:', result.rows[0])
    }

    return NextResponse.json({
      documents: result.rows,
      count: result.rows.length,
    })
  } catch (error: any) {
    console.error('Error fetching documents:', error.message)
    console.error('Stack:', error.stack)
    return NextResponse.json({ error: 'Failed to fetch documents', details: error.message }, { status: 500 })
  }
}
