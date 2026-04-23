import mongoose from 'mongoose';

const borrowingSchema = new mongoose.Schema(
	{
		owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		borrower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

		title: { type: String, required: true, trim: true, maxlength: 120 },
		description: { type: String, required: true, trim: true, maxlength: 2000 },
		category: { type: String, trim: true, default: 'general', index: true },
		condition: { type: String, trim: true, default: '' },

		images: [{ type: String, trim: true }],

		requestedFrom: { type: Date, default: null, index: true },
		requestedUntil: { type: Date, default: null, index: true },
		dueAt: { type: Date, default: null, index: true },
		returnedAt: { type: Date, default: null },

		status: {
			type: String,
			enum: ['available', 'requested', 'borrowed', 'returned', 'unavailable'],
			default: 'available',
			index: true,
		},
	},
	{ timestamps: true }
);

borrowingSchema.index({ owner: 1, status: 1, createdAt: -1 });
borrowingSchema.index({ borrower: 1, status: 1, dueAt: 1 });

const Borrowing = mongoose.model('Borrowing', borrowingSchema);
export default Borrowing;
