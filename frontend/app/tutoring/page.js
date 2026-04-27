'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { GraduationCap, Search, ArrowRight, Clock, Calendar, CheckCircle, XCircle, BookOpen, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './tutoring.module.css';
import useRequireAuth from '../../lib/useRequireAuth';
import api from '../../lib/api';
import {
  fetchMyTutorProfile,
  fetchTutorBookings,
  acceptBooking,
  rejectBooking,
  completeBooking,
  approvePayment,
  rejectPaymentProof,
  startBookingChat,
} from '../../lib/apiRequests';
import ImagePreviewModal from '../../components/ImagePreviewModal';

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function relativeTime(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + 'd ago';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function StatusBadge({ status }) {
  const cls = {
    pending:   styles.statusPending,
    approved:  styles.statusApproved,
    completed: styles.statusCompleted,
    cancelled: styles.statusCancelled,
    rejected:  styles.statusRejected,
  }[status] || styles.statusPending;
  return <span className={[styles.statusBadge, cls].join(' ')}>{status}</span>;
}

function SessionCard({ booking }) {
  const tutor = booking.tutor?.user || {};
  const name  = tutor.name || booking.tutor?.name || 'Tutor';
  const subjects = (booking.tutor?.subjects || booking.tutor?.courses || []).slice(0, 2).join(', ');
  const router = useRouter();
  const [chatLoading, setChatLoading] = useState(false);

  const handleMessageTutor = async (e) => {
    e.stopPropagation();
    setChatLoading(true);
    try {
      const res = await startBookingChat(booking._id);
      const requestId = res?.data?.requestId;
      if (requestId) {
        router.push(`/messages?requestId=${requestId}`);
      }
    } catch (err) {
      toast.error(err?.message || 'Could not open chat.');
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div 
      className={styles.sessionCard}
      style={{ flexDirection: 'column', gap: '0.5rem' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
        <div className={styles.sessionAvatar}>
          {tutor.avatar
            ? <Image src={tutor.avatar} alt={name} width={40} height={40} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials(name)
          }
        </div>
        <div className={styles.sessionBody}>
          <p className={styles.sessionName}>{name}</p>
          <div className={styles.sessionMeta}>
            {booking.course && <span>{booking.course}</span>}
            {subjects && !booking.course && <span>{subjects}</span>}
            {booking.scheduledAt && (
              <span><Calendar size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {new Date(booking.scheduledAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            )}
            {booking.durationMinutes && <span><Clock size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {booking.durationMinutes} min</span>}
            <span style={{ color: '#C8BFB5' }}>{relativeTime(booking.createdAt)}</span>
          </div>
        </div>
        <StatusBadge status={booking.status} />
      </div>
      {['pending', 'confirmed'].includes(booking.status) && (
        <button
          type="button"
          onClick={handleMessageTutor}
          disabled={chatLoading}
          style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 600, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}
        >
          <MessageSquare size={13} /> {chatLoading ? 'Opening…' : 'Message Tutor'}
        </button>
      )}
    </div>
  );
}

function TutorBookingCard({ booking, actionId, onAccept, onReject, onComplete, onApprovePayment, onRejectPayment }) {
  const student = booking.student || {};
  const name    = student.name || 'Student';
  const busy    = actionId === booking._id;
  const router = useRouter();
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  const handleMessageStudent = async (e) => {
    e.stopPropagation();
    setChatLoading(true);
    try {
      const res = await startBookingChat(booking._id);
      const requestId = res?.data?.requestId;
      if (requestId) {
        router.push(`/messages?requestId=${requestId}`);
      }
    } catch (err) {
      toast.error(err?.message || 'Could not open chat.');
    } finally {
      setChatLoading(false);
    }
  };

  const statusColors = {
    pending:   { bg: '#FFF7ED', color: '#B45309', label: 'Pending' },
    confirmed: { bg: '#ECFDF5', color: '#065F46', label: 'Confirmed' },
    approved:  { bg: '#ECFDF5', color: '#065F46', label: 'Confirmed' },
    completed: { bg: '#F0F9FF', color: '#0369A1', label: 'Completed' },
    cancelled: { bg: '#FEF2F2', color: '#991B1B', label: 'Cancelled' },
    rejected:  { bg: '#FEF2F2', color: '#991B1B', label: 'Rejected' },
  };
  const sc = statusColors[booking.status] || statusColors.pending;

  const payBadge = {
    pending:   { bg: '#FFF7ED', color: '#B45309', label: 'Payment Pending' },
    uploaded:  { bg: '#EFF6FF', color: '#1D4ED8', label: 'Receipt Uploaded – Review!' },
    approved:  { bg: '#ECFDF5', color: '#065F46', label: 'Payment Approved' },
    rejected:  { bg: '#FEF2F2', color: '#991B1B', label: 'Payment Rejected' },
    not_required: null,
  }[booking.paymentStatus];

  return (
    <div className={styles.sessionCard} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
        <div className={styles.sessionAvatar}>
          {student.avatar
            ? <Image src={student.avatar} alt={name} width={40} height={40} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            : name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
          }
        </div>
        <div className={styles.sessionBody} style={{ flex: 1 }}>
          <p className={styles.sessionName}>{name}</p>
          <div className={styles.sessionMeta}>
            {booking.course && <span><BookOpen size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {booking.course}</span>}
            {booking.scheduledAt && (
              <span><Calendar size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {new Date(booking.scheduledAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            )}
            {booking.durationMinutes && <span><Clock size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {booking.durationMinutes} min</span>}
          </div>
          {booking.studentMessage && (
            <p style={{ fontSize: '0.8rem', color: '#6B6B6B', marginTop: '0.25rem', fontStyle: 'italic' }}>&quot;{booking.studentMessage}&quot;</p>
          )}
        </div>
        <span style={{ background: sc.bg, color: sc.color, borderRadius: 99, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{sc.label}</span>
      </div>

      {['pending', 'confirmed', 'approved', 'completed'].includes(booking.status) && (
        <button
          type="button"
          onClick={handleMessageStudent}
          disabled={chatLoading}
          style={{ alignSelf: 'flex-end', marginTop: '-0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 600, background: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD', borderRadius: 8, padding: '4px 10px', cursor: 'pointer' }}
        >
          <MessageSquare size={12} /> {chatLoading ? 'Opening…' : 'Message Student'}
        </button>
      )}

      {/* Payment status banner */}
      {payBadge && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: payBadge.bg, color: payBadge.color, borderRadius: 8, padding: '6px 12px', fontSize: '0.8rem', fontWeight: 600, width: '100%' }}>
          <span>{payBadge.label}</span>
          {booking.paymentProofUrl && (
            <button
              onClick={() => setProofModalOpen(true)}
              style={{ marginLeft: 'auto', background: 'transparent', border: '1.5px solid currentColor', borderRadius: 6, padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: 'inherit' }}
            >
              View Receipt
            </button>
          )}
        </div>
      )}

      <ImagePreviewModal
        isOpen={proofModalOpen}
        imageUrl={booking.paymentProofUrl}
        onClose={() => setProofModalOpen(false)}
        title={`Payment proof — ${name}`}
      />

      {/* Action buttons */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
        {/* Payment approve/reject — highest priority when receipt uploaded */}
        {booking.paymentStatus === 'uploaded' && (
          <>
            <button
              onClick={() => onApprovePayment(booking._id)}
              disabled={busy}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: '#065F46', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}
            >
              <CheckCircle size={13} /> {busy ? 'Saving…' : 'Approve Payment'}
            </button>
            <button
              onClick={() => onRejectPayment(booking._id)}
              disabled={busy}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: '#fff', color: '#C0392B', border: '1.5px solid #C0392B', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}
            >
              <XCircle size={13} /> {busy ? 'Saving…' : 'Reject Payment'}
            </button>
          </>
        )}

        {/* Booking accept/reject for free sessions (no payment required) */}
        {booking.status === 'pending' && booking.paymentStatus === 'not_required' && (
          <>
            <button
              onClick={() => onAccept(booking._id)}
              disabled={busy}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: '#1A1A1A', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}
            >
              <CheckCircle size={13} /> {busy ? 'Saving…' : 'Accept'}
            </button>
            <button
              onClick={() => onReject(booking._id)}
              disabled={busy}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: '#fff', color: '#C0392B', border: '1.5px solid #C0392B', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}
            >
              <XCircle size={13} /> {busy ? 'Saving…' : 'Reject'}
            </button>
          </>
        )}

        {(booking.status === 'confirmed' || booking.status === 'approved') && (
          <button
            onClick={() => onComplete(booking._id)}
            disabled={busy}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', background: '#065F46', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}
          >
            <CheckCircle size={13} /> {busy ? 'Saving…' : 'Mark Complete'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function TutoringPage() {
  useRequireAuth();
  const [bookings, setBookings]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');

  // tutor side
  const [tutorProfile, setTutorProfile]   = useState(null);
  const [tutorBookings, setTutorBookings] = useState([]);
  const [tutorLoading, setTutorLoading]   = useState(true);
  const [actionId, setActionId]           = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      (async () => {
        setLoading(true);
        try {
          const res = await api.get('/bookings/mine?limit=50');
          setBookings(res?.data?.data?.items || res?.data?.data || []);
        } catch {
          setError('Could not load your bookings.');
        } finally {
          setLoading(false);
        }
      })();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const loadTutorBookings = useCallback(async () => {
    try {
      const res = await fetchTutorBookings();
      const items = res?.data?.items || res?.data?.data?.items || res?.data || [];
      setTutorBookings(Array.isArray(items) ? items : []);
    } catch { /* not a tutor or no bookings */ }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      (async () => {
        setTutorLoading(true);
        try {
          const res = await fetchMyTutorProfile();
          const profile = res?.data?.data || res?.data;
          if (profile?._id) {
            setTutorProfile(profile);
            await loadTutorBookings();
          }
        } catch { /* no tutor profile */ }
        finally { setTutorLoading(false); }
      })();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadTutorBookings]);

  const handleAccept = async (bookingId) => {
    setActionId(bookingId);
    try {
      await acceptBooking(bookingId);
      toast.success('Booking accepted!');
      await loadTutorBookings();
    } catch (err) {
      toast.error(err?.message || 'Could not accept booking.');
    } finally { setActionId(null); }
  };

  const handleReject = async (bookingId) => {
    setActionId(bookingId);
    try {
      await rejectBooking(bookingId);
      toast.success('Booking rejected.');
      await loadTutorBookings();
    } catch (err) {
      toast.error(err?.message || 'Could not reject booking.');
    } finally { setActionId(null); }
  };

  const handleComplete = async (bookingId) => {
    setActionId(bookingId);
    try {
      await completeBooking(bookingId);
      toast.success('Session marked as complete!');
      await loadTutorBookings();
    } catch (err) {
      toast.error(err?.message || 'Could not complete booking.');
    } finally { setActionId(null); }
  };

  const handleApprovePayment = async (bookingId) => {
    setActionId(bookingId);
    try {
      await approvePayment(bookingId);
      toast.success('Payment approved! Booking confirmed.');
      await loadTutorBookings();
    } catch (err) {
      toast.error(err?.message || 'Could not approve payment.');
    } finally { setActionId(null); }
  };

  const handleRejectPayment = async (bookingId) => {
    setActionId(bookingId);
    try {
      await rejectPaymentProof(bookingId, { tutorNote: 'Payment proof was not acceptable. Please re-upload.' });
      toast.success('Payment rejected. Student will be notified.');
      await loadTutorBookings();
    } catch (err) {
      toast.error(err?.message || 'Could not reject payment.');
    } finally { setActionId(null); }
  };

  const current = bookings.filter((b) => ['pending', 'approved', 'confirmed'].includes(b.status));
  const past    = bookings.filter((b) => ['completed', 'cancelled', 'rejected'].includes(b.status));

  const pendingRequests   = tutorBookings.filter((b) => b.status === 'pending' || b.paymentStatus === 'uploaded');
  const confirmedSessions = tutorBookings.filter((b) => ['confirmed', 'approved'].includes(b.status) && b.paymentStatus !== 'uploaded');
  const pastTutorSessions = tutorBookings.filter((b) => ['completed', 'cancelled', 'rejected'].includes(b.status));

  const skeletons = Array.from({ length: 3 }, (_, i) => (
    <div key={i} className={styles.skeleton} style={{ height: 80, marginBottom: '0.5rem' }} />
  ));

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.hero}>
          <span className={styles.kicker}>Peer Tutoring</span>
          <h1 className={styles.heroTitle}>My Tutoring Sessions</h1>
          <p className={styles.heroDesc}>Track your current bookings and past sessions. Connect with tutors to get help on any subject.</p>
          <div className={styles.heroActions}>
            <Link href="/tutors" className={styles.btnPrimary}><Search size={15} /> Find a Tutor <ArrowRight size={14} /></Link>
            {tutorProfile
              ? <Link href={'/tutors/' + tutorProfile._id} className={styles.btnSecondary}><GraduationCap size={15} /> My Tutor Profile</Link>
              : <Link href="/tutors/become" className={styles.btnSecondary}><GraduationCap size={15} /> Become a Tutor</Link>
            }
          </div>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        {/* ── TUTOR PANEL ── */}
        {!tutorLoading && tutorProfile && (
          <div style={{ marginBottom: '3rem' }}>
            <p className={styles.sectionTitle} style={{ marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <GraduationCap size={18} /> Tutor Dashboard
            </p>
            <p style={{ color: '#8B8580', fontSize: '0.83rem', marginBottom: '1.25rem' }}>
              Manage booking requests from students for your sessions.
            </p>

            {/* Pending Requests */}
            <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.6rem', color: '#1A1A1A' }}>
              Pending Requests {pendingRequests.length > 0 && <span style={{ background: '#E8553E', color: '#fff', borderRadius: 99, padding: '1px 8px', fontSize: '0.75rem', marginLeft: 6 }}>{pendingRequests.length}</span>}
            </p>
            {pendingRequests.length === 0 ? (
              <div className={styles.emptyState} style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                <BookOpen size={26} className={styles.emptyIcon} />
                <p className={styles.emptyStateTitle} style={{ fontSize: '0.95rem' }}>No pending requests</p>
                <p className={styles.emptyStateText}>When students book your sessions, they will appear here.</p>
              </div>
            ) : (
              <div style={{ marginBottom: '1.5rem' }}>
                {pendingRequests.map((b) => (
                  <TutorBookingCard
                    key={b._id}
                    booking={b}
                    actionId={actionId}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onComplete={handleComplete}
                    onApprovePayment={handleApprovePayment}
                    onRejectPayment={handleRejectPayment}
                  />
                ))}
              </div>
            )}

            {/* Confirmed / Upcoming */}
            {confirmedSessions.length > 0 && (
              <>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.6rem', color: '#1A1A1A' }}>Upcoming Sessions</p>
                <div style={{ marginBottom: '1.5rem' }}>
                  {confirmedSessions.map((b) => (
                    <TutorBookingCard
                      key={b._id}
                      booking={b}
                      actionId={actionId}
                      onAccept={handleAccept}
                      onReject={handleReject}
                      onComplete={handleComplete}
                      onApprovePayment={handleApprovePayment}
                      onRejectPayment={handleRejectPayment}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Past Tutor Sessions */}
            {pastTutorSessions.length > 0 && (
              <>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.6rem', color: '#6B6B6B' }}>Past Sessions (as Tutor)</p>
                <div style={{ marginBottom: '1.5rem' }}>
                  {pastTutorSessions.slice(0, 5).map((b) => (
                    <TutorBookingCard
                      key={b._id}
                      booking={b}
                      actionId={actionId}
                      onAccept={handleAccept}
                      onReject={handleReject}
                      onComplete={handleComplete}
                      onApprovePayment={handleApprovePayment}
                      onRejectPayment={handleRejectPayment}
                    />
                  ))}
                </div>
              </>
            )}

            <div style={{ borderBottom: '1px solid #E8E3DE', marginBottom: '2.5rem' }} />
          </div>
        )}

        {/* Quick action cards */}
        <div className={styles.actionGrid} style={{ marginBottom: '2.5rem' }}>
          <Link href="/tutors" className={styles.actionCard}>
            <span className={styles.actionCardBadge}>Browse</span>
            <p className={styles.actionCardTitle}>Find a Tutor</p>
            <p className={styles.actionCardDesc}>Search by subject, day, or rating to find your perfect study partner.</p>
            <span className={styles.actionCardHint}>Browse tutors <ArrowRight size={12} /></span>
          </Link>
          <Link href="/tutors/become" className={styles.actionCard}>
            <span className={styles.actionCardBadge}>Teach</span>
            <p className={styles.actionCardTitle}>Become a Tutor</p>
            <p className={styles.actionCardDesc}>Share your expertise and help fellow students while earning.</p>
            <span className={styles.actionCardHint}>Set up profile <ArrowRight size={12} /></span>
          </Link>
        </div>

        {/* ── STUDENT: Active Sessions ── */}
        <p className={styles.sectionTitle} style={{ marginBottom: '0.75rem' }}>My Bookings (as Student)</p>
        {loading ? skeletons : current.length === 0 ? (
          <div className={styles.emptyState} style={{ padding: '2rem', marginBottom: '2rem' }}>
            <GraduationCap size={32} className={styles.emptyIcon} />
            <h3 className={styles.emptyStateTitle} style={{ fontSize: '1rem' }}>No active sessions</h3>
            <p className={styles.emptyStateText} style={{ marginBottom: '1rem' }}>Find a tutor and book your first session.</p>
            <Link href="/tutors" className={styles.btnPrimary}><Search size={14} /> Find a Tutor</Link>
          </div>
        ) : (
          <div style={{ marginBottom: '2rem' }}>
            {current.map((b) => <SessionCard key={b._id} booking={b} />)}
          </div>
        )}

        {/* Past Sessions (as student) */}
        {!loading && past.length > 0 && (
          <>
            <p className={styles.sectionTitle} style={{ marginBottom: '0.75rem' }}>Past Sessions (as Student)</p>
            <div style={{ marginBottom: '2rem' }}>
              {past.slice(0, 10).map((b) => <SessionCard key={b._id} booking={b} />)}
            </div>
          </>
        )}

        {/* How it works */}
        <p className={styles.sectionTitle} style={{ marginBottom: '0.75rem' }}>How It Works</p>
        <div className={styles.stepsRow}>
          <div className={styles.stepCard}>
            <p className={styles.stepNumber}>01</p>
            <p className={styles.stepTitle}>Find a Tutor</p>
            <p className={styles.stepDesc}>Browse student tutors by subject, availability, and price.</p>
          </div>
          <div className={styles.stepCard}>
            <p className={styles.stepNumber}>02</p>
            <p className={styles.stepTitle}>Book a Session</p>
            <p className={styles.stepDesc}>Pick a time slot, describe what you need, and submit your booking.</p>
          </div>
          <div className={styles.stepCard}>
            <p className={styles.stepNumber}>03</p>
            <p className={styles.stepTitle}>Learn Together</p>
            <p className={styles.stepDesc}>Meet your tutor, complete the session, and leave a review.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
