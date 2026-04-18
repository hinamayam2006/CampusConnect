'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { closeRequest, getMyRequests, withdrawRequest } from '../../../lib/apiRequests';
import useRequireAuth from '../../../lib/useRequireAuth';
import styles from '../marketplace-pages.module.css';

export default function MyMarketplaceRequestsPage() {
  const { isReady } = useRequireAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await getMyRequests('requester', null, 'marketplace');
      setRequests((res.data || []).filter((request) => request.status !== 'cancelled'));
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    loadRequests();
  }, [isReady]);

  const handleWithdraw = async (requestId) => {
    if (!window.confirm('Withdraw this request?')) return;

    try {
      setActionLoading(true);
      await withdrawRequest(requestId);
      toast.success('Request withdrawn');
      await loadRequests();
    } catch (err) {
      toast.error(err.response?.message || err.message || 'Could not withdraw request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async (requestId) => {
    if (!window.confirm('Close this request? It will be hidden from your marketplace requests.')) return;

    try {
      setActionLoading(true);
      await closeRequest(requestId);
      toast.success('Request closed');
      await loadRequests();
    } catch (err) {
      toast.error(err.response?.message || err.message || 'Could not close request');
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
            Track the marketplace items you requested and see each seller response in one place.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link href="/marketplace" className="btn btn-outline-secondary btn-sm">
            Back to marketplace
          </Link>
          <Link href="/marketplace/general" className="btn btn-primary btn-sm">
            Browse listings
          </Link>
        </div>
      </div>

      {loading ? (
        <div className={styles.emptyPanel}>Loading your requests...</div>
      ) : requests.length === 0 ? (
        <div className={styles.emptyPanel}>
          No marketplace requests yet. Requests for listings will appear here.
        </div>
      ) : (
        <div className={styles.requestGrid}>
          {requests.map((request) => (
            <div key={request._id} className={styles.requestCard}>
              <div className={styles.requestCardTop}>
                <div>
                  <div className={styles.requestRoute}>{request.refId?.title || 'Listing details'}</div>
                  <div className={styles.requestMeta}>
                    {request.refId?.category || 'Marketplace'} • {request.refId?.listingType || 'Listing'}
                  </div>
                </div>
                <span className={`${styles.statusPill} ${getStatusClass(request.status)}`}>
                  {request.status}
                </span>
              </div>

              <div className={styles.requestDetails}>
                <div className={styles.requestDetailCard}>
                  <span className={styles.detailLabel}>Seller</span>
                  <span className={styles.detailValue}>{request.owner?.name || 'Seller unavailable'}</span>
                </div>
                <div className={styles.requestDetailCard}>
                  <span className={styles.detailLabel}>Type</span>
                  <span className={styles.detailValue}>{request.refId?.listingType || 'N/A'}</span>
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
                  <Link href={`/marketplace/${request.refId._id}`} className="btn btn-outline-primary btn-sm">
                    View listing
                  </Link>
                )}
                {request.status === 'pending' && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handleWithdraw(request._id)}
                    disabled={actionLoading}
                  >
                    Withdraw
                  </button>
                )}
                {request.status !== 'pending' && (
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => handleClose(request._id)}
                    disabled={actionLoading}
                  >
                    Hide
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
