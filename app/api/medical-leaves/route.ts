import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { v4 as uuidv4 } from "uuid"

export async function GET(request: NextRequest) {
  try {
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
    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get("athleteId")
    const coachId = searchParams.get("coachId")
    const specialistId = searchParams.get("specialistId")
    const status = searchParams.get("status")

    let queryText = `
      SELECT mlr.*, 
             u_athlete.name as athlete_name, u_athlete.email as athlete_email,
             u_coach.name as coach_name, u_coach.email as coach_email,
             u_specialist.name as specialist_name, u_specialist.email as specialist_email
      FROM medical_leave_requests mlr
      LEFT JOIN users u_athlete ON mlr.athlete_id = u_athlete.id
      LEFT JOIN users u_coach ON mlr.coach_id = u_coach.id
      LEFT JOIN users u_specialist ON mlr.specialist_id = u_specialist.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    // Filter based on user role
    if (user.role === 'athlete') {
      queryText += ` AND mlr.athlete_id = $${paramIndex++}`
      params.push(user.id)
    } else if (user.role === 'coach') {
      queryText += ` AND mlr.coach_id = $${paramIndex++}`
      params.push(user.id)
    } else if (user.role === 'specialist') {
      queryText += ` AND (mlr.specialist_id = $${paramIndex++} OR mlr.status = 'pending_specialist_review')`
      params.push(user.id)
    }

    // Additional filters
    if (athleteId) {
      queryText += ` AND mlr.athlete_id = $${paramIndex++}`
      params.push(athleteId)
    }
    if (coachId) {
      queryText += ` AND mlr.coach_id = $${paramIndex++}`
      params.push(coachId)
    }
    if (specialistId) {
      queryText += ` AND mlr.specialist_id = $${paramIndex++}`
      params.push(specialistId)
    }
    if (status) {
      queryText += ` AND mlr.status = $${paramIndex++}`
      params.push(status)
    }

    queryText += ` ORDER BY mlr.created_at DESC`

    const result = await query(queryText, params)

    return NextResponse.json({ medicalLeaves: result.rows })
  } catch (error: any) {
    console.error("Error fetching medical leave requests:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch medical leave requests" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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

    if (user.role !== 'athlete') {
      return NextResponse.json(
        { error: "Only athletes can create medical leave requests" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { 
      coach_id, 
      leave_type, 
      reason, 
      start_date, 
      end_date,
      medical_certificate_path,
      medical_certificate_name,
      medical_certificate_size
    } = body

    if (!coach_id || !leave_type || !reason || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Coach, leave type, reason, start date, and end date are required" },
        { status: 400 }
      )
    }

    // Calculate duration
    const startDateObj = new Date(start_date)
    const endDateObj = new Date(end_date)
    const durationDays = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const leaveId = uuidv4()

    await query(
      `INSERT INTO medical_leave_requests 
       (id, athlete_id, coach_id, leave_type, reason, start_date, end_date, duration_days,
        medical_certificate_path, medical_certificate_name, medical_certificate_size, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        leaveId,
        user.id,
        coach_id,
        leave_type,
        reason,
        start_date,
        end_date,
        durationDays,
        medical_certificate_path || null,
        medical_certificate_name || null,
        medical_certificate_size || null,
        'pending_specialist_review'
      ]
    )

    // Notify all specialists about new leave request
    const specialists = await query(
      `SELECT id FROM users WHERE role = 'specialist' AND profile_verified = true`,
      []
    )

    for (const specialist of specialists.rows) {
      await query(
        `INSERT INTO notifications (id, user_id, type, title, message, action_url)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          uuidv4(),
          specialist.id,
          'medical_leave_request',
          'New Medical Leave Request',
          `An athlete has submitted a ${leave_type} leave request requiring review`,
          `/specialist/medical-leaves/${leaveId}`
        ]
      )
    }

    // Notify coach that request has been submitted
    await query(
      `INSERT INTO notifications (id, user_id, type, title, message, action_url)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        uuidv4(),
        coach_id,
        'medical_leave_request',
        'Medical Leave Request Submitted',
        `Your athlete has submitted a medical leave request pending specialist review`,
        `/coach/medical-leaves/${leaveId}`
      ]
    )

    const newLeave = await query(
      `SELECT mlr.*, 
              u_athlete.name as athlete_name, u_athlete.email as athlete_email,
              u_coach.name as coach_name, u_coach.email as coach_email
       FROM medical_leave_requests mlr
       LEFT JOIN users u_athlete ON mlr.athlete_id = u_athlete.id
       LEFT JOIN users u_coach ON mlr.coach_id = u_coach.id
       WHERE mlr.id = $1`,
      [leaveId]
    )

    return NextResponse.json({ medicalLeave: newLeave.rows[0] }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating medical leave request:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create medical leave request" },
      { status: 500 }
    )
  }
}
