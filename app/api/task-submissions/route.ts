import { NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/db"
import { requirePermission } from "@/lib/authz"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { v4 as uuidv4 } from "uuid"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const athleteId = searchParams.get("athleteId")
    const planId = searchParams.get("planId")
    const taskId = searchParams.get("taskId")

    // Verify user has permission
    await requirePermission("VIEW_OWN_TRAINING_PLAN")

    let queryStr = `
      SELECT ts.* 
      FROM task_submissions ts
    `
    const queryParams: any[] = []
    const conditions: string[] = []

    if (taskId) {
      conditions.push(`ts.task_id = $${queryParams.length + 1}`)
      queryParams.push(taskId)
    }

    if (athleteId) {
      conditions.push(`ts.athlete_id = $${queryParams.length + 1}`)
      queryParams.push(athleteId)
    }

    if (planId) {
      queryStr += ` INNER JOIN training_plan_tasks tpt ON ts.task_id = tpt.id`
      conditions.push(`tpt.plan_id = $${queryParams.length + 1}`)
      queryParams.push(planId)
    }

    if (conditions.length > 0) {
      queryStr += ` WHERE ${conditions.join(" AND ")}`
    }

    queryStr += ` ORDER BY ts.submitted_at DESC`

    const result = await query(queryStr, queryParams)

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

export async function POST(request: NextRequest) {
  try {
    // Verify user has permission
    const user = await requirePermission("SUBMIT_DAILY_TRAINING_FORM")

    const formData = await request.formData()
    const taskId = formData.get("taskId") as string
    const athleteId = formData.get("athleteId") as string
    const notes = formData.get("notes") as string || ""
    const files = formData.getAll("files") as File[]

    if (!taskId || !athleteId) {
      return NextResponse.json(
        { error: "taskId and athleteId are required" },
        { status: 400 }
      )
    }

    // Upload files
    const uploadedPaths: string[] = []
    
    if (files && files.length > 0) {
      const uploadDir = path.join(process.cwd(), "public", "task-submissions")
      
      // Create directory if it doesn't exist
      try {
        await mkdir(uploadDir, { recursive: true })
      } catch (err) {
        // Directory may already exist
      }

      for (const file of files) {
        if (file.size > 0) {
          const bytes = await file.arrayBuffer()
          const buffer = Buffer.from(bytes)
          
          const timestamp = Date.now()
          const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          const fileName = `${athleteId}-${timestamp}-${sanitizedFileName}`
          const filePath = path.join(uploadDir, fileName)
          
          await writeFile(filePath, buffer)
          uploadedPaths.push(`/task-submissions/${fileName}`)
        }
      }
    }

    // Check if submission already exists
    const existing = await query(
      `SELECT id FROM task_submissions WHERE task_id = $1 AND athlete_id = $2`,
      [taskId, athleteId]
    )

    let result
    if (existing.rows.length > 0) {
      // Update existing submission
      result = await query(
        `UPDATE task_submissions 
         SET attachments = $1, notes = $2, submitted_at = CURRENT_TIMESTAMP
         WHERE task_id = $3 AND athlete_id = $4
         RETURNING *`,
        [uploadedPaths, notes, taskId, athleteId]
      )
    } else {
      // Create new submission
      const submissionId = uuidv4()
      result = await query(
        `INSERT INTO task_submissions (id, task_id, athlete_id, attachments, notes, submitted_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING *`,
        [submissionId, taskId, athleteId, uploadedPaths, notes]
      )
    }

    return NextResponse.json({
      submission: result.rows[0],
      message: "Task submitted successfully",
    })
  } catch (error: any) {
    console.error("Error submitting task:", error)
    return NextResponse.json(
      { error: error.message || "Failed to submit task" },
      { status: error.status || 500 }
    )
  }
}
