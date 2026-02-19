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
    const specialistId = searchParams.get("specialistId")
    const status = searchParams.get("status")

    let queryText = `
      SELECT sc.*, 
             u_athlete.name as athlete_name, u_athlete.email as athlete_email,
             u_specialist.name as specialist_name, u_specialist.email as specialist_email
      FROM specialist_consultations sc
      LEFT JOIN users u_athlete ON sc.athlete_id = u_athlete.id
      LEFT JOIN users u_specialist ON sc.specialist_id = u_specialist.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    // Filter based on user role
    if (user.role === 'athlete') {
      queryText += ` AND sc.athlete_id = $${paramIndex++}`
      params.push(user.id)
    } else if (user.role === 'specialist') {
      if (status === 'pending') {
        queryText += ` AND (sc.specialist_id IS NULL OR sc.specialist_id = $${paramIndex++})`
        params.push(user.id)
      } else {
        queryText += ` AND sc.specialist_id = $${paramIndex++}`
        params.push(user.id)
      }
    }

    // Additional filters
    if (athleteId) {
      queryText += ` AND sc.athlete_id = $${paramIndex++}`
      params.push(athleteId)
    }
    if (specialistId) {
      queryText += ` AND sc.specialist_id = $${paramIndex++}`
      params.push(specialistId)
    }
    if (status) {
      queryText += ` AND sc.status = $${paramIndex++}`
      params.push(status)
    }

    queryText += ` ORDER BY sc.created_at DESC`

    const result = await query(queryText, params)

    return NextResponse.json({ consultations: result.rows })
  } catch (error: any) {
    console.error("Error fetching consultations:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch consultations" },
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
        { error: "Only athletes can create consultation requests" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { consultation_type, reason, symptoms, urgency, preferred_date, attachments } = body

    if (!consultation_type || !reason) {
      return NextResponse.json(
        { error: "Consultation type and reason are required" },
        { status: 400 }
      )
    }

    const consultationId = uuidv4()

    await query(
      `INSERT INTO specialist_consultations 
       (id, athlete_id, consultation_type, reason, symptoms, urgency, preferred_date, attachments, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        consultationId,
        user.id,
        consultation_type,
        reason,
        symptoms || null,
        urgency || 'normal',
        preferred_date || null,
        attachments || [],
        'pending'
      ]
    )

    // Create a notification for all specialists
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
          'consultation_request',
          'New Consultation Request',
          `An athlete has requested a ${consultation_type} consultation`,
          `/specialist/consultations/${consultationId}`
        ]
      )
    }

    const newConsultation = await query(
      `SELECT sc.*, 
              u_athlete.name as athlete_name, u_athlete.email as athlete_email
       FROM specialist_consultations sc
       LEFT JOIN users u_athlete ON sc.athlete_id = u_athlete.id
       WHERE sc.id = $1`,
      [consultationId]
    )

    return NextResponse.json({ consultation: newConsultation.rows[0] }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating consultation:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create consultation" },
      { status: 500 }
    )
  }
}
