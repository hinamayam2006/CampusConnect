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

    // Determine receiver
    const receiver = request.requester.equals(sender) ? request.owner : request.requester;

    // Create message
    const message = await Message.create(
      [
        {
          request: requestId,
          sender,
          receiver,
          content,
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
    res.status(201).json({
      success: true,
      data: message[0],
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
 */
export const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByIdAndUpdate(
      messageId,
      { readAt: new Date() },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
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
