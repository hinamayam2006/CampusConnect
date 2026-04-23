import mongoose from 'mongoose';

const lostnFoundSchema = new mongoose.Schema(
	{
		owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

		postType: {
			type: String,
			enum: ['lost', 'found'],
			required: true,
			index: true,
		},
		title: { type: String, required: true, trim: true, maxlength: 120 },
		description: { type: String, required: true, trim: true, maxlength: 2000 },
		category: { type: String, trim: true, default: 'other', index: true },
		location: { type: String, trim: true, default: '' },
		incidentAt: { type: Date, default: null, index: true },
		contactInfo: { type: String, trim: true, default: '' },
		images: [{ type: String, trim: true }],

		status: {
			type: String,
			enum: ['open', 'resolved', 'closed'],
			default: 'open',
			index: true,
		},
		resolvedAt: { type: Date, default: null },
	},
	{ timestamps: true }
);

lostnFoundSchema.index({ postType: 1, status: 1, createdAt: -1 });
lostnFoundSchema.index({ title: 'text', description: 'text', location: 'text', category: 'text' });

const LostnFound = mongoose.model('LostnFound', lostnFoundSchema);

export default LostnFound;
