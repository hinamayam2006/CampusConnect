import User from '../models/User.model.js';
import { isEmailConfigured, sendNotificationEmail } from '../utils/email.js';

function queueNotificationEmail(emailQueue, item) {
  if (Array.isArray(emailQueue)) {
    emailQueue.push(item);
  }
}

async function deliverNotificationEmail(userId, { message }) {
  if (!isEmailConfigured()) return;

  const user = await User.findById(userId).select('email name');
  if (!user?.email) return;

  try {
    await sendNotificationEmail({
      to: user.email,
      recipientName: user.name,
      message,
    });
  } catch (err) {
    // Log but don't throw — email is optional, don't block the main request
    console.error('Notification email failed (non-critical):', err.message);
  }
}

/**
 * Push an in-app notification (trigger-like side effect from marketplace / rides flows).
 */
export async function pushNotification(userId, { type, message, link, requestId, meta }, options = {}) {
  const notification = {
    type,
    message,
    link: link || '',
    read: false,
    createdAt: new Date(),
  };
  if (requestId) notification.requestId = requestId;
  if (meta) notification.meta = meta;

  const update = {
    $push: {
      notifications: {
        $each: [notification],
        $position: 0,
        $slice: 200,
      },
    },
  };
  const updatedUser = await User.findByIdAndUpdate(userId, update, {
    returnDocument: 'after',
    ...(options.session ? { session: options.session } : {}),
  });

  if (options.session) {
    queueNotificationEmail(options.emailQueue, { userId, message });
  } else {
    await deliverNotificationEmail(userId, { message });
  }

  const io = globalThis.__campusIo;
  if (io?.to) {
    io.to(`user_${userId}`).emit('notification_received', {
      ...notification,
      userId: String(userId),
    });
  }

  return updatedUser;
}

export async function flushQueuedNotificationEmails(emailQueue = []) {
  if (!Array.isArray(emailQueue) || !emailQueue.length) return;

  // Send emails in background without blocking the response
  for (const item of emailQueue) {
    try {
      await deliverNotificationEmail(item.userId, { message: item.message });
    } catch (err) {
      // Silently continue if email fails — don't block request
      console.error('Email delivery error (non-critical):', err.message);
    }
  }
}
