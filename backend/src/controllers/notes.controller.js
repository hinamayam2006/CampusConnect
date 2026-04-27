import { Readable } from 'stream';
import Note from '../models/Note.model.js';
import User from '../models/User.model.js';
import Review from '../models/Review.model.js';
import { buildDownloadUrl } from '../services/cloudinary.service.js';
import { logActivity } from '../services/activity.service.js';
import { pushNotification } from '../services/notification.service.js';
import { buildTokenSearchQuery } from '../utils/search.js';
import moderationService from '../services/moderation.service.js';

function attachDownloadUrl(noteDoc) {
  const data = noteDoc.toObject();
  if (!data.downloadUrl && data.publicId) {
    data.downloadUrl = buildDownloadUrl({
      publicId: data.publicId,
      resourceType: data.resourceType || 'raw',
      format: data.fileFormat,
      filename: data.fileName,
    });
  }
  data.downloadFileName = data.fileName || '';

  // Handle additional files
  if (data.additionalFiles && data.additionalFiles.length > 0) {
    data.additionalFiles = data.additionalFiles.map((file) => {
      if (!file.downloadUrl && file.publicId) {
        file.downloadUrl = buildDownloadUrl({
          publicId: file.publicId,
          resourceType: file.resourceType || 'raw',
          format: file.fileFormat,
          filename: file.fileName,
        });
      }
      file.downloadFileName = file.fileName || '';
      return file;
    });
  }

  return data;
}

