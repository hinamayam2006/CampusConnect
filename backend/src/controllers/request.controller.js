import mongoose from 'mongoose';
import Request from '../models/Request.model.js';
import Listing from '../models/Listing.model.js';
import Ride from '../models/Ride.model.js';
import LostnFound from '../models/LostnFound.model.js';
import Borrowing from '../models/Borrowing.model.js';
import User from '../models/User.model.js';
import { logActivity } from '../services/activity.service.js';
import { flushQueuedNotificationEmails, pushNotification } from '../services/notification.service.js';

const REQUEST_RESEND_COOLDOWN_MS = 6 * 60 * 60 * 1000;

/**
 * Create a new request for a shareable resource.
 * Status starts as PENDING
 * Owner receives a notification
 */
export const createRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const emailQueue = [];
  try {
    const { refModel, refId, seatsRequested = 1, message = '' } = req.body;
    const requester = req.user._id;
    const normalizedMessage = String(message || '').trim();

    // Validate refModel
    if (!['Listing', 'Ride', 'LostnFound', 'Borrowing'].includes(refModel)) {
      return res.status(400).json({ success: false, message: 'Invalid refModel' });
    }

    // Fetch referenced resource and resolve owner/context metadata.
    let resource;
    let owner;
    let context;
    let resourceLabel;
    let link;

    if (refModel === 'Listing') {
      resource = await Listing.findById(refId).session(session);
      owner = resource?.seller;
      context = 'marketplace';
      resourceLabel = 'listing';
      link = `/marketplace/${refId}`;

      if (resource && resource.status !== 'active') {
        await session.abortTransaction();
        return res.status(409).json({
          success: false,
          message: 'This listing is already reserved or sold.',
        });
      }
    } else if (refModel === 'Ride') {
      resource = await Ride.findById(refId).session(session);
      owner = resource?.driver;
      context = 'ride';
      resourceLabel = 'ride offer';
      link = `/rides/${refId}`;
    } else if (refModel === 'LostnFound') {
      resource = await LostnFound.findById(refId).session(session);
      owner = resource?.owner;
      context = 'lostnfound';
      resourceLabel = resource?.postType === 'found' ? 'found-item post' : 'lost-item post';
      link = `/lostnfound/${refId}`;
    } else {
      resource = await Borrowing.findById(refId).session(session);
      owner = resource?.owner;
      context = 'borrow';
      resourceLabel = 'borrow request';
      link = '/borrow';
    }

    if (!resource) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: `${refModel} not found` });
    }

    const ownerUser = await User.findById(owner).select('allowMessages').session(session);
    if (ownerUser && ownerUser.allowMessages === false) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        message: 'This user is not accepting new messages right now.',
      });
    }

    // Prevent user from requesting their own resource
    if (owner.equals(requester)) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ success: false, message: 'Cannot request your own resource' });
    }

    // If there is already an approved, still-open request/chat for this resource,
    // do not create another request.
    const existingApprovedOpen = await Request.findOne({
      requester,
      refModel,
      refId,
      status: 'approved',
      chatClosed: { $ne: true },
    }).session(session);

    if (existingApprovedOpen) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: 'You already have an approved active request for this item. Open the existing chat from the item page.',
      });
    }

    // Prevent immediate repeat requests on the same resource.
    // After cooldown, allow a follow-up ping on the same pending request.
    const existingPending = await Request.findOne({
      requester,
      refModel,
      refId,
      status: 'pending',
    }).session(session);

    if (existingPending) {
      const elapsed = Date.now() - new Date(existingPending.createdAt).getTime();
      if (elapsed < REQUEST_RESEND_COOLDOWN_MS) {
        const retryAfterMinutes = Math.ceil((REQUEST_RESEND_COOLDOWN_MS - elapsed) / (60 * 1000));
        await session.abortTransaction();
        return res.status(429).json({
          success: false,
          message: `You already sent a request. Try again in about ${retryAfterMinutes} minute(s).`,
        });
      }

      if (normalizedMessage) {
        existingPending.message = normalizedMessage;
      }
      await existingPending.save({ session });

      await logActivity(
        {
          userId: requester,
          type: `${context}_request_create`,
          refModel: 'Request',
          refId: existingPending._id,
          meta: { refModel, refId, context, followUp: true },
        },
        { session }
      );

      await pushNotification(
        owner,
        {
          type: `${context}_request_received`,
          message: `${req.user.name} sent a follow-up request about your ${resourceLabel}.`,
          link,
          requestId: existingPending._id,
          meta: { refModel, refId, context, requester, message: normalizedMessage, followUp: true },
        },
        { session, emailQueue }
      );

      await session.commitTransaction();
      await flushQueuedNotificationEmails(emailQueue);
      return res.status(200).json({
        success: true,
        data: existingPending,
        message: 'Follow-up request sent successfully',
      });
    }

    // Create the request
    const request = await Request.create(
      [
        {
          requester,
          owner,
          refModel,
          refId,
          status: 'pending',
          context,
          seatsRequested: context === 'ride' ? seatsRequested : 1,
          message: normalizedMessage,
        },
      ],
      { session }
    );

    // Log activity
    await logActivity(
      {
        userId: requester,
        type: `${context}_request_create`,
        refModel: 'Request',
        refId: request[0]._id,
        meta: { refModel, refId, context },
      },
      { session }
    );

    // Notify owner
    await pushNotification(
      owner,
      {
        type: `${context}_request_received`,
        message: `${req.user.name} contacted you about your ${resourceLabel}.`,
        link,
        requestId: request[0]._id,
        meta: { refModel, refId, context, requester, message: normalizedMessage },
      },
      { session, emailQueue }
    );

    await session.commitTransaction();
    await flushQueuedNotificationEmails(emailQueue);
    res.status(201).json({
      success: true,
      data: request[0],
      message: 'Request created successfully',
    });
  } catch (err) {
    await session.abortTransaction();
    if (err?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You already have a pending request for this post.',
      });
    }
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Get all requests for the current user (both as requester and owner)
 */
