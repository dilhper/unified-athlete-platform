export interface Message {
  id: string
  content: string
  communityId: string
  senderId: string
  sender: {
    id: string
    name: string
    avatar?: string
    role: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  data: Record<string, any>
  userId: string
  read: boolean
  createdAt: Date
}

export interface SocketEvents {
  // Client to Server
  'send-message': (data: { communityId: string; content: string }) => void
  'delete-message': (data: { messageId: string; communityId: string }) => void
  'join-community': (communityId: string) => void
  'leave-community': (communityId: string) => void
  'typing': (data: { communityId: string; isTyping: boolean }) => void
  'subscribe-notifications': () => void
  'unsubscribe-notifications': () => void

  // Server to Client
  'new-message': (message: Message) => void
  'message-deleted': (data: { messageId: string }) => void
  'user-joined': (data: { userId: string; message: string }) => void
  'user-left': (data: { userId: string; message: string }) => void
  'user-typing': (data: { userId: string; isTyping: boolean }) => void
  notification: (notification: Notification) => void
  error: (data: { message: string }) => void
  connect: () => void
  disconnect: () => void
}
