/**
 * admin.routes.js
 *
 * All routes: protect → isAdmin → handler
 * A normal student hitting any of these gets 403.
 */

import express from 'express';
import protect from '../middleware/auth.middleware.js';
import isAdmin from '../middleware/admin.middleware.js';
import {
  listAllTickets,
  updateTicket,
  listAllUsers,
  suspendUser,
  unsuspendUser,
  changeUserRole,
  deleteContent,
  getAnalytics,
  getAuditLog,
} from '../controllers/admin.controller.js';

const router = express.Router();

// Apply protect + isAdmin to EVERY route in this file
router.use(protect, isAdmin);

// ── Tickets ──
router.get('/tickets',       listAllTickets);
router.patch('/tickets/:id', updateTicket);

// ── Users ──
router.get('/users',                    listAllUsers);
router.patch('/users/:id/suspend',      suspendUser);
router.patch('/users/:id/unsuspend',    unsuspendUser);
router.patch('/users/:id/role',         changeUserRole);

// ── Content Moderation ──
router.delete('/content/:type/:id',     deleteContent);

// ── Analytics & Audit ──
router.get('/analytics',   getAnalytics);
router.get('/audit-log',   getAuditLog);

export default router;
