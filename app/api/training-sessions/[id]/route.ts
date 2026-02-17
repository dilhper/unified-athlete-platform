import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function PATCH(req: Request, context: { params: { id: string } }) {
  try {
    const { id } = context.params;
    const body = await req.json();
    const { completed } = body || {};

    if (typeof completed !== "boolean") {
      return NextResponse.json({ error: "completed must be a boolean" }, { status: 400 });
    }

    const result = await query(
      `UPDATE training_sessions
       SET completed = $2
       WHERE id = $1
       RETURNING *`,
      [id, completed]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session: result.rows[0] });
  } catch (error) {
    console.error("Failed to update session", error);
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }
}
