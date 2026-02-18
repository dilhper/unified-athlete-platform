import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getClient, query } from '@/lib/db'
import { requirePermission, requireCoachAthleteRelationship, authErrorToResponse } from '@/lib/authz'
import { logAudit } from '@/lib/audit'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const athleteId = searchParams.get('athleteId')
    const coachId = searchParams.get('coachId')

    if (!athleteId && !coachId) {
      return NextResponse.json(
        { error: 'athleteId or coachId query param is required' },
        { status: 400 }
      )
    }

    if (athleteId) {
      const result = await query(
        `SELECT tp.*, COALESCE(array_remove(array_agg(tpa.athlete_id), NULL), '{}') AS athlete_ids
         FROM training_plans tp
         INNER JOIN training_plan_athletes tpa ON tpa.plan_id = tp.id
         WHERE tpa.athlete_id = $1
         GROUP BY tp.id
         ORDER BY tp.created_at DESC`,
        [athleteId]
      )
      return NextResponse.json({ trainingPlans: result.rows })
    }

    const result = await query(
      `SELECT tp.*, COALESCE(array_remove(array_agg(tpa.athlete_id), NULL), '{}') AS athlete_ids
       FROM training_plans tp
       LEFT JOIN training_plan_athletes tpa ON tpa.plan_id = tp.id
       WHERE tp.coach_id = $1
       GROUP BY tp.id
       ORDER BY tp.created_at DESC`,
      [coachId]
    )
    return NextResponse.json({ trainingPlans: result.rows })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch training plans' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const client = await getClient()
  try {
    // RBAC: Only coaches can create training plans
    const user = await requirePermission('CREATE_TRAINING_PLAN');

    const body = await req.json()
    const {
      name,
      description,
      coachId,
      athleteIds = [],
      startDate,
      endDate,
      status = 'active',
      mode = 'both',
      tasks = [],
    } = body || {}

    // Verify coach is creating plan for themselves
    if (coachId !== user.id) {
      logAudit({
        actorId: user.id,
        actorRole: 'coach',
        action: 'PERMISSION_DENIED',
        resourceType: 'training_plan',
        result: 'denied',
        denialReason: 'Coach ID mismatch',
      });
      return NextResponse.json(
        { error: 'You can only create training plans for yourself' },
        { status: 403 }
      );
    }

    if (!name || !coachId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'name, coachId, startDate, and endDate are required' },
        { status: 400 }
      )
    }

    const planId = randomUUID()

    await client.query('BEGIN')

    const planResult = await client.query(
      `INSERT INTO training_plans (
        id,
        name,
        description,
        coach_id,
        status,
        mode,
        start_date,
        end_date,
        created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
      RETURNING *`,
      [planId, name, description || null, coachId, status, mode, startDate, endDate]
    )

    if (Array.isArray(athleteIds) && athleteIds.length > 0) {
      for (const athleteId of athleteIds) {
        await client.query(
          `INSERT INTO training_plan_athletes (plan_id, athlete_id)
           VALUES ($1,$2)`,
          [planId, athleteId]
        )
      }
    }

    // Insert tasks if provided
    if (Array.isArray(tasks) && tasks.length > 0) {
      for (const task of tasks) {
        const taskId = randomUUID()
        await client.query(
          `INSERT INTO training_plan_tasks (
            id, plan_id, name, description, start_date, end_date, order_index, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            taskId,
            planId,
            task.name,
            task.description || null,
            task.startDate,
            task.endDate,
            task.orderIndex || 0,
          ]
        )
      }
    }

    await client.query('COMMIT')

    // Log successful training plan creation
    logAudit({
      actorId: user.id,
      actorRole: 'coach',
      action: 'RESOURCE_CREATED',
      resourceType: 'training_plan',
      resourceId: planId,
      result: 'success',
      statusAfter: {
        name,
        status,
        mode,
        athlete_count: athleteIds.length,
      },
    });

    return NextResponse.json({ trainingPlan: planResult.rows[0] }, { status: 201 })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error(error)
    
    // Log any errors that occurred during training plan creation
    if (error instanceof Error && error.message.includes('verification')) {
      logAudit({
        actorId: 'unknown',
        actorRole: 'coach',
        action: 'ERROR_OCCURRED',
        resourceType: 'training_plan',
        result: 'error',
        errorMessage: error.message,
      });
    }
    
    return authErrorToResponse(error)
  } finally {
    client.release()
  }
}
