import './loadEnv.js';

import mongoose from 'mongoose';
import cron from 'node-cron';
import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import { sendRideReminders, autoCloseExpiredRides } from './controllers/rides.controller.js';
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

// Store user socket connections for routing
const userConnections = new Map();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Register user connection
  socket.on('register_user', (userId) => {
    userConnections.set(userId, socket.id);
    socket.userId = userId;
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  // Join request-specific room for real-time updates
  socket.on('join_request_chat', (requestId) => {
    const room = `request_${requestId}`;
    socket.join(room);
    console.log(`User ${socket.userId} joined chat room: ${room}`);
  });

  // Handle incoming messages
  socket.on('send_message', async (data) => {
    try {
      const { requestId, content, messageType = 'text' } = data;
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
      const message = await Message.create({
        request: requestId,
        sender: senderId,
        receiver: receiverId,
        content,
        messageType,
      });

      // Populate sender/receiver info
      const populatedMessage = await message.populate('sender', 'name avatar');

      // Emit message to both users in the room
      const room = `request_${requestId}`;
      io.to(room).emit('receive_message', populatedMessage);

      console.log(`Message sent in room ${room}`);
    } catch (err) {
      console.error('Error sending message:', err);
      socket.emit('error', 'Failed to send message');
    }
  });

  // Handle typing indicator
  socket.on('typing', (data) => {
    const { requestId } = data;
    const room = `request_${requestId}`;
    socket.to(room).emit('user_typing', { userId: socket.userId });
  });

  // Handle stop typing
  socket.on('stop_typing', (data) => {
    const { requestId } = data;
    const room = `request_${requestId}`;
    socket.to(room).emit('user_stop_typing', { userId: socket.userId });
  });

  // Mark message as read
  socket.on('mark_read', async (data) => {
    try {
      const { messageId } = data;
      await Message.findByIdAndUpdate(messageId, { readAt: new Date() });
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

    console.log('Cron jobs scheduled');
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
