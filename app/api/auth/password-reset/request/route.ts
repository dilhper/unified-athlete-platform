import { NextResponse } from "next/server"
import { createHash, randomBytes } from "crypto"
import { query } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = body?.email

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const userResult = await query("SELECT id FROM users WHERE email = $1", [email])

    if (userResult.rowCount > 0) {
      const userId = userResult.rows[0].id
      const resetToken = randomBytes(32).toString("hex")
      const resetTokenHash = createHash("sha256").update(resetToken).digest("hex")
      const resetExpiresAt = new Date(Date.now() + 1000 * 60 * 60)

      await query(
        `INSERT INTO auth_tokens (user_id, token_hash, token_type, expires_at)
         VALUES ($1,$2,$3,$4)`,
        [userId, resetTokenHash, "password_reset", resetExpiresAt]
      )

      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({
          message: "If an account exists, a reset link has been sent.",
          resetToken,
        })
      }
    }

    return NextResponse.json({ message: "If an account exists, a reset link has been sent." })
  } catch (error) {
    console.error("Password reset request error:", error)
    return NextResponse.json({ error: "Failed to request password reset" }, { status: 500 })
  }
}
