import mongoose from 'mongoose';

const availabilitySlotSchema = new mongoose.Schema(
  {
    day: { type: String, required: true, trim: true, maxlength: 10 }, // e.g. "Monday"
    startTime: { type: String, required: true, trim: true, maxlength: 10 }, // e.g. "09:00"
    endTime: { type: String, required: true, trim: true, maxlength: 10 }, // e.g. "11:00"
  },
  { _id: false }
);

const tutorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    bio: { type: String, required: true, trim: true, maxlength: 2000 },
    courses: [{ type: String, required: true, trim: true, maxlength: 80 }],

    hourlyRate: { type: Number, default: 0, min: 0 },
    isFree: { type: Boolean, default: false },

    availabilitySlots: { type: [availabilitySlotSchema], default: [] },

    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    totalSessions: { type: Number, default: 0, min: 0 },

    contactEmail: { type: String, trim: true, maxlength: 200, default: '' },

    paymentMethod: { type: String, trim: true, maxlength: 50, default: '' },
    paymentAccountNumber: { type: String, trim: true, maxlength: 50, default: '' },
    paymentInstructions: { type: String, trim: true, maxlength: 300, default: '' },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

tutorProfileSchema.index({ isActive: 1, averageRating: -1, createdAt: -1 });

tutorProfileSchema.pre('validate', function () {
  if (this.isFree) {
    this.hourlyRate = 0;
  }
});

const TutorProfile = mongoose.model('TutorProfile', tutorProfileSchema);
export default TutorProfile;
