'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import useStore from '../../../store/useStore';

export default function ProfilePage() {
  const { id } = useParams();
  const { user: me } = useStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [context, setContext] = useState('marketplace');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/users/${id}`);
        if (!cancelled && res.data.success) setProfile(res.data.data);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const submitRating = async (e) => {
    e.preventDefault();
    if (!me) {
      toast.error('Log in to rate');
      return;
    }
    try {
      await api.post(`/users/${id}/rate`, { score, comment, context });
      toast.success('Thanks — trust score updated');
      const res = await api.get(`/users/${id}`);
      if (res.data.success) setProfile(res.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit');
    }
  };

  if (loading) return <div className="container py-5">Loading…</div>;
  if (!profile) return <div className="container py-5">Profile not found.</div>;

  const isSelf = me && String(me._id) === String(profile._id || id);

  return (
    <div className="container py-4 py-md-5" style={{ maxWidth: 720 }}>
      <Link href="/" className="small">
        ← Home
      </Link>
      <div className="bg-white rounded-3 shadow-sm border p-4 mt-3">
        <h1 className="h3 mb-1">{profile.name}</h1>
        <p className="text-secondary mb-2">
          {profile.department} · Year {profile.year}
          {profile.location ? ` · ${profile.location}` : ''}
        </p>
        <p className="mb-3">
          <strong>Trust score:</strong> {profile.trustScore ?? '—'} ({profile.totalRatings ?? 0} ratings)
        </p>

        {!isSelf && me && (
          <form onSubmit={submitRating} className="border-top pt-3 mt-3">
            <h2 className="h6">Rate this member</h2>
            <p className="small text-secondary">Tied to marketplace, rides, borrowing, or tutoring context.</p>
            <div className="row g-2 mb-2">
              <div className="col-md-4">
                <label className="form-label small">Score</label>
                <select className="form-select form-select-sm" value={score} onChange={(e) => setScore(Number(e.target.value))}>
                  {[5, 4, 3, 2, 1].map((s) => (
                    <option key={s} value={s}>
                      {s} — excellent → poor
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-8">
                <label className="form-label small">Context</label>
                <select className="form-select form-select-sm" value={context} onChange={(e) => setContext(e.target.value)}>
                  <option value="marketplace">Marketplace</option>
                  <option value="ride">Ride / carpool</option>
                  <option value="borrow">Borrow</option>
                  <option value="tutoring">Tutoring</option>
                </select>
              </div>
            </div>
            <div className="mb-2">
              <label className="form-label small">Comment (optional)</label>
              <input className="form-control form-control-sm" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Submit rating
            </button>
          </form>
        )}

        {profile.ratingsReceived?.length > 0 && (
          <div className="border-top pt-3 mt-3">
            <h2 className="h6">Recent feedback</h2>
            <ul className="list-unstyled small mb-0">
              {profile.ratingsReceived
                .slice()
                .reverse()
                .slice(0, 8)
                .map((r, i) => (
                  <li key={i} className="mb-2 pb-2 border-bottom">
                    <strong>{r.score}/5</strong> · {r.context}
                    {r.by?.name && ` · from ${r.by.name}`}
                    {r.comment ? ` — ${r.comment}` : ''}
                  </li>
                ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
