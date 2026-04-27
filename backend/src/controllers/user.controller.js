import mongoose from 'mongoose';
import User from '../models/User.model.js';
import Note from '../models/Note.model.js';
import Listing from '../models/Listing.model.js';
import TutorProfile from '../models/TutorProfile.model.js';
import Booking from '../models/Booking.model.js';
import Request from '../models/Request.model.js';
import { flushQueuedNotificationEmails, pushNotification } from '../services/notification.service.js';

export const getPublicProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name email avatar bio profilePublic showEmail allowMessages showActivity createdAt');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isSelf = req.user && String(req.user._id) === String(user._id);
    if (!isSelf && user.profilePublic === false) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const data = user.toObject();
    if (!isSelf && !data.showEmail) {
      delete data.email;
    }

    const [notesCount, listingsCount, tutorProfile, tutoredStudents] = await Promise.all([
      Note.countDocuments({ uploadedBy: user._id, status: 'active' }),
      Listing.countDocuments({ seller: user._id }),
      TutorProfile.findOne({ user: user._id, isActive: true }).select('averageRating totalSessions'),
      Booking.distinct('student', { tutor: user._id, status: 'completed' }),
    ]);

    data.notesCount = notesCount;
    data.listingsCount = listingsCount;
    data.studentsTutored = tutoredStudents.length;
    data.reliabilityRating = tutorProfile?.averageRating || 0;

    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

