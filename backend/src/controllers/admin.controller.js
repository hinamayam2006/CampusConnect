/**
 * admin.controller.js
 *
 * All routes protected by: protect → isAdmin (double-layer)
 *
 * Sections:
 *  1. Tickets        — list, patch status/notes
 *  2. Users          — list, suspend/unsuspend, change role
 *  3. Content        — delete any post across modules
 *  4. Analytics      — aggregation pipelines ($group, $lookup, $facet)
 *
 * Audit logging: every destructive/state-changing action appends
 * an ActivityEvent document (append-only, never deleted).
 */

import mongoose from 'mongoose';
import Ticket from '../models/Ticket.model.js';
import User from '../models/User.model.js';
import ActivityEvent from '../models/ActivityEvent.model.js';
import Listing from '../models/Listing.model.js';
import Ride from '../models/Ride.model.js';
import LostnFound from '../models/LostnFound.model.js';
import Borrowing from '../models/Borrowing.model.js';
import Note from '../models/Note.model.js';

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Append-only audit log. Never throws — audit failure must not block the main action.
 */
async function auditLog(adminId, type, refModel, refId, meta = {}) {
  try {
    await ActivityEvent.create({
      userId: adminId,
      type,
      refModel,
      refId: refId || null,
      meta,
    });
  } catch {
    // intentionally silent — audit failure is non-blocking
  }
}

// ─── 1. TICKETS ───────────────────────────────────────────────────────────────