export const getMyRequests = async (req, res) => {
  try {
    const { role, status, context } = req.query;
    const userId = req.user._id;

    let query = {};

    // role: 'requester', 'owner', or both (default)
    if (role === 'requester') {
      query.requester = userId;
    } else if (role === 'owner') {
      query.owner = userId;
    } else {
      query = { $or: [{ requester: userId }, { owner: userId }] };
    }

    if (status) {
      query.status = status;
    }

    if (context) {
      query.context = context;
    }

    const requests = await Request.find(query)
      .populate('requester', 'name avatar department')
      .populate('owner', 'name avatar department')
      .populate('refId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Get a specific request by ID
 */
export const getRequestById = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('requester', 'name avatar department')
      .populate('owner', 'name avatar department')
      .populate('refId');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Check if user has permission to view
    if (!request.requester._id.equals(req.user._id) && !request.owner._id.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    res.status(200).json({ success: true, data: request });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Approve a request (owner only)
 * Status: PENDING -> APPROVED
 */
export const approveRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const emailQueue = [];
  try {
    const request = await Request.findById(req.params.id).session(session);

    if (!request) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Only owner can approve
    if (!request.owner.equals(req.user._id)) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'Only owner can approve' });
    }

    // Status must be pending
    if (request.status !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Cannot approve a ${request.status} request`,
      });
    }

    if (request.context === 'ride') {
      const ride = await Ride.findById(request.refId).session(session);
      if (!ride || ride.status !== 'scheduled') {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'Ride is no longer available' });
      }
      if (ride.driver.equals(request.requester) || ride.passengers.some((p) => p.user.equals(request.requester))) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'Requester is already on this ride' });
      }

      const confirmed = ride.passengers.filter((p) => p.status === 'confirmed').reduce((sum, p) => sum + (p.seatsRequested || 1), 0);
      const seatsRequested = Math.max(1, request.seatsRequested || 1);
      if (confirmed + seatsRequested > ride.seatsTotal) {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'Not enough seats remaining to approve this request' });
      }

      ride.passengers.push({ user: request.requester, status: 'confirmed', seatsRequested });
      ride.seatsAvailable = Math.max(0, ride.seatsTotal - confirmed - seatsRequested);
      if (ride.seatsAvailable <= 0) ride.status = 'full';
      await ride.save({ session });
    } else if (request.context === 'marketplace') {
      const listing = await Listing.findById(request.refId).session(session);
      if (!listing || listing.status === 'sold') {
        await session.abortTransaction();
        return res.status(400).json({ success: false, message: 'This listing is no longer available' });
      }
      listing.status = 'sold';
      await listing.save({ session });

      // Auto-cleanup: decline other pending requests for this listing
      await Request.updateMany(
        { refId: listing._id, status: 'pending', _id: { $ne: request._id } },
        { status: 'declined', declineReason: 'Item has been reserved/sold to someone else' },
        { session }
      );
    } else if (request.context === 'borrow') {
      const item = await Borrowing.findById(request.refId).session(session);
      if (item && item.status === 'available') {
        item.status = 'borrowed';
        item.borrower = request.requester;
        item.returnedAt = null;
        if (!item.dueAt && item.requestedUntil) {
          item.dueAt = item.requestedUntil;
        }
        await item.save({ session });
      }
    }

    request.status = 'approved';
    request.chatInitialized = true;
    await request.save({ session });

    // Log activity
    await logActivity(
      {
        userId: req.user._id,
        type: 'request_approved',
        refModel: 'Request',
        refId: request._id,
        meta: { context: request.context },
      },
      { session }
    );

    // Notify requester
    await pushNotification(
      request.requester,
      {
        type: 'request_approved',
        message: `Your request was approved! You can now chat with the owner.`,
        link: `/dashboard`,
        requestId: request._id,
        meta: { refModel: request.refModel, refId: request.refId, context: request.context, owner: request.owner },
      },
      { session, emailQueue }
    );

    // Update owner's notification to show approved status
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'notifications.$[elem].message': 'Request approved by you',
          'notifications.$[elem].type': 'request_approved_by_owner',
          'notifications.$[elem].meta.chatInitialized': true,
        },
      },
      {
        arrayFilters: [{ 'elem.requestId': request._id }],
        session,
      }
    );

    await session.commitTransaction();
    await flushQueuedNotificationEmails(emailQueue);
    res.status(200).json({
      success: true,
      data: request,
      message: 'Request approved',
    });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Decline a request (owner only)
 * Status: PENDING -> DECLINED
 */
export const declineRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const emailQueue = [];
  try {
    const { declineReason = '' } = req.body;
    const request = await Request.findById(req.params.id).session(session);

    if (!request) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Only owner can decline
    if (!request.owner.equals(req.user._id)) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'Only owner can decline' });
    }

    // Status must be pending
    if (request.status !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Cannot decline a ${request.status} request`,
      });
    }

    request.status = 'declined';
    request.declineReason = declineReason;
    await request.save({ session });

    // Log activity
    await logActivity(
      {
        userId: req.user._id,
        type: 'request_declined',
        refModel: 'Request',
        refId: request._id,
        meta: { context: request.context, reason: declineReason },
      },
      { session }
    );

    // Notify requester
    await pushNotification(
      request.requester,
      {
        type: 'request_declined',
        message: `Your request was declined.${declineReason ? ` Reason: ${declineReason}` : ''}`,
        link: `/requests/${request._id}`,
        requestId: request._id,
        meta: { refModel: request.refModel, refId: request.refId, context: request.context, declinedBy: req.user._id, reason: declineReason },
      },
      { session, emailQueue }
    );

    // Update owner's notification to show declined status
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'notifications.$[elem].message': `Request declined by you${declineReason ? ` (${declineReason})` : ''}`,
          'notifications.$[elem].type': 'request_declined_by_owner',
        },
      },
      {
        arrayFilters: [{ 'elem.requestId': request._id }],
        session,
      }
    );

    await session.commitTransaction();
    await flushQueuedNotificationEmails(emailQueue);
    res.status(200).json({
      success: true,
      data: request,
      message: 'Request declined',
    });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Withdraw a request (requester only, only if PENDING)
 * Status: PENDING -> WITHDRAWN
 */
