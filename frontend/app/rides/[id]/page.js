// rides/[id]/page.js
 'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowRight, ChevronLeft, Clock, Car, Users, RotateCcw, AlertTriangle } from 'lucide-react';
import UnifiedReportModal from '../../../components/UnifiedReportModal';
import api from '../../../lib/api';
import { createRequest } from '../../../lib/apiRequests';
import useStore from '../../../store/useStore';
import styles from '../rides-pages.module.css';

export default function RideDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useStore();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [seatsRequested, setSeatsRequested] = useState(1);
  const [requesting, setRequesting] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/rides/${id}`);
        if (!cancelled && res.data.success) setRide(res.data.data);
      } catch {
        if (!cancelled) setRide(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const join = async () => {
    if (!user) {
      toast.error('Log in to request this ride');
      router.push('/login');
      return;
    }
    if (!ride) {
      toast.error('Ride not loaded yet');
      return;
    }
    try {
      setRequesting(true);
      await createRequest('Ride', id, seatsRequested, message.trim());
      toast.success('Ride request sent to the driver');
      setRide((current) => (current ? { ...current, hasRequested: true } : current));
      setMessage('');
    } catch (err) {
      toast.error(err.response?.message || err.message || 'Could not request this ride');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.detailPage}>
        <div className={styles.detailGrid}>
          <div>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.detailCard} style={{ marginBottom: '1rem' }}>
                <div className={styles.skeletonLine} style={{ height: i === 1 ? 28 : 18, width: i === 1 ? '70%' : '50%' }} />
              </div>
            ))}
          </div>
          <div className={styles.actionCard}>
            <div className={styles.skeletonLine} style={{ height: 20, width: '60%', marginBottom: 12 }} />
            <div className={styles.skeletonLine} style={{ height: 36 }} />
          </div>
        </div>
      </div>
    );
  }

  if (!ride) {
    return (
      <div className={styles.detailPage}>
        <Link href="/rides/browse" className={styles.detailBackLink}><ChevronLeft size={15} /> Back to browse</Link>
        <div className={styles.detailCard} style={{ textAlign: 'center', padding: '2.5rem' }}>
          <Car size={36} style={{ opacity: 0.2, marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>Ride not found or no longer available.</p>
        </div>
      </div>
    );
  }

  const driver = ride.driver;
  const driverInitials = driver?.name ? driver.name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') : '?';
  const isDriver = user && String(user._id) === String(driver?._id || driver);
  const already = user && ride.passengers?.some((p) => String(p.user?._id || p.user) === String(user._id));
  const mapSrc = `https://maps.google.com/maps?saddr=${encodeURIComponent(ride.originName)}&daddr=${encodeURIComponent(ride.destName)}&output=embed`;
  const canRequest = !isDriver && ride.status === 'scheduled' && !already && ride.seatsAvailable > 0 && !ride.hasRequested;

  return (
    <div className={styles.detailPage}>
      <Link href="/rides/browse" className={styles.detailBackLink}>
        <ChevronLeft size={15} /> Back to browse
      </Link>

      <div className={styles.detailGrid}>
        {/* ── Left column ── */}
        <div className={styles.detailLeft}>
          <span className={styles.detailTypeBadge}>
            {ride.recurring?.enabled ? 'Recurring Route' : 'One-time Ride'}
          </span>
          <h1 className={styles.detailTitle}>
            {ride.originName} <ArrowRight size={20} style={{ display: 'inline', verticalAlign: 'middle' }} /> {ride.destName}
          </h1>
          <p className={styles.detailDeparture}>
            <Clock size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            {new Date(ride.departureTime).toLocaleString('en-PK', { dateStyle: 'long', timeStyle: 'short' })}
          </p>

          {/* Route details */}
          <div className={styles.detailCard}>
            <div className={styles.detailCardLabel}>Trip Details</div>
            <ul className={styles.detailMetaList}>
            <li><strong>Seats left</strong> {ride.seatsAvailable}</li>
            <li><strong>Vehicle</strong> {ride.vehicleInfo || '—'}</li>
            <li><strong>Plate</strong> {ride.licensePlateNumber || '—'}</li>
            {ride.recurring?.enabled && ride.recurring.daysOfWeek?.length > 0 && (
              <li>
                <strong>Weekly</strong>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <RotateCcw size={12} /> {ride.recurring.daysOfWeek.join(', ')}
                  </span>
                </li>
              )}
            </ul>
          </div>

          {/* Notes */}
          {ride.notes && (
            <div className={styles.detailCard}>
              <div className={styles.detailCardLabel}>Driver&apos;s Note</div>
              <p className={styles.detailNotes}>{ride.notes}</p>
            </div>
          )}

          {/* Driver */}
          {driver && (
            <div className={styles.detailCard}>
              <div className={styles.detailCardLabel}>Driver</div>
              <div className={styles.driverCard} style={{ marginBottom: isDriver ? 0 : '1rem' }}>
                <div className={styles.driverAvatar}>
                  {driver.avatar
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={driver.avatar} alt={driver.name} />
                    : driverInitials}
                </div>
                <div className={styles.driverInfo}>
                  <Link href={`/profile/${driver._id}`} className={styles.driverName}>{driver.name}</Link>
                  {driver.department && <div className={styles.driverDept}>{driver.department}</div>}
                </div>
              </div>
              {!isDriver && (
                <>
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      fontSize: '0.75rem',
                      color: '#DC2626',
                      textDecoration: 'none',
                      padding: '0.5rem',
                      border: '1px solid #FECACA',
                      borderRadius: '8px',
                      background: '#FEF2F2',
                      cursor: 'pointer'
                    }}
                  >
                    <AlertTriangle size={12} /> Report this ride
                  </button>

                  <UnifiedReportModal
                    isOpen={reportModalOpen}
                    onClose={() => setReportModalOpen(false)}
                    targetModel="Ride"
                    targetId={id}
                    targetTitle={ride ? `${ride.originName} → ${ride.destName}` : ''}
                    targetDescription={ride?.notes}
                  />
                </>
              )}
            </div>
          )}

          {/* Map */}
          <div className={styles.detailCard} style={{ padding: 0, overflow: 'hidden' }}>
            <div className={styles.mapWrap}>
              <iframe title="Route map" src={mapSrc} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          </div>
        </div>

        {/* ── Right column (action card) ── */}
        <div className={styles.detailRight}>
          <div className={styles.actionCard}>
            <div className={styles.actionCardTitle}>Book a Seat</div>
            <p className={styles.actionSeatsLeft}>
              <strong>{ride.seatsAvailable}</strong> seat{ride.seatsAvailable !== 1 ? 's' : ''} available
            </p>

              {ride.hasRequested ? (
              <div className={styles.actionInfoBanner}>Your request has been sent and is pending approval.</div>
              ) : already ? (
                <div className={styles.actionInfoBanner}>You are confirmed on this ride.</div>
            ) : isDriver ? (
              <div className={styles.actionInfoBanner}>You are hosting this trip.</div>
            ) : ride.status !== 'scheduled' ? (
              <div className={styles.actionWarnBanner}>This ride is no longer accepting requests.</div>
            ) : ride.seatsAvailable < 1 ? (
              <div className={styles.actionWarnBanner}>No seats left on this ride.</div>
            ) : !user ? (
              <div className={styles.actionWarnBanner}>
                <Link href="/login">Log in</Link> to request this ride.
              </div>
            ) : canRequest ? (
              <>
                <label className={styles.actionLabel} htmlFor="seatCount">Seats requested</label>
                <input
                  id="seatCount"
                  type="number"
                  min={1}
                  max={ride.seatsAvailable}
                  value={seatsRequested}
                  onChange={(e) => setSeatsRequested(Math.max(1, Math.min(ride.seatsAvailable, Number(e.target.value || 1))))}
                  className={styles.actionInput}
                />
                <label className={styles.actionLabel} htmlFor="rideMessage">Message (optional)</label>
                <textarea
                  id="rideMessage"
                  rows={3}
                  className={`${styles.actionInput} ${styles.actionTextarea}`}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Hi, I would love to join your trip."
                />
                <button
                  type="button"
                  className={styles.actionBtnPrimary}
                  onClick={join}
                  disabled={requesting}
                >
                  {requesting ? 'Sending request…' : 'Request Ride Approval'}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
