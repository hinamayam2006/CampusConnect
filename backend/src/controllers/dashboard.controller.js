import User from '../models/User.model.js';

// @desc    Get dashboard summary stats
export const getDashboardSummary = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const unreadNotifications = user.notifications 
      ? user.notifications.filter(n => !n.read).length 
      : 0;

    res.status(200).json({
      success: true,
      data: {
        itemsForSale: 0, 
        borrowRequests: 0,
        upcomingRides: 0,
        unreadNotifications: unreadNotifications
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Get recent activity/notifications
export const getDashboardActivity = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');

    // FIX: Safe copy [...user.notifications] before reversing
    const activity = user.notifications
      ? [...user.notifications].reverse().slice(0, 5) 
      : [];

    res.status(200).json({
      success: true,
      data: activity
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};