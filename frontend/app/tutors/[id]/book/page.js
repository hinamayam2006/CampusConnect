'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import useRequireAuth from '../../../../lib/useRequireAuth';
import { fetchTutorById, createBooking, uploadPaymentProof, uploadImage } from '../../../../lib/apiRequests';
import { dayLabel } from '../../../../lib/uiHelpers';
import styles from '../../../tutoring/tutoring.module.css';

const MAX_MESSAGE = 1000;
const MIN_ADVANCE_MINUTES = 5;
const MIN_DURATION = 15;
const MAX_DURATION = 480;
const MAX_BOOKING_DAYS_AHEAD = 30;

function getMinDateTime() {
  return new Date(Date.now() + MIN_ADVANCE_MINUTES * 60 * 1000).toISOString().slice(0, 16);
}

function getMaxDateTime() {
  const d = new Date();
  d.setDate(d.getDate() + MAX_BOOKING_DAYS_AHEAD);
  return d.toISOString().slice(0, 16);
}

function computeEndTime(start, durationMin) {
  if (!start || !durationMin) return null;
  const d = new Date(start);
  if (Number.isNaN(d.getTime())) return null;
  d.setMinutes(d.getMinutes() + Number(durationMin));
  return d;
}

export default function BookTutorPage() {
  const { isReady, user } = useRequireAuth();
  const params = useParams();
  const tutorId = params?.id;
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [course, setCourse] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [message, setMessage] = useState('');
  const [paymentFile, setPaymentFile] = useState(null);
  const [paymentPreview, setPaymentPreview] = useState('');
  const [uploadingPayment, setUploadingPayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isReady || !tutorId) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchTutorById(tutorId);
        if (!cancelled) setProfile(res.data || null);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load tutor profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, tutorId]);

  const estimatedCost = useMemo(() => {
    if (!profile || profile.isFree) return 0;
    return (Number(durationMinutes || 0) / 60) * Number(profile.hourlyRate || 0);
  }, [profile, durationMinutes]);

  const endTime = useMemo(() => computeEndTime(scheduledAt, durationMinutes), [scheduledAt, durationMinutes]);

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!course.trim()) {
      toast.error('Please select a course.');
      return;
    }
    if (course === 'custom' && !message.trim()) {
      toast.error('Please describe the custom course in the message field.');
      return;
    }
    if (!scheduledAt) {
      toast.error('Please select a date and time for the session.');
      return;
    }

    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      toast.error('Invalid date and time. Please re-enter.');
      return;
    }

    const minDate = new Date(Date.now() + MIN_ADVANCE_MINUTES * 60 * 1000);
    if (scheduledDate <= minDate) {
      toast.error(`Session must be at least ${MIN_ADVANCE_MINUTES} minutes from now.`);
      return;
    }

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + MAX_BOOKING_DAYS_AHEAD);
    if (scheduledDate > maxDate) {
      toast.error(`You can only book up to ${MAX_BOOKING_DAYS_AHEAD} days in advance.`);
      return;
    }

    const durationValue = Number(durationMinutes || 0);
    if (!Number.isInteger(durationValue) || durationValue <= 0) {
      toast.error('Duration must be a positive whole number.');
      return;
    }
    if (durationValue < MIN_DURATION) {
      toast.error(`Minimum session duration is ${MIN_DURATION} minutes.`);
      return;
    }
    if (durationValue > MAX_DURATION) {
      toast.error(`Maximum session duration is ${MAX_DURATION / 60} hours.`);
      return;
    }
    if (message && message.length > MAX_MESSAGE) {
      toast.error(`Message must be ${MAX_MESSAGE} characters or less.`);
      return;
    }

    if (profile?.user && user) {
      const profileUserId = String(profile.user._id || profile.user.id || '');
      const currentUserId = String(user._id || user.id || '');
      if (profileUserId && currentUserId && profileUserId === currentUserId) {
        toast.error("You can't book your own tutoring profile.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        tutorProfileId: tutorId,
        course,
        scheduledAt: scheduledDate.toISOString(),
        durationMinutes: durationValue,
        studentMessage: message,
      };
      const bookingRes = await createBooking(payload);
      const bookingData = bookingRes.data || bookingRes;

      // If tutor is paid and student selected a payment file, upload proof
      if (!profile.isFree && paymentFile && bookingData?._id) {
        setUploadingPayment(true);
        try {
          const imgRes = await uploadImage(paymentFile);
          const proofUrl = imgRes?.data?.url;
          if (proofUrl) {
            await uploadPaymentProof(bookingData._id, { paymentProofUrl: proofUrl });
            toast.success('Booking sent with payment proof! Tutor will review and confirm.');
          } else {
            toast.success('Booking sent! Upload your payment screenshot from the dashboard.');
          }
        } catch (uploadErr) {
          toast.success('Booking created, but payment proof upload failed. You can re-upload from the dashboard.');
        } finally {
          setUploadingPayment(false);
        }
      } else if (!profile.isFree) {
        toast.success('Booking request sent! Please upload payment proof from the dashboard.');
      } else {
        toast.success('Booking request sent successfully! The tutor will be notified.');
      }
      router.push('/dashboard/student');
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) {
        toast.error('This time slot is already booked. Please choose another.');
      } else if (status === 422) {
        toast.error(err?.response?.data?.message || 'Invalid booking details. Please review and try again.');
      } else {
        toast.error(err?.message || 'Could not create booking. Please try again later.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- SKELETON ---------- */
  if (!isReady || loading) {
    return (
      <div className={styles.page}>
        <div className="container" style={{ maxWidth: 920 }}>
          <div style={{ marginBottom: 24 }}>
            <div className={styles.skeleton} style={{ width: '45%', height: 24, marginBottom: 10 }} />
            <div className={styles.skeleton} style={{ width: '30%', height: 14 }} />
          </div>
          <div className="row g-3">
            <div className="col-12 col-lg-6">
              <div className={styles.skeletonCard} style={{ minHeight: 320 }}>
                <div className={styles.skeleton} style={{ width: '60%', height: 16, marginBottom: 14 }} />
                <div className={styles.skeleton} style={{ width: '100%', height: 38, marginBottom: 14 }} />
                <div className={styles.skeleton} style={{ width: '100%', height: 38, marginBottom: 14 }} />
                <div className={styles.skeleton} style={{ width: '100%', height: 38 }} />
              </div>
            </div>
            <div className="col-12 col-lg-6">
              <div className={styles.skeletonCard} style={{ minHeight: 320 }}>
                <div className={styles.skeleton} style={{ width: '50%', height: 16, marginBottom: 14 }} />
                <div className={styles.skeleton} style={{ width: '70%', height: 14, marginBottom: 10 }} />
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
        <div className="container" style={{ maxWidth: 920 }}>
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
        <div className="container" style={{ maxWidth: 920 }}>
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
      <div className={`container ${styles.container}`} style={{ maxWidth: 920 }}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Book a session</h1>
            <p className={styles.pageSubtitle}>with {profile.user?.name || 'Tutor'} {!profile.isFree ? `· Rs ${profile.hourlyRate}/hr` : '· Free'}</p>
          </div>
          <div className={styles.actionRow}>
            <Link href={`/tutors/${tutorId}`} className={styles.btnSecondary}>Back to profile</Link>
            <Link href="/tutors" className={styles.btnSecondary}>Browse tutors</Link>
          </div>
        </div>

        <div className="row g-3">
          {/* ---------- FORM ---------- */}
          <div className="col-12 col-lg-6">
            <form onSubmit={onSubmit} className={styles.surfaceCardStrong}>
              <h5 style={{ fontWeight: 700, marginBottom: '1rem' }}>Session details</h5>

              {/* Course */}
              <div style={{ marginBottom: '1rem' }}>
                <label className={styles.formLabel}>
                  Course <span className={styles.formRequired}>*</span>
                </label>
                <select
                  className="form-select"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  style={{ borderRadius: 8, border: '1.5px solid #e5dfd7' }}
                  required
                >
                  <option value="">Select a course…</option>
                  {(profile.courses || []).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="custom">Custom course (describe in message)</option>
                </select>
              </div>

              {/* Date & time */}
              <div style={{ marginBottom: '1rem' }}>
                <label className={styles.formLabel}>
                  Date & time <span className={styles.formRequired}>*</span>
                </label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={getMinDateTime()}
                  max={getMaxDateTime()}
                  style={{ borderRadius: 8, border: '1.5px solid #e5dfd7' }}
                  required
                />
                <div className={styles.formHint}>
                  At least {MIN_ADVANCE_MINUTES} min from now · Up to {MAX_BOOKING_DAYS_AHEAD} days ahead
                </div>
              </div>

              {/* Duration */}
              <div style={{ marginBottom: '1rem' }}>
                <label className={styles.formLabel}>
                  Duration <span className={styles.formRequired}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="number"
                    min={MIN_DURATION}
                    max={MAX_DURATION}
                    step="15"
                    className="form-control"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    style={{ borderRadius: 8, border: '1.5px solid #e5dfd7', maxWidth: 120 }}
                    required
                  />
                  <span style={{ fontSize: '0.88rem', color: '#8a7e78' }}>minutes</span>
                </div>
                <div className={styles.formHint}>
                  {MIN_DURATION}–{MAX_DURATION} min (in 15-min steps)
                  {endTime && (
                    <span> · Ends at <strong>{endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></span>
                  )}
                </div>
              </div>

              {/* Payment info & proof upload */}
              {!profile.isFree && (
                <div style={{ marginBottom: '1rem' }}>
                  <div className={styles.paymentSection}>
                    <div className={styles.paymentLabel}>Payment information</div>
                    {profile.paymentMethod || profile.paymentAccountNumber ? (
                      <div style={{ background: '#fdfbf8', border: '1.5px solid #e5dfd7', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '0.75rem' }}>
                        {profile.paymentMethod && (
                          <div style={{ marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                            <strong>Method:</strong> {profile.paymentMethod}
                          </div>
                        )}
                        {profile.paymentAccountNumber && (
                          <div style={{ marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                            <strong>Account/Number:</strong> {profile.paymentAccountNumber}
                          </div>
                        )}
                        {profile.paymentInstructions && (
                          <div style={{ fontSize: '0.85rem', color: '#8a7e78', fontStyle: 'italic' }}>
                            {profile.paymentInstructions}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={styles.alertInfo} style={{ marginBottom: '0.75rem' }}>
                        Tutor has not provided payment details yet. You can still book and upload proof later.
                      </div>
                    )}

                    <label className={styles.formLabel}>
                      Payment screenshot {profile.paymentAccountNumber ? <span className={styles.formRequired}>*</span> : '(optional)'}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      className="form-control"
                      style={{ borderRadius: 8, border: '1.5px solid #e5dfd7' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error('Payment screenshot must be under 5MB.');
                            e.target.value = '';
                            return;
                          }
                          setPaymentFile(file);
                          setPaymentPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                    <div className={styles.formHint}>Upload a screenshot of your payment (max 5MB)</div>
                    {paymentPreview && (
                      <div style={{ marginTop: '0.5rem' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={paymentPreview} alt="Payment proof preview" style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8, border: '1px solid #e5dfd7' }} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Message */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className={styles.formLabel}>
                  Message {course === 'custom' ? <span className={styles.formRequired}>*</span> : '(optional)'}
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
                  placeholder="What do you need help with? Anything the tutor should prepare?"
                  style={{ borderRadius: 8, border: '1.5px solid #e5dfd7' }}
                />
                <div className={styles.formHint} style={{ textAlign: 'right' }}>
                  {message.length}/{MAX_MESSAGE}
                </div>
              </div>

              <button className={`${styles.btnPrimary} w-100`} disabled={submitting || uploadingPayment} type="submit">
                {uploadingPayment ? 'Uploading payment proof…' : submitting ? 'Sending request…' : 'Send booking request'}
              </button>
            </form>
          </div>

          {/* ---------- SUMMARY ---------- */}
          <div className="col-12 col-lg-6">
            <div className={styles.surfaceCardStrong}>
              <h5 style={{ fontWeight: 700, marginBottom: '1rem' }}>Session summary</h5>

              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Hourly rate</div>
                  <div className={styles.statValue}>{profile.isFree ? 'Free' : `Rs ${profile.hourlyRate}/hr`}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Estimated cost</div>
                  <div className={styles.statValue}>{profile.isFree ? 'Free' : `Rs ${estimatedCost.toFixed(0)}`}</div>
                </div>
                {!profile.isFree && (
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Payment</div>
                    <div className={styles.statValue}>{paymentFile ? '✓ Screenshot selected' : 'Not uploaded yet'}</div>
                  </div>
                )}
                {scheduledAt && endTime && (
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Session window</div>
                    <div className={styles.statValue} style={{ fontSize: '0.95rem' }}>
                      {new Date(scheduledAt).toLocaleDateString()} · {new Date(scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )}
              </div>

              <hr className={styles.divider} />

              <h6 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Tutor availability</h6>
              {!profile.availabilitySlots?.length ? (
                <p style={{ color: '#8a7e78', fontSize: '0.88rem' }}>No availability slots provided by the tutor.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.4rem' }}>
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

              <hr className={styles.divider} />

              <div className={styles.alertInfo}>
                Tutors typically respond within 24 hours. You'll receive a notification when they accept or suggest a new time.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
