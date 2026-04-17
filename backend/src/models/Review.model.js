import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    targetType: {
      type: String,
      enum: ['note', 'tutor'],
      required: true,
      index: true,
    },

    // Polymorphic target. We keep it simple as ObjectId in Phase 1.
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

reviewSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });
reviewSchema.index({ reviewer: 1, createdAt: -1 });

const Review = mongoose.model('Review', reviewSchema);
export default Review;
