'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import useRequireAuth from '../../../lib/useRequireAuth';
import {
  fetchTutorBookings,
  acceptBooking,
  rejectBooking,
  completeBooking,
  approvePayment,
  rejectPaymentProof,
  deleteBooking,
} from '../../../lib/apiRequests';
import BookingStatusBadge from '../../../components/BookingStatusBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import styles from '../../tutoring/tutoring.module.css';

function formatSchedule(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return String(dateValue || '');
  return date.toLocaleString();
}

export default function TutorDashboardPage() {
  const { isReady } = useRequireAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [pendingAction, setPendingAction] = useState({ type: '', bookingId: '' });
  const [query, setQuery] = useState('');
  const [proofPreview, setProofPreview] = useState({ open: false, url: '' });

  useEffect(() => {
    if (!isReady) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchTutorBookings();
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

  const updateBooking = (bookingId, updated) => {
    setItems((prev) => prev.map((b) => (b._id === bookingId ? updated : b)));
  };

  const handleAccept = async (bookingId) => {
    try {
      const res = await acceptBooking(bookingId);
      updateBooking(bookingId, res.data || res);
      toast.success('Booking accepted');
    } catch (err) {
      toast.error(err?.message || 'Could not accept booking');
    }
  };

  const handleReject = async (bookingId) => {
    try {
      const res = await rejectBooking(bookingId);
      updateBooking(bookingId, res.data || res);
      toast.success('Booking rejected');
    } catch (err) {
      toast.error(err?.message || 'Could not reject booking');
    }
  };

  const handleComplete = async (bookingId) => {
    try {
      const res = await completeBooking(bookingId);
      updateBooking(bookingId, res.data || res);
      toast.success('Booking marked complete');
    } catch (err) {
      toast.error(err?.message || 'Could not complete booking');
    }
  };

  const handleApprovePayment = async (bookingId) => {
    try {
      const res = await approvePayment(bookingId);
      updateBooking(bookingId, res.data || res);
      toast.success('Payment approved – booking confirmed!');
    } catch (err) {
      toast.error(err?.message || 'Could not approve payment');
    }
  };

  const handleRejectPayment = async (bookingId) => {
    try {
      const res = await rejectPaymentProof(bookingId);
      updateBooking(bookingId, res.data || res);
      toast.success('Payment rejected – student will be notified to re-upload');
    } catch (err) {
      toast.error(err?.message || 'Could not reject payment');
    }
  };

  const handleDelete = async (bookingId) => {
    try {
      await deleteBooking(bookingId);
      setItems((prev) => prev.filter((b) => b._id !== bookingId));
      toast.success('Session deleted');
    } catch (err) {
      toast.error(err?.message || 'Could not delete session');
    }
  };

  const openProofPreview = (url) => {
    setProofPreview({ open: true, url });
  };

  const closeProofPreview = () => {
    setProofPreview({ open: false, url: '' });
  };

  const filteredItems = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== 'all' && item.status !== filter) return false;
      if (!trimmed) return true;
      const course = String(item.course || '').toLowerCase();
      const student = String(item.student?.name || '').toLowerCase();
      return course.includes(trimmed) || student.includes(trimmed);
    });
  }, [items, filter, query]);

  const stats = useMemo(() => {
    const pending = items.filter((x) => x.status === 'pending').length;
    const confirmed = items.filter((x) => x.status === 'confirmed').length;
    const completed = items.filter((x) => x.status === 'completed').length;
    const cancelled = items.filter((x) => x.status === 'cancelled').length;
    const awaitingPayment = items.filter((x) => x.paymentStatus === 'uploaded').length;
    return { pending, confirmed, completed, cancelled, awaitingPayment, total: items.length };
  }, [items]);

  if (!isReady) {
    return <div className="container py-5 text-secondary">Loading session…</div>;
  }

  return (
    <div className={styles.page}>
      <div className={`container ${styles.container}`}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Tutor Dashboard</h1>
            <p className={styles.pageSubtitle}>Manage your sessions, bookings &amp; payments.</p>
          </div>
          <div className={styles.actionRow}>
            <Link href="/tutors/become" className={`${styles.btnPrimary} ${styles.btnSmall}`}>Edit Profile</Link>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className={styles.statGrid} style={{ marginBottom: '1.25rem' }}>
            <div className={styles.statCard}>
              <div className={styles.statValue} style={{ color: 'var(--cc-ink)' }}>{stats.total}</div>
              <div className={styles.statLabel}>Total Sessions</div>
            </div>
            <div className={styles.statCard} style={{ borderLeft: '3px solid var(--cc-warning)' }}>
              <div className={styles.statValue} style={{ color: 'var(--cc-warning)' }}>{stats.pending}</div>
              <div className={styles.statLabel}>Pending</div>
            </div>
            <div className={styles.statCard} style={{ borderLeft: '3px solid var(--cc-primary)' }}>
              <div className={styles.statValue} style={{ color: 'var(--cc-primary)' }}>{stats.confirmed}</div>
              <div className={styles.statLabel}>Confirmed</div>
            </div>
            <div className={styles.statCard} style={{ borderLeft: '3px solid var(--cc-mint, var(--cc-success))' }}>
              <div className={styles.statValue} style={{ color: 'var(--cc-mint, var(--cc-success))' }}>{stats.completed}</div>
              <div className={styles.statLabel}>Completed</div>
            </div>
            {stats.awaitingPayment > 0 && (
              <div className={styles.statCard} style={{ borderLeft: '3px solid #e65100', background: '#fff8f0' }}>
                <div className={styles.statValue} style={{ color: '#e65100' }}>{stats.awaitingPayment}</div>
                <div className={styles.statLabel}>Payment Review</div>
              </div>
            )}
          </div>
        )}

        {/* Filter bar */}
        <div className={styles.surfaceCard} style={{ marginBottom: '0.75rem', padding: '0.75rem 1rem' }}>
          <div className={styles.filterBar}>
            <input
              className={styles.searchInput}
              placeholder="Search student or course…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className={styles.filterGroup}>
              {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.filterChip} ${filter === value ? styles.filterChipActive : ''}`}
                  onClick={() => setFilter(value)}
                >
                  {value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <div className={styles.alertDanger}>{error}</div>}

        {/* Bookings list */}
        {loading ? (
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeleton} style={{ width: '55%', height: 16, marginBottom: 8 }} />
                <div className={styles.skeleton} style={{ width: '35%', height: 12, marginBottom: 8 }} />
                <div className={styles.skeleton} style={{ width: '25%', height: 12 }} />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📋</div>
            <div className={styles.emptyStateTitle}>
              {items.length === 0 ? 'No bookings yet' : 'No bookings match this filter'}
            </div>
            <div className={styles.emptyStateText}>
              {items.length === 0
                ? 'Share your profile to start receiving booking requests.'
                : 'Try a different filter or search term.'}
            </div>
            {items.length === 0 && (
              <Link href="/tutors/become" className={`${styles.btnPrimary} ${styles.btnSmall}`}>Update Profile</Link>
            )}
          </div>
        ) : (
          <div className={styles.cardGrid}>
            {filteredItems.map((booking) => (
              <div key={booking._id} className={styles.bookingCard}>
                <div className={styles.bookingCardBody}>
                  <div className={styles.bookingCardTop}>
                    <h3 className={styles.bookingCourse}>{booking.course}</h3>
                    <BookingStatusBadge status={booking.status} />
                  </div>

                  <div className={styles.bookingMeta}>
                    <div className={styles.bookingMetaItem}>
                      <span>👤</span>
                      <strong>{booking.student?.name || 'Student'}</strong>
                    </div>
                    <div className={styles.bookingMetaItem}>
                      <span>📅</span>
                      <span>{formatSchedule(booking.scheduledAt)}</span>
                    </div>
                    <div className={styles.bookingMetaItem}>
                      <span>⏱</span>
                      <span>{booking.durationMinutes || 0} mins</span>
                    </div>
                    {booking.paymentStatus && booking.paymentStatus !== 'not_required' && (
                      <div className={styles.bookingMetaItem}>
                        <span>💳</span>
                        <span
                          className={styles.bookingPaymentBadge}
                          data-status={booking.paymentStatus}
                        >
                          {booking.paymentStatus === 'pending' && 'Awaiting upload'}
                          {booking.paymentStatus === 'uploaded' && 'Review needed'}
                          {booking.paymentStatus === 'approved' && 'Approved ✓'}
                          {booking.paymentStatus === 'rejected' && 'Rejected'}
                        </span>
                      </div>
                    )}
                  </div>

                  {booking.studentMessage && (
                    <div className={styles.bookingMessage}>
                      &ldquo;{booking.studentMessage}&rdquo;
                    </div>
                  )}
                </div>

                {/* Payment proof section */}
                {booking.paymentProofUrl && ['uploaded', 'approved'].includes(booking.paymentStatus) && (
                  <div className={styles.bookingProofSection}>
                    <div className={styles.bookingProofLabel}>Payment Proof</div>
                    <button
                      type="button"
                      className={styles.bookingProofButton}
                      onClick={() => openProofPreview(booking.paymentProofUrl)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={booking.paymentProofUrl}
                        alt="Payment proof"
                        className={styles.bookingProofImage}
                      />
                    </button>
                    {booking.paymentStatus === 'uploaded' && (
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                        <button
                          className={`${styles.btnSuccess} ${styles.btnSmall}`}
                          onClick={() => setPendingAction({ type: 'approvePayment', bookingId: booking._id })}
                        >
                          ✓ Approve
                        </button>
                        <button
                          className={`${styles.btnOutlineDanger} ${styles.btnSmall}`}
                          onClick={() => setPendingAction({ type: 'rejectPayment', bookingId: booking._id })}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                {(booking.status === 'pending' && booking.paymentStatus !== 'uploaded') && (
                  <div className={styles.bookingActions}>
                    <button
                      className={`${styles.btnPrimary} ${styles.btnSmall}`}
                      onClick={() => setPendingAction({ type: 'accept', bookingId: booking._id })}
                    >
                      Accept
                    </button>
                    <button
                      className={`${styles.btnOutlineDanger} ${styles.btnSmall}`}
                      onClick={() => setPendingAction({ type: 'reject', bookingId: booking._id })}
                    >
                      Reject
                    </button>
                  </div>
                )}
                {booking.status === 'confirmed' && (
                  <div className={styles.bookingActions}>
                    <button
                      className={`${styles.btnSuccess} ${styles.btnSmall}`}
                      onClick={() => setPendingAction({ type: 'complete', bookingId: booking._id })}
                    >
                      ✓ Mark Complete
                    </button>
                  </div>
                )}
                {booking.status !== 'completed' && (
                  <div className={styles.bookingActions} style={{ marginTop: '0.25rem' }}>
                    <button
                      className={`${styles.btnDanger} ${styles.btnSmall}`}
                      onClick={() => setPendingAction({ type: 'delete', bookingId: booking._id })}
                    >
                      🗑 Delete Session
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(pendingAction.bookingId)}
        title={pendingAction.type === 'delete' ? 'Delete session?' : 'Confirm action'}
        message={pendingAction.type === 'delete'
          ? 'This will permanently remove the session and notify the student. This cannot be undone.'
          : 'Please confirm this booking update.'}
        confirmLabel={pendingAction.type === 'delete' ? 'Delete' : 'Confirm'}
        onCancel={() => setPendingAction({ type: '', bookingId: '' })}
        onConfirm={() => {
          if (pendingAction.type === 'accept') handleAccept(pendingAction.bookingId);
          if (pendingAction.type === 'reject') handleReject(pendingAction.bookingId);
          if (pendingAction.type === 'complete') handleComplete(pendingAction.bookingId);
          if (pendingAction.type === 'approvePayment') handleApprovePayment(pendingAction.bookingId);
          if (pendingAction.type === 'rejectPayment') handleRejectPayment(pendingAction.bookingId);
          if (pendingAction.type === 'delete') handleDelete(pendingAction.bookingId);
          setPendingAction({ type: '', bookingId: '' });
        }}
      />
      {proofPreview.open && proofPreview.url && (
        <div
          className={styles.proofModalOverlay}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeProofPreview();
          }}
        >
          <div className={styles.proofModal}>
            <div className={styles.proofModalHeader}>
              <span>Payment proof</span>
              <button
                type="button"
                className={`${styles.btnSecondary} ${styles.btnSmall}`}
                onClick={closeProofPreview}
              >
                Close
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proofPreview.url}
              alt="Payment proof full view"
              className={styles.proofModalImage}
            />
            <div className={styles.proofModalActions}>
              <a
                href={proofPreview.url}
                className={`${styles.btnSecondary} ${styles.btnSmall}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open full
              </a>
              <a
                href={proofPreview.url}
                className={`${styles.btnPrimary} ${styles.btnSmall}`}
                download
              >
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

