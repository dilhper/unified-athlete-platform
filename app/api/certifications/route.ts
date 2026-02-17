import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse } from '@/lib/authz'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const coachId = searchParams.get('coachId')

    if (!coachId) {
      return NextResponse.json({ error: 'coachId query param is required' }, { status: 400 })
    }

    const result = await query(
      `SELECT * FROM certifications WHERE coach_id = $1 ORDER BY created_at DESC`,
      [coachId]
    )

    return NextResponse.json({ certifications: result.rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch certifications' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    // RBAC: Only coaches can submit certifications
    const user = await requirePermission('SUBMIT_CERTIFICATION');

    const body = await req.json()
    const {
      coachId,
      title,
      issuingOrganization,
      issueDate,
      expiryDate,
      credentialId,
      attachments,
      notes,
    } = body || {}

    // Verify coach is submitting for themselves
    if (coachId !== user.id) {
      return NextResponse.json(
        { error: 'You can only submit certifications for yourself' },
        { status: 403 }
      );
    }

    if (!coachId || !title || !issuingOrganization || !issueDate) {
      return NextResponse.json(
        { error: 'coachId, title, issuingOrganization, and issueDate are required' },
        { status: 400 }
      )
    }

    const id = randomUUID()

    const result = await query(
      `INSERT INTO certifications (
        id,
        coach_id,
        title,
        issuing_organization,
        issue_date,
        expiry_date,
        credential_id,
        attachments,
        notes,
        status,
        created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',NOW())
      RETURNING *`,
      [
        id,
        coachId,
        title,
        issuingOrganization,
        issueDate,
        expiryDate || null,
        credentialId || null,
        attachments || null,
        notes || null,
      ]
    )

    return NextResponse.json({ certification: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error(error)
    return authErrorToResponse(error)
  }
}
