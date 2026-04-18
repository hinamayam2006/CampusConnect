'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getMyRequests, withdrawRequest } from '../../../lib/apiRequests';
import useRequireAuth from '../../../lib/useRequireAuth';
import styles from '../rides-pages.module.css';

function formatTime(value) {
  return new Date(value).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MyRideRequestsPage() {
  const { isReady } = useRequireAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadRideRequests = async () => {
    try {
      setLoading(true);
      const res = await getMyRequests('requester', null, 'ride');
      setRequests((res.data || []).filter((request) => request.status !== 'cancelled'));
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    loadRideRequests();
  }, [isReady]);

  const handleWithdraw = async (requestId) => {
    if (!window.confirm('Withdraw this ride request?')) return;

    try {
      setActionLoading(true);
      await withdrawRequest(requestId);
      toast.success('Request withdrawn');
      await loadRideRequests();
    } catch (err) {
      toast.error(err.response?.message || err.message || 'Could not withdraw request');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending':
        return styles.statusPending;
      case 'approved':
        return styles.statusApproved;
      case 'declined':
        return styles.statusDeclined;
      case 'withdrawn':
        return styles.statusMuted;
      default:
        return styles.statusMuted;
    }
  };

  if (!isReady) {
    return <div className="container py-5 text-secondary">Loading your requests...</div>;
  }

  return (
    <div className="container py-4 py-md-5">
      <div className={styles.pageHero}>
        <div>
          <h1 className={styles.pageTitle}>My requests</h1>
          <p className={styles.pageSubtitle}>
            Review the ride requests you have sent and track their latest status.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link href="/rides" className="btn btn-outline-secondary btn-sm">
            Back to carpooling
          </Link>
          <Link href="/rides/browse" className="btn btn-primary btn-sm">
            Find a ride
          </Link>
        </div>
      </div>

      {loading ? (
        <div className={styles.emptyPanel}>Loading your requests...</div>
      ) : requests.length === 0 ? (
        <div className={styles.emptyPanel}>
          No ride requests yet. When you request a seat, it will appear here.
        </div>
      ) : (
        <div className={styles.requestGrid}>
          {requests.map((request) => (
            <div key={request._id} className={styles.requestCard}>
              <div className={styles.requestCardTop}>
                <div>
                  <div className={styles.requestRoute}>
                    {request.refId?.originName || 'Ride'} to {request.refId?.destName || 'destination'}
                  </div>
                  <div className={styles.requestMeta}>
                    {request.refId?.departureTime ? formatTime(request.refId.departureTime) : 'Departure time unavailable'}
                  </div>
                </div>
                <span className={`${styles.statusPill} ${getStatusClass(request.status)}`}>
                  {request.status}
                </span>
              </div>

              <div className={styles.requestDetails}>
                <div className={styles.requestDetailCard}>
                  <span className={styles.detailLabel}>Seats requested</span>
                  <span className={styles.detailValue}>
                    {request.seatsRequested || 1} seat{request.seatsRequested > 1 ? 's' : ''}
                  </span>
                </div>
                <div className={styles.requestDetailCard}>
                  <span className={styles.detailLabel}>Driver</span>
                  <span className={styles.detailValue}>{request.owner?.name || 'Driver unavailable'}</span>
                </div>
              </div>

              {request.message && (
                <div className={styles.messageBox}>
                  <strong>Your message:</strong> {request.message}
                </div>
              )}

              {request.declineReason && (
                <div className={styles.declineBox}>
                  <strong>Decline reason:</strong> {request.declineReason}
                </div>
              )}

              <div className={styles.cardActions}>
                {request.refId?._id && (
                  <Link href={`/rides/${request.refId._id}`} className="btn btn-outline-primary btn-sm">
                    View ride
                  </Link>
                )}
                {request.status === 'pending' && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    disabled={actionLoading}
                    onClick={() => handleWithdraw(request._id)}
                  >
                    Withdraw
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
