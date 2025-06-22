require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const { createServer } = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/database');

const authRoutes = require('./routes/auth');
const facebookRoutes = require('./routes/facebook');
const conversationRoutes = require('./routes/conversations');
const webhookRoutes = require('./routes/webhook');
const facebookAuthRoutes = require('./routes/facebookAuth');
const postsRoutes = require('./routes/posts');
const commentsRoutes = require('./routes/comments');

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://localhost:5176',
      'http://127.0.0.1:5176',
      'http://[::1]:5176',
      'http://localhost:5177',
      'https://6de4-103-108-5-157.ngrok-free.app',
      'https://b1d4-103-108-5-157.ngrok-free.app',
      'https://eca5-103-108-5-157.ngrok-free.app',
      'file://'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['ngrok-skip-browser-warning', 'Content-Type', 'Authorization']
  },
  allowEIO3: true,
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6,
  serveClient: false
});

// Connect to MongoDB
connectDB();

// Store Socket.IO instance globally for use in routes
global.io = io;

// Middleware`
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5174', // Additional port in case 5173 is in use
    'http://localhost:5175', // Additional port in case 5174 is also in use
    'http://localhost:5176', // Current frontend port
    'http://localhost:5177', // Another possible frontend port
    'http://localhost:5173', // Allow local frontend explicitly
    'https://b1d4-103-108-5-157.ngrok-free.app', // Allow self-requests via ngrok
    'https://eca5-103-108-5-157.ngrok-free.app', // Current ngrok URL
    'https://6de4-103-108-5-157.ngrok-free.app'
  ],
  credentials: true
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/facebook-dashboard'
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/facebook', facebookRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/facebook-auth', facebookAuthRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/comments', commentsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Default route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Facebook Dashboard Backend API',
    version: '1.0.0'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

const PORT = process.env.PORT || 5000;

// Socket.IO connection handling with detailed logging
io.engine.on('connection_error', (err) => {
  console.log('🔌❌ Socket.IO connection error:', err.req);
  console.log('🔌❌ Error details:', err.code, err.message);
  console.log('🔌❌ Error context:', err.context);
});

io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  console.log('🔌 Client origin:', socket.handshake.headers.origin);
  console.log('🔌 Client user-agent:', socket.handshake.headers['user-agent']);
  
  // Join user to their specific room for targeted updates
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`👤 User ${userId} joined their room`);
  });
  
  // Join user to page-specific room for page updates
  socket.on('join-page-room', (pageId) => {
    socket.join(`page-${pageId}`);
    console.log(`📄 Joined page room: ${pageId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

const httpServer = server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`⚡ WebSocket enabled for real-time updates`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => {
    console.log('💤 Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  httpServer.close(() => {
    console.log('💤 Process terminated');
    process.exit(0);
  });
});

module.exports = app;
