'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'

export const useSocket = (communityId?: string) => {
  const { data: session } = useSession()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<any[]>([])
  const [typingUsers, setTypingUsers] = useState<Map<string, boolean>>(new Map())
  const socketRef = useRef<Socket | null>(null)

  // Initialize socket connection
  useEffect(() => {
    if (!session?.user) return

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000'
    const newSocket = io(socketUrl, {
      auth: {
        token: (session as any)?.accessToken || '',
        userId: session.user.email || '',
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })

    newSocket.on('connect', () => {
      setIsConnected(true)
      console.log('Connected to Socket.io server')
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
      console.log('Disconnected from Socket.io server')
    })

    newSocket.on('error', (error) => {
      console.error('Socket.io error:', error)
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [session])

  // Join community on mount
  useEffect(() => {
    if (!socket || !communityId) return

    socket.emit('join-community', communityId)

    return () => {
      socket.emit('leave-community', communityId)
    }
  }, [socket, communityId])

  // Listen for messages
  useEffect(() => {
    if (!socket) return

    const handleNewMessage = (message: any) => {
      setMessages((prev) => [...prev, message])
    }

    const handleMessageDeleted = (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId))
    }

    const handleUserTyping = (data: { userId: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const newMap = new Map(prev)
        if (data.isTyping) {
          newMap.set(data.userId, true)
        } else {
          newMap.delete(data.userId)
        }
        return newMap
      })
    }

    socket.on('new-message', handleNewMessage)
    socket.on('message-deleted', handleMessageDeleted)
    socket.on('user-typing', handleUserTyping)

    return () => {
      socket.off('new-message', handleNewMessage)
      socket.off('message-deleted', handleMessageDeleted)
      socket.off('user-typing', handleUserTyping)
    }
  }, [socket])

  // Send message
  const sendMessage = useCallback(
    (content: string) => {
      if (!socket || !communityId) return

      socket.emit('send-message', {
        communityId,
        content,
      })
    },
    [socket, communityId]
  )

  // Delete message
  const deleteMessage = useCallback(
    (messageId: string) => {
      if (!socket || !communityId) return

      socket.emit('delete-message', {
        messageId,
        communityId,
      })
    },
    [socket, communityId]
  )

  // Emit typing indicator
  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!socket || !communityId) return

      socket.emit('typing', {
        communityId,
        isTyping,
      })
    },
    [socket, communityId]
  )

  return {
    socket,
    isConnected,
    messages,
    typingUsers,
    sendMessage,
    deleteMessage,
    setTyping,
  }
}
