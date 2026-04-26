'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronLeft, Car } from 'lucide-react';
import { getMyRequests, withdrawRequest } from '../../../lib/apiRequests';
import useRequireAuth from '../../../lib/useRequireAuth';
import styles from '../../community.module.css';
import detailStyles from '../rides-pages.module.css';

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

  const loadRideRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getMyRequests('requester', null, 'ride');
      setRequests((res.data || []).filter((request) => request.status !== 'cancelled'));
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const timer = setTimeout(() => {
      void loadRideRequests();
    }, 0);

    return () => clearTimeout(timer);
  }, [isReady, loadRideRequests]);

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
      case 'pending': return detailStyles.statusPending;
      case 'approved': return detailStyles.statusApproved;
      case 'declined': return detailStyles.statusDeclined;
      default: return detailStyles.statusMuted;
    }
  };

  if (!isReady) {
    return (
      <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading your requests...
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>My Requests</h1>
            <p className={styles.pageSubtitle}>Review the ride requests you have sent.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link href="/rides" className={styles.btnOutline}>
              <ChevronLeft size={15} /> Rides Hub
            </Link>
            <Link href="/rides/browse" className={styles.btnPrimary}>
              <Car size={16} /> Find a Ride
            </Link>
          </div>
        </div>

        {loading ? (
          <div className={detailStyles.emptyPanel}>Loading your requests...</div>
        ) : requests.length === 0 ? (
          <div className={detailStyles.emptyPanel}>
            No ride requests yet. When you request a seat, it will appear here.
          </div>
        ) : (
          <div className={detailStyles.requestGrid} style={{ animation: 'fadeInUp 0.6s ease both', animationDelay: '0.1s' }}>
            {requests.map((request) => (
              <div key={request._id} className={detailStyles.requestCard}>
                <div className={detailStyles.requestCardTop}>
                  <div>
                    <div className={detailStyles.requestRoute}>
                      {request.refId?.originName || 'Ride'} → {request.refId?.destName || 'destination'}
                    </div>
                    <div className={detailStyles.requestMeta}>
                      {request.refId?.departureTime ? formatTime(request.refId.departureTime) : 'Departure time unavailable'}
                    </div>
                  </div>
                  <span className={`${detailStyles.statusPill} ${getStatusClass(request.status)}`}>
                    {request.status}
                  </span>
                </div>

                <div className={detailStyles.requestDetails}>
                  <div className={detailStyles.requestDetailCard}>
                    <span className={detailStyles.detailLabel}>Seats requested</span>
                    <span className={detailStyles.detailValue}>
                      {request.seatsRequested || 1} seat{request.seatsRequested > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className={detailStyles.requestDetailCard}>
                    <span className={detailStyles.detailLabel}>Driver</span>
                    <span className={detailStyles.detailValue}>{request.owner?.name || 'Driver unavailable'}</span>
                  </div>
                  <div className={detailStyles.requestDetailCard}>
                    <span className={detailStyles.detailLabel}>Ride plate</span>
                    <span className={detailStyles.detailValue}>{request.refId?.licensePlateNumber || 'N/A'}</span>
                  </div>
                </div>

                {request.message && (
                  <div className={detailStyles.messageBox}>
                    <strong>Your message:</strong> {request.message}
                  </div>
                )}

                <div className={detailStyles.cardActions}>
                  {request.refId?._id && (
                    <Link href={`/rides/${request.refId._id}`} className={detailStyles.btnView}>
                      View Ride
                    </Link>
                  )}
                  {request.status === 'pending' && (
                    <button
                      type="button"
                      className={detailStyles.btnDanger}
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
    </div>
  );
}
