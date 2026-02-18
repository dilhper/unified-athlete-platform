import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse } from '@/lib/authz'
import { logAudit } from '@/lib/audit'
import { withTransaction, TransactionClient } from '@/lib/transaction'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Only officials can approve/reject profile change requests
    const user = await requirePermission('APPROVE_REGISTRATION');
    
    const { id } = params
    const body = await request.json()
    const { status, reviewNotes } = body
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status (approved/rejected) is required' },
        { status: 400 }
      )
    }
    
    // Get the profile change request
    const requestResult = await query(
      `SELECT * FROM profile_change_requests WHERE id = $1`,
      [id]
    )
    
    if (requestResult.rowCount === 0) {
      return NextResponse.json(
        { error: 'Profile change request not found' },
        { status: 404 }
      )
    }
    
    const changeRequest = requestResult.rows[0]
    
    if (changeRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Profile change request has already been reviewed' },
        { status: 400 }
      )
    }
    
    // Use transaction for approval
    const txResult = await withTransaction(async (tx: TransactionClient) => {
      // Update the request status
      const updateRequest = await tx.query(
        `UPDATE profile_change_requests
         SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_notes = $3
         WHERE id = $4
         RETURNING *`,
        [status, user.id, reviewNotes || null, id]
      )
      
      // If approved, update the user's profile
      if (status === 'approved') {
        const requestedChanges = changeRequest.requested_changes
        const updateFields: string[] = []
        const updateValues: any[] = []
        let valueIndex = 1
        
        if (requestedChanges.athleteType !== undefined) {
          updateFields.push(`athlete_type = $${valueIndex++}`)
          updateValues.push(requestedChanges.athleteType)
        }
        if (requestedChanges.schoolClub !== undefined) {
          updateFields.push(`school_club = $${valueIndex++}`)
          updateValues.push(requestedChanges.schoolClub)
        }
        if (requestedChanges.dateOfBirth !== undefined) {
          updateFields.push(`date_of_birth = $${valueIndex++}`)
          updateValues.push(requestedChanges.dateOfBirth)
        }
        if (requestedChanges.nationalRanking !== undefined) {
          updateFields.push(`national_ranking = $${valueIndex++}`)
          updateValues.push(requestedChanges.nationalRanking)
        }
        if (requestedChanges.district !== undefined) {
          updateFields.push(`district = $${valueIndex++}`)
          updateValues.push(requestedChanges.district)
        }
        if (requestedChanges.trainingPlace !== undefined) {
          updateFields.push(`training_place = $${valueIndex++}`)
          updateValues.push(requestedChanges.trainingPlace)
        }
        
        if (updateFields.length > 0) {
          updateValues.push(changeRequest.user_id)
          await tx.query(
            `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW()
             WHERE id = $${valueIndex}`,
            updateValues
          )
        }
      }
      
      // Log audit
      logAudit({
        actorId: user.id,
        actorRole: user.role as 'official',
        action: status === 'approved' ? 'APPROVAL_GRANTED' : 'APPROVAL_DENIED',
        resourceType: 'profile_change_request',
        resourceId: id,
        result: 'success',
        statusBefore: { status: 'pending' },
        statusAfter: { status },
      })
      
      // Notify the athlete
      const notificationMessage = status === 'approved'
        ? 'Your profile change request has been approved and your profile has been updated.'
        : `Your profile change request has been rejected.${reviewNotes ? ' Reason: ' + reviewNotes : ''}`
      
      await tx.query(
        `INSERT INTO notifications (id, user_id, type, title, message, read, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, false, NOW())`,
        [
          changeRequest.user_id,
          status === 'approved' ? 'profile_change_approved' : 'profile_change_rejected',
          status === 'approved' ? 'Profile Updated' : 'Profile Change Rejected',
          notificationMessage
        ]
      )
      
      return updateRequest.rows[0]
    }, 'approve-profile-change')
    
    if (!txResult.success) {
      return NextResponse.json(
        { error: txResult.error?.message || 'Failed to process request' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      request: txResult.data,
      message: `Profile change request ${status} successfully`
    }, { status: 200 })
    
  } catch (error) {
    console.error('Error processing profile change request:', error)
    return authErrorToResponse(error)
  }
}
