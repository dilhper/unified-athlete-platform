import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { query } from '@/lib/db'
import { requirePermission, authErrorToResponse } from '@/lib/authz'

const communityPrefix = 'Sport: '

const normalizeSport = (sport: string) => sport.trim()

const parseSportFromName = (name: string) => {
  if (name.startsWith(communityPrefix)) {
    return name.slice(communityPrefix.length).trim()
  }
  return name
}

export async function GET() {
  try {
    await requirePermission('MANAGE_COMMUNITY')

    const statsResult = await query(
      `SELECT sport,
              COUNT(DISTINCT athlete_id)::int AS athlete_count,
              COUNT(DISTINCT coach_id)::int AS coach_count,
              COUNT(*)::int AS registration_count
       FROM sport_registrations
       GROUP BY sport
       ORDER BY sport ASC`
    )

    const communitiesResult = await query(
      `SELECT id, name, description, member_ids
       FROM communities
       WHERE name LIKE 'Sport:%'
       ORDER BY created_at DESC`
    )

    const communityMap = new Map<string, any>()
    communitiesResult.rows.forEach((row) => {
      const sport = parseSportFromName(row.name)
      communityMap.set(sport, {
        id: row.id,
        name: row.name,
        description: row.description,
        memberCount: (row.member_ids || []).length,
      })
    })

    const sports = statsResult.rows.map((row) => {
      const sport = normalizeSport(row.sport)
      return {
        sport,
        athleteCount: row.athlete_count,
        coachCount: row.coach_count,
        registrationCount: row.registration_count,
        community: communityMap.get(sport) || null,
      }
    })

    return NextResponse.json({ sports })
  } catch (error) {
    console.error('Error fetching sport communities:', error)
    return authErrorToResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission('MANAGE_COMMUNITY')

    const body = await request.json()
    const { sport } = body || {}

    if (!sport || typeof sport !== 'string') {
      return NextResponse.json({ error: 'sport is required' }, { status: 400 })
    }

    const normalizedSport = normalizeSport(sport)
    const communityName = `${communityPrefix}${normalizedSport}`

    const memberResult = await query(
      `SELECT DISTINCT athlete_id AS user_id FROM sport_registrations WHERE sport = $1
       UNION
       SELECT DISTINCT coach_id AS user_id FROM sport_registrations WHERE sport = $1`,
      [normalizedSport]
    )

    const memberIds = memberResult.rows.map((row) => row.user_id).filter(Boolean)

    const existing = await query(
      `SELECT id, member_ids FROM communities WHERE name = $1`,
      [communityName]
    )

    if (existing.rowCount > 0) {
      const currentMembers = existing.rows[0].member_ids || []
      const updatedMembers = Array.from(new Set([...currentMembers, ...memberIds]))

      const updateResult = await query(
        `UPDATE communities
         SET member_ids = $2
         WHERE id = $1
         RETURNING id, name, description, member_ids`,
        [existing.rows[0].id, updatedMembers]
      )

      const community = updateResult.rows[0]
      return NextResponse.json({
        community: {
          id: community.id,
          name: community.name,
          description: community.description,
          memberCount: (community.member_ids || []).length,
        },
      })
    }

    const id = randomUUID()
    const description = `Community for ${normalizedSport} athletes and coaches`

    const result = await query(
      `INSERT INTO communities (id, name, description, creator_id, member_ids, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, name, description, member_ids`,
      [id, communityName, description, user.id, memberIds]
    )

    const community = result.rows[0]

    return NextResponse.json({
      community: {
        id: community.id,
        name: community.name,
        description: community.description,
        memberCount: (community.member_ids || []).length,
      },
    })
  } catch (error) {
    console.error('Error creating sport community:', error)
    return authErrorToResponse(error)
  }
}
