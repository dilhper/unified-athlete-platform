# Real-time Messaging with Socket.io

## Overview

This implementation provides real-time messaging capabilities for the unified athlete platform using Socket.io, enabling:

- **Live Community Chat** - Real-time messaging in community channels
- **Typing Indicators** - See when users are typing
- **Real-time Notifications** - Instant delivery of user mentions and alerts
- **Message Broadcasting** - Instant message delivery to all community members
- **User Presence** - Track which users are active in each community

## Architecture

### Server Setup

**File:** `lib/socket.ts`
- Initializes Socket.io server with authentication middleware
- Handles connection/disconnection lifecycle
- Manages event handlers for messages, typing indicators, and notifications
- Verifies user authentication before accepting connections

**File:** `lib/socket-instance.ts`
- Global Socket.io server instance management
- Provides helper functions for sending notifications and broadcasting messages

**File:** `server.js`
- Custom HTTP server wrapper for Next.js
- Integrates Socket.io with the Next.js application
- Must be used instead of `next dev` during development

### Client Setup

**File:** `hooks/use-socket.ts`
- React hook for Socket.io client connection
- Manages socket lifecycle with session integration
- Provides methods for sending messages, deleting messages, and typing indicators
- Auto-reconnection with exponential backoff

**File:** `lib/socket-types.ts`
- TypeScript types for Socket.io events
- Ensures type safety across client-server communication

### Frontend Components

**File:** `components/realtime-chat.tsx`
- Chat UI component with real-time messaging
- Displays typing indicators
- Handles message deletion with confirmation
- Auto-scrolls to latest messages
- Connection status indicator

**File:** `components/notification-center.tsx`
- Notification dropdown component
- Lists unread notifications with badge counter
- Mark individual notifications as read or delete
- Mark all notifications as read at once
- Auto-refresh on mount

## Socket.io Events

### Client → Server

```typescript
// Send a new message to a community
emit('send-message', {
  communityId: string
  content: string
})

// Delete a message (sender only)
emit('delete-message', {
  messageId: string
  communityId: string
})

// Join a community room (subscribe to updates)
emit('join-community', communityId: string)

// Leave a community room
emit('leave-community', communityId: string)

// Send typing indicator
emit('typing', {
  communityId: string
  isTyping: boolean
})

// Subscribe to personal notifications
emit('subscribe-notifications')

// Unsubscribe from personal notifications
emit('unsubscribe-notifications')
```

### Server → Client

```typescript
// New message in community
on('new-message', (message: Message) => {})

// Message deleted
on('message-deleted', (data: { messageId: string }) => {})

// User joined community
on('user-joined', (data: { userId: string; message: string }) => {})

// User left community
on('user-left', (data: { userId: string; message: string }) => {})

// User typing indicator
on('user-typing', (data: { userId: string; isTyping: boolean }) => {})

// Receive notification
on('notification', (notification: Notification) => {})

// Error event
on('error', (data: { message: string }) => {})
```

## API Endpoints

### POST /api/messages-realtime
Create a new message and broadcast to community

**Request:**
```json
{
  "communityId": "string",
  "content": "string",
  "mentionedUserIds": ["string"]  // Optional
}
```

**Response:**
```json
{
  "id": "string",
  "content": "string",
  "communityId": "string",
  "senderId": "string",
  "sender": {
    "id": "string",
    "name": "string",
    "avatar": "string",
    "role": "string"
  },
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### GET /api/messages-realtime
Fetch messages from a community

**Query Parameters:**
- `communityId` (required) - Community ID
- `limit` (optional, default: 50) - Number of messages to return
- `offset` (optional, default: 0) - Pagination offset

**Response:**
```json
{
  "messages": [Message[]],
  "total": "number",
  "limit": "number",
  "offset": "number"
}
```

### POST /api/notifications-broadcast
Send a real-time notification

**Request:**
```json
{
  "userId": "string",
  "type": "string",
  "title": "string",
  "message": "string",
  "data": {}  // Optional metadata
}
```

**Response:**
```json
{
  "id": "string",
  "type": "string",
  "title": "string",
  "message": "string",
  "data": {},
  "userId": "string",
  "read": false,
  "createdAt": "ISO8601"
}
```

### GET /api/notifications-broadcast
Fetch notifications

**Query Parameters:**
- `limit` (optional, default: 10) - Number of notifications
- `offset` (optional, default: 0) - Pagination offset
- `read` (optional) - Filter by read status (true/false)

### GET /api/socket-status
Check Socket.io server status

**Response:**
```json
{
  "socketConnected": boolean,
  "userId": "string",
  "socketUrl": "string",
  "message": "string"
}
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install socket.io socket.io-client
```

### 2. Configure Environment Variables
Add to `.env.local`:
```
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_NAMESPACE=/socket.io
NEXT_PUBLIC_SOCKET_DEBUG=false
```

### 3. Update Database Schema
The following models are required in `prisma/schema.prisma`:
- `Message` - Stores chat messages
- `Notification` - Stores user notifications
- Community members relationship

### 4. Run Development Server
Use the custom server instead of `next dev`:
```bash
# Option 1: Direct Node execution
node server.js

