import Ticket from '../models/Ticket.model.js';
import User from '../models/User.model.js';
import { pushNotification } from '../services/notification.service.js';

export const submitFeedback = async (req, res) => {
  try {
    const { category, title, description, rating } = req.body;

    const ticket = await Ticket.create({
      type: 'feedback',
      category,
      title,
      description,
      rating,
      submittedBy: req.user._id,
      priority: 'low',
    });

    // Notify admins of new feedback
    const admins = await User.find({ role: 'admin' }).select('_id');
    await Promise.allSettled(
      admins.map(admin => pushNotification(admin._id, {
        type: 'new_ticket',
        message: `New Feedback Submitted: ${title}`,
        link: '/admin/reports',
      }))
    );

    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const submitIssueReport = async (req, res) => {
  try {
    const { category, title, description, targetId, targetType, images } = req.body;

    // Define priority based on category
    let priority = 'medium';
    if (category === 'Harassment' || category === 'Scam/Fraud') {
      priority = 'high';
    }

    const ticket = await Ticket.create({
      type: 'issue_report',
      category,
      title,
      description,
      targetId: targetId || null,
      targetType: targetType || '',
      images,
      submittedBy: req.user._id,
      priority,
    });

    // Notify admins of new issue report (High priority gets urgent message)
    const admins = await User.find({ role: 'admin' }).select('_id');
    const msgPrefix = priority === 'high' ? 'URGENT ISSUE: ' : 'New Issue Report: ';
    await Promise.allSettled(
      admins.map(admin => pushNotification(admin._id, {
        type: 'new_ticket',
        message: `${msgPrefix}${title}`,
        link: '/admin/reports',
      }))
    );

    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const listMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ submittedBy: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
      
    res.status(200).json({ success: true, data: { items: tickets } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
