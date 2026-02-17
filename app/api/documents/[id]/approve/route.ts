import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { action, reason } = await req.json()

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (action === 'reject' && !reason) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
    }

    // Update document status
    if (action === 'approve') {
      await query(
        `UPDATE document_submissions 
         SET status = 'approved', approved_by = (SELECT id FROM users WHERE role = 'official' LIMIT 1), approved_at = NOW()
         WHERE id = $1`,
        [params.id]
      )
    } else {
      await query(
        `UPDATE document_submissions 
         SET status = 'rejected', rejection_reason = $1, approved_by = (SELECT id FROM users WHERE role = 'official' LIMIT 1), approved_at = NOW()
         WHERE id = $2`,
        [reason, params.id]
      )
    }

    // Get the document to find the user
    const docResult = await query(
      `SELECT user_id FROM document_submissions WHERE id = $1`,
      [params.id]
    )

    if (docResult.rows.length === 0) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const userId = docResult.rows[0].user_id

    // Update user's profile_pending_verification based on all documents
    const docStatusResult = await query(
      `SELECT COUNT(*) as total, 
              SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
              SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
       FROM document_submissions WHERE user_id = $1`,
      [userId]
    )

    const stats = docStatusResult.rows[0]

    // If all documents are approved, verify the user
    if (parseInt(stats.total) === parseInt(stats.approved) && parseInt(stats.approved) > 0) {
      await query(
        `UPDATE users SET profile_verified = true, profile_pending_verification = false, email_verified = true WHERE id = $1`,
        [userId]
      )
    } else if (parseInt(stats.rejected) > 0) {
      // If any are rejected, keep pending
      await query(
        `UPDATE users SET profile_pending_verification = true, profile_verified = false WHERE id = $1`,
        [userId]
      )
    }

    return NextResponse.json({
      message: `Document ${action}ed successfully`,
    })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to process document' }, { status: 500 })
  }
}
