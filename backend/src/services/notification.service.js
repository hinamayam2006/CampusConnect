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
    console.error('Notification email failed:', err.message);
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
    new: true,
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

  for (const item of emailQueue) {
    await deliverNotificationEmail(item.userId, { message: item.message });
  }
}
