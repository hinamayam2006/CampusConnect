import mongoose from 'mongoose';

const passengerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'declined'],
      default: 'pending',
    },
    hidden: {
      type: Boolean,
      default: false,
    },
    seatsRequested: {
      type: Number,
      default: 1,
      min: 1,
      max: 8,
    },
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema(
  {
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originName: { type: String, required: true, trim: true },
    destName: { type: String, required: true, trim: true },
    originLat: { type: Number, default: null },
    originLng: { type: Number, default: null },
    destLat: { type: Number, default: null },
    destLng: { type: Number, default: null },
    departureTime: { type: Date, required: true, index: true },
    seatsTotal: { type: Number, required: true, min: 1, max: 8 },
    seatsAvailable: { type: Number, required: true, min: 0, max: 8 },
    vehicleInfo: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    recurring: {
      enabled: { type: Boolean, default: false },
      daysOfWeek: [{ type: Number, min: 0, max: 6 }],
    },
    status: {
      type: String,
      enum: ['scheduled', 'full', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    passengers: [passengerSchema],
  },
  { timestamps: true }
);

rideSchema.index({ driver: 1, departureTime: -1 });
rideSchema.index({ originName: 1, destName: 1, departureTime: 1 });
rideSchema.index({ status: 1, departureTime: 1 });

// Mongoose 9+ does not pass `next` to sync document middleware — do not call next().
rideSchema.pre('save', function () {
  if (this.seatsAvailable > this.seatsTotal) {
    this.seatsAvailable = this.seatsTotal;
  }
});

const Ride = mongoose.model('Ride', rideSchema);
export default Ride;
