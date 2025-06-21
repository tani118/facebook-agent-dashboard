# Facebook Helpdesk Dashboard - Complete API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## Authentication Routes (`/api/auth`)

### 1. User Registration
- **POST** `/auth/signup`
- **Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "data": {
      "user": {
        "id": "user_id",
        "name": "John Doe",
        "email": "john@example.com",
        "createdAt": "2023-12-21T10:00:00.000Z"
      },
      "token": "jwt_token_here"
    }
  }
  ```

### 2. User Login
- **POST** `/auth/login`
- **Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "SecurePass123"
  }
  ```

### 3. Get Current User Profile
- **GET** `/auth/me`
- **Headers:** `Authorization: Bearer <token>`

### 4. Update User Profile
- **PUT** `/auth/profile`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "name": "John Smith",
    "email": "johnsmith@example.com"
  }
  ```

### 5. Change Password
- **POST** `/auth/change-password`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "currentPassword": "oldPassword",
    "newPassword": "NewSecurePass123"
  }
  ```

---

## Facebook API Routes (`/api/facebook`)

### 1. Get Page Conversations
- **GET** `/facebook/conversations/:pageId?pageAccessToken=<token>&limit=25`
- **Headers:** `Authorization: Bearer <token>`

### 2. Get Conversation Messages
- **GET** `/facebook/conversations/:conversationId/messages?pageAccessToken=<token>&limit=25`
- **Headers:** `Authorization: Bearer <token>`

### 3. Get User Profile
- **GET** `/facebook/user/:userId?pageAccessToken=<token>`
- **Headers:** `Authorization: Bearer <token>`

### 4. Send Message
- **POST** `/facebook/conversations/:conversationId/send`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "message": "Hello, how can I help you?",
    "pageAccessToken": "page_access_token"
  }
  ```

### 5. Get Page Information
- **GET** `/facebook/page/:pageId?pageAccessToken=<token>`
- **Headers:** `Authorization: Bearer <token>`

### 6. Test Facebook Connection
- **POST** `/facebook/test-connection`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "pageAccessToken": "page_access_token",
    "pageId": "page_id"
  }
  ```

---

## Conversation Management Routes (`/api/conversations`)

### 1. Sync Conversations from Facebook
- **POST** `/conversations/sync`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "pageAccessToken": "page_access_token",
    "pageId": "page_id",
    "limit": 25
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Successfully synced 15 conversations",
    "data": {
      "syncedCount": 15,
      "conversations": [...]
    }
  }
  ```

### 2. Sync Messages for Conversation
- **POST** `/conversations/:conversationId/sync-messages`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "pageAccessToken": "page_access_token",
    "pageId": "page_id",
    "limit": 25
  }
  ```

### 3. Get Local Conversations
- **GET** `/conversations?pageId=<pageId>&page=1&limit=25`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Conversations retrieved successfully",
    "data": {
      "conversations": [
        {
          "conversationId": "conversation_id",
          "pageId": "page_id",
          "customerId": "customer_id",
          "customerName": "Customer Name",
          "customerProfilePic": "profile_pic_url",
          "lastMessageAt": "2023-12-21T10:00:00.000Z",
          "lastMessageContent": "Last message content",
          "unreadCount": 3,
          "status": "active",
          "assignedTo": null,
          "createdAt": "2023-12-21T09:00:00.000Z",
          "updatedAt": "2023-12-21T10:00:00.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 25,
        "total": 50,
        "pages": 2
      }
    }
  }
  ```

### 4. Get Messages for Conversation
- **GET** `/conversations/:conversationId/messages?pageId=<pageId>&page=1&limit=25`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Messages retrieved successfully",
    "data": {
      "messages": [
        {
          "messageId": "message_id",
          "conversationId": "conversation_id",
          "senderId": "sender_id",
          "senderName": "Sender Name",
          "senderType": "customer",
          "content": "Message content",
          "messageType": "text",
          "sentAt": "2023-12-21T10:00:00.000Z",
          "isRead": true,
          "readAt": "2023-12-21T10:05:00.000Z",
          "attachments": [],
          "deliveryStatus": "delivered"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 25,
        "total": 100,
        "pages": 4
      }
    }
  }
  ```

