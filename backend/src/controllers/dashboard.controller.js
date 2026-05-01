import User from '../models/User.model.js';
import Listing from '../models/Listing.model.js';
import Ride from '../models/Ride.model.js';
import ActivityEvent from '../models/ActivityEvent.model.js';

const ACTIVITY_LABELS = {
  marketplace_listing_create: 'You posted a marketplace listing',
  marketplace_listing_view: 'You viewed a marketplace listing',
  marketplace_activity: 'Marketplace activity',
  marketplace_search: 'You searched the marketplace',
  marketplace_interest: 'You expressed interest in a listing',
  marketplace_request_create: 'You sent a marketplace request',
  marketplace_request_received: 'You received a marketplace request',
  marketplace_listing_completed: 'You marked a marketplace listing completed',
  lostnfound_request_create: 'You submitted a lost & found request',
  lostnfound_request_received: 'You received a lost & found request',
  borrow_request_create: 'You sent a borrow request',
  borrow_request_received: 'You received a borrow request',
  borrow_item_borrowed: 'You marked an item as borrowed',
  borrow_item_returned: 'You marked an item as returned',
  lostnfound_item_resolved: 'You resolved a lost & found item',
  lostnfound_item_reopened: 'You reopened a lost & found item',
  lostnfound_item_closed: 'You closed a lost & found item',
  ride_create: 'You posted a carpool ride',
  ride_view: 'You viewed a ride offer',
  ride_posted: 'You posted a ride',
  ride_search: 'You searched carpool rides',
  ride_join: 'You joined a carpool ride',
  ride_request_create: 'You sent a ride request',
  ride_request_received: 'You received a ride request',
  ride_confirmed: 'A ride was confirmed',
  ride_completed: 'A ride was completed',
  request_approved: 'A request was approved',
  request_declined: 'A request was declined',
  request_withdrawn: 'A request was withdrawn',
  request_closed: 'A request was closed',
  chat_initialized: 'You started a chat',
  message_sent: 'You sent a message',
  rating_received: 'You received a rating',
  note_uploaded: 'You uploaded a note',
  note_downloaded: 'You downloaded a note',
  booking_created: 'You requested a tutoring session',
  booking_confirmed: 'A tutoring session was confirmed',
  booking_rejected: 'A tutoring session was rejected',
  booking_cancelled: 'A tutoring session was cancelled',
  booking_completed: 'A tutoring session was completed',
  booking_no_show: 'A tutoring session was marked no-show',
  admin_user_suspended: 'User suspended (admin)',
  admin_user_unsuspended: 'User unsuspended (admin)',
  admin_role_changed: 'User role changed (admin)',
  admin_ticket_updated: 'Ticket updated (admin)',
  admin_content_deleted: 'Content deleted (admin)',
  admin_moderation_shadow_ban: 'User shadow banned (admin)',
  admin_moderation_remove_content: 'Content removed (admin)',
  admin_moderation_warn_user: 'User warned (admin)',
  admin_moderation_dismiss: 'Moderation dismissed (admin)',
  admin_moderation_no_action: 'No action taken (admin)',
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
      ? user.notifications.filter((n) => !n.read && !n.hidden).length
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

    const activityRows = events
      .map((e) => {
        const label = ACTIVITY_LABELS[e.type];
        if (!label) return null;
        return {
          _id: e._id,
          kind: 'activity',
          message: label,
          link: activityLink(e),
          createdAt: e.createdAt,
          read: true,
        };
      })
      .filter(Boolean);

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
