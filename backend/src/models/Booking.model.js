import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tutor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tutorProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TutorProfile',
      required: true,
      index: true,
    },

    course: { type: String, required: true, trim: true, maxlength: 120 },
    scheduledAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, required: true, min: 15, max: 8 * 60 },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled', 'completed'],
      default: 'pending',
      index: true,
    },

    studentMessage: { type: String, trim: true, maxlength: 1000, default: '' },
    tutorNote: { type: String, trim: true, maxlength: 1000, default: '' },

    paymentProofUrl: { type: String, trim: true, default: '' },
    paymentStatus: {
      type: String,
      enum: ['not_required', 'pending', 'uploaded', 'approved', 'rejected'],
      default: 'not_required',
      index: true,
    },

    // Attendance verification
    attendanceStatus: {
      type: String,
      enum: ['pending', 'attended', 'no_show', 'cancelled'],
      default: 'pending',
      index: true,
    },
    attendanceVerifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    attendanceVerifiedAt: { type: Date },
    studentConfirmedAttendance: { type: Boolean, default: false },
    tutorConfirmedAttendance: { type: Boolean, default: false },

    // Reminder tracking
    reminderSent: { type: Boolean, default: false },
    completionPromptSent: { type: Boolean, default: false },

    // Chat request tied to this booking (auto-created on first message)
    chatRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request', default: null },
  },
  { timestamps: true }
);

bookingSchema.index({ tutor: 1, status: 1, scheduledAt: 1 });
bookingSchema.index({ student: 1, status: 1, scheduledAt: -1 });

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