export const createNote = async (req, res) => {
  try {
    const created = await Note.create({
      ...req.body,
      uploadedBy: req.user._id,
    });

    try {
      await logActivity({
        userId: req.user._id,
        type: 'note_uploaded',
        refModel: 'Note',
        refId: created._id,
        meta: { title: created.title, course: created.course },
      });

      await pushNotification(req.user._id, {
        type: 'note_uploaded',
        message: `Your note "${created.title}" is now live.`,
        link: `/notes/${created._id}`,
        meta: { refModel: 'Note', refId: created._id },
      });
    } catch (logErr) {
      console.warn('Activity log failed:', logErr.message);
    }

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const listNotes = async (req, res) => {
  try {
    const { q = '', page = '1', limit = '12' } = req.query;

    const query = { status: 'active' };
    const searchQuery = buildTokenSearchQuery(q, ['title', 'description', 'course', 'subject']);
    if (searchQuery) {
      query.$and = searchQuery.$and;
    }

    const lim = Math.min(48, Math.max(1, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;

    const [items, total, user] = await Promise.all([
      Note.find(query)
        .populate('uploadedBy', 'name department year avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim),
      Note.countDocuments(query),
      User.findById(req.user._id).select('savedNotes downloadedNotes'),
    ]);

    const savedSet = new Set((user?.savedNotes || []).map((id) => String(id)));
    const downloadedSet = new Set((user?.downloadedNotes || []).map((id) => String(id)));

    const mapped = items.map((note) => {
      const data = attachDownloadUrl(note);
      const id = String(note._id);
      return {
        ...data,
        isBookmarked: savedSet.has(id),
        hasDownloaded: downloadedSet.has(id),
      };
    });

    const totalPages = Math.max(1, Math.ceil(total / lim));

    res.status(200).json({
      success: true,
      data: { items: mapped, total, page: Number(page), totalPages },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const searchNotes = async (req, res) => {
  try {
    const {
      q = '',
      course,
      tags,
      sort = 'newest',
      page = '1',
      limit = '12',
    } = req.query;

    const query = { status: 'active' };

    if (course) {
      query.course = new RegExp(String(course).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    const tagList = String(tags || '')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (tagList.length) {
      query.tags = { $all: tagList };
    }

    const search = String(q).trim();
    const searchQuery = buildTokenSearchQuery(search, ['title', 'description', 'course', 'subject']);
    if (searchQuery) {
      query.$and = [...(query.$and || []), ...searchQuery.$and];
    }

    const lim = Math.min(48, Math.max(1, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;

    let sortOrder = { createdAt: -1 };
    if (sort === 'popular') sortOrder = { downloadCount: -1, createdAt: -1 };
    if (sort === 'rating') sortOrder = { averageRating: -1, createdAt: -1 };
    if (sort === 'newest') sortOrder = { createdAt: -1 };

    let findQuery = Note.find(query)
      .populate('uploadedBy', 'name department year avatar')
      .skip(skip)
      .limit(lim)
      .sort(sortOrder);

    const [items, total, user] = await Promise.all([
      findQuery,
      Note.countDocuments(query),
      User.findById(req.user._id).select('savedNotes downloadedNotes'),
    ]);

    const savedSet = new Set((user?.savedNotes || []).map((id) => String(id)));
    const downloadedSet = new Set((user?.downloadedNotes || []).map((id) => String(id)));

    const mapped = items.map((note) => {
      const data = attachDownloadUrl(note);
      const id = String(note._id);
      return {
        ...data,
        isBookmarked: savedSet.has(id),
        hasDownloaded: downloadedSet.has(id),
      };
    });

    const totalPages = Math.max(1, Math.ceil(total / lim));

    res.status(200).json({
      success: true,
      data: { items: mapped, total, page: Number(page), totalPages },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const listMyNotes = async (req, res) => {
  try {
    const { page = '1', limit = '12' } = req.query;
    const lim = Math.min(48, Math.max(1, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;

    const query = { uploadedBy: req.user._id };
    const [items, total] = await Promise.all([
      Note.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim),
      Note.countDocuments(query),
    ]);

    const mapped = items.map((note) => attachDownloadUrl(note));
    const totalPages = Math.max(1, Math.ceil(total / lim));

    res.status(200).json({
      success: true,
      data: { items: mapped, total, page: Number(page), totalPages },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const listMyNoteStats = async (req, res) => {
  try {
    const items = await Note.find({ uploadedBy: req.user._id })
      .select('title downloadCount averageRating createdAt')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: { items } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const reportNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    const { reason, comment } = req.body;
    
    // Delegate to unified moderation service
    const result = await moderationService.processReport({
      targetModel: 'Note',
      targetId: note._id,
      reportedBy: req.user._id,
      reason,
      comment: comment || ''
    });

    res.status(200).json({ 
      success: true, 
      message: 'Report submitted successfully',
      data: {
        reportCount: result.reportCount,
        status:
          result.autoAction === 'flagged' || result.autoAction === 'shadow_banned' || result.autoAction === 'hidden'
            ? 'flagged'
            : 'active',
        wasAutoFlagged: result.wasAutoActioned,
        sensitivity: result.report.sensitivity
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getNoteById = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).populate(
      'uploadedBy',
      'name department year avatar'
    );

    if (!note || note.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }
    const user = await User.findById(req.user._id).select('savedNotes downloadedNotes');
    const id = String(note._id);
    const data = attachDownloadUrl(note);
    data.isBookmarked = (user?.savedNotes || []).some((n) => String(n) === id);
    data.hasDownloaded = (user?.downloadedNotes || []).some((n) => String(n) === id);

    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    // Only owner can delete
    if (String(note.uploadedBy) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Note.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Note deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const downloadNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note || note.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    const user = await User.findById(req.user._id).select('downloadedNotes');
    const already = (user?.downloadedNotes || []).some((n) => String(n) === String(note._id));

    if (!already) {
      await Promise.all([
        User.findByIdAndUpdate(req.user._id, { $addToSet: { downloadedNotes: note._id } }),
        Note.findByIdAndUpdate(note._id, { $inc: { downloadCount: 1 } }),
      ]);

      try {
        await logActivity({
          userId: req.user._id,
          type: 'note_downloaded',
          refModel: 'Note',
          refId: note._id,
          meta: { title: note.title, course: note.course },
        });

        await pushNotification(note.uploadedBy, {
          type: 'note_downloaded',
          message: `Your note "${note.title}" was downloaded.`,
          link: `/notes/${note._id}`,
          meta: { refModel: 'Note', refId: note._id },
        });
      } catch (logErr) {
        console.warn('Activity log failed:', logErr.message);
      }
    }

    let downloadUrl = '';
    if (note.publicId) {
      downloadUrl = buildDownloadUrl({
        publicId: note.publicId,
        resourceType: note.resourceType || 'raw',
        format: note.fileFormat,
        filename: note.fileName,
      });
    }

    res.status(200).json({
      success: true,
      data: {
        downloaded: true,
        alreadyDownloaded: already,
        downloadUrl: downloadUrl || note.fileUrl,
        downloadProxyPath: `/notes/${note._id}/file`,
        fileName: note.fileName || '',
        downloadFileName: note.fileName || '',
        fileType: note.fileType || '',
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const downloadNoteFile = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).select(
      'fileUrl fileType fileName fileFormat resourceType publicId status'
    );
    if (!note || note.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    const downloadUrl = note.publicId
      ? buildDownloadUrl({
        publicId: note.publicId,
        resourceType: note.resourceType || 'raw',
        format: note.fileFormat,
        filename: note.fileName,
      })
      : '';

    const primaryUrl = downloadUrl || note.fileUrl;
    const secondaryUrl = downloadUrl && note.fileUrl && downloadUrl !== note.fileUrl
      ? note.fileUrl
      : '';

    let fileRes = await fetch(primaryUrl);
    if (!fileRes.ok && secondaryUrl) {
      fileRes = await fetch(secondaryUrl);
    }
    if (!fileRes.ok) {
      return res.status(502).json({ success: false, message: 'Failed to fetch file from storage' });
    }

    const fileName = note.fileName || (note.fileFormat ? `note.${note.fileFormat}` : 'note');
    const safeFileName = String(fileName).replace(/["\\\r\n]/g, '').trim() || 'note';
    const encodedFileName = encodeURIComponent(safeFileName);
    const contentType = note.fileType || fileRes.headers.get('content-type') || 'application/octet-stream';
    const contentLength = fileRes.headers.get('content-length');

    res.setHeader('Content-Type', contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`
    );
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Cache-Control', 'private, max-age=300, must-revalidate');

    const body = fileRes.body;
    if (!body) {
      return res.status(502).json({ success: false, message: 'Empty file stream' });
    }

    Readable.fromWeb(body).pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const listNoteReviews = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).select('_id status');
    if (!note || note.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    const items = await Review.find({ targetType: 'note', targetId: note._id })
      .populate('reviewer', 'name avatar department year')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: { items } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const bookmarkNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).select('_id status');
    if (!note || note.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { savedNotes: note._id } });
    res.status(200).json({ success: true, data: { saved: true } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const unbookmarkNote = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $pull: { savedNotes: req.params.id } });
    res.status(200).json({ success: true, data: { saved: false } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const listBookmarks = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('savedNotes')
      .populate({
        path: 'savedNotes',
        match: { status: 'active' },
        populate: { path: 'uploadedBy', select: 'name department year avatar' },
      });

    const items = (user?.savedNotes || []).filter(Boolean);
    res.status(200).json({ success: true, data: { items, total: items.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const reviewNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).select('_id status uploadedBy');
    if (!note || note.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    if (note.uploadedBy && note.uploadedBy.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You cannot review your own note' });
    }

    const user = await User.findById(req.user._id).select('downloadedNotes');
    const hasDownloaded = (user?.downloadedNotes || []).some((n) => String(n) === String(note._id));
    if (!hasDownloaded) {
      return res.status(403).json({ success: false, message: 'Download required before reviewing' });
    }

    const existing = await Review.findOne({
      reviewer: req.user._id,
      targetType: 'note',
      targetId: note._id,
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already reviewed this note' });
    }

    const review = await Review.create({
      reviewer: req.user._id,
      targetType: 'note',
      targetId: note._id,
      rating: req.body.rating,
      comment: req.body.comment || '',
    });

    const stats = await Review.aggregate([
      { $match: { targetType: 'note', targetId: note._id } },
      { $group: { _id: '$targetId', avg: { $avg: '$rating' } } },
    ]);

    const avg = stats[0]?.avg || 0;
    await Note.findByIdAndUpdate(note._id, { averageRating: avg });

    res.status(201).json({ success: true, data: review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getFlaggedNotes = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const flaggedNotes = await Note.find({ status: 'flagged' })
      .populate('uploadedBy', 'name email')
      .populate('reports.reportedBy', 'name email')
      .sort({ autoFlaggedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Note.countDocuments({ status: 'flagged' });

    res.status(200).json({
      success: true,
      data: {
        items: flaggedNotes,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const adminReviewNote = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ success: false, message: 'Note not found' });

    const { action, adminNote } = req.body; // action: 'approve' | 'remove'

    note.adminReviewedAt = new Date();
    note.adminReviewedBy = req.user._id;

    if (action === 'approve') {
      note.status = 'active';
      note.reportCount = 0;
      note.reports = [];
    } else if (action === 'remove') {
      note.status = 'removed';
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    await note.save();

    // Log admin action
    try {
      await logActivity({
        userId: req.user._id,
        type: `note_admin_${action}`,
        refModel: 'Note',
        refId: note._id,
        meta: { 
          originalStatus: note.status,
          adminNote: adminNote || '',
          reportCount: note.reportCount 
        },
      });
    } catch (logErr) {
      console.warn('Activity log failed:', logErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Note ${action}d successfully`,
      data: note
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
