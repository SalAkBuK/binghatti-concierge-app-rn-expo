Here’s the clean integration plan for mobile so residents can receive and reply to messages. This is backend‑compatible with the current messaging module.

What to build in the app

Conversation list screen
Conversation detail screen (messages thread + reply input)
Realtime updates via Socket.IO (/notifications namespace)
REST endpoints you’ll use

POST /api/org/conversations
Create a new conversation (staff/admin -> resident, or resident -> staff/admin).
GET /api/org/conversations
List conversations for the logged‑in user.
GET /api/org/conversations/:id
Fetch conversation with messages.
POST /api/org/conversations/:id/messages
Send a reply.
POST /api/org/conversations/:id/read
Mark conversation as read.
Realtime events (Socket.IO /notifications)

conversation:new
Payload: { conversationId, subject }
message:new
Payload: { conversationId, message }
conversation:read
Payload: { conversationId }
Recommended client flow

On app start (after login), open socket to /notifications with token.
Load conversation list via REST.
When conversation:new arrives, refetch list or insert the new convo.
When message:new arrives:
If the user is viewing that conversation, append to thread.
Otherwise, update list preview + unread badge.
When user opens a conversation, call POST /read and update unread counts.
Auth

Socket: send JWT as auth: { token } or ?token=...
REST: Authorization: Bearer <access_token>
Minimal data shapes

// from REST
type Conversation = {
  id: string;
  subject?: string | null;
  buildingId?: string | null;
  participants: { id: string; name: string; avatarUrl?: string | null }[];
  unreadCount: number;
  lastMessage?: Message | null;
  createdAt: string;
  updatedAt: string;
};

type Message = {
  id: string;
  content: string;
  sender: { id: string; name: string; avatarUrl?: string | null };
  createdAt: string;
};

// realtime message payload
type MessageNewPayload = {
  conversationId: string;
  message: Message;
};
