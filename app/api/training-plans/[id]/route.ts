import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    console.log("[Training Plan API] Fetching plan:", id)
    
    // Get current user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      console.log("[Training Plan API] Unauthorized - No session")
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    console.log("[Training Plan API] User email:", session.user.email)

    // Get user info
    const userResult = await query(
      `SELECT id, role FROM users WHERE email = $1`,
      [session.user.email]
    )

    if (userResult.rows.length === 0) {
      console.log("[Training Plan API] User not found in database")
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const user = userResult.rows[0]
    console.log("[Training Plan API] User:", user.id, "Role:", user.role)

    // Get training plan
    const result = await query(
      `SELECT * FROM training_plans WHERE id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      console.log("[Training Plan API] Training plan not found in database")
      return NextResponse.json(
        { error: "Training plan not found" },
        { status: 404 }
      )
    }

    const plan = result.rows[0]
    console.log("[Training Plan API] Found plan:", plan.id, "Coach:", plan.coach_id)
    
    // Check if athlete is assigned to this plan
    if (user.role === 'athlete') {
      console.log("[Training Plan API] Checking athlete assignment...")
      const assignmentResult = await query(
        `SELECT plan_id FROM training_plan_athletes WHERE plan_id = $1 AND athlete_id = $2`,
        [id, user.id]
      )
      
      console.log("[Training Plan API] Assignment rows found:", assignmentResult.rows.length)
      
      if (assignmentResult.rows.length === 0) {
        console.log("[Training Plan API] Athlete not assigned to this plan")
        return NextResponse.json(
          { error: "You are not assigned to this training plan" },
          { status: 403 }
        )
      }
      console.log("[Training Plan API] Athlete is assigned - Access granted")
    } else if (user.role === 'coach') {
      // Verify coach owns this plan
      console.log("[Training Plan API] Checking coach ownership...")
      if (plan.coach_id !== user.id) {
        console.log("[Training Plan API] Coach does not own this plan")
        return NextResponse.json(
          { error: "You do not have access to this training plan" },
          { status: 403 }
        )
      }
      console.log("[Training Plan API] Coach owns plan - Access granted")
    }
    
    // Parse athleteIds if stored as JSON
    if (plan.athlete_ids && typeof plan.athlete_ids === 'string') {
      plan.athleteIds = JSON.parse(plan.athlete_ids)
    } else {
      plan.athleteIds = plan.athlete_ids || []
    }

    return NextResponse.json({
      trainingPlan: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        coachId: plan.coach_id,
        athleteIds: plan.athleteIds,
        status: plan.status,
        startDate: plan.start_date,
        endDate: plan.end_date,
        completionStatus: plan.completion_status,
        createdAt: plan.created_at,
      },
    })
  } catch (error: any) {
    console.error("Error fetching training plan:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch training plan" },
      { status: error.status || 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Verify user is authenticated
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { status, completion_status, completion_notes } = body

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (status) {
      updates.push(`status = $${paramIndex++}`)
      values.push(status)
    }

    if (completion_status) {
      updates.push(`completion_status = $${paramIndex++}`)
      values.push(completion_status)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      )
    }

    // Add ID as last parameter
    values.push(id)

    const result = await query(
      `UPDATE training_plans 
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Training plan not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      trainingPlan: result.rows[0],
      message: "Training plan updated successfully",
    })
  } catch (error: any) {
    console.error("Error updating training plan:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update training plan" },
      { status: error.status || 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Verify user is authenticated
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Delete training plan (cascade will delete tasks and submissions)
    const result = await query(
      `DELETE FROM training_plans WHERE id = $1 RETURNING *`,
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Training plan not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: "Training plan deleted successfully",
    })
  } catch (error: any) {
    console.error("Error deleting training plan:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete training plan" },
      { status: error.status || 500 }
    )
  }
}
