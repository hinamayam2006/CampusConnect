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
} from '../../../lib/apiRequests';
import BookingStatusBadge from '../../../components/BookingStatusBadge';
import ReviewForm from '../../../components/ReviewForm';
import ConfirmDialog from '../../../components/ConfirmDialog';
import ImagePreviewModal from '../../../components/ImagePreviewModal';

import styles from '../../tutoring/tutoring.module.css';

function formatSchedule(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue || '');
  return date.toLocaleString();
}

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
    return () => {
      cancelled = true;
    };
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
      const imgRes = await uploadImage(file);
      const proofUrl = imgRes?.data?.url;
      if (!proofUrl) throw new Error('Upload failed');
      const res = await uploadPaymentProof(bookingId, { paymentProofUrl: proofUrl });
      // Immediately sync state with backend response
      const updatedBooking = res.data || res;
      setItems((prev) => prev.map((b) => (b._id === bookingId ? updatedBooking : b)));
      toast.success('Payment proof uploaded! Tutor will review it.');
      // Clear the file input state cleanly
      const fileInputs = document.querySelectorAll(`input[data-booking-id="${bookingId}"]`);
      fileInputs.forEach((input) => {
        input.value = '';
      });
    } catch (err) {
      toast.error(err?.message || 'Could not upload payment proof');
    } finally {
      setUploadingPaymentId('');
    }
  };

  if (!isReady) {
    return <div className="container py-5 text-secondary">Loading session…</div>;
  }

  return (
    <div className={styles.page}>
      <div className={`container ${styles.container}`}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>My Bookings</h1>
            <p className={styles.pageSubtitle}>Track your tutoring sessions &amp; payments.</p>
          </div>
          <div className={styles.actionRow}>
            <Link href="/tutors" className={`${styles.btnPrimary} ${styles.btnSmall}`}>Find Tutors</Link>
          </div>
        </div>

        {error && <div className={styles.alertDanger}>{error}</div>}

        {loading ? (
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={`sk-${idx}`} className={styles.skeletonCard}>
                <div className={styles.skeleton} style={{ width: '50%', height: 16, marginBottom: 8 }} />
                <div className={styles.skeleton} style={{ width: '35%', height: 12, marginBottom: 8 }} />
                <div className={styles.skeleton} style={{ width: '25%', height: 12 }} />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📚</div>
            <div className={styles.emptyStateTitle}>No bookings yet</div>
            <div className={styles.emptyStateText}>Find a tutor to book your first session.</div>
            <Link href="/tutors" className={`${styles.btnPrimary} ${styles.btnSmall}`}>Browse Tutors</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {items.map((booking) => {
              const canCancel = ['pending', 'confirmed'].includes(booking.status);
              const canReview = booking.status === 'completed' && !reviewed[booking._id];
              const isSelfReview = !!(
                user?._id && booking.tutor?._id && String(user._id) === String(booking.tutor._id)
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
                        <span>👨‍🏫</span>
                        <strong>{booking.tutor?.name || 'Tutor'}</strong>
                      </div>
                      <div className={styles.bookingMetaItem}>
                        <span>📅</span>
                        <span>{formatSchedule(booking.scheduledAt)}</span>
                      </div>
                      <div className={styles.bookingMetaItem}>
                        <span>⏱</span>
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
                      <div className={styles.paymentSection} style={{ marginTop: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
                          <span className={styles.paymentLabel} style={{ margin: 0 }}>Payment</span>
                          <span
                            className={styles.bookingPaymentBadge}
                            data-status={booking.paymentStatus}
                          >
                            {booking.paymentStatus === 'pending' && 'Upload required'}
                            {booking.paymentStatus === 'uploaded' && 'Awaiting approval'}
                            {booking.paymentStatus === 'approved' && 'Approved ✓'}
                            {booking.paymentStatus === 'rejected' && 'Rejected'}
                          </span>
                        </div>
                        {booking.paymentStatus === 'rejected' && booking.tutorNote && (
                          <div style={{ fontSize: '0.82rem', color: 'var(--cc-danger)', marginBottom: '0.3rem' }}>
                            Tutor note: {booking.tutorNote}
                          </div>
                        )}
                        {booking.paymentProofUrl && (
                          <div style={{ marginBottom: '0.4rem' }}>
                            <button
                              type="button"
                              className={styles.bookingProofButton}
                              onClick={() => setProofPreview({ open: true, url: booking.paymentProofUrl })}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={booking.paymentProofUrl} alt="Payment proof" className={styles.bookingProofImage} style={{ maxWidth: 140, maxHeight: 140 }} />
                            </button>
                          </div>
                        )}
                        {['pending', 'rejected'].includes(booking.paymentStatus) && (
                          <div>
                            <input
                              type="file"
                              accept="image/*"
                              data-booking-id={booking._id}
                              className={styles.filterInput}
                              style={{ maxWidth: 240, borderRadius: 'var(--cc-radius-sm)' }}
                              disabled={uploadingPaymentId === booking._id}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePaymentUpload(booking._id, file);
                              }}
                            />
                            {uploadingPaymentId === booking._id && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--cc-muted)', marginTop: '0.25rem' }}>Uploading…</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  {(canCancel || canReview) && (
                    <div className={styles.bookingActions}>
                      {canCancel && (
                        <button
                          className={`${styles.btnOutlineDanger} ${styles.btnSmall}`}
                          onClick={() => setPendingCancelId(booking._id)}
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  )}

                  {canReview && (
                    <div style={{ padding: '0.75rem 1.15rem', borderTop: '1px solid var(--cc-border-light)' }}>
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
