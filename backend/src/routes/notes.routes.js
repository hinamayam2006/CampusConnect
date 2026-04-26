import express from 'express';
import protect from '../middleware/auth.middleware.js';
import isAdmin from '../middleware/admin.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { createNoteSchema, submitReviewSchema, reportNoteSchema } from '../utils/validators.js';
import {
	createNote,
	deleteNote,
	getNoteById,
	listNotes,
	searchNotes,
	listMyNotes,
	listMyNoteStats,
	reportNote,
	downloadNote,
	downloadNoteFile,
	bookmarkNote,
	unbookmarkNote,
	listBookmarks,
	reviewNote,
	listNoteReviews,
	getFlaggedNotes,
	adminReviewNote,
} from '../controllers/notes.controller.js';

const router = express.Router();

router.get('/bookmarks', protect, listBookmarks);
router.get('/search', protect, searchNotes);
router.get('/mine/stats', protect, listMyNoteStats);
router.get('/mine', protect, listMyNotes);
router.get('/', protect, listNotes);
router.get('/:id/file', protect, downloadNoteFile);
router.get('/:id/reviews', protect, listNoteReviews);

// H-6 FIX: Admin routes MUST come before /:id to prevent Express capturing 'admin' as a note ID
router.get('/admin/flagged', protect, isAdmin, getFlaggedNotes);
router.patch('/admin/:id/review', protect, isAdmin, adminReviewNote);

router.get('/:id', protect, getNoteById);
router.post('/', protect, validate(createNoteSchema), createNote);
router.post('/:id/download', protect, downloadNote);
router.post('/:id/bookmark', protect, bookmarkNote);
router.delete('/:id/bookmark', protect, unbookmarkNote);
router.post('/:id/review', protect, validate(submitReviewSchema), reviewNote);
router.post('/:id/report', protect, validate(reportNoteSchema), reportNote);
router.delete('/:id', protect, deleteNote);


export default router;
