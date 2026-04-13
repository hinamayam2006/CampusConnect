import User from '../models/User.model.js';

/**
 * Recalculates trust from embedded ratings (logic kept in one place like a stored procedure).
 */
export async function recalcTrustScore(userId, session = null) {
  let q = User.findById(userId).select('ratingsReceived');
  if (session) q = q.session(session);
  const user = await q;
  if (!user) return null;
  const ratings = user.ratingsReceived || [];
  if (!ratings.length) {
    const upd = User.findByIdAndUpdate(
      userId,
      { trustScore: 0, totalRatings: 0 },
      { new: true, ...(session ? { session } : {}) }
    );
    return upd;
  }
  const sum = ratings.reduce((acc, r) => acc + r.score, 0);
  const avg = Math.round((sum / ratings.length) * 10) / 10;
  return User.findByIdAndUpdate(
    userId,
    { trustScore: avg, totalRatings: ratings.length },
    { new: true, ...(session ? { session } : {}) }
  );
}
