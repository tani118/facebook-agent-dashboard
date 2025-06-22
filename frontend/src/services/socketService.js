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

    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const isNgrok = socketUrl.includes('ngrok');

    const socketOptions = {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      forceNew: true,
      timeout: 15000
    };

    if (isNgrok) {
      socketOptions.transports = ['polling']; 
      socketOptions.upgrade = false; 
      socketOptions.extraHeaders = {
        'ngrok-skip-browser-warning': 'true'
      };
    } else {
      socketOptions.transports = ['polling', 'websocket'];
    }

    this.socket = io(socketUrl, socketOptions);

    this.socket.on('connect', () => {
      this.isConnected = true;
      
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

    this.socket.on('new-message', (data) => {
      console.log('📩 Received new message:', data);
      this.emitToHandlers('new-message', data);
    });

    this.socket.on('new-comment', (data) => {
      console.log('💬 Received new comment:', data);
      this.emitToHandlers('new-comment', data);
    });

    this.socket.on('conversation-updated', (data) => {
      console.log('💬 Conversation updated:', data);
      this.emitToHandlers('conversation-updated', data);
    });
  }

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

  isSocketConnected() {
    return this.socket && this.isConnected;
  }

  getSocketId() {
    return this.socket?.id;
  }
}

const socketService = new SocketService();

export default socketService;
