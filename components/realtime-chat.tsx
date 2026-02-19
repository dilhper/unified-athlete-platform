'use client'

import { useState, useEffect, useRef } from 'react'
import { useSocket } from '@/hooks/use-socket'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useSession } from 'next-auth/react'

interface RealtimeChatProps {
  communityId: string
  communityName: string
}

export function RealtimeChat({ communityId, communityName }: RealtimeChatProps) {
  const { data: session } = useSession()
  const {
    socket,
    isConnected,
    messages,
    typingUsers,
    sendMessage,
    deleteMessage,
    setTyping,
  } = useSocket(communityId)

  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)

    // Emit typing indicator
    if (!isTyping) {
      setIsTyping(true)
      setTyping(true)
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Stop typing after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      setTyping(false)
    }, 1000)
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim()) return

    // Send via REST API (which also broadcasts via Socket.io)
    sendMessage(input)
    setInput('')
    setIsTyping(false)
    setTyping(false)
  }

  const handleDeleteMessage = (messageId: string) => {
    if (confirm('Delete this message?')) {
      deleteMessage(messageId)
    }
  }

  if (!session) {
    return (
      <Card className="p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Please sign in to participate in this conversation
        </p>
      </Card>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{communityName}</h3>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.senderId === (session.user as any)?.id ? 'flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <Avatar className="h-8 w-8">
                  <AvatarImage src={message.sender?.avatar} />
                  <AvatarFallback>
                    {(message.sender?.name || 'U').charAt(0)}
                  </AvatarFallback>
                </Avatar>

                {/* Message Content */}
                <div
                  className={`flex-1 ${
                    message.senderId === session.user?.email
                      ? 'items-end'
                      : 'items-start'
                  }`}
                >
                  <div className="flex gap-2 items-baseline mb-1">
                    <span className="text-sm font-semibold">
                      {message.sender?.name || 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.createdAt || message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <div
                    className={`rounded-lg px-3 py-2 max-w-xs ${
                      message.senderId === (session.user as any)?.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm break-words">{message.content}</p>
                  </div>

                  {/* Delete button for own messages */}
                  {message.senderId === (session.user as any)?.id && (
                    <button
                      onClick={() => handleDeleteMessage(message.id)}
                      className="text-xs text-muted-foreground hover:text-destructive mt-1"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Typing indicator */}
          {Array.from(typingUsers.keys()).map((userId) => (
            <div key={userId} className="flex gap-3 items-end">
              <Avatar className="h-8 w-8">
                <AvatarFallback>...</AvatarFallback>
              </Avatar>
              <div className="flex gap-1">
                <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" />
                <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce delay-100" />
                <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce delay-200" />
              </div>
            </div>
          ))}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="border-t p-4">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={input}
            onChange={handleInputChange}
            disabled={!isConnected}
            className="flex-1"
          />
          <Button type="submit" disabled={!isConnected || !input.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  )
}
