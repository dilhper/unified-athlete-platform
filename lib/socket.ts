import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { prisma } from '@/lib/prisma'

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
        // Verify user is in community
        const community = await prisma.community.findUnique({
          where: { id: data.communityId },
          include: {
            members: {
              where: { id: socket.userId },
            },
          },
        })

        if (!community || community.members.length === 0) {
          socket.emit('error', { message: 'Not a member of this community' })
          return
        }

        // Create message in database
        const message = await prisma.message.create({
          data: {
            content: data.content,
            senderId: socket.userId!,
            communityId: data.communityId,
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                avatar: true,
                role: true,
              },
            },
          },
        })

        // Broadcast to community
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
        // Verify ownership
        const message = await prisma.message.findUnique({
          where: { id: data.messageId },
        })

        if (!message) {
          socket.emit('error', { message: 'Message not found' })
          return
        }

        if (message.senderId !== socket.userId) {
          socket.emit('error', { message: 'Unauthorized' })
          return
        }

        // Delete message
        await prisma.message.delete({
          where: { id: data.messageId },
        })

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
