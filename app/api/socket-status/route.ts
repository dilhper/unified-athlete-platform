import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { getSocket } from '@/lib/socket-instance'

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth()

  if (error) {
    return NextResponse.json({ error }, { status: 401 })
  }

  try {
    const socket = getSocket()
    const isConnected = socket !== null

    return NextResponse.json({
      socketConnected: isConnected,
      userId: user?.id,
      socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000',
      message: isConnected
        ? 'Socket.io server is running'
        : 'Socket.io server not initialized',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check socket status' },
      { status: 500 }
    )
  }
}
