import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema(
  {
    // Document-level denormalization for quick lookups
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Polymorphic reference: can reference either Listing or Ride
    refModel: {
      type: String,
      enum: ['Listing', 'Ride', 'LostnFound', 'Borrowing', 'Booking'],
      required: true,
      index: true,
    },
    refId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
      refPath: 'refModel',
    },
    // Status flow: PENDING -> APPROVED/DECLINED
    // After approval, requester can still withdraw or owner can cancel
    status: {
      type: String,
      enum: ['pending', 'approved', 'declined', 'withdrawn', 'cancelled'],
      default: 'pending',
      index: true,
    },
    // Context metadata
    context: {
      type: String,
      enum: ['marketplace', 'ride', 'lostnfound', 'borrow', 'tutoring'],
      required: true,
    },
    // For rides: number of seats requested
    seatsRequested: {
      type: Number,
      default: 1,
      min: 1,
    },
    // Message from requester
    message: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    // Reason for decline (if declined)
    declineReason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    // Chat enabled after approval
    chatInitialized: {
      type: Boolean,
      default: false,
    },
    chatAcceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    chatAcceptedAt: {
      type: Date,
      default: null,
    },
    chatClosed: {
      type: Boolean,
      default: false,
    },
    chatClosedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    chatClosedAt: {
      type: Date,
      default: null,
    },    chatClosed: {
      type: Boolean,
      default: false,
    },
    chatClosedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    chatClosedAt: {
      type: Date,
      default: null,
    },  },
  { timestamps: true }
);

// Compound indexes for efficient queries
requestSchema.index({ requester: 1, status: 1 });
requestSchema.index({ owner: 1, status: 1 });
requestSchema.index({ refModel: 1, refId: 1, status: 1 });
requestSchema.index({ context: 1, status: 1 });
requestSchema.index({ createdAt: -1 });

// Prevent duplicate pending requests for same requester on same resource
requestSchema.index(
  { requester: 1, refModel: 1, refId: 1, status: 1 },
  { unique: true, sparse: true, partialFilterExpression: { status: 'pending' } }
);

const Request = mongoose.model('Request', requestSchema);
export default Request;
