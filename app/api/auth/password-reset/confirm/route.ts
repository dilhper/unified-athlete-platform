import { NextResponse } from "next/server"
import { createHash } from "crypto"
import { hash } from "bcryptjs"
import { query } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const token = body?.token
    const newPassword = body?.password

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Reset token is required" }, { status: 400 })
    }

    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 })
    }

    const tokenHash = createHash("sha256").update(token).digest("hex")
    const tokenResult = await query(
      `SELECT id, user_id, expires_at, used_at
       FROM auth_tokens
       WHERE token_hash = $1 AND token_type = $2`,
      [tokenHash, "password_reset"]
    )

    if (tokenResult.rowCount === 0) {
      return NextResponse.json({ error: "Invalid reset token" }, { status: 400 })
    }

    const tokenRow = tokenResult.rows[0]
    if (tokenRow.used_at) {
      return NextResponse.json({ error: "Reset token has already been used" }, { status: 400 })
    }

    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Reset token has expired" }, { status: 400 })
    }

    const passwordHash = await hash(newPassword, 10)
    await query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, tokenRow.user_id])
    await query("UPDATE auth_tokens SET used_at = NOW() WHERE id = $1", [tokenRow.id])

    return NextResponse.json({ message: "Password updated successfully" })
  } catch (error) {
    console.error("Password reset confirm error:", error)
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 })
  }
}
