import mongoose from 'mongoose';

const DEPTS = ['SEECS', 'ASAB', 'SADA', 'NBS', 'SCME', 'SNS', 'SMME', 'USPCASE', 'NICE', 'IESE', 'IGIS', 'S3H', 'NLS', 'Other'];

const listingSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: {
      type: String,
      enum: ['general', 'textbook'],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    courseCode: { type: String, trim: true, uppercase: true, default: '' },
    semester: {
      type: Number,
      min: 1,
      max: 8,
      default: null,
    },
    department: {
      type: String,
      enum: DEPTS,
      required: true,
      index: true,
    },
    listingType: {
      type: String,
      enum: ['sale', 'rent', 'exchange'],
      required: true,
      index: true,
    },
    price: {
      type: Number,
      min: 0,
      default: null,
    },
    condition: { type: String, trim: true, default: '' },
    images: [{ type: String }],
    status: {
      type: String,
      enum: ['active', 'reserved', 'sold', 'flagged', 'removed'],
      default: 'active',
      index: true,
    },
    reservedFor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reservationExpiresAt: {
      type: Date,
      default: null,
    },
    views: { type: Number, default: 0, min: 0 },
    // Moderation fields
    reportCount: { type: Number, default: 0, min: 0 },
    reports: [{
      reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      reason: { type: String, required: true, enum: ['spam', 'inappropriate', 'copyright', 'low_quality', 'other'] },
      comment: { type: String, maxlength: 500 },
      reportedAt: { type: Date, default: Date.now },
    }],
    autoFlaggedAt: { type: Date },
    adminReviewedAt: { type: Date },
    adminReviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

listingSchema.index({ category: 1, department: 1, semester: 1, status: 1 });
listingSchema.index({ title: 'text', description: 'text', courseCode: 'text' });
listingSchema.index({ createdAt: -1 });

// Mongoose 9+ does not pass `next` to sync document middleware — do not call next().
listingSchema.pre('save', function () {
  if (this.category === 'general') {
    this.courseCode = '';
    this.semester = null;
  }
});

const Listing = mongoose.model('Listing', listingSchema);
export default Listing;
