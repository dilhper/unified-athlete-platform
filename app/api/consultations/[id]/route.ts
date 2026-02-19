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
      `SELECT sc.*, 
              u_athlete.name as athlete_name, u_athlete.email as athlete_email,
              u_specialist.name as specialist_name, u_specialist.email as specialist_email
       FROM specialist_consultations sc
       LEFT JOIN users u_athlete ON sc.athlete_id = u_athlete.id
       LEFT JOIN users u_specialist ON sc.specialist_id = u_specialist.id
       WHERE sc.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 })
    }

    return NextResponse.json({ consultation: result.rows[0] })
  } catch (error: any) {
    console.error("Error fetching consultation:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch consultation" },
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
    const { 
      specialist_id, 
      status, 
      scheduled_date, 
      consultation_notes, 
      recommendation 
    } = body

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (specialist_id !== undefined) {
      updates.push(`specialist_id = $${paramIndex++}`)
      values.push(specialist_id)
      if (status !== 'cancelled') {
        updates.push(`status = $${paramIndex++}`)
        values.push('assigned')
      }
    }

    if (status) {
      updates.push(`status = $${paramIndex++}`)
      values.push(status)
    }

    if (scheduled_date) {
      updates.push(`scheduled_date = $${paramIndex++}`)
      values.push(scheduled_date)
    }

    if (consultation_notes !== undefined) {
      updates.push(`consultation_notes = $${paramIndex++}`)
      values.push(consultation_notes)
    }

    if (recommendation !== undefined) {
      updates.push(`recommendation = $${paramIndex++}`)
      values.push(recommendation)
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    values.push(id)
    const queryText = `
      UPDATE specialist_consultations
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await query(queryText, values)

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 })
    }

    // Send notification to athlete if specialist assigned or status changed
    if (specialist_id || status) {
      const consultation = result.rows[0]
      await query(
        `INSERT INTO notifications (id, user_id, type, title, message, action_url)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          uuidv4(),
          consultation.athlete_id,
          'consultation_update',
          'Consultation Update',
          `Your consultation request has been ${status || 'assigned to a specialist'}`,
          `/athlete/consultations/${id}`
        ]
      )
    }

    return NextResponse.json({ consultation: result.rows[0] })
  } catch (error: any) {
    console.error("Error updating consultation:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update consultation" },
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
      `DELETE FROM specialist_consultations WHERE id = $1 RETURNING id`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Consultation not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Consultation deleted successfully" })
  } catch (error: any) {
    console.error("Error deleting consultation:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete consultation" },
      { status: 500 }
    )
  }
}
