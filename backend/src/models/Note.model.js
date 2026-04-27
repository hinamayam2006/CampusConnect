import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
	{
		title: { type: String, required: true, trim: true, maxlength: 150 },
		description: { type: String, trim: true, maxlength: 2000, default: '' },
		course: { type: String, required: true, trim: true, maxlength: 120 },
		subject: { type: String, required: true, trim: true, maxlength: 80 },
		tags: [{ type: String, trim: true, maxlength: 40 }],

		fileUrl: { type: String, required: true, trim: true },
		previewImageUrl: { type: String, trim: true, default: '' },
		publicId: { type: String, trim: true, default: '' },
		resourceType: { type: String, trim: true, default: '' },
		fileFormat: { type: String, trim: true, default: '' },
		fileName: { type: String, trim: true, default: '' },
		fileType: { type: String, trim: true, default: '' },
		fileSize: { type: Number, default: 0, min: 0 },

		// Additional files attached to this note (for multi-file uploads)
		additionalFiles: [
			{
				fileUrl:      { type: String, trim: true },
				publicId:     { type: String, trim: true, default: '' },
				resourceType: { type: String, trim: true, default: '' },
				fileFormat:   { type: String, trim: true, default: '' },
				fileName:     { type: String, trim: true, default: '' },
				fileType:     { type: String, trim: true, default: '' },
				fileSize:     { type: Number, default: 0, min: 0 },
			},
		],

		uploadedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true,
		},

		downloadCount: { type: Number, default: 0, min: 0 },
		averageRating: { type: Number, default: 0, min: 0, max: 5 },
		status: {
			type: String,
			enum: ['active', 'flagged', 'removed'],
			default: 'active',
			index: true,
		},
		// Community moderation fields
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

noteSchema.index({ uploadedBy: 1, createdAt: -1 });
noteSchema.index({ status: 1, createdAt: -1 });
noteSchema.index({ title: 'text', description: 'text', tags: 'text' });

const Note = mongoose.model('Note', noteSchema);
export default Note;
