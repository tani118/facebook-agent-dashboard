import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventHandlers = new Map();
  }

  connect(userId) {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('🔌 Connected to server via WebSocket');
      this.isConnected = true;
      
      // Join user-specific room
      if (userId) {
        this.socket.emit('join-user-room', userId);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      this.isConnected = false;
    });

    // Set up event handlers
    this.setupEventHandlers();

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  joinPageRoom(pageId) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join-page-room', pageId);
      console.log(`📄 Joined page room: ${pageId}`);
    }
  }

  setupEventHandlers() {
    if (!this.socket) return;

    // Handle new message events
    this.socket.on('new-message', (data) => {
      console.log('📩 Received new message:', data);
      this.emitToHandlers('new-message', data);
    });

    // Handle conversation updates
    this.socket.on('conversation-updated', (data) => {
      console.log('💬 Conversation updated:', data);
      this.emitToHandlers('conversation-updated', data);
    });
  }

  // Event handler management
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event).add(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).delete(handler);
    }
  }

  emitToHandlers(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in ${event} handler:`, error);
        }
      });
    }
  }

  // Utility methods
  isSocketConnected() {
    return this.socket && this.isConnected;
  }

  getSocketId() {
    return this.socket?.id;
  }
}

// Singleton instance
const socketService = new SocketService();

export default socketService;
