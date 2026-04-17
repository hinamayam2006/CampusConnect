import User from '../models/User.model.js';
import Listing from '../models/Listing.model.js';
import Ride from '../models/Ride.model.js';
import ActivityEvent from '../models/ActivityEvent.model.js';

const ACTIVITY_LABELS = {
  marketplace_listing_create: 'You posted a marketplace listing',
  marketplace_listing_view: 'You viewed a marketplace listing',
  marketplace_search: 'You searched the marketplace',
  marketplace_interest: 'You expressed interest in a listing',
  ride_create: 'You posted a carpool ride',
  ride_view: 'You viewed a ride offer',
  ride_search: 'You searched carpool rides',
  ride_join: 'You joined a carpool ride',
  note_uploaded: 'You uploaded a note',
  note_downloaded: 'You downloaded a note',
};

function activityLink(e) {
  if (e.refModel === 'Listing' && e.refId) return `/marketplace/${e.refId}`;
  if (e.refModel === 'Ride' && e.refId) return `/rides/${e.refId}`;
  return '';
}

// @desc    Get dashboard summary stats
export const getDashboardSummary = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const unreadNotifications = user.notifications
      ? user.notifications.filter((n) => !n.read).length
      : 0;

    const uid = req.user._id;
    const [itemsForSale, upcomingRidesDriver, upcomingRidesPassenger] = await Promise.all([
      Listing.countDocuments({ seller: uid, status: 'active' }),
      Ride.countDocuments({
        driver: uid,
        departureTime: { $gte: new Date() },
        status: 'scheduled',
      }),
      Ride.countDocuments({
        'passengers.user': uid,
        departureTime: { $gte: new Date() },
        status: { $in: ['scheduled', 'full'] },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        itemsForSale,
        borrowRequests: 0,
        upcomingRides: upcomingRidesDriver + upcomingRidesPassenger,
        unreadNotifications,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};

// @desc    Recent activity: notifications + marketplace / ride audit trail
export const getDashboardActivity = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notifications');
    const events = await ActivityEvent.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(18)
      .lean();

    const activityRows = events.map((e) => ({
      _id: e._id,
      kind: 'activity',
      message: ACTIVITY_LABELS[e.type] || 'Campus activity',
      link: activityLink(e),
      createdAt: e.createdAt,
      read: true,
    }));

    const notifRows = (user.notifications || [])
      .slice()
      .reverse()
      .slice(0, 12)
      .map((n) => ({
        _id: n._id,
        kind: 'notification',
        message: n.message,
        link: n.link,
        createdAt: n.createdAt,
        read: n.read,
      }));

    const merged = [...activityRows, ...notifRows].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.status(200).json({
      success: true,
      data: merged.slice(0, 14),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Cursor-style batched read over activity events (demonstrates cursor / streaming reads).
 */
export const getActivityCursor = async (req, res) => {
  try {
    const batch = Math.min(Number(req.query.batch) || 25, 100);
    const cursor = ActivityEvent.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .batchSize(batch)
      .cursor();

    const items = [];
    for (let i = 0; i < batch; i += 1) {
      const doc = await cursor.next();
      if (!doc) break;
      items.push(doc);
    }
    await cursor.close();

    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
