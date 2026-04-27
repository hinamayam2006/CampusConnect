'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, BookOpen, Clock, Star, ArrowRight, AlertTriangle, Mail } from 'lucide-react';
import styles from '../../tutoring/tutoring.module.css';
import { fetchTutorById, fetchTutorReviews } from '../../../lib/apiRequests';
import useRequireAuth from '../../../lib/useRequireAuth';
import useStore from '../../../store/useStore';
import StarRating from '../../../components/StarRating';
import ReviewsList from '../../../components/ReviewsList';
import { initials } from '@/lib/utils'; // L-1 FIX: use shared util

const DAY_SHORT = { Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri', Saturday:'Sat', Sunday:'Sun' };


export default function TutorDetailPage() {
  useRequireAuth();
  const { id } = useParams();
  const { user } = useStore();
  const [tutor, setTutor]     = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const [tRes, rRes] = await Promise.allSettled([
          fetchTutorById(id),
          fetchTutorReviews(id),
        ]);
        if (tRes.status === 'fulfilled') {
          setTutor(tRes.value?.data?.data || tRes.value?.data || null);
        } else {
          setError('Could not load tutor profile.');
        }
        if (rRes.status === 'fulfilled') {
          setReviews(rRes.value?.data?.data || rRes.value?.data || []);
        }
      } catch {
        setError('Could not load tutor profile.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.skeleton} style={{ height: 300, marginBottom: '1rem' }} />
        <div className={styles.skeleton} style={{ height: 180 }} />
      </div>
    </div>
  );

  if (error || !tutor) return (
    <div className={styles.page}>
      <div className={styles.container} style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <p style={{ color: '#6B6B6B', marginBottom: '1rem' }}>{error || 'Tutor not found.'}</p>
        <Link href="/tutors" className={styles.btnSecondary}><ArrowLeft size={14} /> Back to Tutors</Link>
      </div>
    </div>
  );

  const subjects = tutor.subjects || tutor.courses || [];
  const hourlyRate = tutor.hourlyRate;
  const isFree = tutor.isFree || hourlyRate === 0;
  const slots = tutor.availabilitySlots || [];
  const isOwner = Boolean(user?._id && tutor?.user?._id && String(user._id) === String(tutor.user._id));

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/tutors" className={styles.btnSecondary} style={{ marginBottom: '1.25rem', display: 'inline-flex' }}>
          <ArrowLeft size={14} /> Back to Tutors
        </Link>

        <div className={styles.detailLayout}>
          {/* ── Left Column ── */}
          <div>
            <div className={styles.detailCard}>
              <div className={styles.detailCardHeader}>
                <div className={styles.detailAvatar}>
                  {tutor.user?.avatar
                    ? <img src={tutor.user.avatar} alt={tutor.user?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : initials(tutor.user?.name)
                  }
                </div>
                <div style={{ flex: 1 }}>
                  <h1 className={styles.detailName}>{tutor.user?.name || 'Tutor'}</h1>
                  <div className={styles.detailBadges}>
                    {tutor.user?.department && (
                      <span className={styles.detailBadge}><MapPin size={11} /> {tutor.user.department}</span>
                    )}
                    {isFree
                      ? <span className={styles.tutorFreeBadge}>Free Tutoring</span>
                      : hourlyRate > 0
                        ? <span className={styles.tutorPaidBadge}>PKR {hourlyRate}/hr</span>
                        : null
                    }
                    {tutor.averageRating > 0 && (
                      <span className={styles.detailBadge}>
                        <Star size={11} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                        {tutor.averageRating.toFixed(1)} ({tutor.reviewCount || 0} reviews)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.detailCardBody}>
                {tutor.bio && (
                  <>
                    <p className={styles.sectionLabel}>About</p>
                    <p className={styles.bioText}>{tutor.bio}</p>
                  </>
                )}

                {subjects.length > 0 && (
                  <>
                    <p className={styles.sectionTitle}><BookOpen size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />Subjects</p>
                    <div className={styles.subjectList}>
                      {subjects.map((s, i) => <span key={i} className={styles.subjectPill}>{s}</span>)}
                    </div>
                  </>
                )}

                {slots.length > 0 && (
                  <>
                    <p className={styles.sectionTitle}><Clock size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />Availability</p>
                    <div className={styles.slotGrid}>
                      {slots.map((s, i) => (
                        <span key={i} className={styles.slotPill}>
                          {DAY_SHORT[s.day] || s.day} {s.startTime}–{s.endTime}
                        </span>
                      ))}
                    </div>
                  </>
                )}

                {tutor.paymentMethod && (
                  <>
                    <p className={styles.sectionTitle}>Payment</p>
                    {/* L-7 FIX: paymentDetails doesn't exist in TutorProfile schema — correct field is paymentInstructions */}
                    <p className={styles.bioText}>{tutor.paymentMethod}{tutor.paymentInstructions ? ' — ' + tutor.paymentInstructions : ''}</p>
                  </>
                )}

                {tutor.contactEmail && (
                  <>
                    <p className={styles.sectionTitle}><Mail size={14} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />Contact</p>
                    <a href={`mailto:${tutor.contactEmail}`} className={styles.bioText} style={{ color: '#2563EB', textDecoration: 'none' }}>{tutor.contactEmail}</a>
                  </>
                )}
              </div>
            </div>

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className={styles.detailCard} style={{ marginTop: '1rem' }}>
                <div className={styles.detailCardBody}>
                  <p className={styles.formTitle}>Reviews</p>
                  <StarRating value={tutor.averageRating || 0} readOnly size={16} />
                  {/* M-1 FIX: ReviewsList expects 'items' prop, not 'reviews' — reviews never rendered */}
                  <ReviewsList items={reviews} />
                </div>
              </div>
            )}
          </div>

          {/* ── Right Column — Book Card ── */}
          <div>
            <div className={styles.bookingCard}>
              {isOwner ? (
                <>
                  <p className={styles.bookingTitle}>Your Tutor Profile</p>
                  <p style={{ fontSize: '0.85rem', color: '#6B6B6B', marginBottom: '1rem' }}>
                    Students can find and book sessions with you from this page.
                  </p>
                  <Link
                    href="/tutors/become"
                    className={styles.btnSecondary}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Edit Profile <ArrowRight size={14} />
                  </Link>
                  <Link
                    href="/tutoring"
                    className={styles.btnPrimary}
                    style={{ width: '100%', justifyContent: 'center', marginTop: '0.6rem' }}
                  >
                    My Sessions <ArrowRight size={14} />
                  </Link>
                </>
              ) : (
                <>
                  <p className={styles.bookingTitle}>Book a Session</p>

                  <div className={styles.rateRow}>
                    {isFree
                      ? <span className={styles.rateAmount} style={{ color: '#16A34A' }}>Free</span>
                      : hourlyRate > 0
                        ? <>
                            <span className={styles.rateAmount}>PKR {hourlyRate}</span>
                            <span className={styles.ratePer}>per hour</span>
                          </>
                        : <span className={styles.rateAmount} style={{ fontSize: '1rem', color: '#9E9E9E' }}>Rate on request</span>
                    }
                  </div>

                  {slots.length > 0 && (
                    <div style={{ margin: '1rem 0', padding: '0.75rem', background: '#F2EDE4', borderRadius: 10 }}>
                      <p className={styles.sectionLabel} style={{ marginBottom: '0.5rem' }}>Available slots</p>
                      <div className={styles.slotGrid}>
                        {slots.slice(0, 4).map((s, i) => (
                          <span key={i} className={styles.slotPill}>{DAY_SHORT[s.day] || s.day} {s.startTime}</span>
                        ))}
                        {slots.length > 4 && <span className={styles.slotPill}>+{slots.length - 4} more</span>}
                      </div>
                    </div>
                  )}

                  <Link
                    href={`/tutors/${id}/book`}
                    className={styles.btnPrimary}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Book Session <ArrowRight size={14} />
                  </Link>
                  <Link 
                    href={`/report-issue?targetId=${id}&targetType=TutorProfile`}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.4rem', 
                      fontSize: '0.75rem', 
                      color: '#DC2626', 
                      textDecoration: 'none', 
                      padding: '0.5rem', 
                      marginTop: '1rem',
                      border: '1px solid #FECACA', 
                      borderRadius: '8px',
                      background: '#FEF2F2'
                    }}
                  >
                    <AlertTriangle size={12} /> Report this tutor
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
