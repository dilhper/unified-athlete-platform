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
    
    // Get current user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get user info
    const userResult = await query(
      `SELECT id, role FROM users WHERE email = $1`,
      [session.user.email]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const user = userResult.rows[0]

    // If athlete, verify they're assigned to this plan
    if (user.role === 'athlete') {
      const assignmentResult = await query(
        `SELECT plan_id FROM training_plan_athletes WHERE plan_id = $1 AND athlete_id = $2`,
        [id, user.id]
      )
      
      if (assignmentResult.rows.length === 0) {
        return NextResponse.json(
          { error: "You are not assigned to this training plan" },
          { status: 403 }
        )
      }
    }

    // Get all submissions for tasks in this training plan
    const result = await query(
      `SELECT ts.* 
       FROM task_submissions ts
       INNER JOIN training_plan_tasks tpt ON ts.task_id = tpt.id
       WHERE tpt.plan_id = $1
       ORDER BY ts.submitted_at DESC`,
      [id]
    )

    return NextResponse.json({
      submissions: result.rows,
    })
  } catch (error: any) {
    console.error("Error fetching task submissions:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch submissions" },
      { status: error.status || 500 }
    )
  }
}