export const withdrawRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const emailQueue = [];
  try {
    const request = await Request.findById(req.params.id).session(session);

    if (!request) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Only requester can withdraw
    if (!request.requester.equals(req.user._id)) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'Only requester can withdraw' });
    }

    // Status must be pending
    if (request.status !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Cannot withdraw a ${request.status} request`,
      });
    }

    request.status = 'withdrawn';
    await request.save({ session });

    // Log activity
    await logActivity(
      {
        userId: req.user._id,
        type: 'request_withdrawn',
        refModel: 'Request',
        refId: request._id,
        meta: { context: request.context },
      },
      { session }
    );

    // Update owner's existing request notification so it no longer shows action buttons.
    await User.findByIdAndUpdate(
      request.owner,
      {
        $set: {
          'notifications.$[elem].message': 'This request was withdrawn',
          'notifications.$[elem].type': 'request_withdrawn_by_requester',
          'notifications.$[elem].read': false,
          'notifications.$[elem].meta.withdrawnBy': req.user._id,
        },
      },
      {
        arrayFilters: [{ 'elem.requestId': request._id }],
        session,
      }
    );

    const io = globalThis.__campusIo;
    if (io?.to) {
      io.to(`user_${request.owner}`).emit('notification_received', {
        type: 'request_withdrawn_by_requester',
        message: 'This request was withdrawn',
        link: `/requests/${request._id}`,
        requestId: request._id,
        meta: {
          refModel: request.refModel,
          refId: request.refId,
          context: request.context,
          withdrawnBy: req.user._id,
        },
      });
    }

    // Update requester's notification to show withdrawn status
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          'notifications.$[elem].message': 'You withdrew this request',
          'notifications.$[elem].type': 'request_withdrawn_by_requester',
        },
      },
      {
        arrayFilters: [{ 'elem.requestId': request._id }],
        session,
      }
    );

    await session.commitTransaction();
    await flushQueuedNotificationEmails(emailQueue);
    res.status(200).json({
      success: true,
      data: request,
      message: 'Request withdrawn',
    });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Close a declined or withdrawn request so the requester can hide it from their picks
 */
export const closeRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const request = await Request.findById(req.params.id).session(session);

    if (!request) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (!request.requester.equals(req.user._id)) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'Only requester can close this request' });
    }

    if (request.status === 'pending') {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Withdraw pending requests instead of closing them' });
    }

    if (request.status === 'cancelled') {
      await session.commitTransaction();
      return res.status(200).json({ success: true, data: request, message: 'Request already closed' });
    }

    request.status = 'cancelled';
    await request.save({ session });

    await logActivity(
      {
        userId: req.user._id,
        type: 'request_closed',
        refModel: 'Request',
        refId: request._id,
        meta: { context: request.context },
      },
      { session }
    );

    await session.commitTransaction();
    res.status(200).json({ success: true, data: request, message: 'Request closed' });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Accept chat request (either party can accept, but until then no messages can be sent)
 */
export const acceptChatRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const emailQueue = [];
  try {
    const request = await Request.findById(req.params.id).session(session);

    if (!request) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    // Request must be approved
    if (request.status !== 'approved') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Chat can only be initialized for approved requests',
      });
    }

    if (request.chatClosed) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Chat for this request has already been closed',
      });
    }

    // Must be either requester or owner
    const userId = req.user._id;
    if (!request.requester.equals(userId) && !request.owner.equals(userId)) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    // Accept chat
    if (!request.chatAcceptedBy) {
      request.chatAcceptedBy = userId;
      request.chatAcceptedAt = new Date();
    } else if (!request.chatAcceptedBy.equals(userId) && request.status === 'approved') {
      // Both parties have accepted — chat is fully enabled
    }

    await request.save({ session });

    // Notify the other party
    const otherPartyId = request.requester.equals(userId)
      ? request.owner
      : request.requester;
    await pushNotification(
      otherPartyId,
      {
        type: 'chat_initialized',
        message: `Chat is now available! You can start messaging.`,
        link: `/dashboard`,
        requestId: request._id,
        meta: { refModel: request.refModel, refId: request.refId, context: request.context, userAccepted: userId },
      },
      { session, emailQueue }
    );

    await session.commitTransaction();
    await flushQueuedNotificationEmails(emailQueue);
    res.status(200).json({
      success: true,
      data: request,
      message: 'Chat accepted',
    });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Close an approved chat permanently
 */
export const closeChat = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const emailQueue = [];
  try {
    const request = await Request.findById(req.params.id).session(session);
    if (!request) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'approved') {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Only approved chats can be closed' });
    }

    const userId = req.user._id;
    if (!request.requester.equals(userId) && !request.owner.equals(userId)) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    if (request.chatClosed) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Chat is already closed' });
    }

    request.chatClosed = true;
    request.chatClosedBy = userId;
    request.chatClosedAt = new Date();
    await request.save({ session });

    const otherPartyId = request.requester.equals(userId) ? request.owner : request.requester;

    await pushNotification(
      otherPartyId,
      {
        type: 'chat_closed',
        message: `${req.user.name} closed this chat for privacy.`,
        link: `/requests/${request._id}`,
        requestId: request._id,
        meta: { refModel: request.refModel, refId: request.refId, context: request.context, closedBy: userId },
      },
      { session, emailQueue }
    );

    if (req.app?.io) {
      const room = `request_${request._id}`;
      req.app.io.to(room).emit('chat_closed', {
        requestId: request._id,
        closedBy: userId,
        message: 'This chat has been closed by the other participant.',
      });
    }

    await session.commitTransaction();
    await flushQueuedNotificationEmails(emailQueue);
    res.status(200).json({ success: true, data: request, message: 'Chat closed' });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Get requests related to a specific resource
 */
export const getRequestsForResource = async (req, res) => {
  try {
    const { refModel, refId } = req.params;

    // Only owner can view requests for their resource
    let resource;
    if (refModel === 'Listing') {
      resource = await Listing.findById(refId);
    } else if (refModel === 'Ride') {
      resource = await Ride.findById(refId);
    } else if (refModel === 'LostnFound') {
      resource = await LostnFound.findById(refId);
    } else if (refModel === 'Borrowing') {
      resource = await Borrowing.findById(refId);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid refModel' });
    }

    if (!resource) {
      return res.status(404).json({ success: false, message: `${refModel} not found` });
    }

    let owner;
    if (refModel === 'Listing') owner = resource.seller;
    else if (refModel === 'Ride') owner = resource.driver;
    else owner = resource.owner;

    if (!owner.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only resource owner can view requests',
      });
    }

    const requests = await Request.find({
      refModel,
      refId,
      status: { $in: ['pending', 'approved'] },
    })
      .populate('requester', 'name avatar department')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
