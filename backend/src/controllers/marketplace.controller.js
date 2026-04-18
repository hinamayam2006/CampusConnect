import mongoose from 'mongoose';
import Listing from '../models/Listing.model.js';
import ActivityEvent from '../models/ActivityEvent.model.js';
import Request from '../models/Request.model.js';
import { logActivity } from '../services/activity.service.js';
import { flushQueuedNotificationEmails, pushNotification } from '../services/notification.service.js';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const listListings = async (req, res) => {
  try {
    const {
      category,
      department,
      semester,
      courseCode,
      listingType,
      search,
      status = 'active',
      page = '1',
      limit = '12',
    } = req.query;

    const q = { status };
    if (category) q.category = category;
    if (department) q.department = department;
    if (semester !== undefined && semester !== '') q.semester = Number(semester);
    if (courseCode) q.courseCode = new RegExp(escapeRegex(String(courseCode)), 'i');
    if (listingType) q.listingType = listingType;
    if (search && String(search).trim()) {
      q.$text = { $search: String(search).trim() };
    }

    const skip = (Math.max(1, Number(page)) - 1) * Math.min(48, Math.max(1, Number(limit)));
    const lim = Math.min(48, Math.max(1, Number(limit)));

    let listQ = Listing.find(q).populate('seller', 'name department trustScore avatar year');
    if (search && String(search).trim()) {
      listQ = listQ.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
    } else {
      listQ = listQ.sort({ createdAt: -1 });
    }

    const [items, total] = await Promise.all([listQ.skip(skip).limit(lim), Listing.countDocuments(q)]);

    res.status(200).json({ success: true, data: { items, total, page: Number(page) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getListingById = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate(
      'seller',
      'name department year trustScore totalRatings avatar location'
    );
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    await Listing.updateOne({ _id: listing._id }, { $inc: { views: 1 } });

    if (req.user) {
      await logActivity({
        userId: req.user._id,
        type: 'marketplace_listing_view',
        refModel: 'Listing',
        refId: listing._id,
        meta: { category: listing.category, department: listing.department },
      });
    }

    let hasRequested = false;
    if (req.user) {
      const existingRequest = await Request.findOne({
        requester: req.user._id,
        refModel: 'Listing',
        refId: listing._id,
        status: { $in: ['pending', 'approved'] },
      });
      hasRequested = !!existingRequest;
    }

    res.status(200).json({ success: true, data: { ...listing.toObject(), hasRequested } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createListing = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const emailQueue = [];
  try {
    const [created] = await Listing.create(
      [{ ...req.body, seller: req.user._id }],
      { session }
    );

    await logActivity(
      {
        userId: req.user._id,
        type: 'marketplace_listing_create',
        refModel: 'Listing',
        refId: created._id,
        meta: { category: created.category, title: created.title },
      },
      { session }
    );

    await pushNotification(
      req.user._id,
      {
        type: 'marketplace_activity',
        message: `Your listing "${created.title}" is now live.`,
        link: `/marketplace/${created._id}`,
      },
      { session, emailQueue }
    );

    await session.commitTransaction();
    await flushQueuedNotificationEmails(emailQueue);
    res.status(201).json({ success: true, data: created });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

export const updateListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    if (!listing.seller.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }
    Object.assign(listing, req.body);
    await listing.save();
    res.status(200).json({ success: true, data: listing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }
    const isOwner = listing.seller.equals(req.user._id);
    const isMod = req.user.role === 'moderator';
    if (!isOwner && !isMod) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }
    await listing.deleteOne();
    res.status(200).json({ success: true, message: 'Listing removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const expressInterest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const emailQueue = [];
  try {
    const listing = await Listing.findById(req.params.id).populate('seller');
    if (!listing || listing.status !== 'active') {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Listing not available' });
    }
    if (listing.seller._id.equals(req.user._id)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'You own this listing' });
    }

    const [request] = await Request.create(
      [
        {
          requester: req.user._id,
          owner: listing.seller._id,
          refModel: 'Listing',
          refId: listing._id,
          status: 'pending',
          context: 'marketplace',
          seatsRequested: 1,
          message: req.body.message || '',
        },
      ],
      { session }
    );

    await logActivity(
      {
        userId: req.user._id,
        type: 'marketplace_request_create',
        refModel: 'Request',
        refId: request._id,
        meta: { title: listing.title },
      },
      { session }
    );

    await pushNotification(
      listing.seller._id,
      {
        type: 'marketplace_request_received',
        message: `${req.user.name} is interested in your listing "${listing.title}"!`,
        link: `/marketplace/${listing._id}`,
        requestId: request._id,
        meta: { refModel: 'Listing', refId: listing._id, context: 'marketplace', message: req.body.message || '' },
      },
      { session, emailQueue }
    );

    await session.commitTransaction();
    await flushQueuedNotificationEmails(emailQueue);
    res.status(201).json({ success: true, data: request, message: 'Request sent to seller' });
  } catch (err) {
    await session.abortTransaction();
    if (err?.code === 11000) {
      return res.status(400).json({ success: false, message: 'You already have an active request for this listing' });
    }
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

export const logMarketplaceSearch = async (req, res) => {
  try {
    await logActivity({
      userId: req.user._id,
      type: 'marketplace_search',
      meta: { ...req.body },
    });
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMarketplaceRecommendations = async (req, res) => {
  try {
    const uid = req.user._id;
    const top = await ActivityEvent.aggregate([
      {
        $match: {
          userId: uid,
          type: { $in: ['marketplace_listing_view', 'marketplace_search'] },
        },
      },
      {
        $group: {
          _id: { category: '$meta.category', department: '$meta.department' },
          n: { $sum: 1 },
        },
      },
      { $sort: { n: -1 } },
      { $limit: 6 },
    ]);

    const clauses = top
      .filter((t) => t._id.category && t._id.department)
      .map((t) => ({ category: t._id.category, department: t._id.department }));

    let items = [];
    if (clauses.length) {
      items = await Listing.find({
        status: 'active',
        seller: { $ne: uid },
        $or: clauses,
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('seller', 'name trustScore department');
    }

    if (!items.length) {
      items = await Listing.find({ status: 'active', seller: { $ne: uid } })
        .sort({ views: -1, createdAt: -1 })
        .limit(10)
        .populate('seller', 'name trustScore department');
    }

    res.status(200).json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyListings = async (req, res) => {
  try {
    const items = await Listing.find({ seller: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.status(200).json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Mark a listing as completed (changes status from active to sold/reserved)
 * Only seller can mark their own listing as completed
 */
export const markListingCompleted = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const listing = await Listing.findById(req.params.id).session(session);

    if (!listing) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Listing not found' });
    }

    // Verify ownership
    if (!listing.seller.equals(req.user._id)) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'Only seller can mark their listing as completed' });
    }

    listing.status = 'sold';
    await listing.save({ session });

    // Log activity
    await logActivity(
      {
        userId: req.user._id,
        type: 'marketplace_listing_completed',
        refModel: 'Listing',
        refId: listing._id,
        meta: { title: listing.title },
      },
      { session }
    );

    await session.commitTransaction();
    res.status(200).json({
      success: true,
      data: listing,
      message: 'Listing marked as completed',
    });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};
