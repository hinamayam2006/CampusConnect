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
import { sendEmail } from '../utils/email.js';

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
        .populate('submittedBy', 'name email role isSuspended')
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

    // Send suspension email to user
    try {
      const suspensionEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Suspended - CampusConnect</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa;">
          <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">CampusConnect</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Account Suspension Notice</p>
            </div>

            <!-- Content -->
            <div style="padding: 40px;">
              <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                <div style="display: flex; align-items: center; margin-bottom: 10px;">
                  <span style="font-size: 24px; margin-right: 10px;">⚠️</span>
                  <h2 style="margin: 0; color: #dc2626; font-size: 20px;">Your Account Has Been Suspended</h2>
                </div>
                <p style="margin: 10px 0 0; color: #991b1b; line-height: 1.6;">
                  Your CampusConnect account has been temporarily suspended due to a violation of our community guidelines.
                </p>
              </div>

              <div style="margin-bottom: 30px;">
                <h3 style="margin: 0 0 15px; color: #374151; font-size: 18px;">Suspension Details:</h3>
                <div style="background: #f3f4f6; border-radius: 6px; padding: 20px;">
                  <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;"><strong>Reason:</strong></p>
                  <p style="margin: 0 0 20px; color: #111827; font-size: 16px; font-weight: 500;">${reason}</p>
                  <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;"><strong>Date:</strong></p>
                  <p style="margin: 0; color: #111827; font-size: 16px;">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>

              <div style="margin-bottom: 30px;">
                <h3 style="margin: 0 0 15px; color: #374151; font-size: 18px;">What This Means:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #4b5563; line-height: 1.8;">
                  <li>You cannot log in to your account</li>
                  <li>Your existing content remains visible to others</li>
                  <li>You cannot create new content or interact with the platform</li>
                  <li>This suspension is permanent until reviewed by an administrator</li>
                </ul>
              </div>

              <div style="margin-bottom: 30px;">
                <h3 style="margin: 0 0 15px; color: #374151; font-size: 18px;">Appeal Process:</h3>
                <p style="margin: 0 0 20px; color: #4b5563; line-height: 1.6;">
                  If you believe this suspension is an error or would like to provide additional context, please respond to this email with:
                </p>
                <div style="background: #eff6ff; border: 1px solid #dbeafe; border-radius: 6px; padding: 20px;">
                  <ol style="margin: 0; padding-left: 20px; color: #1e40af; line-height: 1.8;">
                    <li>Your full name and email address</li>
                    <li>Detailed explanation of the situation</li>
                    <li>Any evidence or context you'd like to share</li>
                    <li>Why you believe the suspension should be reviewed</li>
                  </ol>
                </div>
              </div>

              <div style="background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 20px;">
                <p style="margin: 0; color: #92400e; line-height: 1.6; font-size: 14px;">
                  <strong>Important:</strong> Please respond directly to this email. Your appeal will be reviewed by our administration team, and we'll get back to you within 24-48 hours.
                </p>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #f8f9fa; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
                This is an automated message from CampusConnect Administration
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} CampusConnect. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendEmail({
        to: user.email,
        subject: `Account Suspended - CampusConnect`,
        html: suspensionEmailHtml
      });

      console.log(`Suspension email sent to ${user.email}`);
    } catch (emailError) {
      console.warn('Failed to send suspension email:', emailError.message);
      // Don't fail the suspension if email fails
    }

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

    // Send unsuspension email to user
    try {
      const unsuspensionEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Account Restored - CampusConnect</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8f9fa;">
          <div style="max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 30px 40px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: 700;">CampusConnect</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Account Reinstated</p>
            </div>

            <div style="padding: 40px;">
              <div style="background: #dcfce7; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 8px; color: #166534; font-size: 20px;">Your account has been restored</h2>
                <p style="margin: 0; color: #166534; line-height: 1.6;">
                  You can now log back in and continue using CampusConnect.
                </p>
              </div>

              <p style="margin: 0 0 12px; color: #374151; line-height: 1.7;">
                Hello ${user.name || 'there'},
              </p>
              <p style="margin: 0 0 20px; color: #4b5563; line-height: 1.7;">
                After review, your account suspension has been lifted by the administration team.
              </p>

              <div style="background: #f3f4f6; border-radius: 6px; padding: 16px; margin-bottom: 20px;">
                <p style="margin: 0; color: #111827; font-size: 14px;"><strong>Restored on:</strong> ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>

              <p style="margin: 0; color: #6b7280; line-height: 1.7; font-size: 14px;">
                Thank you for helping keep CampusConnect safe for everyone.
              </p>
            </div>

            <div style="background: #f8f9fa; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 13px;">
                This is an automated message from CampusConnect Administration
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} CampusConnect. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendEmail({
        to: user.email,
        subject: 'Account Restored - CampusConnect',
        html: unsuspensionEmailHtml,
      });

      console.log(`Unsuspension email sent to ${user.email}`);
    } catch (emailError) {
      console.warn('Failed to send unsuspension email:', emailError.message);
      // Keep unsuspension successful even if email delivery fails.
    }

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
      'admin_moderation_shadow_ban',
      'admin_moderation_remove_content',
      'admin_moderation_warn_user',
      'admin_moderation_dismiss',
      'admin_moderation_no_action',
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
