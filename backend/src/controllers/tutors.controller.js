import TutorProfile from '../models/TutorProfile.model.js';
import Booking from '../models/Booking.model.js';
import Review from '../models/Review.model.js';
import { buildTokenSearchQuery } from '../utils/search.js';

export const createTutorProfile = async (req, res) => {
  try {
    const existing = await TutorProfile.findOne({ user: req.user._id });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Tutor profile already exists' });
    }

    const created = await TutorProfile.create({
      ...req.body,
      user: req.user._id,
    });

    res.status(201).json({ success: true, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateTutorProfile = async (req, res) => {
  try {
    const profile = await TutorProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Tutor profile not found' });
    }

    if (!profile.user.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    Object.assign(profile, req.body);
    await profile.save();

    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const listTutors = async (req, res) => {
  try {
    const { q = '', page = '1', limit = '12' } = req.query;

    const query = { isActive: true };
    const searchQuery = buildTokenSearchQuery(q, ['bio', 'courses']);
    if (searchQuery) {
      query.$and = searchQuery.$and;
    }

    const lim = Math.min(48, Math.max(1, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;

    const [items, total] = await Promise.all([
      TutorProfile.find(query)
        .populate('user', 'name department year avatar')
        .sort({ averageRating: -1, createdAt: -1 })
        .skip(skip)
        .limit(lim),
      TutorProfile.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / lim));

    res.status(200).json({
      success: true,
      data: { items, total, page: Number(page), totalPages },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTutorById = async (req, res) => {
  try {
    const profile = await TutorProfile.findById(req.params.id).populate(
      'user',
      'name department year avatar'
    );

    if (!profile || !profile.isActive) {
      return res.status(404).json({ success: false, message: 'Tutor profile not found' });
    }

    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyTutorProfile = async (req, res) => {
  try {
    const profile = await TutorProfile.findOne({ user: req.user._id }).populate(
      'user',
      'name department year avatar'
    );

    if (!profile) {
      return res.status(200).json({ success: true, data: null });
    }

    res.status(200).json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getTutorEarnings = async (req, res) => {
  try {
    const profile = await TutorProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Tutor profile not found' });
    }

    if (!profile.user.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    const rows = await Booking.aggregate([
      {
        $match: {
          tutor: req.user._id,
          status: 'completed',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$scheduledAt' },
            month: { $month: '$scheduledAt' },
          },
          totalSessions: { $sum: 1 },
          totalMinutes: { $sum: '$durationMinutes' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const hourlyRate = profile.isFree ? 0 : profile.hourlyRate;

    const monthly = rows.map((r) => {
      const month = `${r._id.year}-${String(r._id.month).padStart(2, '0')}`;
      const earnings = hourlyRate ? (r.totalMinutes / 60) * hourlyRate : 0;
      return {
        month,
        totalSessions: r.totalSessions,
        totalMinutes: r.totalMinutes,
        earnings,
      };
    });

    const totalSessions = monthly.reduce((sum, m) => sum + m.totalSessions, 0);
    const totalMinutes = monthly.reduce((sum, m) => sum + m.totalMinutes, 0);
    const totalEarnings = monthly.reduce((sum, m) => sum + m.earnings, 0);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          hourlyRate,
          isFree: profile.isFree,
          totalSessions,
          totalMinutes,
          totalEarnings,
        },
        monthly,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const listTutorReviews = async (req, res) => {
  try {
    const profile = await TutorProfile.findById(req.params.id).select('_id isActive');
    if (!profile || !profile.isActive) {
      return res.status(404).json({ success: false, message: 'Tutor profile not found' });
    }

    const items = await Review.find({ targetType: 'tutor', targetId: profile._id })
      .populate('reviewer', 'name avatar department year')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: { items } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
