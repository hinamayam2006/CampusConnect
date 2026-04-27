import { io } from 'socket.io-client';

let socket = null;

function toErrorText(err) {
  if (!err) return '';
  if (typeof err === 'string') return err;
  if (typeof err?.message === 'string') return err.message;
  return String(err);
}

function isAuthFailure(err) {
  const text = toErrorText(err).toLowerCase();
  return text.includes('authentication failed') || text.includes('token') || text.includes('not authorized');
}

/**
 * Initialize Socket.io connection
 * Called once when the app loads (in layout or App component)
 */
export const initializeSocket = (token) => {
  if (socket) {
    if (token) {
      socket.auth = { ...(socket.auth || {}), token };
    }
    return socket;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

  socket = io(apiUrl, {
    auth: {
      token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('Socket.io connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket.io disconnected');
  });

  socket.on('connect_error', (err) => {
    if (isAuthFailure(err)) {
      console.warn('Socket auth connect failed. Waiting for fresh token.');
      return;
    }
    console.error('Socket.io connect_error:', err);
  });

  socket.on('error', (err) => {
    if (isAuthFailure(err)) {
      console.warn('Socket auth error. Waiting for fresh token.');
      return;
    }
    console.error('Socket.io error:', err);
  });

  return socket;
};

/**
 * Update auth token for existing socket instance.
 * Useful when access token rotates via refresh.
 */
export const updateSocketAuthToken = (token) => {
  if (!socket || !token) return;
  socket.auth = { ...(socket.auth || {}), token };
};

/**
 * Get the Socket.io instance
 */
export const getSocket = () => {
  return socket;
};

/**
 * Disconnect the Socket.io connection
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Register user for notifications
 */
export const registerUser = (userId, token) => {
  if (socket) {
    socket.emit('register_user', userId, token);
  }
};

/**
 * Join a chat room for a specific request
 */
export const joinChatRoom = (requestId) => {
  if (socket) {
    socket.emit('join_request_chat', requestId);
  }
};

/**
 * Send a message via Socket.io
 */
export const sendMessage = (requestId, content, messageType = 'text', attachment = null) => {
  if (socket) {
    socket.emit('send_message', {
      requestId,
      content,
      messageType,
      attachment,
    });
  }
};

/**
 * Listen for incoming messages
 */
export const onMessageReceived = (callback) => {
  if (socket) {
    socket.on('receive_message', callback);
  }
};

/**
 * Listen for global notification events
 */
export const onNotificationReceived = (callback) => {
  if (socket) {
    socket.on('notification_received', callback);
  }
};

/**
 * Handle typing indicator
 */
export const sendTyping = (requestId) => {
  if (socket) {
    socket.emit('typing', { requestId });
  }
};

/**
 * Handle stop typing
 */
export const sendStopTyping = (requestId) => {
  if (socket) {
    socket.emit('stop_typing', { requestId });
  }
};

/**
 * Listen for typing indicators
 */
export const onUserTyping = (callback) => {
  if (socket) {
    socket.on('user_typing', callback);
  }
};

/**
 * Listen for stop typing
 */
export const onUserStopTyping = (callback) => {
  if (socket) {
    socket.on('user_stop_typing', callback);
  }
};

/**
 * Mark message as read
 */
export const markMessageRead = (messageId) => {
  if (socket) {
    socket.emit('mark_read', { messageId });
  }
};

/**
 * Listen for read confirmations
 */
export const onReadConfirmed = (callback) => {
  if (socket) {
    socket.on('read_confirmed', callback);
  }
};

/**
 * Remove a listener
 */
export const removeListener = (event, callback) => {
  if (socket) {
    socket.off(event, callback);
  }
};
