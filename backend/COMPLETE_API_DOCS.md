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

## Facebook Authentication Routes (`/api/facebook-auth`)

### 1. Exchange Token
- **POST** `/facebook-auth/exchange-token`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "shortLivedToken": "short_lived_user_access_token"
  }
  ```

### 2. Get User's Facebook Pages
- **POST** `/facebook-auth/get-pages`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "userToken": "user_access_token"
  }
  ```

### 3. Connect Facebook Page
- **POST** `/facebook-auth/connect-page`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "pageId": "page_id",
    "pageName": "Page Name",
    "userToken": "user_access_token"
  }
  ```

### 4. Disconnect Facebook Page
- **DELETE** `/facebook-auth/disconnect-page/:pageId`
- **Headers:** `Authorization: Bearer <token>`

### 5. Get Connected Pages
- **GET** `/facebook-auth/connected-pages`
- **Headers:** `Authorization: Bearer <token>`

### 6. Refresh Page Token
- **POST** `/facebook-auth/refresh-page-token`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "pageId": "page_id",
    "userToken": "user_access_token"
  }
  ```

---

## Webhook Routes (`/api/webhook`)

### 1. Webhook Verification (Facebook Setup)
- **GET** `/webhook/webhook?hub.mode=subscribe&hub.verify_token=<verify_token>&hub.challenge=<challenge>`
- **Description:** Used by Facebook to verify webhook endpoint

### 2. Webhook Event Handler
- **POST** `/webhook/webhook`
- **Description:** Receives Facebook webhook events (messages, comments, etc.)
- **Automatically processes:**
  - Incoming messages
  - Message delivery confirmations
  - Message read receipts
  - Postback events
  - Comment events

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

## Posts and Comments Routes (`/api/posts`)

### 1. Get Page Posts
- **GET** `/posts/:pageId`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `limit` (optional): Number of posts to fetch (default: 25)
  - `since` (optional): Unix timestamp to fetch posts since
  - `until` (optional): Unix timestamp to fetch posts until
- **Response:**
  ```json
  {
    "success": true,
    "posts": [
      {
        "id": "page_id_post_id",
        "message": "Post content here",
        "created_time": "2023-12-21T10:00:00.000Z",
        "updated_time": "2023-12-21T10:00:00.000Z",
        "story": "Story text if available",
        "full_picture": "https://example.com/image.jpg",
        "permalink_url": "https://facebook.com/permalink",
        "status_type": "mobile_status_update",
        "type": "status",
        "from": {
          "name": "Page Name",
          "id": "page_id"
        },
        "comments_count": 5,
        "likes_count": 12,
        "reactions_count": 15,
        "shares_count": 3
      }
    ],
    "paging": {
      "cursors": {
        "before": "cursor_before",
        "after": "cursor_after"
      },
      "next": "next_page_url"
    }
  }
  ```

### 2. Get Post Comments
- **GET** `/posts/:pageId/:postId/comments`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `limit` (optional): Number of comments to fetch (default: 25)
  - `order` (optional): 'chronological' or 'reverse_chronological' (default: 'chronological')
  - `includeReplies` (optional): Include comment replies (default: 'true')
- **Response:**
  ```json
  {
    "success": true,
    "comments": [
      {
        "id": "comment_id",
        "message": "This is a comment",
        "created_time": "2023-12-21T10:00:00.000Z",
        "from": {
          "name": "User Name",
          "id": "user_id"
        },
        "attachment": {
          "media": {
            "image": {
              "src": "https://example.com/image.jpg"
            }
          }
        },
        "like_count": 3,
        "comment_count": 1,
        "user_likes": false,
        "can_reply_privately": true,
        "comments": {
          "data": [
            {
              "id": "reply_id",
              "message": "Reply to comment",
              "created_time": "2023-12-21T10:30:00.000Z",
              "from": {
                "name": "Another User",
                "id": "another_user_id"
              },
              "like_count": 0,
              "parent": {
                "id": "comment_id"
              }
            }
          ]
        }
      }
    ],
    "paging": {
      "cursors": {
        "before": "cursor_before",
        "after": "cursor_after"
      }
    }
  }
  ```

### 3. Get Specific Comment
- **GET** `/posts/:pageId/comments/:commentId`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "comment": {
      "id": "comment_id",
      "message": "Comment content",
      "created_time": "2023-12-21T10:00:00.000Z",
      "from": {
        "name": "User Name",
        "id": "user_id"
      },
      "like_count": 3,
      "comment_count": 1,
      "user_likes": false,
      "can_reply_privately": true,
      "permalink_url": "https://facebook.com/comment_permalink"
    }
  }
  ```

### 4. Reply to Comment
- **POST** `/posts/:pageId/comments/:commentId/reply`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "message": "This is a reply to the comment"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "reply": {
      "id": "new_reply_id"
    }
  }
  ```

### 5. Send Private Message to Comment Author
- **POST** `/posts/:pageId/comments/:commentId/private-message`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "message": "Private message to comment author"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "privateMessage": {
      "id": "private_message_id"
    }
  }
  ```

### 6. Hide/Unhide Comment
- **POST** `/posts/:pageId/comments/:commentId/hide`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "hide": true
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Comment hidden successfully",
    "data": {
      "success": true
    }
  }
  ```