/** GET /api/admin/tickets?type=&status=&priority=&page=&limit= */
export const listAllTickets = async (req, res) => {
  try {
    const { type, status, priority, page = '1', limit = '20' } = req.query;

    const q = {};
    if (type)     q.type     = type;
    if (status)   q.status   = status;
    if (priority) q.priority = priority;

    const currentPage = Math.max(1, Number(page) || 1);
    const lim         = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip        = (currentPage - 1) * lim;

    const [items, total] = await Promise.all([
      Ticket.find(q)
        .populate('submittedBy', 'name email department year role isSuspended')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim),
      Ticket.countDocuments(q),
    ]);

    return res.status(200).json({ success: true, data: { items, total, page: currentPage } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/** PATCH /api/admin/tickets/:id  — update status and/or adminNotes */
export const updateTicket = async (req, res) => {
  try {
    const { status, adminNotes, priority } = req.body;

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

    if (status) ticket.status = status;
    if (adminNotes !== undefined) ticket.adminNotes = adminNotes;
    if (priority) ticket.priority = priority;

    await ticket.save();

    await auditLog(req.user._id, 'admin_ticket_updated', 'Ticket', ticket._id, {
      newStatus: status,
      by: req.user.name,
    });

    return res.status(200).json({ success: true, data: ticket });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 2. USERS ─────────────────────────────────────────────────────────────────

/** GET /api/admin/users?search=&role=&suspended=&page=&limit= */
export const listAllUsers = async (req, res) => {
  try {
    const { search, role, suspended, page = '1', limit = '20' } = req.query;

    const q = {};
    if (role)      q.role        = role;
    if (suspended === 'true')  q.isSuspended = true;
    if (suspended === 'false') q.isSuspended = false;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      q.$or = [{ name: rx }, { email: rx }];
    }

    const currentPage = Math.max(1, Number(page) || 1);
    const lim         = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip        = (currentPage - 1) * lim;

    const [users, total] = await Promise.all([
      User.find(q)
        .select('-password -refreshToken -notifications -verificationToken -passwordResetToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim),
      User.countDocuments(q),
    ]);

    return res.status(200).json({ success: true, data: { users, total, page: currentPage } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/** PATCH /api/admin/users/:id/suspend */
export const suspendUser = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'A suspension reason is required.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Prevent suspending another admin
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Cannot suspend an admin account.' });
    }

    user.isSuspended      = true;
    user.suspensionReason = reason.trim();
    user.suspendedAt      = new Date();
    user.suspendedBy      = req.user._id;
    await user.save();

    await auditLog(req.user._id, 'admin_user_suspended', 'User', user._id, {
      reason,
      by: req.user.name,
    });

    return res.status(200).json({ success: true, message: `User ${user.name} suspended.`, data: { isSuspended: true } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/** PATCH /api/admin/users/:id/unsuspend */
export const unsuspendUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isSuspended      = false;
    user.suspensionReason = '';
    user.suspendedAt      = null;
    user.suspendedBy      = null;
    await user.save();

    await auditLog(req.user._id, 'admin_user_unsuspended', 'User', user._id, {
      by: req.user.name,
    });

    return res.status(200).json({ success: true, message: `User ${user.name} unsuspended.`, data: { isSuspended: false } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/** PATCH /api/admin/users/:id/role */
export const changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const VALID_ROLES = ['student', 'moderator', 'admin'];
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const prevRole = user.role;
    user.role = role;
    await user.save();

    await auditLog(req.user._id, 'admin_role_changed', 'User', user._id, {
      from: prevRole,
      to: role,
      by: req.user.name,
    });

    return res.status(200).json({ success: true, message: `Role updated to ${role}.`, data: { role } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 3. CONTENT MODERATION ────────────────────────────────────────────────────

const MODEL_MAP = {
  Listing:   Listing,
  Ride:      Ride,
  LostnFound: LostnFound,
  Borrowing: Borrowing,
  Note:      Note,
};

/** DELETE /api/admin/content/:type/:id */
export const deleteContent = async (req, res) => {
  try {
    const { type, id } = req.params;

    const Model = MODEL_MAP[type];
    if (!Model) {
      return res.status(400).json({ success: false, message: `Unknown content type: ${type}` });
    }

    const doc = await Model.findById(id);
    if (!doc) return res.status(404).json({ success: false, message: 'Content not found' });

    await doc.deleteOne();

    await auditLog(req.user._id, 'admin_content_deleted', type, new mongoose.Types.ObjectId(id), {
      contentType: type,
      by: req.user.name,
      title: doc.title || doc.description?.slice(0, 60) || 'N/A',
    });

    return res.status(200).json({ success: true, message: `${type} deleted successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ─── 4. ANALYTICS (AGGREGATION PIPELINES) ─────────────────────────────────────

/**
 * GET /api/admin/analytics
 *
 * Uses $facet to run multiple aggregation sub-pipelines in ONE query.
 * This is the "Advanced DBMS" showcase:
 *   - $group  → group by field, count documents
 *   - $lookup → join across collections
 *   - $facet  → parallel sub-pipelines in one pass
 *   - Date arithmetic for overdue item detection
 */
export const getAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // ── 1. Platform overview (parallel Promise.all for speed) ──
    const [
      totalUsers,
      suspendedUsers,
      openTickets,
      urgentTickets,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isSuspended: true }),
      Ticket.countDocuments({ status: 'open' }),
      Ticket.countDocuments({ status: 'open', priority: 'high' }),
    ]);

    // ── 2. Marketplace success rate ─ $facet pipeline ──
    const [marketplaceFacet] = await Listing.aggregate([
      {
        $facet: {
          total:    [{ $count: 'n' }],
          sold:     [{ $match: { status: 'sold' } },     { $count: 'n' }],
          active:   [{ $match: { status: 'active' } },   { $count: 'n' }],
          reserved: [{ $match: { status: 'reserved' } }, { $count: 'n' }],
        },
      },
    ]);

    const soldThisWeek = await Listing.countDocuments({
      status: 'sold',
      updatedAt: { $gte: weekAgo },
    });

    const topListingCategories = await Listing.aggregate([
      { $group: { _id: { $ifNull: ['$category', 'uncategorized'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { category: '$_id', count: 1, _id: 0 } },
    ]);

    const topLostnFoundCategories = await LostnFound.aggregate([
      { $group: { _id: { $ifNull: ['$category', 'other'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $project: { category: '$_id', count: 1, _id: 0 } },
    ]);

    // ── 3. Most active departments ─ $group + $lookup ──
    const departmentActivity = await ActivityEvent.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
      { $group: { _id: '$userId', eventCount: { $sum: 1 } } },
      {
        $lookup: {
          from:         'users',
          localField:   '_id',
          foreignField: '_id',
          as:           'user',
        },
      },
      { $unwind: '$user' },
      { $group: { _id: '$user.department', totalEvents: { $sum: '$eventCount' }, userCount: { $sum: 1 } } },
      { $sort: { totalEvents: -1 } },
      { $limit: 8 },
      { $project: { department: '$_id', totalEvents: 1, userCount: 1, _id: 0 } },
    ]);

    // ── 4. Lost & Found resolution rate ─ $group ──
    const [lostnfoundFacet] = await LostnFound.aggregate([
      {
        $facet: {
          open:     [{ $match: { status: 'open' } },     { $count: 'n' }],
          resolved: [{ $match: { status: 'resolved' } }, { $count: 'n' }],
          closed:   [{ $match: { status: 'closed' } },   { $count: 'n' }],
        },
      },
    ]);

    // ── 5. Overdue borrowings ─ temporal query (dueAt < now AND still borrowed) ──
    const overdueBorrowings = await Borrowing.find({
      status: 'borrowed',
      dueAt:  { $lt: now, $ne: null },
    })
      .populate('owner',    'name email department')
      .populate('borrower', 'name email department')
      .select('title dueAt owner borrower createdAt')
      .sort({ dueAt: 1 })
      .limit(20);

    // ── 6. New users per day (last 7 days) ─ $group by date ──
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id:   { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', count: 1, _id: 0 } },
    ]);

    // ── 7. Ticket category breakdown ─ $group ──
    const ticketsByCategory = await Ticket.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { category: '$_id', count: 1, _id: 0 } },
    ]);

    return res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          suspendedUsers,
          openTickets,
          urgentTickets,
        },
        marketplace: {
          total:    marketplaceFacet.total[0]?.n    || 0,
          sold:     marketplaceFacet.sold[0]?.n     || 0,
          active:   marketplaceFacet.active[0]?.n   || 0,
          reserved: marketplaceFacet.reserved[0]?.n || 0,
          soldThisWeek,
        },
        lostnfound: {
          open:     lostnfoundFacet.open[0]?.n     || 0,
          resolved: lostnfoundFacet.resolved[0]?.n || 0,
          closed:   lostnfoundFacet.closed[0]?.n   || 0,
        },
        topCategories: {
          marketplace: topListingCategories,
          lostnfound: topLostnFoundCategories,
        },
        departmentActivity,
        overdueBorrowings,
        userGrowth,
        ticketsByCategory,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/** GET /api/admin/audit-log?page=&limit= */
export const getAuditLog = async (req, res) => {
  try {
    const { page = '1', limit = '30', type } = req.query;
    const currentPage = Math.max(1, Number(page) || 1);
    const lim         = Math.min(100, Math.max(1, Number(limit) || 30));
    const skip        = (currentPage - 1) * lim;

    const ADMIN_TYPES = [
      'admin_user_suspended',
      'admin_user_unsuspended',
      'admin_role_changed',
      'admin_ticket_updated',
      'admin_content_deleted',
    ];

    const query = { type: { $in: ADMIN_TYPES } };
    if (type) query.type = type;

    const [items, total] = await Promise.all([
      ActivityEvent.find(query)
        .populate('userId', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim),
      ActivityEvent.countDocuments(query),
    ]);

    return res.status(200).json({ success: true, data: { items, total, page: currentPage } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
