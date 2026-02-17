import { NextResponse } from "next/server"
import { query } from "@/lib/db"

// GET /api/platform-stats - Summary counts for login page
export async function GET() {
  try {
    const [athletesResult, coachesResult, achievementsResult, opportunitiesResult] = await Promise.all([
      query("SELECT COUNT(*)::int AS count FROM users WHERE role = $1", ["athlete"]),
      query("SELECT COUNT(*)::int AS count FROM users WHERE role = $1", ["coach"]),
      query("SELECT COUNT(*)::int AS count FROM achievements WHERE status = $1", ["verified"]),
      query("SELECT COUNT(*)::int AS count FROM opportunities"),
    ])

    return NextResponse.json({
      athletes: athletesResult.rows[0]?.count ?? 0,
      coaches: coachesResult.rows[0]?.count ?? 0,
      achievementsVerified: achievementsResult.rows[0]?.count ?? 0,
      opportunities: opportunitiesResult.rows[0]?.count ?? 0,
    })
  } catch (error) {
    console.error("Error fetching platform stats:", error)
    return NextResponse.json({ error: "Failed to fetch platform stats" }, { status: 500 })
  }
}
