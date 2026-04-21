import Booking from '../models/Booking.model.js';
import TutorProfile from '../models/TutorProfile.model.js';
import Review from '../models/Review.model.js';
import User from '../models/User.model.js';
import { sendEmail, sendTutoringApprovalEmail, sendTutoringRequestEmail } from '../utils/email.js';
import { logActivity } from '../services/activity.service.js';
import { pushNotification } from '../services/notification.service.js';

function formatSchedule(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue);
  return date.toLocaleString();
}

async function notifyEmail(toUserId, subject, text) {
  try {
    const user = await User.findById(toUserId).select('email name');
    if (!user?.email) {
      console.warn('[Email] No email found for user', toUserId);
      return;
    }
    const result = await sendEmail({
      to: user.email,
      subject,
      text,
    });
    if (result?.skipped) {
      console.warn('[Email] Skipped – EMAIL_USER / EMAIL_APP_PASSWORD not set');
    } else {
      console.log(`[Email] Sent to ${user.email}: "${subject}"`);
    }
  } catch (err) {
    console.error('[Email] Failed:', err.message);
  }
}

export const createBooking = async (req, res) => {
  try {
    const { tutorProfileId, course, scheduledAt, durationMinutes, studentMessage = '' } = req.body;

    const profile = await TutorProfile.findById(tutorProfileId);
    if (!profile || !profile.isActive) {
      return res.status(404).json({ success: false, message: 'Tutor profile not found' });
    }

    if (profile.user.equals(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot book your own profile' });
    }

    // Check for time conflict with existing bookings for this tutor
    const requestedStart = new Date(scheduledAt);
    const requestedEnd = new Date(requestedStart.getTime() + durationMinutes * 60 * 1000);

    const conflicting = await Booking.findOne({
      tutor: profile.user,
      status: { $in: ['pending', 'confirmed'] },
      $expr: {
        $and: [
          { $lt: ['$scheduledAt', requestedEnd] },
          {
            $gt: [
              { $add: ['$scheduledAt', { $multiply: ['$durationMinutes', 60000] }] },
              requestedStart,
            ],
          },
        ],
      },
    });

    if (conflicting) {
      return res.status(409).json({
        success: false,
        message: `This time slot is already booked. There is an existing session on ${formatSchedule(conflicting.scheduledAt)} for ${conflicting.durationMinutes} minutes. Please choose a different date or time.`,
      });
    }

    const booking = await Booking.create({
      student: req.user._id,
      tutor: profile.user,
      tutorProfile: profile._id,
      course,
      scheduledAt,
      durationMinutes,
      studentMessage,
      status: 'pending',
      paymentStatus: profile.isFree ? 'not_required' : 'pending',
    });

    // HTML email to the tutor
    const tutorUser = await User.findById(profile.user).select('email name');
    const schedDate = new Date(scheduledAt);
    if (tutorUser?.email) {
      await sendTutoringRequestEmail({
        to: tutorUser.email,
        studentName: req.user.name || 'A student',
        sessionTitle: course,
        date: schedDate.toLocaleDateString(),
        time: schedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }

    // Confirmation email to the student
    await notifyEmail(
      req.user._id,
      'CampusConnect: Booking request sent',
      `CampusConnect update: Your booking request for ${course} on ${formatSchedule(scheduledAt)} has been sent to the tutor. You will be notified once the tutor responds.${profile.isFree ? '' : ' Please upload your payment proof from the dashboard.'}`
    );

    try {
      await logActivity({
        userId: req.user._id,
        type: 'booking_created',
        refModel: 'Booking',
        refId: booking._id,
        meta: { tutorProfile: profile._id, course },
      });

      await pushNotification(profile.user, {
        type: 'booking_created',
        message: `New booking request for ${course}.`,
        link: '/dashboard/tutor',
        meta: { refModel: 'Booking', refId: booking._id },
      });
    } catch (logErr) {
      console.warn('Activity log failed:', logErr.message);
    }

    res.status(201).json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!booking.tutor.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending bookings can be accepted' });
    }

    booking.status = 'confirmed';
    await booking.save();

    // HTML approval email to the student
    const studentUser = await User.findById(booking.student).select('email name');
    const approveDate = new Date(booking.scheduledAt);
    if (studentUser?.email) {
      await sendTutoringApprovalEmail({
        to: studentUser.email,
        studentName: studentUser.name || 'Student',
        sessionTitle: booking.course,
        date: approveDate.toLocaleDateString(),
        time: approveDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    }

    try {
      await logActivity({
        userId: req.user._id,
        type: 'booking_confirmed',
        refModel: 'Booking',
        refId: booking._id,
        meta: { course: booking.course },
      });

      await pushNotification(booking.student, {
        type: 'booking_confirmed',
        message: `Your booking for ${booking.course} was confirmed.`,
        link: '/dashboard/student',
        meta: { refModel: 'Booking', refId: booking._id },
      });
    } catch (logErr) {
      console.warn('Activity log failed:', logErr.message);
    }

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const rejectBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!booking.tutor.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending bookings can be rejected' });
    }

    booking.status = 'cancelled';
    booking.tutorNote = req.body?.tutorNote || '';
    await booking.save();

    await notifyEmail(
      booking.student,
      'CampusConnect: Booking rejected',
      `CampusConnect update: Your booking request for ${booking.course} was rejected.`
    );

    try {
      await logActivity({
        userId: req.user._id,
        type: 'booking_rejected',
        refModel: 'Booking',
        refId: booking._id,
        meta: { course: booking.course },
      });

      await pushNotification(booking.student, {
        type: 'booking_rejected',
        message: `Your booking request for ${booking.course} was rejected.`,
        link: '/dashboard/student',
        meta: { refModel: 'Booking', refId: booking._id },
      });
    } catch (logErr) {
      console.warn('Activity log failed:', logErr.message);
    }

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!booking.student.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Only pending or confirmed bookings can be cancelled' });
    }

    booking.status = 'cancelled';
    await booking.save();

    await notifyEmail(
      booking.tutor,
      'CampusConnect: Booking cancelled',
      `CampusConnect update: The booking for ${booking.course} on ${formatSchedule(booking.scheduledAt)} was cancelled by the student.`
    );

    try {
      await logActivity({
        userId: req.user._id,
        type: 'booking_cancelled',
        refModel: 'Booking',
        refId: booking._id,
        meta: { course: booking.course },
      });

      await pushNotification(booking.tutor, {
        type: 'booking_cancelled',
        message: `Booking for ${booking.course} was cancelled by the student.`,
        link: '/dashboard/tutor',
        meta: { refModel: 'Booking', refId: booking._id },
      });
    } catch (logErr) {
      console.warn('Activity log failed:', logErr.message);
    }

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!booking.tutor.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Only confirmed bookings can be completed' });
    }

    booking.status = 'completed';
    await booking.save();

    await TutorProfile.findByIdAndUpdate(booking.tutorProfile, { $inc: { totalSessions: 1 } });

    await notifyEmail(
      booking.student,
      'CampusConnect: Session completed',
      `CampusConnect update: Your tutoring session for ${booking.course} on ${formatSchedule(booking.scheduledAt)} has been marked as completed. You can now leave a review from your dashboard!`
    );

    try {
      await logActivity({
        userId: req.user._id,
        type: 'booking_completed',
        refModel: 'Booking',
        refId: booking._id,
        meta: { course: booking.course },
      });

      await pushNotification(booking.student, {
        type: 'booking_completed',
        message: `Your booking for ${booking.course} was marked complete.`,
        link: '/dashboard/student',
        meta: { refModel: 'Booking', refId: booking._id },
      });
    } catch (logErr) {
      console.warn('Activity log failed:', logErr.message);
    }

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const reviewBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!booking.student.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    if (booking.tutor && booking.tutor.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You cannot review your own profile' });
    }

    if (booking.status !== 'completed') {
      return res.status(403).json({ success: false, message: 'Booking must be completed before reviewing' });
    }

    const existing = await Review.findOne({
      reviewer: req.user._id,
      targetType: 'tutor',
      targetId: booking.tutorProfile,
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already reviewed this tutor' });
    }

    const review = await Review.create({
      reviewer: req.user._id,
      targetType: 'tutor',
      targetId: booking.tutorProfile,
      rating: req.body.rating,
      comment: req.body.comment || '',
    });

    const stats = await Review.aggregate([
      { $match: { targetType: 'tutor', targetId: booking.tutorProfile } },
      { $group: { _id: '$targetId', avg: { $avg: '$rating' } } },
    ]);

    const avg = stats[0]?.avg || 0;
    await TutorProfile.findByIdAndUpdate(booking.tutorProfile, { averageRating: avg });

    res.status(201).json({ success: true, data: review });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const listMyBookings = async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const lim = Math.min(50, Math.max(1, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;

    const query = { student: req.user._id };
    const [items, total] = await Promise.all([
      Booking.find(query)
        .populate('tutorProfile', 'bio courses hourlyRate isFree averageRating')
        .populate('tutor', 'name department year avatar')
        .sort({ scheduledAt: -1 })
        .skip(skip)
        .limit(lim),
      Booking.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / lim));

    res.status(200).json({ success: true, data: { items, total, page: Number(page), totalPages } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const listTutorBookings = async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const lim = Math.min(50, Math.max(1, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * lim;

    const query = { tutor: req.user._id };
    const [items, total] = await Promise.all([
      Booking.find(query)
        .populate('student', 'name department year avatar')
        .populate('tutorProfile', 'bio courses hourlyRate isFree averageRating')
        .sort({ scheduledAt: -1 })
        .skip(skip)
        .limit(lim),
      Booking.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / lim));

    res.status(200).json({ success: true, data: { items, total, page: Number(page), totalPages } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadPaymentProof = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!booking.student.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    if (booking.paymentStatus === 'not_required') {
      return res.status(400).json({ success: false, message: 'Payment is not required for this booking' });
    }

    if (!['pending', 'rejected'].includes(booking.paymentStatus)) {
      return res.status(400).json({ success: false, message: 'Payment proof can only be uploaded when status is pending or rejected' });
    }

    const { paymentProofUrl } = req.body;
    if (!paymentProofUrl) {
      return res.status(400).json({ success: false, message: 'Payment proof image URL is required' });
    }

    booking.paymentProofUrl = paymentProofUrl;
    booking.paymentStatus = 'uploaded';
    await booking.save();

    // Email tutor about uploaded payment proof
    await notifyEmail(
      booking.tutor,
      'CampusConnect: Payment proof uploaded – review needed',
      `CampusConnect update: A student has uploaded payment proof for ${booking.course} on ${formatSchedule(booking.scheduledAt)}. Please review and approve or reject from your dashboard.`
    );

    try {
      await pushNotification(booking.tutor, {
        type: 'payment_uploaded',
        message: `Payment proof uploaded for ${booking.course} booking. Please review and approve.`,
        link: '/dashboard/tutor',
        meta: { refModel: 'Booking', refId: booking._id },
      });
    } catch (logErr) {
      console.warn('Notification failed:', logErr.message);
    }

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const approvePayment = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!booking.tutor.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    if (booking.paymentStatus !== 'uploaded') {
      return res.status(400).json({ success: false, message: 'Only uploaded payment proofs can be approved' });
    }

    booking.paymentStatus = 'approved';
    booking.status = 'confirmed';
    await booking.save();

    await notifyEmail(
      booking.student,
      'CampusConnect: Payment approved – Booking confirmed',
      `CampusConnect update: Your payment for ${booking.course} on ${formatSchedule(booking.scheduledAt)} has been approved and your booking is now confirmed!`
    );

    try {
      await logActivity({
        userId: req.user._id,
        type: 'payment_approved',
        refModel: 'Booking',
        refId: booking._id,
        meta: { course: booking.course },
      });

      await pushNotification(booking.student, {
        type: 'payment_approved',
        message: `Your payment for ${booking.course} was approved. Booking confirmed!`,
        link: '/dashboard/student',
        meta: { refModel: 'Booking', refId: booking._id },
      });
    } catch (logErr) {
      console.warn('Activity log failed:', logErr.message);
    }

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const rejectPayment = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!booking.tutor.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    if (booking.paymentStatus !== 'uploaded') {
      return res.status(400).json({ success: false, message: 'Only uploaded payment proofs can be rejected' });
    }

    booking.paymentStatus = 'rejected';
    booking.tutorNote = req.body?.tutorNote || 'Payment proof was not acceptable. Please re-upload.';
    await booking.save();

    await notifyEmail(
      booking.student,
      'CampusConnect: Payment proof rejected',
      `CampusConnect update: Your payment proof for ${booking.course} was rejected. Reason: ${booking.tutorNote}. Please upload a valid screenshot from your dashboard.`
    );

    try {
      await pushNotification(booking.student, {
        type: 'payment_rejected',
        message: `Your payment proof for ${booking.course} was rejected. Please upload a valid screenshot.`,
        link: '/dashboard/student',
        meta: { refModel: 'Booking', refId: booking._id },
      });
    } catch (logErr) {
      console.warn('Notification failed:', logErr.message);
    }

    res.status(200).json({ success: true, data: booking });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!booking.tutor.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the tutor can delete this session' });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Completed sessions cannot be deleted' });
    }

    const hasReview = await Review.findOne({
      targetType: 'tutor',
      targetId: booking.tutorProfile,
      reviewer: booking.student,
    });
    if (hasReview) {
      return res.status(400).json({ success: false, message: 'Cannot delete a session that has a review' });
    }

    if (booking.paymentStatus === 'approved') {
      return res.status(400).json({ success: false, message: 'Cannot delete a session with approved payment. Cancel it instead.' });
    }

    const scheduledTime = new Date(booking.scheduledAt);
    const now = new Date();
    const hoursUntilSession = (scheduledTime - now) / (1000 * 60 * 60);
    if (booking.status === 'confirmed' && hoursUntilSession < 2) {
      return res.status(400).json({
        success: false,
        message: 'Confirmed sessions cannot be deleted less than 2 hours before the scheduled time. Please cancel instead.',
      });
    }

    const reason = req.body?.reason || '';

    await notifyEmail(
      booking.student,
      'CampusConnect: Session deleted by tutor',
      `CampusConnect update: Your ${booking.status} tutoring session for ${booking.course} on ${formatSchedule(booking.scheduledAt)} has been removed by the tutor.${reason ? ` Reason: ${reason}` : ''}`
    );

    try {
      await pushNotification(booking.student, {
        type: 'booking_deleted',
        message: `Your session for ${booking.course} was deleted by the tutor.${reason ? ` Reason: ${reason}` : ''}`,
        link: '/dashboard/student',
        meta: { refModel: 'Booking', refId: booking._id },
      });
    } catch (logErr) {
      console.warn('Notification failed:', logErr.message);
    }

    await Booking.findByIdAndDelete(booking._id);

    res.status(200).json({ success: true, message: 'Session deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
