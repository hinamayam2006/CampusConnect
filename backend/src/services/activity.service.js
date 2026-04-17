import ActivityEvent from '../models/ActivityEvent.model.js';

export async function logActivity(payload, options = {}) {
  const doc = await ActivityEvent.create(
    [
      {
        userId: payload.userId,
        type: payload.type,
        refModel: payload.refModel,
        refId: payload.refId,
        meta: payload.meta || {},
      },
    ],
    options.session ? { session: options.session } : {}
  );
  return doc[0];
}
