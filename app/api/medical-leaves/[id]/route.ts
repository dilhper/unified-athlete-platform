import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { v4 as uuidv4 } from "uuid"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await query(
      `SELECT mlr.*, 
              u_athlete.name as athlete_name, u_athlete.email as athlete_email,
              u_coach.name as coach_name, u_coach.email as coach_email,
              u_specialist.name as specialist_name, u_specialist.email as specialist_email
       FROM medical_leave_requests mlr
       LEFT JOIN users u_athlete ON mlr.athlete_id = u_athlete.id
       LEFT JOIN users u_coach ON mlr.coach_id = u_coach.id
       LEFT JOIN users u_specialist ON mlr.specialist_id = u_specialist.id
       WHERE mlr.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Medical leave request not found" }, { status: 404 })
    }

    return NextResponse.json({ medicalLeave: result.rows[0] })
  } catch (error: any) {
    console.error("Error fetching medical leave request:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch medical leave request" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userResult = await query(
      `SELECT id, role FROM users WHERE email = $1`,
      [session.user.email]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const user = userResult.rows[0]
    const body = await request.json()

    // Get the current leave request
    const currentLeave = await query(
      `SELECT * FROM medical_leave_requests WHERE id = $1`,
      [id]
    )

    if (currentLeave.rows.length === 0) {
      return NextResponse.json({ error: "Medical leave request not found" }, { status: 404 })
    }

    const leave = currentLeave.rows[0]

    // Specialist Review
    if (user.role === 'specialist' && body.specialist_review) {
      const { specialist_review, specialist_recommendation } = body

      await query(
        `UPDATE medical_leave_requests
         SET specialist_id = $1,
             specialist_review = $2,
             specialist_recommendation = $3,
             specialist_reviewed_at = CURRENT_TIMESTAMP,
             status = $4
         WHERE id = $5`,
        [
          user.id,
          specialist_review,
          specialist_recommendation,
          specialist_recommendation === 'reject' ? 'rejected' : 'pending_coach_decision',
          id
        ]
      )

      // Notify coach of specialist review
      await query(
        `INSERT INTO notifications (id, user_id, type, title, message, action_url)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          uuidv4(),
          leave.coach_id,
          'medical_leave_reviewed',
          'Medical Leave Review Complete',
          `A specialist has reviewed the medical leave request with recommendation: ${specialist_recommendation}`,
          `/coach/medical-leaves/${id}`
        ]
      )

      // Notify athlete
      await query(
        `INSERT INTO notifications (id, user_id, type, title, message, action_url)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          uuidv4(),
          leave.athlete_id,
          'medical_leave_reviewed',
          'Medical Leave Review Complete',
          `Your medical leave request has been reviewed by a specialist`,
          `/athlete/medical-leaves/${id}`
        ]
      )
    }

    // Coach Decision
    if (user.role === 'coach' && body.coach_decision) {
      const { coach_decision, coach_notes } = body

      if (leave.status !== 'pending_coach_decision' && leave.status !== 'specialist_reviewed') {
        return NextResponse.json(
          { error: "This leave request is not ready for coach decision" },
          { status: 400 }
        )
      }

      await query(
        `UPDATE medical_leave_requests
         SET coach_decision = $1,
             coach_notes = $2,
             coach_decided_at = CURRENT_TIMESTAMP,
             status = $3
         WHERE id = $4`,
        [
          coach_decision,
          coach_notes,
          'approved',
          id
        ]
      )

      // Notify athlete of coach decision
      await query(
        `INSERT INTO notifications (id, user_id, type, title, message, action_url)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          uuidv4(),
          leave.athlete_id,
          'medical_leave_decision',
          'Coach Decision on Medical Leave',
          `Your coach has decided: ${coach_decision}`,
          `/athlete/medical-leaves/${id}`
        ]
      )
    }

    // Get updated leave request
    const updatedLeave = await query(
      `SELECT mlr.*, 
              u_athlete.name as athlete_name, u_athlete.email as athlete_email,
              u_coach.name as coach_name, u_coach.email as coach_email,
              u_specialist.name as specialist_name, u_specialist.email as specialist_email
       FROM medical_leave_requests mlr
       LEFT JOIN users u_athlete ON mlr.athlete_id = u_athlete.id
       LEFT JOIN users u_coach ON mlr.coach_id = u_coach.id
       LEFT JOIN users u_specialist ON mlr.specialist_id = u_specialist.id
       WHERE mlr.id = $1`,
      [id]
    )

    return NextResponse.json({ medicalLeave: updatedLeave.rows[0] })
  } catch (error: any) {
    console.error("Error updating medical leave request:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update medical leave request" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await query(
      `DELETE FROM medical_leave_requests WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Medical leave request not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Medical leave request deleted successfully" })
  } catch (error: any) {
    console.error("Error deleting medical leave request:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete medical leave request" },
      { status: 500 }
    )
  }
}
