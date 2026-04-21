import mongoose from 'mongoose';
import Ride from '../models/Ride.model.js';
import Request from '../models/Request.model.js';
import ActivityEvent from '../models/ActivityEvent.model.js';
import User from '../models/User.model.js';
import { logActivity } from '../services/activity.service.js';
import { flushQueuedNotificationEmails, pushNotification } from '../services/notification.service.js';

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const listRides = async (req, res) => {
  try {
    const { originName, destName, after } = req.query;
    const from =
      after && !Number.isNaN(new Date(after).getTime()) ? new Date(after) : new Date();
    const q = { status: { $in: ['scheduled', 'full'] }, departureTime: { $gte: from } };
    if (originName) q.originName = new RegExp(escapeRegex(String(originName)), 'i');
    if (destName) q.destName = new RegExp(escapeRegex(String(destName)), 'i');

    const rides = await Ride.find(q)
      .sort({ departureTime: 1 })
      .limit(60)
      .populate('driver', 'name department avatar year');

    res.status(200).json({ success: true, data: rides });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id).populate(
      'driver',
      'name department year avatar'
    );
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    if (req.user) {
      await logActivity({
        userId: req.user._id,
        type: 'ride_view',
        refModel: 'Ride',
        refId: ride._id,
        meta: { origin: ride.originName, dest: ride.destName },
      });
    }

    let hasRequested = false;
    if (req.user) {
      const existingRequest = await Request.findOne({
        requester: req.user._id,
        refModel: 'Ride',
        refId: ride._id,
        status: { $in: ['pending', 'approved'] },
      });
      hasRequested = !!existingRequest;
    }

    res.status(200).json({ success: true, data: { ...ride.toObject(), hasRequested } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createRide = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const emailQueue = [];
  try {
    const body = { ...req.body };
    body.seatsAvailable = body.seatsTotal;
    if (!body.recurring) {
      body.recurring = { enabled: false, daysOfWeek: [] };
    }

    const [ride] = await Ride.create([{ ...body, driver: req.user._id }], { session });

    await logActivity(
      {
        userId: req.user._id,
        type: 'ride_create',
        refModel: 'Ride',
        refId: ride._id,
        meta: { origin: ride.originName, dest: ride.destName, recurring: ride.recurring?.enabled },
      },
      { session }
    );

    await pushNotification(
      req.user._id,
      {
        type: 'ride_posted',
        message: `Your ride from ${ride.originName} to ${ride.destName} is live.`,
        link: `/rides/${ride._id}`,
      },
      { session, emailQueue }
    );

    await session.commitTransaction();
    await flushQueuedNotificationEmails(emailQueue);
    res.status(201).json({ success: true, data: ride });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

export const updateRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }
    if (!ride.driver.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    Object.assign(ride, req.body);

    const confirmedSeats = ride.passengers
      .filter((p) => p.status === 'confirmed')
      .reduce((sum, passenger) => sum + (passenger.seatsRequested || 1), 0);

    ride.seatsAvailable = Math.max(0, ride.seatsTotal - confirmedSeats);
    if (ride.status !== 'completed' && ride.status !== 'cancelled') {
      ride.status = ride.seatsAvailable > 0 ? 'scheduled' : 'full';
    }

    await ride.save();
    res.status(200).json({ success: true, data: ride });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    if (!ride.driver.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the driver can delete this ride' });
    }

    await Request.updateMany(
      {
        refModel: 'Ride',
        refId: ride._id,
        status: { $in: ['pending', 'approved'] },
      },
      {
        $set: {
          status: 'cancelled',
        },
      }
    );

    await ride.deleteOne();

    res.status(200).json({ success: true, message: 'Ride deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const joinRide = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const emailQueue = [];
  try {
    const ride = await Ride.findById(req.params.id).session(session);
    if (!ride || ride.status !== 'scheduled') {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Ride not available' });
    }
    if (ride.driver.equals(req.user._id)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'You are driving this ride' });
    }
    if (ride.passengers.some((p) => p.user.equals(req.user._id))) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Already requested or on this ride' });
    }

    const seatsRequested = Math.max(1, Number(req.body.seatsRequested) || 1);
    const pendingRequests = await Request.find({ requester: req.user._id, refModel: 'Ride', refId: ride._id, status: 'pending' }).session(session);
    if (pendingRequests.length) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'You already have a pending ride request' });
    }

    const confirmed = ride.passengers.filter((p) => p.status === 'confirmed').reduce((sum, p) => sum + (p.seatsRequested || 1), 0);
    if (confirmed + seatsRequested > ride.seatsTotal) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Not enough seats left for this request' });
    }

    const [request] = await Request.create(
      [
        {
          requester: req.user._id,
          owner: ride.driver,
          refModel: 'Ride',
          refId: ride._id,
          status: 'pending',
          context: 'ride',
          seatsRequested,
          message: req.body.message || '',
        },
      ],
      { session }
    );

    await logActivity(
      {
        userId: req.user._id,
        type: 'ride_request_create',
        refModel: 'Request',
        refId: request._id,
        meta: { origin: ride.originName, dest: ride.destName, seatsRequested },
      },
      { session }
    );

    await pushNotification(
      ride.driver,
      {
        type: 'ride_request_received',
        message: `${req.user.name} is interested in your ride offer to ${ride.destName}!`,
        link: `/rides/${ride._id}`,
        requestId: request._id,
        meta: { refModel: 'Ride', refId: ride._id, context: 'ride', seatsRequested, message: req.body.message || '' },
      },
      { session, emailQueue }
    );

    await session.commitTransaction();
    await flushQueuedNotificationEmails(emailQueue);
    res.status(201).json({ success: true, data: request, message: 'Ride request submitted for driver approval' });
  } catch (err) {
    await session.abortTransaction();
    if (err?.code === 11000) {
      return res.status(400).json({ success: false, message: 'You already have an active ride request for this trip' });
    }
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

export const leaveRide = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const emailQueue = [];
  try {
    const ride = await Ride.findById(req.params.id).session(session);
    if (!ride) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    const passengerIndex = ride.passengers.findIndex((p) => p.user.equals(req.user._id));
    if (passengerIndex === -1) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'You are not a passenger on this ride' });
    }

    if (ride.status === 'completed') {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Cannot leave a completed ride' });
    }

    ride.passengers.splice(passengerIndex, 1);
    const confirmedSeats = ride.passengers
      .filter((p) => p.status === 'confirmed')
      .reduce((sum, p) => sum + (p.seatsRequested || 1), 0);

    ride.seatsAvailable = Math.max(0, ride.seatsTotal - confirmedSeats);
    if (ride.status === 'full' && ride.seatsAvailable > 0) {
      ride.status = 'scheduled';
    }

    await ride.save({ session });

    const request = await Request.findOne({
      refModel: 'Ride',
      refId: ride._id,
      requester: req.user._id,
      status: 'approved',
    }).session(session);

    if (request) {
      request.status = 'cancelled';
      await request.save({ session });
    }

    await pushNotification(
      ride.driver,
      {
        type: 'ride_passenger_left',
        message: `${req.user.name} left your ride to ${ride.destName}.`,
        link: `/rides/${ride._id}`,
      },
      { session, emailQueue }
    );

    await session.commitTransaction();
    await flushQueuedNotificationEmails(emailQueue);
    res.status(200).json({ success: true, data: ride, message: 'You have left the ride' });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

