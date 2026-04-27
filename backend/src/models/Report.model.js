import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  // Content being reported
  targetModel: {
    type: String,
    required: true,
    enum: ['Note', 'Listing', 'Ride', 'Borrowing', 'User'],
    index: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
    refPath: 'targetModel'
  },
  
  // Who is reporting
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Report details
  reason: {
    type: String,
    required: true,
    enum: [
      // High sensitivity (Rides)
      'dangerous_driving', 'harassment', 'safety_concern', 'no_show',
      // Medium sensitivity (Marketplace/Borrow)
      'scam', 'fraud', 'misrepresentation', 'stolen_goods',
      // Low sensitivity (Notes)
      'spam', 'inappropriate', 'copyright', 'low_quality', 'plagiarism',
      // General
      'other'
    ]
  },
  comment: {
    type: String,
    maxlength: 500,
    trim: true
  },
  
  // Moderation metadata
  sensitivity: {
    type: String,
    required: true,
    enum: ['high', 'medium', 'low'],
    default: 'medium'
  },
  threshold: {
    type: Number,
    required: true,
    default: 3
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending'
  },
  
  // Admin actions
  adminReviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminReviewedAt: {
    type: Date
  },
  adminAction: {
    type: String,
    enum: ['shadow_ban', 'remove_content', 'warn_user', 'dismiss', 'no_action']
  },
  adminNote: {
    type: String,
    maxlength: 1000
  },
  
  // Auto-moderation
  autoActionTaken: {
    type: String,
    enum: ['shadow_banned', 'flagged', 'warning_badge', 'hidden']
  },
  autoActionAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
reportSchema.index({ targetModel: 1, targetId: 1, status: 1 });
reportSchema.index({ targetModel: 1, targetId: 1, reportedBy: 1 }, { unique: true });
reportSchema.index({ sensitivity: 1, status: 1, createdAt: -1 });
reportSchema.index({ autoActionTaken: 1, autoActionAt: -1 });

// Static methods for different content types
reportSchema.statics.getSensitivityConfig = function(targetModel) {
  const configs = {
    'Ride': { sensitivity: 'high', threshold: 1 },
    'Listing': { sensitivity: 'medium', threshold: 3 },
    'Borrowing': { sensitivity: 'medium', threshold: 2 },
    'Note': { sensitivity: 'low', threshold: 5 },
    'User': { sensitivity: 'high', threshold: 3 }
  };
  
  return configs[targetModel] || { sensitivity: 'medium', threshold: 3 };
};

reportSchema.statics.getReasonsForSensitivity = function(sensitivity) {
  const reasons = {
    high: ['dangerous_driving', 'harassment', 'safety_concern', 'no_show', 'scam', 'fraud'],
    medium: ['misrepresentation', 'stolen_goods', 'scam', 'fraud'],
    low: ['spam', 'inappropriate', 'copyright', 'low_quality', 'plagiarism', 'other']
  };
  
  return reasons[sensitivity] || reasons.medium;
};

reportSchema.statics.getAutoAction = function(reportCount, sensitivity, targetModel) {
  const config = this.getSensitivityConfig(targetModel);
  const threshold = config.threshold;
  
  if (sensitivity === 'high' && reportCount >= threshold) {
    return 'shadow_banned';
  }
  
  if (sensitivity === 'medium' && reportCount >= threshold) {
    return 'flagged';
  }
  
  if (sensitivity === 'medium' && reportCount >= Math.max(1, threshold - 1)) {
    return 'warning_badge';
  }
  
  if (sensitivity === 'low' && reportCount >= threshold + 2) {
    return 'hidden';
  }
  
  if (sensitivity === 'low' && reportCount >= threshold) {
    return 'warning_badge';
  }
  
  return null;
};

const Report = mongoose.model('Report', reportSchema);
export default Report;
