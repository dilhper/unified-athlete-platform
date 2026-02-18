import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse } from '@/lib/authz'
import { logAudit } from '@/lib/audit'

export async function PATCH(
  request: Request, 
  { params }: { params: { id: string } }
) {
  try {
    // Only coaches can approve/reject sport registrations
    const user = await requirePermission('APPROVE_SPORT_REGISTRATION');
    
    const { id } = params
    const body = await request.json()
    const { status, notes } = body
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status (approved/rejected) is required' },
        { status: 400 }
      )
    }
    
    // Get the sport registration to verify coach ownership
    const regResult = await query(
      `SELECT * FROM sport_registrations WHERE id = $1`,
      [id]
    )
    
    if (regResult.rowCount === 0) {
      return NextResponse.json(
        { error: 'Sport registration not found' },
        { status: 404 }
      )
    }
    
    const registration = regResult.rows[0]
    
    // Verify that the coach is the one assigned to this registration
    if (registration.coach_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only approve/reject registrations for your own athletes' },
        { status: 403 }
      )
    }
    
    // Update the registration status
    const updateResult = await query(
      `UPDATE sport_registrations 
       SET status = $1
       WHERE id = $2
       RETURNING *`,
      [status, id]
    )
    
    // Log the approval/rejection
    logAudit({
      actorId: user.id,
      actorRole: user.role as 'coach',
      action: status === 'approved' ? 'APPROVAL_GRANTED' : 'APPROVAL_DENIED',
      resourceType: 'sport_registration',
      resourceId: id,
      result: 'success',
      statusBefore: { status: registration.status },
      statusAfter: { status },
    })
    
    // Create notification for the athlete
    const notificationMessage = status === 'approved' 
      ? `Your sport registration for ${registration.sport} has been approved by your coach.`
      : `Your sport registration for ${registration.sport} has been rejected by your coach.${notes ? ' Reason: ' + notes : ''}`
    
    await query(
      `INSERT INTO notifications (id, user_id, type, title, message, read, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, false, NOW())`,
      [
        registration.athlete_id,
        status === 'approved' ? 'registration_approved' : 'registration_rejected',
        status === 'approved' ? 'Sport Registration Approved' : 'Sport Registration Rejected',
        notificationMessage
      ]
    )
    
    return NextResponse.json({ 
      registration: updateResult.rows[0],
      message: `Sport registration ${status} successfully`
    }, { status: 200 })
    
  } catch (error) {
    console.error('Error updating sport registration:', error)
    return authErrorToResponse(error)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Athletes can cancel their own pending registrations
    const user = await requirePermission('APPLY_TO_OPPORTUNITY');
    
    const { id } = params
    
    // Get the sport registration to verify athlete ownership
    const regResult = await query(
      `SELECT * FROM sport_registrations WHERE id = $1`,
      [id]
    )
    
    if (regResult.rowCount === 0) {
      return NextResponse.json(
        { error: 'Sport registration not found' },
        { status: 404 }
      )
    }
    
    const registration = regResult.rows[0]
    
    // Verify that the athlete is canceling their own registration
    if (registration.athlete_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only cancel your own sport registrations' },
        { status: 403 }
      )
    }
    
    // Only allow canceling pending registrations
    if (registration.status !== 'pending') {
      return NextResponse.json(
        { error: 'You can only cancel pending registrations' },
        { status: 400 }
      )
    }
    
    // Delete the registration
    await query(
      `DELETE FROM sport_registrations WHERE id = $1`,
      [id]
    )
    
    // Log the cancellation
    logAudit({
      actorId: user.id,
      actorRole: user.role as 'athlete',
      action: 'RESOURCE_DELETED',
      resourceType: 'sport_registration',
      resourceId: id,
      result: 'success',
      statusBefore: { status: registration.status, sport: registration.sport },
      statusAfter: { deleted: true },
    })
    
    // Create notification for the coach
    await query(
      `INSERT INTO notifications (id, user_id, type, title, message, read, created_at)
       VALUES (gen_random_uuid(), $1, 'registration_cancelled', 'Sport Registration Cancelled', $2, false, NOW())`,
      [
        registration.coach_id,
        `An athlete has cancelled their pending registration for ${registration.sport}.`
      ]
    )
    
    return NextResponse.json({ 
      message: 'Sport registration cancelled successfully'
    }, { status: 200 })
    
  } catch (error) {
    console.error('Error deleting sport registration:', error)
    return authErrorToResponse(error)
  }
}
