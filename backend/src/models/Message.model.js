import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    // Reference to the approved request (ensures only approved chats can have messages)
    request: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    // Message type: text, image, etc. (for future extensibility)
    messageType: {
      type: String,
      enum: ['text', 'image', 'file'],
      default: 'text',
    },
    // Read status tracking
    readAt: {
      type: Date,
      default: null,
    },
    // For image/file uploads
    attachment: {
      url: String,
      name: String,
      size: Number,
    },
  },
  { timestamps: true }
);

// Indexes for efficient message retrieval
messageSchema.index({ request: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ readAt: 1 }); // For unread message counts
messageSchema.index({ createdAt: 1 }); // For archival/cleanup

const Message = mongoose.model('Message', messageSchema);
export default Message;
