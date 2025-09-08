# Facebook Helpdesk Dashboard
## Demo: https://www.loom.com/share/5548fd67aba2476eb7c0fd5013d89f8e?sid=650bd38d-c7ca-4881-a5a1-54233c667e4b
## Deployed at: https://facebook-agent-dashboard-2.vercel.app/

A complete Facebook Helpdesk Dashboard solution that allows businesses to manage Facebook Messenger conversations and post comments from a unified interface.

## Features

### Backend
- **Authentication System**: JWT-based user authentication with signup/login
- **Facebook Integration**: OAuth integration for page connections
- **Messenger Management**: Real-time conversation handling with 24-hour rule
- **Post Comments**: Complete CRUD operations for Facebook post comments
- **Webhook Processing**: Real-time event handling from Facebook
- **Agent Assignment**: Manual and automatic conversation assignment
- **Database Models**: User, Conversation, and Message management

### Frontend
- **Simple Dashboard Interface**: Clean and minimal design
- **Authentication Flow**: Login/Signup with proper validation
- **Facebook Page Setup**: Connect and manage Facebook pages
- **Conversation List**: View all conversations and posts in sidebar
- **Chat Interface**: Send messages and reply to comments
- **Real-time Updates**: Live conversation and comment management

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Facebook Graph API v23.0**
- **JWT Authentication**
- **Real-time Webhooks**

### Frontend
- **React 19** with Vite
- **Tailwind CSS** for styling
- **Axios** for API calls
- **Context API** for state management

## Quick Start

### Prerequisites
- Node.js 18+ installed
- MongoDB installed and running
- Facebook Developer App (for production)

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   Create `.env` file with:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/facebook-dashboard
   
   # JWT
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_EXPIRE=7d
   
   # Session
   SESSION_SECRET=your-session-secret-here
   
   # Facebook App (for production)
   FACEBOOK_APP_ID=your-facebook-app-id
   FACEBOOK_APP_SECRET=your-facebook-app-secret
   WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token
   
   # URLs
   FRONTEND_URL=http://localhost:5173
   BACKEND_URL=http://localhost:5000
   ```

4. **Start the server**
   ```bash
   npm start
   ```
   Server runs at: http://localhost:5000

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   Frontend runs at: http://localhost:5173

## Usage

### 1. Authentication
- **Sign Up**: Create a new account with name, email, and password
- **Login**: Sign in with your credentials

### 2. Facebook Page Setup
- **Connect Page**: Use Facebook OAuth to connect your Facebook pages
- **Manage Pages**: View connected pages and disconnect if needed
- **Multiple Pages**: Switch between multiple connected pages

### 3. Dashboard
- **Conversations Tab**: View and manage Messenger conversations
- **Posts Tab**: View Facebook posts and manage comments
- **Chat Interface**: Click on any conversation or post to start managing
- **Real-time**: Live updates for new messages and comments

### 4. Messaging & Comments
- **Send Messages**: Reply to customer messages in real-time
- **Comment Replies**: Respond to post comments directly
- **Comment Moderation**: Hide, delete, or like/unlike comments
- **Private Messages**: Send private messages to comment authors

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile

### Facebook Integration
- `GET /api/facebook-auth/` - Initiate Facebook OAuth
- `GET /api/facebook-auth/callback` - Handle OAuth callback
- `GET /api/facebook-auth/pages` - Get connected pages

### Conversations
- `GET /api/conversations` - Get conversations
- `GET /api/facebook/messages/:id` - Get conversation messages
- `POST /api/facebook/send-message` - Send message

### Posts & Comments
- `GET /api/posts/:pageId` - Get page posts
- `GET /api/posts/:pageId/:postId/comments` - Get post comments
- `POST /api/posts/:pageId/comments/:commentId/reply` - Reply to comment

## Project Structure

```
facebook-agent-dashboard/
├── backend/
│   ├── api/                    # Facebook API clients
│   ├── config/                 # Database configuration
│   ├── middleware/             # Auth and validation middleware
│   ├── models/                 # MongoDB models
│   ├── routes/                 # Express routes
│   ├── services/               # Business logic
│   ├── utils/                  # Utility functions
│   └── server.js               # Main server file
│
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── contexts/           # React contexts
│   │   └── App.jsx             # Main app component
│   └── package.json
│
└── README.md
```

## Development Status

### Features
- Complete backend API with 25+ endpoints
- User authentication and authorization
- Facebook OAuth integration
- Real-time webhook processing
- Conversation management with 24-hour rules
- Post comments CRUD operations
- Simple and clean frontend interface
- Dashboard with conversation and post management
- Chat interface for messaging and commenting

### Production Setup Required
- Facebook App configuration with real credentials
- Public webhook URL setup
- Production deployment (AWS, GCP, Azure)
- SSL certificates and domain setup
For issues and questions:
- Create an issue in the repository
- Check the API documentation in `backend/COMPLETE_API_DOCS.md`
- Review the implementation status in `backend/FINAL_IMPLEMENTATION_STATUS.md`
