import mongoose from 'mongoose';
import User from '../models/User.model.js';
import Request from '../models/Request.model.js';
import { flushQueuedNotificationEmails, pushNotification } from '../services/notification.service.js';
import { recalcTrustScore } from '../services/trust.service.js';

export const getPublicProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name department year location avatar trustScore totalRatings ratingsReceived createdAt')
      .populate('ratingsReceived.by', 'name department');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const rateUser = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const emailQueue = [];
  try {
    const { id } = req.params;
    if (String(id) === String(req.user._id)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'You cannot rate yourself' });
    }

    const target = await User.findById(id).session(session);
    if (!target) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { context } = req.body;
    if (['marketplace', 'ride'].includes(context)) {
      const relatedRequest = await Request.findOne({
        context,
        status: 'approved',
        $or: [
          { requester: req.user._id, owner: id },
          { requester: id, owner: req.user._id },
        ],
      }).session(session);

      if (!relatedRequest) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'You can only rate this user after an approved transaction.',
        });
      }
    }

    await User.findByIdAndUpdate(
      id,
      {
        $push: {
          ratingsReceived: {
            by: req.user._id,
            score: req.body.score,
            comment: req.body.comment || '',
            context: req.body.context,
            createdAt: new Date(),
          },
        },
      },
      { session }
    );

    await recalcTrustScore(id, session);

    await pushNotification(
      id,
      {
        type: 'rating_received',
        message: `${req.user.name} rated you ${req.body.score}/5 (${req.body.context}).`,
        link: `/profile/${req.user._id}`,
      },
      { session, emailQueue }
    );

    await session.commitTransaction();
    await flushQueuedNotificationEmails(emailQueue);
    res.status(200).json({ success: true, message: 'Rating recorded' });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};
