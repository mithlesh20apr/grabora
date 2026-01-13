# Support Management System - API Integration Guide

## Overview
The support page has been fully integrated with backend APIs to provide a complete support ticket management system with real-time messaging, rating, and ticket tracking.

## Integrated APIs

### 1. Create Support Ticket
**Endpoint:** `POST /api/v1/support/tickets`

**Request:**
```json
{
  "subject": "Order not arrived",
  "description": "I haven't received my order yet",
  "category": "Shipping & Delivery",
  "priority": "High"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "ticket_id",
    "userId": "user_id",
    "subject": "Order not arrived",
    "description": "I haven't received my order yet",
    "category": "Shipping & Delivery",
    "priority": "High",
    "status": "Open",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z",
    "messages": []
  }
}
```

---

### 2. Get User's Tickets
**Endpoint:** `GET /api/v1/support/my-tickets`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ticket_id",
      "userId": "user_id",
      "subject": "Order issue",
      "category": "Order Issue",
      "priority": "Medium",
      "status": "In Progress",
      "description": "Product received damaged",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T11:45:00Z",
      "messages": [
        {
          "_id": "msg_id_1",
          "ticketId": "ticket_id",
          "senderId": "user_id",
          "senderName": "John Doe",
          "senderType": "customer",
          "message": "My product arrived damaged",
          "createdAt": "2024-01-15T10:30:00Z"
        },
        {
          "_id": "msg_id_2",
          "ticketId": "ticket_id",
          "senderId": "support_staff_id",
          "senderName": "Support Team",
          "senderType": "support",
          "message": "We're sorry to hear that. Please provide order ID for verification.",
          "createdAt": "2024-01-15T10:45:00Z"
        }
      ]
    }
  ]
}
```

---

### 3. Get Ticket Details
**Endpoint:** `GET /api/v1/support/tickets/:id`

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "ticket_id",
    "userId": "user_id",
    "subject": "Payment failed",
    "category": "Payment Problem",
    "priority": "Urgent",
    "status": "Resolved",
    "description": "Transaction failed but amount was deducted",
    "createdAt": "2024-01-15T09:00:00Z",
    "updatedAt": "2024-01-15T14:00:00Z",
    "rating": {
      "score": 4,
      "feedback": "Quick resolution, very helpful"
    },
    "messages": [
      {
        "_id": "msg_id",
        "ticketId": "ticket_id",
        "senderId": "user_id",
        "senderName": "John Doe",
        "senderType": "customer",
        "message": "My payment was deducted but order not placed",
        "createdAt": "2024-01-15T09:00:00Z"
      }
    ]
  }
}
```

---

### 4. Add Message/Reply to Ticket
**Endpoint:** `POST /api/v1/support/tickets/:id/message`

**Headers:**
```
Authorization: Bearer {token}
```

**Request:**
```json
{
  "message": "Thank you for the quick response!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "msg_id",
    "ticketId": "ticket_id",
    "senderId": "user_id",
    "senderName": "John Doe",
    "senderType": "customer",
    "message": "Thank you for the quick response!",
    "createdAt": "2024-01-15T14:30:00Z"
  }
}
```

---

### 5. Rate Resolved Ticket
**Endpoint:** `POST /api/v1/support/tickets/:id/rate`

**Headers:**
```
Authorization: Bearer {token}
```

**Request:**
```json
{
  "score": 5,
  "feedback": "Excellent support team! Issue resolved quickly"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "ticket_id",
    "rating": {
      "score": 5,
      "feedback": "Excellent support team! Issue resolved quickly"
    },
    "updatedAt": "2024-01-15T14:35:00Z"
  }
}
```

---

## Features Implemented

### 1. Three-Tab Interface
- **Submit Ticket Tab**: Create new support tickets with category and priority
- **My Tickets Tab**: View all user's tickets with status, priority, and message count
- **FAQs Tab**: Frequently asked questions for quick self-service

### 2. Ticket Management
- **Create Tickets**: Submit issues with subject, category, priority, and description
- **View Tickets**: List of all tickets with quick status indicators
- **Ticket Details**: Full ticket view with complete message history
- **Back Navigation**: Easy navigation between ticket list and details

### 3. Real-Time Messaging
- **Message Thread**: Chronological display of all messages in a ticket
- **Message Types**: Distinguish between customer and support messages
- **Message Status**: Timestamps and sender information for each message
- **Reply Form**: Send messages only when ticket is not closed

### 4. Ticket Rating
- **5-Star Rating**: Rate support experience for resolved tickets
- **Optional Feedback**: Add detailed feedback along with rating
- **Display Rating**: Show submitted rating with score and feedback
- **Single Rating**: Only rate once per ticket

### 5. Authentication
- **Login Required**: Support features require authentication
- **Login Redirect**: Unauthenticated users see login prompts
- **Bearer Token**: All API calls include authorization token
- **Session Storage**: Token retrieved from sessionStorage