export const hidePassengerRide = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const ride = await Ride.findById(req.params.id).session(session);
    if (!ride) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    const passenger = ride.passengers.find((p) => p.user.equals(req.user._id));
    if (!passenger) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'You are not a passenger on this ride' });
    }

    passenger.hidden = true;
    await ride.save({ session });

    await session.commitTransaction();
    res.status(200).json({ success: true, data: ride, message: 'Ride hidden from your passenger list' });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

export const logRideSearch = async (req, res) => {
  try {
    await logActivity({
      userId: req.user._id,
      type: 'ride_search',
      meta: { ...req.body },
    });
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getRideSuggestions = async (req, res) => {
  try {
    const uid = req.user._id;
    const top = await ActivityEvent.aggregate([
      { $match: { userId: uid, type: { $in: ['ride_search', 'ride_view', 'ride_join'] } } },
      {
        $group: {
          _id: { on: '$meta.originName', dn: '$meta.destName' },
          n: { $sum: 1 },
        },
      },
      { $sort: { n: -1 } },
      { $limit: 8 },
    ]);

    const now = new Date();
    const rides = [];

    for (const row of top) {
      const on = row._id.on;
      const dn = row._id.dn;
      if (!on || !dn) continue;
      const found = await Ride.find({
        status: 'scheduled',
        departureTime: { $gte: now },
        originName: new RegExp(escapeRegex(String(on).slice(0, 40)), 'i'),
        destName: new RegExp(escapeRegex(String(dn).slice(0, 40)), 'i'),
        driver: { $ne: uid },
      })
        .sort({ departureTime: 1 })
        .limit(4)
        .populate('driver', 'name department');
      rides.push(...found);
    }

    const unique = [];
    const seen = new Set();
    for (const r of rides) {
      const id = String(r._id);
      if (seen.has(id)) continue;
      seen.add(id);
      unique.push(r);
      if (unique.length >= 12) break;
    }

    if (unique.length < 6) {
      const more = await Ride.find({
        status: 'scheduled',
        departureTime: { $gte: now },
        driver: { $ne: uid },
      })
        .sort({ departureTime: 1 })
        .limit(12 - unique.length)
        .populate('driver', 'name department');
      for (const r of more) {
        if (seen.has(String(r._id))) continue;
        unique.push(r);
        seen.add(String(r._id));
      }
    }

    res.status(200).json({ success: true, data: unique });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyRides = async (req, res) => {
  try {
    const asDriver = await Ride.find({ driver: req.user._id })
      .sort({ departureTime: -1 })
      .limit(50)
      .populate('passengers.user', 'name department');
    const asPassenger = await Ride.find({
      passengers: {
        $elemMatch: {
          user: req.user._id,
          hidden: { $ne: true },
        },
      },
    })
      .sort({ departureTime: -1 })
      .limit(50)
      .populate('driver', 'name department');
    res.status(200).json({ success: true, data: { asDriver, asPassenger } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** Scheduled job: remind drivers of rides departing today (trigger-style deadline nudge). */
export const sendRideReminders = async () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const rides = await Ride.find({
    departureTime: { $gte: start, $lt: end },
    status: { $in: ['scheduled', 'full'] },
  });

  for (const ride of rides) {
    await pushNotification(ride.driver, {
      type: 'ride_confirmed',
      message: `Reminder: your ride today (${ride.originName} → ${ride.destName}).`,
      link: `/rides/${ride._id}`,
    });
  }
};

/**
 * Mark a ride as completed
 * Only driver can mark their ride as completed
 * Changes status from scheduled/full -> completed
 */
export const markRideCompleted = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const emailQueue = [];
  try {
    const ride = await Ride.findById(req.params.id).session(session);

    if (!ride) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    // Verify ownership
    if (!ride.driver.equals(req.user._id)) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'Only driver can mark their ride as completed' });
    }

    ride.status = 'completed';
    await ride.save({ session });

    // Log activity
    await logActivity(
      {
        userId: req.user._id,
        type: 'ride_completed',
        refModel: 'Ride',
        refId: ride._id,
        meta: { origin: ride.originName, dest: ride.destName },
      },
      { session }
    );

    // Notify all passengers
    for (const passenger of ride.passengers) {
      await pushNotification(
        passenger.user,
        {
          type: 'ride_completed',
          message: `Your ride from ${ride.originName} to ${ride.destName} is now marked as completed.`,
          link: `/dashboard`,
        },
        { session, emailQueue }
      );
    }

    await session.commitTransaction();
    await flushQueuedNotificationEmails(emailQueue);
    res.status(200).json({
      success: true,
      data: ride,
      message: 'Ride marked as completed',
    });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

/**
 * Auto-close rides that have passed their departure time
 * This should be called periodically by a cron job
 * Status: scheduled/full -> completed (after departure time has passed)
 */
export const autoCloseExpiredRides = async () => {
  try {
    const now = new Date();

    // Find all rides with departure time in the past that are still scheduled/full
    const expiredRides = await Ride.find({
      departureTime: { $lt: now },
      status: { $in: ['scheduled', 'full'] },
    });

    for (const ride of expiredRides) {
      ride.status = 'completed';
      await ride.save();
    }

    console.log(`Auto-closed ${expiredRides.length} expired rides`);
  } catch (err) {
    console.error('Error auto-closing rides:', err);
  }
};
