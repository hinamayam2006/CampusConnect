import './loadEnv.js';

import mongoose from 'mongoose';
import cron from 'node-cron';
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import User from './models/User.model.js';
import { sendRideReminders, autoCloseExpiredRides } from './controllers/rides.controller.js';
import { sendSessionReminders, checkSessionCompletion } from './services/reminder.service.js';
import Message from './models/Message.model.js';
import Request from './models/Request.model.js';

const PORT = process.env.PORT || 5000;

const mongoUri = String(process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
if (!mongoUri) {
  console.error(
    'Missing database URI. Set MONGODB_URI in backend/.env (see .env.example). ' +
      'If you used MONGO_URI, that name is also supported.'
  );
  process.exit(1);
}

// Create HTTP server and Socket.io instance
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: (process.env.FRONTEND_URL || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    credentials: true,
  },
});

globalThis.__campusIo = io;

// Store user socket connections for routing
const userConnections = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Register user connection — must be authenticated via JWT
  socket.on('register_user', async (userId, token) => {
    try {
      // Verify JWT token matches userId to prevent spoofing
      if (!token) {
        socket.emit('error', 'Authentication token required');
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.userId !== userId) {
        socket.emit('error', 'Token does not match user ID');
        return;
      }

      // Verify user still exists and is not suspended
      const user = await User.findById(userId);
      if (!user) {
        socket.emit('error', 'User not found');
        return;
      }

      if (user.isSuspended) {
        socket.emit('error', 'Account suspended');
        return;
      }

      userConnections.set(userId, socket.id);
      socket.userId = userId;
      socket.join(`user_${userId}`);
      console.log(`User ${userId} authenticated and registered with socket ${socket.id}`);
    } catch (err) {
      console.error('Socket authentication error:', err.message);
      socket.emit('error', 'Authentication failed');
    }
  });

  // Join request-specific room for real-time updates
  // C-1 FIX: Verify the socket user is requester or owner before allowing room join
  socket.on('join_request_chat', async (requestId) => {
    if (!socket.userId) {
      socket.emit('error', 'Not authenticated');
      return;
    }
    try {
      const request = await Request.findById(requestId).select('requester owner');
      if (!request) {
        socket.emit('error', 'Request not found');
        return;
      }
      if (!request.requester.equals(socket.userId) && !request.owner.equals(socket.userId)) {
        socket.emit('error', 'Not authorized to join this chat room');
        return;
      }
      const room = `request_${requestId}`;
      socket.join(room);
      console.log(`User ${socket.userId} joined chat room: ${room}`);
    } catch (err) {
      console.error('Error joining request chat:', err.message);
      socket.emit('error', 'Failed to join chat room');
    }
  });

  // Handle incoming messages
  socket.on('send_message', async (data) => {
    try {
      const { requestId, content, messageType = 'text', attachment = null } = data;
      const senderId = socket.userId;

      // Verify request exists and is approved and chat is enabled
      const request = await Request.findById(requestId);
      if (!request || request.status !== 'approved' || !request.chatInitialized || !request.chatAcceptedBy) {
        socket.emit('error', 'Chat not available for this request');
        return;
      }

      // Verify sender is part of the request
      if (!request.requester.equals(senderId) && !request.owner.equals(senderId)) {
        socket.emit('error', 'Not authorized');
        return;
      }

      // Determine receiver
      const receiverId = request.requester.equals(senderId) ? request.owner : request.requester;

      // Save message to database
      const normalizedContent = String(content || '').trim();
      const message = await Message.create({
        request: requestId,
        sender: senderId,
        receiver: receiverId,
        content: messageType === 'text' ? normalizedContent : normalizedContent || attachment?.name || 'Attachment',
        messageType,
        attachment: messageType !== 'text' ? attachment : null,
      });

      // Populate sender/receiver info
      const populatedMessage = await message.populate('sender', 'name avatar').populate('receiver', 'name avatar');

      // Emit message to both users in the room
      const room = `request_${requestId}`;
      io.to(room).emit('receive_message', populatedMessage);
      io.to(`user_${receiverId}`).emit('notification_received', {
        type: 'chat_message',
        message: `${populatedMessage.sender?.name || 'Someone'} sent you a new message.`,
        link: `/messages?requestId=${requestId}`,
        requestId,
        meta: {
          requestId,
          sender: populatedMessage.sender,
          preview: populatedMessage.content,
        },
      });

      console.log(`Message sent in room ${room}`);
    } catch (err) {
      console.error('Error sending message:', err);
      socket.emit('error', 'Failed to send message');
    }
  });

  // Handle typing indicator — L-10 FIX: guard against unregistered sockets
  socket.on('typing', (data) => {
    if (!socket.userId) return;
    const { requestId } = data;
    const room = `request_${requestId}`;
    socket.to(room).emit('user_typing', { userId: socket.userId });
  });

  // Handle stop typing — L-10 FIX: guard against unregistered sockets
  socket.on('stop_typing', (data) => {
    if (!socket.userId) return;
    const { requestId } = data;
    const room = `request_${requestId}`;
    socket.to(room).emit('user_stop_typing', { userId: socket.userId });
  });

  // Mark message as read
  // C-2 FIX: Only the message receiver can mark it as read
  socket.on('mark_read', async (data) => {
    try {
      const { messageId } = data;
      if (!socket.userId) return;

      const message = await Message.findById(messageId).select('receiver readAt');
      if (!message) return;

      // Ownership check — only the intended receiver can mark as read
      if (!message.receiver.equals(socket.userId)) {
        socket.emit('error', 'Not authorized to mark this message as read');
        return;
      }

      if (!message.readAt) {
        await Message.findByIdAndUpdate(messageId, { readAt: new Date() });
      }
      socket.emit('read_confirmed', { messageId });
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    if (socket.userId) {
      userConnections.delete(socket.userId);
    }
  });
});

// Attach io to app for use in controllers if needed
app.io = io;
app.userConnections = userConnections;

// Connect to MongoDB then start server
mongoose.connect(mongoUri)
  .then(() => {
    console.log('MongoDB connected successfully');
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });

    // Daily reminder job (deadline-style notification for drivers)
    // Runs at 8 AM every day
    cron.schedule('0 8 * * *', () => {
      sendRideReminders().catch((e) => console.error('Ride reminders:', e.message));
    });

    // Auto-close expired rides — runs every 10 minutes
    cron.schedule('*/10 * * * *', () => {
      autoCloseExpiredRides().catch((e) => console.error('Auto-close rides:', e.message));
    });

    // Send tutoring session reminders — runs every 5 minutes
    cron.schedule('*/5 * * * *', () => {
      sendSessionReminders().catch((e) => console.error('Session reminders:', e.message));
    });

    // Check for session completion prompts — runs every 10 minutes
    cron.schedule('*/10 * * * *', () => {
      checkSessionCompletion().catch((e) => console.error('Session completion checks:', e.message));
    });

    console.log('Cron jobs scheduled');
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
