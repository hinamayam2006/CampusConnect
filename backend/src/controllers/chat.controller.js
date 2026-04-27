import mongoose from 'mongoose';
import Message from '../models/Message.model.js';
import Request from '../models/Request.model.js';
import { logActivity } from '../services/activity.service.js';

/**
 * Send a message (only allowed if request is approved and chat is accepted)
 */
export const sendMessage = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { requestId, content, messageType = 'text', attachment = null } = req.body;
    const sender = req.user._id;
    const normalizedContent = String(content || '').trim();

    // Validate request exists and is approved
    const request = await Request.findById(requestId).session(session);
    if (!request) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'approved') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Chat is not available for this request',
      });
    }

    if (request.chatClosed) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'This chat has been closed and can no longer be used',
      });
    }

    // Verify sender is either requester or owner
    if (!request.requester.equals(sender) && !request.owner.equals(sender)) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    if (messageType === 'text' && !normalizedContent) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }

    if (messageType !== 'text' && !attachment?.url) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Attachment is required for media messages' });
    }

    // Determine receiver
    const receiver = request.requester.equals(sender) ? request.owner : request.requester;

    // L-10 FIX: For tutoring chats, ensure payment is approved before student can message
    if (request.context === 'tutoring' && request.refModel === 'Booking') {
      const Booking = mongoose.model('Booking');
      const booking = await Booking.findById(request.refId).session(session);
      
      if (booking) {
        // If sender is the student, verify payment is approved
        if (booking.student.equals(sender)) {
          if (booking.paymentStatus !== 'approved' && booking.paymentStatus !== 'not_required') {
            await session.abortTransaction();
            return res.status(403).json({
              success: false,
              message: 'You cannot send messages until your payment is approved.',
            });
          }
        }
      }
    }

    // Create message
    const message = await Message.create(
      [
        {
          request: requestId,
          sender,
          receiver,
          content: messageType === 'text' ? normalizedContent : normalizedContent || attachment?.name || 'Attachment',
          messageType,
          attachment: messageType !== 'text' ? attachment : null,
        },
      ],
      { session }
    );

    // Log activity
    await logActivity(
      {
        userId: sender,
        type: 'message_sent',
        refModel: 'Message',
        refId: message[0]._id,
        meta: { requestId },
      },
      { session }
    );

    await session.commitTransaction();
    const messageDoc = await Message.findById(message[0]._id)
      .populate('sender', 'name avatar')
      .populate('receiver', 'name avatar');

    if (req.app?.io && messageDoc) {
      const room = `request_${requestId}`;
      req.app.io.to(room).emit('receive_message', messageDoc);
      req.app.io.to(`user_${receiver}`).emit('notification_received', {
        type: 'chat_message',
        message: `${req.user.name} sent you a new message.`,
        link: `/messages?requestId=${requestId}`,
        requestId,
        meta: {
          requestId,
          sender: messageDoc.sender,
          preview: messageDoc.content,
        },
      });
    }

    res.status(201).json({
      success: true,
      data: messageDoc || message[0],
      message: 'Message sent',
    });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Get all messages for a specific request
 */
export const getMessages = async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user._id;

    // Verify request exists and user has access
    const request = await Request.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (!request.requester.equals(userId) && !request.owner.equals(userId)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    const messages = await Message.find({ request: requestId })
      .populate('sender', 'name avatar')
      .populate('receiver', 'name avatar')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Mark a message as read
 * C-3 FIX: Only the intended receiver may update read state
 */
export const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    // Fetch first to enforce ownership
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // Only the receiver of the message may mark it as read
    if (!message.receiver.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to mark this message as read',
      });
    }

    // Idempotent — only write if not already read
    if (!message.readAt) {
      message.readAt = new Date();
      await message.save();
    }

    res.status(200).json({
      success: true,
      data: message,
      message: 'Message marked as read',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get unread message count for a user
 */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const unreadCount = await Message.countDocuments({
      receiver: userId,
      readAt: null,
    });

    res.status(200).json({
      success: true,
      data: { unreadCount },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get all active chats for current user (requests with approved status)
 */
export const getActiveChats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all approved requests involving this user (with latest messages)
    const requests = await Request.find({
      status: 'approved',
      chatClosed: { $ne: true },
      $or: [{ requester: userId }, { owner: userId }],
    })
      .populate('requester', 'name avatar department')
      .populate('owner', 'name avatar department')
      .populate('refId')
      .sort({ updatedAt: -1 });

    // For each request, get the latest message
    const chats = await Promise.all(
      requests.map(async (request) => {
        const latestMessage = await Message.findOne({ request: request._id })
          .sort({ createdAt: -1 })
          .lean();

        return {
          request,
          latestMessage,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: chats,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
