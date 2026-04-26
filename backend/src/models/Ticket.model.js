import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['feedback', 'issue_report'],
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    title: { type: String, trim: true, maxlength: 150, default: '' },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    
    // Feedback specific
    rating: { type: Number, min: 1, max: 5 },

    // Issue Report specific
    targetId: {
      type: String,
      trim: true,
      index: true,
    },
    targetType: {
      type: String,
      // M-3 FIX: Removed lowercase duplicates — PascalCase only to match Mongoose model names.
      // Previously had both 'User' and 'user' etc., causing inconsistent stored values.
      enum: ['User', 'Listing', 'Note', 'Request', 'Review', 'Ride', 'TutorProfile', 'Borrowing', 'LostnFound', 'other', ''],
      default: '',
    },
    images: [{ type: String, trim: true }],

    // Admin / System
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'low',
    },
    adminNotes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

const Ticket = mongoose.model('Ticket', ticketSchema);
export default Ticket;
