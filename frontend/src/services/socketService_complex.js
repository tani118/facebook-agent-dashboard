import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.eventHandlers = new Map();
    this.debounceTimers = new Map(); // For debouncing rapid events
    this.hasTriedLocalhost = false; // Track fallback attempts
  }

  getSocketUrl() {
    // Use dedicated socket URL if available, otherwise fallback to localhost for reliability
    return import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
  }

  connect(userId) {
    if (this.socket) {
      this.disconnect();
    }

    // Determine the correct socket URL
    const socketUrl = this.getSocketUrl();
    console.log('🔌 Attempting to connect to:', socketUrl);

    // For ngrok, we need special configuration
    const isNgrok = socketUrl.includes('ngrok');
    
    this.socket = io(socketUrl, {
      withCredentials: true,
      // For ngrok, prefer polling over websocket initially
      transports: isNgrok ? ['polling', 'websocket'] : ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 15000, // Increase timeout for ngrok
      forceNew: true,
      ...(isNgrok && {
        // Additional ngrok-specific options
        upgrade: false, // Disable automatic upgrade to websocket for ngrok
        rememberUpgrade: false,
        // Add ngrok skip browser warning header
        extraHeaders: {
          'ngrok-skip-browser-warning': 'true'
        }
      })
    });

    this.socket.on('connect', () => {
      console.log('🔌 Connected to server via WebSocket');
      this.isConnected = true;
      
      // Join user-specific room
      if (userId) {
        this.socket.emit('join-user-room', userId);
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from server:', reason);
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔌 Connection error:', error);
      this.isConnected = false;
      
      // If ngrok connection fails, try localhost as fallback
      if (socketUrl.includes('ngrok') && !this.hasTriedLocalhost) {
        console.log('🔄 Ngrok socket failed, trying localhost fallback...');
        this.hasTriedLocalhost = true;
        this.disconnect();
        
        setTimeout(() => {
          this.socket = io('http://localhost:5000', {
            withCredentials: true,
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 3,
            reconnectionDelay: 1000,
            timeout: 5000
          });
          this.setupEventHandlers();
          
          this.socket.on('connect', () => {
            console.log('🔌 Connected via localhost fallback');
            this.isConnected = true;
          });
          
        }, 1000);
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔌 Reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🔌 Reconnection failed:', error);
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

    // Handle new comment events with debouncing to avoid excessive API calls
    this.socket.on('new-comment', (data) => {
      console.log('💬 Received new comment:', data);
      this.emitToHandlers('new-comment', data);
    });

    // Handle conversation updates
    this.socket.on('conversation-updated', (data) => {
      console.log('💬 Conversation updated:', data);
      this.emitToHandlers('conversation-updated', data);
    });

    // Handle comment refresh events (for immediate UI updates)
    this.socket.on('comment-refresh', (data) => {
      console.log('🔄 Comment refresh requested:', data);
      this.emitToHandlers('comment-refresh', data);
    });
  }

  // Event handler management with debouncing support
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

  // Debounced event emission to prevent excessive API calls
  emitToHandlersDebounced(event, data, delay = 300) {
    const timerId = this.debounceTimers.get(event);
    if (timerId) {
      clearTimeout(timerId);
    }

    this.debounceTimers.set(event, setTimeout(() => {
      this.emitToHandlers(event, data);
      this.debounceTimers.delete(event);
    }, delay));
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
