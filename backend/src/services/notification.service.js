import User from '../models/User.model.js';

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
  return User.findByIdAndUpdate(userId, update, {
    new: true,
    ...(options.session ? { session: options.session } : {}),
  });
}
