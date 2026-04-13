'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import useRequireAuth from '../../../lib/useRequireAuth';
import { getMyRequests, withdrawRequest, closeRequest } from '../../../lib/apiRequests';
import ListingManagement from '../../../components/ListingManagement';

export default function MyListingsPage() {
  const { isReady } = useRequireAuth();
  const [activeTab, setActiveTab] = useState('uploads');
  const [picks, setPicks] = useState([]);
  const [picksLoading, setPicksLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadPicks = async () => {
    try {
      setPicksLoading(true);
      const res = await getMyRequests('requester', null, 'marketplace');
      setPicks((res.data || []).filter((req) => req.status !== 'cancelled'));
    } catch {
      setPicks([]);
    } finally {
      setPicksLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady || activeTab !== 'picks') return;
    loadPicks();
  }, [isReady, activeTab]);

  const handleWithdraw = async (requestId) => {
    if (!confirm('Withdraw this request?')) return;
    try {
      setActionLoading(true);
      await withdrawRequest(requestId);
      await loadPicks();
      toast.success('Request withdrawn');
    } catch (err) {
      toast.error(err.response?.message || err.message || 'Could not withdraw request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async (requestId) => {
    if (!confirm('Close this request? It will be hidden from your picks.')) return;
    try {
      setActionLoading(true);
      await closeRequest(requestId);
      await loadPicks();
      toast.success('Request closed');
    } catch (err) {
      toast.error(err.response?.message || err.message || 'Could not close request');
    } finally {
      setActionLoading(false);
    }
  };

  const statusBadgeClass = (status) => {
    switch (status) {
      case 'pending':
        return 'badge bg-warning';
      case 'approved':
        return 'badge bg-success';
      case 'declined':
        return 'badge bg-danger';
      case 'withdrawn':
        return 'badge bg-secondary';
      default:
        return 'badge bg-secondary';
    }
  };

  const visiblePicks = picks.filter((req) => req.status !== 'cancelled');

  return (
    <div className="container py-4 py-md-5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="mb-1">My listings</h1>
          <p className="text-secondary mb-0">Manage your uploads and marketplace requests in one place.</p>
        </div>
        <Link href="/marketplace/create" className="btn btn-primary btn-sm">
          New listing
        </Link>
      </div>
      <Link href="/marketplace" className="small d-inline-block mb-3">
        ← Marketplace hub
      </Link>

      <div className="btn-group mb-4" role="group" aria-label="My listings tabs">
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'uploads' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setActiveTab('uploads')}
        >
          My uploads
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'picks' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setActiveTab('picks')}
        >
          My picks
        </button>
      </div>

      {activeTab === 'uploads' ? (
        <ListingManagement showHeader={false} />
      ) : picksLoading ? (
        <p>Loading your picks…</p>
      ) : visiblePicks.length === 0 ? (
        <p className="text-secondary">No marketplace requests found. Your approved and pending picks will show here.</p>
      ) : (
        <div className="row g-3">
          {visiblePicks.map((request) => (
            <div key={request._id} className="col-12">
              <div className="border rounded-3 p-3 bg-white shadow-sm position-relative">
                <button
                  type="button"
                  className="btn btn-sm text-white"
                  style={{
                    backgroundColor: '#6c1a1a',
                    borderColor: '#6c1a1a',
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    width: '32px',
                    height: '32px',
                    padding: 0,
                  }}
                  disabled={actionLoading}
                  onClick={() => handleClose(request._id)}
                  title="Hide request"
                >
                  ✕
                </button>
                <div className="d-flex justify-content-between align-items-start mb-2 gap-3">
                  <div>
                    <h3 className="h6 mb-1">
                      <Link href={`/marketplace/${request.refId?._id || ''}`} className="text-decoration-none">
                        {request.refId?.title || 'Listing details'}
                      </Link>
                    </h3>
                    <div className="small text-secondary">
                      {request.refId?.category || 'Marketplace'} · {request.refId?.listingType || '—'}
                    </div>
                  </div>
                  <span className={statusBadgeClass(request.status)}>{request.status}</span>
                </div>

                {request.status === 'declined' && (
                  <div className="p-3 rounded-3 mb-3" style={{ backgroundColor: '#f8d7da', color: '#842029' }}>
                    <strong>Declined</strong>
                    <div className="small mt-1">This request was declined by the seller.</div>
                    {request.declineReason && <div className="small mt-1">Reason: {request.declineReason}</div>}
                  </div>
                )}

                {request.message && (
                  <p className="mb-2 small text-secondary">“{request.message}”</p>
                )}

                <div className="d-flex flex-wrap gap-2 mt-2">
                  <Link href={`/marketplace/${request.refId?._id || ''}`} className="btn btn-outline-primary btn-sm">
                    View listing
                  </Link>
                  {request.status === 'pending' && (
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      disabled={actionLoading}
                      onClick={() => handleWithdraw(request._id)}
                    >
                      Withdraw request
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
