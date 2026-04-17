import User from '../models/User.model.js';

export const listNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');
    const list = user?.notifications
      ? [...user.notifications].filter((n) => !n.hidden).reverse()
      : [];
    res.status(200).json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const hideNotification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const n = user.notifications.id(req.params.id);
    if (!n) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    n.hidden = true;
    await user.save();
    res.status(200).json({ success: true, message: 'Notification hidden' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const n = user.notifications.id(req.params.id);
    if (!n) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    n.read = true;
    await user.save();
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.notifications.forEach((n) => {
      n.read = true;
    });
    await user.save();
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