### 7. Delete Comment
- **DELETE** `/posts/:pageId/comments/:commentId`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Comment deleted successfully",
    "data": {
      "success": true
    }
  }
  ```

### 8. Like/Unlike Comment
- **POST** `/posts/:pageId/comments/:commentId/like`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "like": true
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Comment liked successfully",
    "data": {
      "success": true
    }
  }
  ```

### 9. Search Comments
- **GET** `/posts/:pageId/:postId/comments/search`
- **Headers:** `Authorization: Bearer <token>`
- **Query Parameters:**
  - `keyword` (required): Keyword to search for
  - `limit` (optional): Number of results to return (default: 10)
- **Response:**
  ```json
  {
    "success": true,
    "searchResults": {
      "data": [
        {
          "id": "comment_id",
          "message": "Comment containing the keyword",
          "created_time": "2023-12-21T10:00:00.000Z",
          "from": {
            "name": "User Name",
            "id": "user_id"
          },
          "like_count": 2
        }
      ],
      "keyword": "search_keyword",
      "total_matches": 1
    }
  }
  ```

### 10. Batch Process Comments
- **POST** `/posts/:pageId/comments/batch`
- **Headers:** `Authorization: Bearer <token>`
- **Body:**
  ```json
  {
    "operations": [
      {
        "action": "reply",
        "commentId": "comment_id_1",
        "message": "Reply message"
      },
      {
        "action": "hide",
        "commentId": "comment_id_2",
        "hide": true
      },
      {
        "action": "like",
        "commentId": "comment_id_3",
        "like": true
      },
      {
        "action": "private_message",
        "commentId": "comment_id_4",
        "message": "Private message"
      },
      {
        "action": "delete",
        "commentId": "comment_id_5"
      }
    ]
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "batchResults": [
      {
        "operation": {
          "action": "reply",
          "commentId": "comment_id_1",
          "message": "Reply message"
        },
        "result": {
          "success": true,
          "data": {
            "id": "new_reply_id"
          }
        }
      },
      {
        "operation": {
          "action": "hide",
          "commentId": "comment_id_2",
          "hide": true
        },
        "result": {
          "success": true,
          "data": {
            "success": true
          }
        }
      }
    ]
  }
  ```

### 11. Get Comment Author Profile
- **GET** `/posts/:pageId/comments/:commentId/author`
- **Headers:** `Authorization: Bearer <token>`
- **Response:**
  ```json
  {
    "success": true,
    "author": {
      "id": "user_id",
      "name": "User Name",
      "first_name": "User",
      "last_name": "Name",
      "picture": {
        "data": {
          "height": 50,
          "is_silhouette": false,
          "url": "https://example.com/profile_pic.jpg",
          "width": 50
        }
      }
    }
  }
  ```

---

## Facebook Post Comments API Class

The `FacebookPostCommentsFetcher` class provides comprehensive functionality for managing Facebook post comments:

### Key Features:
- **Post Management**: Fetch page posts with filtering options
- **Comment Operations**: Fetch, reply, hide, delete, like/unlike comments
- **Private Messaging**: Send private messages to comment authors
- **Batch Processing**: Perform multiple operations in a single request
- **Search Functionality**: Search comments by keyword
- **User Profiles**: Get comment author information
- **Moderation Tools**: Hide inappropriate comments, delete spam

### Usage Example:
```javascript
const FacebookPostCommentsFetcher = require('./api/fetch-post-comments');

// Initialize with page access token
const fetcher = new FacebookPostCommentsFetcher(pageAccessToken);

// Fetch page posts
const posts = await fetcher.fetchPagePosts(pageId, 25);

// Fetch post comments
const comments = await fetcher.fetchPostComments(postId, 25, 'chronological', true);

// Reply to a comment
const reply = await fetcher.replyToComment(commentId, 'Thank you for your comment!');

// Hide inappropriate comment
const hideResult = await fetcher.hideComment(commentId, true);

// Send private message
const privateMsg = await fetcher.sendPrivateMessage(commentId, 'We sent you a private message');
```

---

## Database Schema Updates

### Message Model Extensions
- Added support for post comment messages
- Enhanced attachment handling for comment media
- Added comment-specific metadata fields

### User Model
- Integrated with Facebook Pages for comment management
- Added page access token storage for comment operations

### Conversation Model
- Extended to handle post comment conversations
- Added post-related metadata and tracking

---

## Implementation Status

### ✅ Completed Features:
1. **Complete Backend Infrastructure** - Express.js server with MongoDB
2. **Authentication System** - JWT-based user auth with password hashing
3. **Facebook Integration** - OAuth, Page connections, Messenger API
4. **Webhook System** - Real-time message processing and events
5. **Conversation Management** - 24-hour rule, agent assignment, status tracking
6. **Message Operations** - Send, receive, read tracking, attachments
7. **User Management** - Profile management, page connections
8. **Facebook Posts & Comments** - Complete CRUD operations for post comments
9. **Comment Moderation** - Hide, delete, like, private messaging
10. **Batch Operations** - Process multiple comments simultaneously
11. **Search & Analytics** - Comment search, author profiles, insights

### 📋 Ready for Production:
- All API endpoints are fully functional
- Comprehensive error handling and validation
- Production-ready security measures
- Complete API documentation
- Modular and maintainable code structure
