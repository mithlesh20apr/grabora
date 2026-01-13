# Support Management System - API Specification

Updated to match exact API requirements provided.

---

## Integrated APIs

### 1. Create Support Ticket
**Endpoint:** `POST /api/v1/support/tickets`

**Request:**
```json
{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "9876543210",
  "category": "order",
  "priority": "medium",
  "subject": "Order not delivered",
  "description": "My order #ORD-2026-00123 was supposed to be delivered yesterday but I haven't received it yet.",
  "orderId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "productId": "64f1a2b3c4d5e6f7a8b9c0d2"
}
```

**Category Options:** `order`, `payment`, `delivery`, `refund`, `product`, `account`, `technical`, `feedback`, `other`

**Priority Options:** `low`, `medium`, `high`, `urgent`

**Notes:**
- `customerName`, `customerEmail`, `customerPhone`, `category`, `priority`, `subject`, `description` are required
- `orderId` and `productId` are optional

---

### 2. Get User's Tickets
**Endpoint:** `GET /api/v1/support/my-tickets?status=open&page=1&limit=10`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `status` (optional): Filter by status - `open`, `in-progress`, `resolved`, `closed`
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ticket_id",
      "userId": "user_id",
      "customerName": "John Doe",
      "customerEmail": "john@example.com",
      "customerPhone": "9876543210",
      "subject": "Order issue",
      "category": "order",
      "priority": "medium",
      "status": "in-progress",
      "description": "Product received damaged",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T11:45:00Z",
      "messages": []
    }
  ]
}
```

---

### 3. Get Ticket Details
**Endpoint:** `GET /api/v1/support/tickets/{id}` or `GET /api/v1/support/tickets/TKT-2026-00001`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "ticket_id",
    "userId": "user_id",
    "customerName": "John Doe",
    "customerEmail": "john@example.com",
    "customerPhone": "9876543210",
    "subject": "Payment failed",
    "category": "payment",
    "priority": "urgent",
    "status": "resolved",
    "description": "Transaction failed but amount was deducted",
    "createdAt": "2024-01-15T09:00:00Z",
    "updatedAt": "2024-01-15T14:00:00Z",
    "rating": {
      "rating": 4,
      "feedback": "Quick resolution, very helpful"
    },
    "messages": [
      {
        "_id": "msg_id_1",
        "ticketId": "ticket_id",
        "senderId": "user_id",
        "senderName": "John Doe",
        "senderType": "customer",
        "message": "My payment was deducted but order not placed",
        "createdAt": "2024-01-15T09:00:00Z"
      },
      {
        "_id": "msg_id_2",
        "ticketId": "ticket_id",
        "senderId": "support_staff_id",
        "senderName": "Support Team",
        "senderType": "support",
        "message": "We've refunded your amount. Please check your account.",
        "createdAt": "2024-01-15T09:15:00Z"
      }
    ]
  }
}
```

---

### 4. Add User Message/Reply
**Endpoint:** `POST /api/v1/support/tickets/{id}/message`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "message": "I checked with my neighbors and they haven't received any package on my behalf. Please investigate."
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
    "message": "I checked with my neighbors and they haven't received any package on my behalf. Please investigate.",
    "createdAt": "2024-01-15T14:30:00Z"
  }
}
```

---

### 5. Rate Resolved Ticket
**Endpoint:** `POST /api/v1/support/tickets/{id}/rate`

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
  "rating": 5,
  "feedback": "Very helpful support team. Issue was resolved quickly."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "ticket_id",
    "rating": {
      "rating": 5,
      "feedback": "Very helpful support team. Issue was resolved quickly."
    },
    "updatedAt": "2024-01-15T14:35:00Z"
  }
}
```

---

## Form Fields Implementation

### Required Fields
1. **Customer Name** - Auto-filled from user profile (user.fullName)
2. **Customer Email** - Auto-filled from user profile (user.email)
3. **Customer Phone** - Auto-filled from user profile (user.phone)
4. **Subject** - Issue title
5. **Description** - Full issue description
6. **Category** - Selected from dropdown (lowercase)
7. **Priority** - Selected from dropdown (lowercase)

### Optional Fields
1. **Order ID** - Link to specific order
2. **Product ID** - Link to specific product

---

## Category Mapping

```typescript
'order' → 'Order Issue'
'payment' → 'Payment Problem'
'delivery' → 'Shipping & Delivery'
'refund' → 'Return & Refund'
'product' → 'Product Question'
'account' → 'Account Help'
'technical' → 'Technical Support'
'feedback' → 'Feedback'
'other' → 'Other'
```

---

## Priority Mapping

```typescript
'low' → Low priority (Green)
'medium' → Medium priority (Yellow)
'high' → High priority (Orange)
'urgent' → Urgent priority (Red)
```

---

## Status Mapping

```typescript
'open' → Open (Blue)
'in-progress' → In Progress (Purple)
'resolved' → Resolved (Green)
'closed' → Closed (Gray)
```

---

## Rating Field

- **Field Name**: `rating` (not `score`)
- **Type**: Number (1-5)
- **Optional**: Yes (only set after ticket is resolved)
- **Display**: Star rating visualization

---

## Compilation Status

✅ **Zero TypeScript Errors**
✅ **Full Type Safety**
✅ **All APIs Integrated**
✅ **Production Ready**

---

## Implementation Checklist

- ✅ Updated SupportTicket interface with customerName, customerEmail, customerPhone
- ✅ Changed priority from uppercase ('Low', 'Medium', etc.) to lowercase ('low', 'medium', etc.)
- ✅ Changed status from mixed case ('Open', 'In Progress', etc.) to lowercase ('open', 'in-progress', etc.)
- ✅ Updated category array to use object structure with value/label pairs
- ✅ Added orderId and productId optional fields to form
- ✅ Changed rating field from 'score' to 'rating'
- ✅ Updated color mappings for lowercase values
- ✅ Updated all API calls to send correct field names
- ✅ Updated form validation to require customerName, customerEmail, customerPhone
- ✅ All form fields properly mapped and validated
