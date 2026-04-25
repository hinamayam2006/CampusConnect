import User from '../models/User.model.js';
import Request from '../models/Request.model.js';
import Listing from '../models/Listing.model.js';
import Ride from '../models/Ride.model.js';
import LostnFound from '../models/LostnFound.model.js';
import Borrowing from '../models/Borrowing.model.js';

function extractPathId(link = '', prefix) {
  const match = String(link).match(new RegExp(`^/${prefix}/([^/?#]+)`));
  return match?.[1] || null;
}

async function resolveNotificationTarget(notification) {
  let refModel = notification.meta?.refModel || null;
  let refId = notification.meta?.refId || null;

  if ((!refModel || !refId) && notification.requestId) {
    const request = await Request.findById(notification.requestId).select('refModel refId');
    if (request) {
      refModel = request.refModel;
      refId = request.refId;
    }
  }

  if (!refModel || !refId) {
    const listingId = extractPathId(notification.link, 'marketplace');
    const rideId = extractPathId(notification.link, 'rides');
    const lostFoundId = extractPathId(notification.link, 'lostnfound');
    const borrowId = extractPathId(notification.link, 'borrow');

    if (listingId) {
      refModel = 'Listing';
      refId = listingId;
    } else if (rideId) {
      refModel = 'Ride';
      refId = rideId;
    } else if (lostFoundId) {
      refModel = 'LostnFound';
      refId = lostFoundId;
    } else if (borrowId) {
      refModel = 'Borrowing';
      refId = borrowId;
    }
  }

  if (refModel === 'Listing' && refId) {
    const listing = await Listing.findById(refId).select('_id');
    if (!listing) {
      return {
        exists: false,
        message: 'This listing was deleted and is no longer available.',
      };
    }

    return {
      exists: true,
      path: `/marketplace/${listing._id}`,
    };
  }

  if (refModel === 'Ride' && refId) {
    const ride = await Ride.findById(refId).select('_id');
    if (!ride) {
      return {
        exists: false,
        message: 'This ride was deleted and is no longer available.',
      };
    }

    return {
      exists: true,
      path: `/rides/${ride._id}`,
    };
  }

  if (refModel === 'LostnFound' && refId) {
    const item = await LostnFound.findById(refId).select('_id');
    if (!item) {
      return {
        exists: false,
        message: 'This lost and found post was deleted and is no longer available.',
      };
    }

    return {
      exists: true,
      path: `/lostnfound/${item._id}`,
    };
  }

  if (refModel === 'Borrowing' && refId) {
    const item = await Borrowing.findById(refId).select('_id');
    if (!item) {
      return {
        exists: false,
        message: 'This borrow listing was deleted and is no longer available.',
      };
    }

    return {
      exists: true,
      path: '/borrow',
    };
  }

  if (notification.link) {
    return {
      exists: true,
      path: notification.link,
    };
  }

  return {
    exists: false,
    message: 'This notification does not have an available destination.',
  };
}

export const listNotifications = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');
    const list = user?.notifications
      ? [...user.notifications]
          .filter((n) => !n.hidden)
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
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

export const resolveNotificationLink = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const notification = user.notifications.id(req.params.id);
    if (!notification || notification.hidden) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const target = await resolveNotificationTarget(notification);
    if (!target.exists) {
      return res.status(404).json({ success: false, message: target.message });
    }

    res.status(200).json({ success: true, data: target });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
