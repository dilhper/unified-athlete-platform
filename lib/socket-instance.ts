import { Server as HTTPServer } from 'http'
import { Socket as ServerSocket } from 'socket.io'

interface CustomSocket extends ServerSocket {
  userId?: string
}

export interface SocketIOServer {
  sendNotification: (userId: string, notification: any) => void
  broadcastToCommunity: (communityId: string, event: string, data: any) => void
  to: (room: string) => any
  emit: (event: string, data: any) => void
}

let globalSocket: SocketIOServer | null = null

export function getSocket(): SocketIOServer | null {
  return globalSocket
}

export function setSocket(socket: SocketIOServer) {
  globalSocket = socket
}