### 6. Status & Priority Indicators
- **Status Types**: Open, In Progress, Resolved, Closed
- **Priority Levels**: Low, Medium, High, Urgent
- **Color Coding**: Visual indicators for quick identification
- **Badges**: Clear visual status displays

### 7. User Experience
- **Loading States**: Spinners for async operations
- **Toast Notifications**: Success/error messages for all actions
- **Disabled States**: Buttons disabled during submissions
- **Empty States**: Helpful messages when no tickets exist
- **Refresh Button**: Manually refresh ticket list

### 8. Categories
Supported ticket categories:
- General Inquiry
- Order Issue
- Payment Problem
- Product Question
- Technical Support
- Account Help
- Shipping & Delivery
- Return & Refund
- Other

---

## Data Structure

### SupportTicket Interface
```typescript
interface SupportTicket {
  _id: string;                          // Unique ticket ID
  ticketId?: string;                    // Alternative ticket ID
  userId: string;                       // Creator's user ID
  subject: string;                      // Issue subject
  category: string;                     // Ticket category
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  description: string;                  // Full issue description
  createdAt: string;                    // Creation timestamp
  updatedAt: string;                    // Last update timestamp
  rating?: {                            // Optional rating after resolution
    score: number;                      // 1-5 star rating
    feedback: string;                   // Optional feedback
  };
  messages: TicketMessage[];            // Conversation messages
}
```

### TicketMessage Interface
```typescript
interface TicketMessage {
  _id: string;                          // Message ID
  ticketId: string;                     // Associated ticket ID
  senderId: string;                     // Message sender's ID
  senderName: string;                   // Display name
  senderType: 'customer' | 'support';   // Message origin
  message: string;                      // Message content
  createdAt: string;                    // Message timestamp
}
```

---

## Component State Management

### Form State
- `formData`: New ticket submission form (name, email, subject, category, priority, description)
- `replyMessage`: Reply message textarea content
- `ratingScore`: Selected star rating (1-5)
- `ratingFeedback`: Optional rating feedback

### UI State
- `activeTab`: Current tab view ('new', 'tickets', 'faq')
- `selectedTicket`: Currently viewing ticket details
- `isLoading`: Loading indicator for ticket list
- `isReplySubmitting`: Loading state for reply submission
- `isRatingSubmitting`: Loading state for rating submission

### Toast Notifications
- Success/error messages with 3-second auto-dismiss
- Contextual messages for all operations

---

## Authentication Flow

1. User must be authenticated to access support features
2. Token is stored in `sessionStorage.getItem('token')`
3. All API requests include: `Authorization: Bearer {token}`
4. Unauthenticated users see login prompts
5. User data auto-populates form from `AuthContext`

---

## Error Handling

- **Network Errors**: Caught and displayed as toast notifications
- **API Errors**: Response status checked, error messages shown
- **Validation**: Client-side validation for required fields
- **Disabled States**: Buttons disabled during requests to prevent double submission

---

## Security Considerations

1. **Authentication Required**: All ticket operations require valid auth token
2. **User Isolation**: Users only see their own tickets
3. **Server-Side Validation**: Backend validates all requests
4. **XSS Prevention**: React auto-escapes content
5. **CSRF Protection**: Bearer token prevents CSRF attacks

---

## Testing Checklist

- [ ] Create a new support ticket without login (should prompt login)
- [ ] Create a new support ticket as authenticated user
- [ ] View list of support tickets
- [ ] Click on a ticket to view details
- [ ] Send a reply to an open ticket
- [ ] Verify new messages appear immediately
- [ ] Rate a resolved ticket (if available)
- [ ] View rating that was submitted
- [ ] Click FAQs tab and expand answers
- [ ] Submit ticket button works from FAQ tab
- [ ] Refresh button works and reloads tickets
- [ ] Back button returns to ticket list
- [ ] Toast notifications appear for success/error
- [ ] Loading spinners show during API calls

---

## API Base URL

The component uses `process.env.NEXT_PUBLIC_API_BASE_URL` or defaults to `http://localhost:4000/api/v2`

Ensure your `.env.local` file contains:
```
NEXT_PUBLIC_API_BASE_URL=http://your-api-domain.com/api/v1
```

---

## Recent Updates

- ✅ Replaced static localStorage with API endpoints
- ✅ Integrated all 5 support management endpoints
- ✅ Added real-time message threading
- ✅ Implemented ticket rating system
- ✅ Added authentication checks
- ✅ Created comprehensive error handling
- ✅ Built responsive UI with proper loading states
- ✅ Fixed TypeScript compilation errors

---

## Next Steps

1. Test all API endpoints with backend
2. Verify token authentication works correctly
3. Test error scenarios (invalid token, server errors)
4. Validate data persistence across page refreshes
5. Test on mobile devices for responsive design