# Option 2: Update package.json dev script
"dev": "node server.js"
```

### 5. Connect Frontend
Use the `useSocket` hook in your components:
```typescript
import { useSocket } from '@/hooks/use-socket'

export function MyComponent() {
  const { socket, isConnected, messages, sendMessage } = useSocket('community-123')
  
  return (
    <RealtimeChat 
      communityId="community-123"
      communityName="My Community"
    />
  )
}
```

## Usage Examples

### Send a Message
```typescript
const { sendMessage } = useSocket(communityId)

sendMessage('Hello, everyone!')
```

### Listen for Messages
```typescript
const { messages } = useSocket(communityId)

// messages is updated in real-time
messages.forEach(msg => console.log(msg.content))
```

### Handle Typing Indicator
```typescript
const { setTyping } = useSocket(communityId)

const handleInputChange = () => {
  setTyping(true)
  // Stop typing after user stops for 1 second
  setTimeout(() => setTyping(false), 1000)
}
```

### Send Real-time Notification
```typescript
const response = await fetch('/api/notifications-broadcast', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'target-user-id',
    type: 'achievement',
    title: 'Congratulations!',
    message: 'You earned a new badge',
    data: { badgeId: 'badge-123' }
  })
})
```

## Security Considerations

### Authentication
- All Socket.io connections require valid authentication token
- Connection is rejected if token is missing or invalid
- User ID is extracted from session and verified

### Authorization
- Users can only join communities they are members of
- Message deletion is restricted to message sender or officials
- Notifications can only be sent by authorized users (self or officials)

### Data Validation
- Community membership is verified before allowing message creation
- Message content length should be validated on client and server
- File attachments in messages must pass validation (see file upload API)

## Performance Optimization

### Message Pagination
- Fetch initial messages with limit (default: 50)
- Implement infinite scroll with offset-based pagination
- Real-time messages are appended to the list

### Typing Indicators
- Debounce typing events to reduce network traffic
- Auto-stop typing indicator after 1 second of inactivity
- Clear typing state when message is sent

### Connection Management
- Automatic reconnection with exponential backoff
- Socket is cleaned up on component unmount
- Graceful handling of disconnection and reconnection

## Troubleshooting

### Socket Connection Fails
1. Verify Socket.io server is running: `GET /api/socket-status`
2. Check browser console for connection errors
3. Ensure `NEXT_PUBLIC_SOCKET_URL` is correctly configured
4. Verify user is authenticated before connecting

### Messages Not Broadcasting
1. Confirm user is member of community
2. Check Socket.io event handlers in `lib/socket.ts`
3. Verify database records are created in `messages` table
4. Check browser console for Socket.io errors

### High Latency on Messages
1. Monitor Socket.io connection quality
2. Check database query performance
3. Consider implementing message compression
4. Implement client-side optimistic updates

## Future Enhancements

- [ ] Message read receipts
- [ ] Typing indicator improvements (show who is typing)
- [ ] File attachment support in messages
- [ ] Message reactions/emoji support
- [ ] Voice/video chat integration
- [ ] Message search and filtering
- [ ] Message pinning and threading
- [ ] User presence indicators
- [ ] Message encryption for sensitive channels
- [ ] Message archiving and export

## Related Files
- Database schema: `prisma/schema.prisma` (Message, Notification models)
- Authentication: `lib/auth-helpers.ts`
- File uploads: `app/api/file-attachments/route.ts`
- Notifications API: `app/api/notifications/route.ts`
- Communities API: `app/api/communities/route.ts`
