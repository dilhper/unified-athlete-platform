import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { randomUUID } from 'crypto'
import { query } from '@/lib/db'

interface CustomSocket extends Socket {
  userId?: string
}

export function initializeSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      credentials: true,
    },
  })

  // Middleware to authenticate socket connections
  io.use((socket: CustomSocket, next) => {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error('Authentication error'))
    }
    // In production, verify JWT token here
    socket.userId = socket.handshake.auth.userId
    next()
  })

  // Connection handler
  io.on('connection', (socket: CustomSocket) => {
    console.log(`User ${socket.userId} connected with socket ID ${socket.id}`)

    // Join community room
    socket.on('join-community', (communityId: string) => {
      socket.join(`community-${communityId}`)
      io.to(`community-${communityId}`).emit('user-joined', {
        userId: socket.userId,
        message: `User ${socket.userId} joined the community`,
      })
    })

    // Leave community room
    socket.on('leave-community', (communityId: string) => {
      socket.leave(`community-${communityId}`)
      io.to(`community-${communityId}`).emit('user-left', {
        userId: socket.userId,
        message: `User ${socket.userId} left the community`,
      })
    })

    // Handle new messages
    socket.on('send-message', async (data: {
      communityId: string
      content: string
    }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Authentication required' })
          return
        }

        const communityResult = await query(
          'SELECT member_ids FROM communities WHERE id = $1',
          [data.communityId]
        )

        if (communityResult.rowCount === 0) {
          socket.emit('error', { message: 'Community not found' })
          return
        }

        const memberIds = communityResult.rows[0].member_ids || []
        if (!memberIds.includes(socket.userId)) {
          socket.emit('error', { message: 'Not a member of this community' })
          return
        }

        const messageId = randomUUID()
        const messageResult = await query(
          `INSERT INTO messages (id, sender_id, community_id, content, timestamp)
           VALUES ($1, $2, $3, $4, NOW())
           RETURNING id, sender_id, community_id, content, timestamp`,
          [messageId, socket.userId, data.communityId, data.content]
        )

        const senderResult = await query(
          'SELECT id, name, avatar, role FROM users WHERE id = $1',
          [socket.userId]
        )

        const sender = senderResult.rows[0] || { id: socket.userId, name: 'Unknown', avatar: null, role: null }

        const message = {
          id: messageResult.rows[0].id,
          senderId: messageResult.rows[0].sender_id,
          communityId: messageResult.rows[0].community_id,
          content: messageResult.rows[0].content,
          createdAt: messageResult.rows[0].timestamp,
          sender: {
            id: sender.id,
            name: sender.name,
            avatar: sender.avatar,
            role: sender.role,
          },
        }

        io.to(`community-${data.communityId}`).emit('new-message', message)
      } catch (error) {
        console.error('Error sending message:', error)
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    // Handle message deletion
    socket.on('delete-message', async (data: {
      messageId: string
      communityId: string
    }) => {
      try {
        if (!socket.userId) {
          socket.emit('error', { message: 'Authentication required' })
          return
        }

        const messageResult = await query(
          'SELECT id, sender_id FROM messages WHERE id = $1',
          [data.messageId]
        )

        if (messageResult.rowCount === 0) {
          socket.emit('error', { message: 'Message not found' })
          return
        }

        const message = messageResult.rows[0]
        if (message.sender_id !== socket.userId) {
          socket.emit('error', { message: 'Unauthorized' })
          return
        }

        await query('DELETE FROM messages WHERE id = $1', [data.messageId])

        // Broadcast deletion
        io.to(`community-${data.communityId}`).emit('message-deleted', {
          messageId: data.messageId,
        })
      } catch (error) {
        console.error('Error deleting message:', error)
        socket.emit('error', { message: 'Failed to delete message' })
      }
    })

    // Handle typing indicator
    socket.on('typing', (data: { communityId: string; isTyping: boolean }) => {
      io.to(`community-${data.communityId}`).emit('user-typing', {
        userId: socket.userId,
        isTyping: data.isTyping,
      })
    })

    // Handle notifications
    socket.on('subscribe-notifications', () => {
      socket.join(`notifications-${socket.userId}`)
    })

    socket.on('unsubscribe-notifications', () => {
      socket.leave(`notifications-${socket.userId}`)
    })

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`User ${socket.userId} disconnected`)
    })
  })

  // Helper function to send notifications to specific user
  const ioWithMethods = io as any
  ioWithMethods.sendNotification = (userId: string, notification: any) => {
    io.to(`notifications-${userId}`).emit('notification', notification)
  }

  // Helper function to broadcast to community
  ioWithMethods.broadcastToCommunity = (communityId: string, event: string, data: any) => {
    io.to(`community-${communityId}`).emit(event, data)
  }

  return io
}
