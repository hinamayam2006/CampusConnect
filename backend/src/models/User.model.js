import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      // Email validation is handled by Zod schemas (validators.js)
      // Zod uses proper RFC 5322 email validation
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      enum: ['CS', 'EE', 'ME', 'CE', 'BBA', 'Economics', 'Law', 'Medicine', 'Other'],
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: 1,
      max: 4,
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    // Application-level access control (analogous to DB roles in SQL systems)
    role: {
      type: String,
      enum: ['student', 'moderator'],
      default: 'student',
    },
    // Trust & Rating System — stored directly on user
    // so we never need a separate query to show trust score
    trustScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    ratingsReceived: [
      {
        by: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        score: {
          type: Number,
          min: 1,
          max: 5,
        },
        comment: String,
        context: {
          type: String,
          enum: ['marketplace', 'ride', 'borrow', 'tutoring'],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // for notifications — simple array, including action metadata and linked requests
    notifications: [
      {
        type: {
          type: String,
          default: 'info',
        },
        message: String,
        link: String,
        requestId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Request',
          default: null,
        },
        meta: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        read: {
          type: Boolean,
          default: false,
        },
        hidden: {
          type: Boolean,
          default: false,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // tutoring fields
    canTeach: [String],
    needsTutoring: [String],
    // notes marketplace
    savedNotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Note' }],
    downloadedNotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Note' }],
    // JWT Refresh Token Management
    // Stored hashed for security; used to issue new short-lived access tokens
    // Allows users to stay logged in across browser sessions/tab reloads
    refreshToken: {
      type: String,
      default: null,
      select: false, // Don't include in queries by default (sensitive)
    },
    refreshTokenExpiry: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

// Index on email for fast login lookups
userSchema.index({ email: 1 });
userSchema.index({ department: 1, year: 1 });
userSchema.index({ role: 1 });

// Remove password from any JSON response automatically
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.notifications; // don't expose in general responses
  return user;
};

const User = mongoose.model('User', userSchema);
export default User;