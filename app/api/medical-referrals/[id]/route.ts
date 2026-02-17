import { NextResponse } from 'next/server'
export const GET = () => NextResponse.json({ error: 'Route removed' }, { status: 410 })
export const POST = () => NextResponse.json({ error: 'Route removed' }, { status: 410 })
export const PUT = () => NextResponse.json({ error: 'Route removed' }, { status: 410 })
export const DELETE = () => NextResponse.json({ error: 'Route removed' }, { status: 410 })
export const PATCH = () => NextResponse.json({ error: 'Route removed' }, { status: 410 })
