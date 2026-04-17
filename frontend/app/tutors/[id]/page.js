'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import api from '../../../lib/api';
import useRequireAuth from '../../../lib/useRequireAuth';
import { fetchTutorReviews } from '../../../lib/apiRequests';
import { dayLabel } from '../../../lib/uiHelpers';
import StarRating from '../../../components/StarRating';
import ReviewsList from '../../../components/ReviewsList';
import styles from '../../tutoring/tutoring.module.css';

export default function TutorDetailPage() {
  const params = useParams();
  const tutorId = params?.id;
  const { isReady } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (!isReady) return undefined;
    if (!tutorId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const [res, reviewRes] = await Promise.all([
          api.get(`/tutors/${tutorId}`),
          fetchTutorReviews(tutorId),
        ]);
        if (!cancelled) {
          setProfile(res.data?.data || null);
          setReviews(reviewRes?.data?.items || []);
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || err.message || 'Failed to load tutor');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tutorId, isReady]);

  /* ---------- SKELETON ---------- */
  if (!isReady || loading) {
    return (
      <div className={styles.page}>
        <div className="container" style={{ maxWidth: 980 }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: 24 }}>
            <div className={styles.skeleton} style={{ width: 64, height: 64, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div className={styles.skeleton} style={{ width: '50%', height: 22, marginBottom: 8 }} />
              <div className={styles.skeleton} style={{ width: '35%', height: 14 }} />
            </div>
          </div>
          <div className="row g-3">
            <div className="col-12 col-lg-7">
              <div className={styles.skeletonCard} style={{ minHeight: 180 }}>
                <div className={styles.skeleton} style={{ width: '80%', height: 16, marginBottom: 10 }} />
                <div className={styles.skeleton} style={{ width: '100%', height: 14, marginBottom: 8 }} />
                <div className={styles.skeleton} style={{ width: '60%', height: 14 }} />
              </div>
            </div>
            <div className="col-12 col-lg-5">
              <div className={styles.skeletonCard} style={{ minHeight: 180 }}>
                <div className={styles.skeleton} style={{ width: '45%', height: 16, marginBottom: 10 }} />
                <div className={styles.skeleton} style={{ width: '70%', height: 14, marginBottom: 8 }} />
                <div className={styles.skeleton} style={{ width: '55%', height: 14 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- ERROR ---------- */
  if (error) {
    return (
      <div className={styles.page}>
        <div className="container" style={{ maxWidth: 980 }}>
          <div className={styles.alertDanger}>{error}</div>
          <Link href="/tutors" className={`${styles.btnSecondary} ${styles.btnSmall}`} style={{ marginTop: '0.75rem' }}>Back to tutors</Link>
        </div>
      </div>
    );
  }

  /* ---------- NOT FOUND ---------- */
  if (!profile) {
    return (
      <div className={styles.page}>
        <div className="container" style={{ maxWidth: 980 }}>
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>👤</div>
            <div className={styles.emptyStateTitle}>Tutor not found</div>
            <div className={styles.emptyStateText}>This profile may have been removed or the link is invalid.</div>
            <Link href="/tutors" className={`${styles.btnPrimary} ${styles.btnSmall}`}>Browse tutors</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={`container ${styles.container}`} style={{ maxWidth: 980 }}>
        <div className={styles.pageHeader}>
          <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start' }}>
            {profile.user?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.user.avatar} alt={profile.user?.name || 'Tutor'} className={styles.avatar} style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div className={styles.avatar} style={{ width: 64, height: 64, fontSize: '1.6rem' }}>
                {String(profile.user?.name || 'T').slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className={styles.pageTitle}>{profile.user?.name || 'Tutor'}</h1>
              <p className={styles.pageSubtitle}>
                {profile.user?.department || ''}{profile.user?.year ? ` · Year ${profile.user.year}` : ''}
                {profile.user?.location ? ` · ${profile.user.location}` : ''}
              </p>
              {profile.user?.trustScore !== undefined && (
                <span className={styles.badgeOlive} style={{ marginTop: '0.35rem' }}>
                  Trust score: {Number(profile.user.trustScore || 0).toFixed(0)}
                </span>
              )}
            </div>
          </div>
          <div className={styles.actionRow}>
            <Link href={`/tutors/${profile._id}/book`} className={`${styles.btnPrimary} ${styles.btnSmall}`}>Book session</Link>
            <Link href="/tutors" className={`${styles.btnSecondary} ${styles.btnSmall}`}>Browse tutors</Link>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-12 col-lg-7">
            <div className={styles.surfaceCardStrong}>
              <h5 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>About</h5>
              <p style={{ color: '#8a7e78', lineHeight: 1.65, marginBottom: '1rem' }}>{profile.bio || 'No bio provided.'}</p>

              <hr className={styles.divider} />

              <h6 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Expertise</h6>
              {(profile.courses || []).length > 0 ? (
                <div className={styles.tagRow}>
                  {(profile.courses || []).map((c) => (
                    <span key={c} className={styles.tag}>{c}</span>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#8a7e78', fontSize: '0.88rem' }}>No courses listed yet.</p>
              )}
            </div>
          </div>

          <div className="col-12 col-lg-5">
            <div className={styles.surfaceCardStrong}>
              <h5 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Details</h5>

              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Hourly rate</div>
                  <div className={styles.statValue}>{profile.isFree ? 'Free' : `Rs ${profile.hourlyRate}/hr`}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Rating</div>
                  <div style={{ marginTop: '0.35rem' }}>
                    <StarRating value={Number(profile.averageRating || 0)} disabled />
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.82rem', color: '#8a7e78' }}>
                      ({Number(profile.averageRating || 0).toFixed(1)})
                    </span>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Sessions completed</div>
                  <div className={styles.statValue}>{profile.totalSessions || 0}</div>
                </div>
              </div>

              <hr className={styles.divider} />

              <h6 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Availability</h6>
              {!profile.availabilitySlots?.length ? (
                <p style={{ color: '#8a7e78', fontSize: '0.88rem' }}>No availability slots provided yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.4rem', marginTop: '0.5rem' }}>
                  {profile.availabilitySlots.map((s, idx) => (
                    <div
                      key={`${s.day}-${s.startTime}-${idx}`}
                      className={styles.tag}
                      style={{ justifyContent: 'flex-start', fontSize: '0.82rem', padding: '0.3rem 0.65rem' }}
                    >
                      {dayLabel(s.day)} · {s.startTime} – {s.endTime}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '0.75rem' }}>
          <div className={styles.surfaceCardStrong}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h5 style={{ fontWeight: 700, marginBottom: '0.15rem' }}>Reviews</h5>
                <p style={{ color: '#8a7e78', fontSize: '0.88rem', margin: 0 }}>{reviews.length} student review{reviews.length === 1 ? '' : 's'}</p>
              </div>
            </div>
            <ReviewsList items={reviews} emptyText="No reviews for this tutor yet. Be the first after a session!" />
          </div>
        </div>
      </div>
    </div>
  );
}
