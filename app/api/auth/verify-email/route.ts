import { NextResponse } from "next/server"
import { createHash } from "crypto"
import { query } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const token = body?.token

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Verification token is required" }, { status: 400 })
    }

    const tokenHash = createHash("sha256").update(token).digest("hex")

    const tokenResult = await query(
      `SELECT id, user_id, expires_at, used_at
       FROM auth_tokens
       WHERE token_hash = $1 AND token_type = $2`,
      [tokenHash, "email_verification"]
    )

    if (tokenResult.rowCount === 0) {
      return NextResponse.json({ error: "Invalid verification token" }, { status: 400 })
    }

    const tokenRow = tokenResult.rows[0]
    if (tokenRow.used_at) {
      return NextResponse.json({ error: "Verification token has already been used" }, { status: 400 })
    }

    if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Verification token has expired" }, { status: 400 })
    }

    await query("UPDATE users SET email_verified = TRUE WHERE id = $1", [tokenRow.user_id])
    await query("UPDATE auth_tokens SET used_at = NOW() WHERE id = $1", [tokenRow.id])

    return NextResponse.json({ message: "Email verified successfully" })
  } catch (error) {
    console.error("Verify email error:", error)
    return NextResponse.json({ error: "Failed to verify email" }, { status: 500 })
  }
}
