'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import useRequireAuth from '../../../lib/useRequireAuth';
import {
  fetchMyBookings,
  cancelBooking,
  submitBookingReview,
  uploadPaymentProof,
  uploadImage,
} from '@/lib/apiRequests';
import BookingStatusBadge from '@/components/BookingStatusBadge';
import ReviewForm from '@/components/ReviewForm';
import ConfirmDialog from '@/components/ConfirmDialog';
import ImagePreviewModal from '@/components/ImagePreviewModal';
import { formatDate, getGreeting } from '@/lib/utils'; // L-2/L-3 FIX: use shared utils
import {
  CalendarCheck,
  Clock,
  CreditCard,
  GraduationCap,
  ChevronRight,
  X,
} from 'lucide-react';

import styles from './student.module.css';


export default function StudentDashboardPage() {
  const { isReady, user } = useRequireAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewed, setReviewed] = useState({});
  const [pendingCancelId, setPendingCancelId] = useState('');
  const [uploadingPaymentId, setUploadingPaymentId] = useState('');
  const [proofPreview, setProofPreview] = useState({ open: false, url: '' });

  useEffect(() => {
    if (!isReady) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchMyBookings();
        if (!cancelled) setItems(res.data?.items || []);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load bookings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isReady]);

  const handleCancel = async (bookingId) => {
    try {
      const res = await cancelBooking(bookingId);
      const updated = res.data || res;
      setItems((prev) => prev.map((b) => (b._id === bookingId ? updated : b)));
      toast.success('Booking cancelled');
    } catch (err) {
      toast.error(err?.message || 'Could not cancel booking');
    }
  };

  const handleReview = async (bookingId, payload) => {
    try {
      await submitBookingReview(bookingId, payload);
      setReviewed((prev) => ({ ...prev, [bookingId]: true }));
      toast.success('Review submitted');
    } catch (err) {
      toast.error(err?.message || 'Could not submit review');
      throw err;
    }
  };

  const handlePaymentUpload = async (bookingId, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB.');
      return;
    }
    setUploadingPaymentId(bookingId);
    try {
      const imgRes = await uploadImage(file, null, 'payment-proofs');
      const proofUrl = imgRes?.data?.url;
      if (!proofUrl) throw new Error('Upload failed');
      const res = await uploadPaymentProof(bookingId, { paymentProofUrl: proofUrl });
      const updatedBooking = res.data || res;
      setItems((prev) => prev.map((b) => (b._id === bookingId ? updatedBooking : b)));
      toast.success('Payment proof uploaded! Tutor will review it.');
      const fileInputs = document.querySelectorAll(`input[data-booking-id="${bookingId}"]`);
      fileInputs.forEach((input) => { input.value = ''; });
    } catch (err) {
      toast.error(err?.message || 'Could not upload payment proof');
    } finally {
      setUploadingPaymentId('');
    }
  };

  if (!isReady) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.skeletonCard}>
            <div className={styles.skeleton} style={{ width: '40%', height: 20, marginBottom: 10 }} />
            <div className={styles.skeleton} style={{ width: '25%', height: 14 }} />
          </div>
        </div>
      </div>
    );
  }

  const firstName = user?.name?.split(' ')[0] || 'Student';

  // Derived stats
  const totalBookings   = items.length;
  const activeSessions  = items.filter((b) => ['pending', 'confirmed'].includes(b.status)).length;
  const pendingPayments = items.filter((b) => b.paymentStatus === 'pending').length;

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* ── Greeting ── */}
        <div className={styles.greeting}>
          <p className={styles.greetingEyebrow}>Student Dashboard · {user?.department || 'NUST'}</p>
          <h1 className={styles.greetingTitle}>
            {getGreeting()}, <em>{firstName}.</em>
          </h1>
          <p className={styles.greetingSub}>
            Here&apos;s an overview of your tutoring activity.
          </p>
        </div>

        {/* ── Stats row ── */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}><CalendarCheck size={18} /></div>
            <div className={styles.statBody}>
              <div className={styles.statValue}>{totalBookings}</div>
              <div className={styles.statLabel}>Total Sessions</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}><Clock size={18} /></div>
            <div className={styles.statBody}>
              <div className={styles.statValue}>{activeSessions}</div>
              <div className={styles.statLabel}>Active Now</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIcon}><CreditCard size={18} /></div>
            <div className={styles.statBody}>
              <div className={styles.statValue}>{pendingPayments}</div>
              <div className={styles.statLabel}>Payments Due</div>
            </div>
          </div>
        </div>

        {/* ── CTA Banner ── */}
        <div className={styles.ctaBanner}>
          <div className={styles.ctaBannerText}>
            <p className={styles.ctaBannerTitle}>Find a Peer Tutor</p>
            <p className={styles.ctaBannerSub}>Browse verified tutors across all departments.</p>
          </div>
          <Link href="/tutors" className={styles.ctaBannerBtn}>
            <GraduationCap size={14} />
            Browse Tutors
          </Link>
        </div>

        {/* ── My Bookings ── */}
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>My Tutoring Sessions</h2>
          <Link href="/tutors" className={styles.sectionLink}>
            Find more <ChevronRight size={13} />
          </Link>
        </div>

        {error && <div className={styles.alertDanger}>{error}</div>}

        {loading ? (
          <div className={styles.bookingList}>
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={`sk-${idx}`} className={styles.skeletonCard}>
                <div className={styles.skeleton} style={{ width: '50%', height: 15, marginBottom: 9 }} />
                <div className={styles.skeleton} style={{ width: '35%', height: 11, marginBottom: 9 }} />
                <div className={styles.skeleton} style={{ width: '25%', height: 11 }} />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className={styles.emptyCard}>
            <div className={styles.emptyIcon}><GraduationCap size={20} /></div>
            <p className={styles.emptyTitle}>No sessions yet</p>
            <p className={styles.emptyText}>Book your first tutoring session to get started.</p>
            <Link href="/tutors" className={styles.btnPrimary} style={{ marginTop: '0.4rem' }}>
              Browse Tutors
            </Link>
          </div>
        ) : (
          <div className={styles.bookingList}>
            {items.map((booking) => {
              const canCancel = ['pending', 'confirmed'].includes(booking.status);
              const canReview = booking.status === 'completed' && !reviewed[booking._id];
              const isSelfReview = !!(
                user?._id && booking.tutor?._id &&
                String(user._id) === String(booking.tutor._id)
              );

              return (
                <div key={booking._id} className={styles.bookingCard}>
                  <div className={styles.bookingCardBody}>
                    <div className={styles.bookingCardTop}>
                      <h3 className={styles.bookingCourse}>{booking.course}</h3>
                      <BookingStatusBadge status={booking.status} />
                    </div>

                    <div className={styles.bookingMeta}>
                      <div className={styles.bookingMetaItem}>
                        <GraduationCap size={13} />
                        <strong>{booking.tutor?.name || 'Tutor'}</strong>
                      </div>
                      <div className={styles.itemSchedule}>
                        <Clock size={12} />
                        {formatDate(booking.scheduledAt)}
                      </div>
                      <div className={styles.bookingMetaItem}>
                        <Clock size={13} />
                        <span>{booking.durationMinutes || 0} mins</span>
                      </div>
                    </div>

                    {booking.studentMessage && (
                      <div className={styles.bookingMessage}>
                        &ldquo;{booking.studentMessage}&rdquo;
                      </div>
                    )}

                    {/* Payment section */}
                    {booking.paymentStatus && booking.paymentStatus !== 'not_required' && (
                      <div className={styles.paymentSection}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                          <span className={styles.paymentLabel}>Payment</span>
                          <span
                            className={styles.paymentBadge}
                            data-status={booking.paymentStatus}
                          >
                            {booking.paymentStatus === 'pending'  && 'Upload required'}
                            {booking.paymentStatus === 'uploaded' && 'Awaiting approval'}
                            {booking.paymentStatus === 'approved' && 'Approved ✓'}
                            {booking.paymentStatus === 'rejected' && 'Rejected'}
                          </span>
                        </div>
                        {booking.paymentStatus === 'rejected' && booking.tutorNote && (
                          <div style={{ fontSize: '0.78rem', color: '#991B1B', marginBottom: '0.3rem' }}>
                            Tutor note: {booking.tutorNote}
                          </div>
                        )}
                        {booking.paymentProofUrl && (
                          <div style={{ marginBottom: '0.4rem' }}>
                            <button
                              type="button"
                              className={styles.proofBtn}
                              onClick={() => setProofPreview({ open: true, url: booking.paymentProofUrl })}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={booking.paymentProofUrl}
                                alt="Payment proof"
                                className={styles.proofImg}
                              />
                            </button>
                          </div>
                        )}
                        {['pending', 'rejected'].includes(booking.paymentStatus) && (
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              data-booking-id={booking._id}
                              className={styles.fileInput}
                              disabled={uploadingPaymentId === booking._id}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePaymentUpload(booking._id, file);
                              }}
                            />
                            {uploadingPaymentId === booking._id && (
                              <div style={{ fontSize: '0.74rem', color: '#9E9E9E', marginTop: '0.25rem' }}>
                                Uploading…
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions row */}
                  {canCancel && (
                    <div className={styles.bookingActions}>
                      <button
                        className={styles.btnDanger}
                        onClick={() => setPendingCancelId(booking._id)}
                      >
                        <X size={13} />
                        Cancel Booking
                      </button>
                    </div>
                  )}

                  {/* Review zone */}
                  {canReview && (
                    <div className={styles.reviewZone}>
                      {isSelfReview ? (
                        <div className={styles.alertWarning}>
                          You cannot review your own tutoring profile.
                        </div>
                      ) : (
                        <ReviewForm onSubmit={(payload) => handleReview(booking._id, payload)} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingCancelId)}
        title="Cancel booking?"
        message="This action will cancel your booking request."
        confirmLabel="Yes, cancel"
        onCancel={() => setPendingCancelId('')}
        onConfirm={() => {
          handleCancel(pendingCancelId);
          setPendingCancelId('');
        }}
      />
      <ImagePreviewModal
        isOpen={proofPreview.open}
        imageUrl={proofPreview.url}
        onClose={() => setProofPreview({ open: false, url: '' })}
        title="Payment proof"
      />
    </div>
  );
}
