# Facebook Dashboard Backend API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication Endpoints

### 1. User Registration
**POST** `/auth/signup`

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2025-06-21T06:19:43.620Z"
    },
    "token": "jwt_token_here"
  }
}
```

**Validation Rules:**
- Name: 2-50 characters, letters and spaces only
- Email: Valid email format
- Password: Minimum 6 characters, must contain uppercase, lowercase, and number

### 2. User Login
**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2025-06-21T06:19:43.620Z"
    },
    "token": "jwt_token_here"
  }
}
```

### 3. Get Current User Profile
**GET** `/auth/me`

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2025-06-21T06:19:43.620Z",
      "updatedAt": "2025-06-21T06:19:43.620Z"
    }
  }
}
```

### 4. Update User Profile
**PUT** `/auth/profile`

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "email": "newemail@example.com"
}
```

### 5. Change Password
**POST** `/auth/change-password`

**Headers:**
```
Authorization: Bearer jwt_token_here
```

**Request Body:**
```json
{
  "currentPassword": "currentPass123",
  "newPassword": "newSecurePass123"
}
```

## Utility Endpoints

### Health Check
**GET** `/health`

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-06-21T06:19:30.605Z"
}
```

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email"
    }
  ]
}
```

### Authentication Error (401)
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Testing with cURL

### Register a new user:
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "Test123456"
  }'
```

### Login:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456"
  }'
```

### Get profile (replace TOKEN with actual JWT):
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

## Environment Variables Required

```env
# Database
MONGODB_URI=mongodb://localhost:27017/facebook-dashboard

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# Session
SESSION_SECRET=your-session-secret

# Server
PORT=5000
NODE_ENV=development

# Frontend (CORS)
FRONTEND_URL=http://localhost:5173
```
