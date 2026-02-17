import { NextResponse } from 'next/server'

// POST /api/auth/register - Create a user with credentials
export async function POST() {
  return NextResponse.json(
    { message: 'Registration is disabled in UI-only demo mode.' },
    { status: 200 }
  )
}
