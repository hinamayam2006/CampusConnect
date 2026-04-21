'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import api from '../../../lib/api';
import useStore from '../../../store/useStore';

export default function ProfilePage() {
  const { id } = useParams();
  const { user: me } = useStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="container py-5">Loading…</div>;
  if (!profile) return <div className="container py-5">Profile not found.</div>;

  const isSelf = me && String(me._id) === String(profile._id || id);

  return (
    <div className="container py-4 py-md-5" style={{ maxWidth: 720 }}>
      <Link href="/" className="small">
        ← Home
      </Link>
      <div className="bg-white rounded-3 shadow-sm border p-4 mt-3">
        <div className="d-flex align-items-center gap-3 mb-3">
          {profile.avatar ? (
            <Image
              src={profile.avatar}
              alt={profile.name || 'User avatar'}
              width={72}
              height={72}
              unoptimized
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e9ecef' }}
            />
          ) : (
            <div
              className="d-flex align-items-center justify-content-center"
              style={{ width: 72, height: 72, borderRadius: '50%', background: '#e9f2ff', fontWeight: 700, color: '#0d6efd' }}
            >
              {String(profile.name || 'U').slice(0, 1).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="h3 mb-1">{profile.name}</h1>
            <p className="text-secondary mb-0">
              {profile.department} · Year {profile.year}
            </p>
          </div>
        </div>

        {isSelf && (
          <div className="border-top pt-3 mt-3">
            <Link href="/profile/edit" className="btn btn-primary btn-sm">Edit Profile</Link>
          </div>
        )}
      </div>
    </div>
  );
}