### 5. Send Message to Conversation
- **POST** `/conversations/:conversationId/send`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "pageAccessToken": "page_access_token",
    "pageId": "page_id",
    "message": "Thank you for contacting us!"
  }
  ```

### 6. Assign Conversation to Agent
- **PUT** `/conversations/:conversationId/assign`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "assignedTo": "user_id"
  }
  ```

### 7. Update Conversation Status
- **PUT** `/conversations/:conversationId/status`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "status": "archived"
  }
  ```
- **Status Options:** `active`, `archived`, `pending`

### 8. Get Conversation Statistics
- **GET** `/conversations/stats?pageId=<pageId>`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "totalConversations": 150,
      "activeConversations": 120,
      "pendingConversations": 25,
      "archivedConversations": 5,
      "unreadMessages": 45
    }
  }
  ```

---

## Utility Routes

### Health Check
- **GET** `/health`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Server is running",
    "timestamp": "2023-12-21T10:00:00.000Z"
  }
  ```

### API Root
- **GET** `/`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Facebook Dashboard Backend API",
    "version": "1.0.0"
  }
  ```

---

## Error Responses

All endpoints return errors in this format:
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"] // Optional
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized (Invalid/Missing Token)
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Facebook Integration Requirements

To use the Facebook integration features, you'll need:

1. **Facebook App ID** and **App Secret**
2. **Page Access Token** with required permissions:
   - `pages_manage_metadata`
   - `pages_messaging`
   - `pages_read_engagement`
   - `pages_show_list`

3. **Webhook Configuration** for real-time message updates

---

## Environment Variables

Make sure to set these in your `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/facebook-dashboard
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
SESSION_SECRET=your-session-secret-key
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token
```

---

## Workflow Example

### 1. User Authentication
```bash
# Register
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"SecurePass123"}'

# Login (save the token)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"SecurePass123"}'
```

### 2. Facebook Integration
```bash
# Test connection
curl -X POST http://localhost:5000/api/facebook/test-connection \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pageAccessToken":"PAGE_ACCESS_TOKEN","pageId":"PAGE_ID"}'

# Sync conversations
curl -X POST http://localhost:5000/api/conversations/sync \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pageAccessToken":"PAGE_ACCESS_TOKEN","pageId":"PAGE_ID","limit":25}'
```

### 3. Message Management
```bash
# Get conversations
curl -X GET "http://localhost:5000/api/conversations?pageId=PAGE_ID&page=1&limit=25" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get messages for a conversation
curl -X GET "http://localhost:5000/api/conversations/CONVERSATION_ID/messages?pageId=PAGE_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Send a message
curl -X POST http://localhost:5000/api/conversations/CONVERSATION_ID/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pageAccessToken":"PAGE_ACCESS_TOKEN","pageId":"PAGE_ID","message":"Hello!"}'
```

---

## Database Models

### User Model
- `name` (String, required)
- `email` (String, required, unique)
- `password` (String, required, hashed)
- `createdAt` (Date)
- `updatedAt` (Date)

### Conversation Model
- `conversationId` (String, unique, Facebook ID)
- `pageId` (String, required)
- `userId` (ObjectId, ref: User)
- `customerId` (String, Facebook customer ID)
- `customerName` (String)
- `customerProfilePic` (String)
- `lastMessageAt` (Date)
- `lastMessageContent` (String)
- `unreadCount` (Number)
- `status` (enum: active, archived, pending)
- `assignedTo` (ObjectId, ref: User)
- `tags` (Array of Strings)
- `notes` (String)

### Message Model
- `messageId` (String, unique, Facebook ID)
- `conversationId` (String)
- `facebookConversationId` (String)
- `pageId` (String)
- `userId` (ObjectId, ref: User)
- `senderId` (String)
- `senderName` (String)
- `senderType` (enum: customer, agent, page)
- `content` (String)
- `messageType` (enum: text, image, file, sticker, other)
- `attachments` (Array)
- `sentAt` (Date)
- `isRead` (Boolean)
- `readAt` (Date)
- `readBy` (ObjectId, ref: User)
- `deliveryStatus` (enum: sent, delivered, failed)

This API provides a complete backend solution for the Facebook Helpdesk Dashboard assignment!
