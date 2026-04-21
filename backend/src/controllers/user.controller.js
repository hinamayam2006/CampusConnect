import mongoose from 'mongoose';
import User from '../models/User.model.js';
import Request from '../models/Request.model.js';
import { flushQueuedNotificationEmails, pushNotification } from '../services/notification.service.js';

export const getPublicProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name department year avatar createdAt');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

