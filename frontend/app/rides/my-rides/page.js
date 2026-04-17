'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import RideManagement from '../../../components/RideManagement';
import { getMyRequests, withdrawRequest } from '../../../lib/apiRequests';
import useRequireAuth from '../../../lib/useRequireAuth';

export default function MyRidesPage() {
  const { isReady } = useRequireAuth();
  const [activeTab, setActiveTab] = useState('rides');
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadRideRequests = async () => {
    try {
      setRequestsLoading(true);
      const res = await getMyRequests('requester', null, 'ride');
      setRequests((res.data || []).filter((req) => req.status !== 'cancelled'));
    } catch {
      setRequests([]);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady || activeTab !== 'requests') return;
    loadRideRequests();
  }, [isReady, activeTab]);

  const handleWithdraw = async (requestId) => {
    if (!confirm('Withdraw this request?')) return;
    try {
      setActionLoading(true);
      await withdrawRequest(requestId);
      await loadRideRequests();
      toast.success('Request withdrawn');
    } catch (err) {
      toast.error(err.response?.message || err.message || 'Could not withdraw request');
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

  const visibleRequests = requests.filter((req) => req.status !== 'cancelled');

  return (
    <div className="container py-4 py-md-5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="mb-1">My rides</h1>
          <p className="text-secondary mb-0">Manage your driver rides and passenger trips in one place.</p>
        </div>
        <Link href="/rides/create" className="btn btn-primary btn-sm">
          Offer a ride
        </Link>
      </div>
      <Link href="/rides" className="small d-inline-block mb-4">
        ← Rides hub
      </Link>

      <div className="btn-group mb-4" role="group" aria-label="My rides tabs">
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'rides' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setActiveTab('rides')}
        >
          My rides
        </button>
        <button
          type="button"
          className={`btn btn-sm ${activeTab === 'requests' ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => setActiveTab('requests')}
        >
          My requests
        </button>
      </div>

      {activeTab === 'rides' ? (
        <RideManagement showHeader={false} />
      ) : requestsLoading ? (
        <p>Loading your requests…</p>
      ) : visibleRequests.length === 0 ? (
        <p className="text-secondary">No ride requests found. Your approved and pending ride join requests will show here.</p>
      ) : (
        <div className="row g-3">
          {visibleRequests.map((request) => (
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
                  onClick={() => handleWithdraw(request._id)}
                  title="Hide request"
                >
                  ✕
                </button>
                <div className="d-flex justify-content-between align-items-start mb-2 gap-3">
                  <div>
                    <h3 className="h6 mb-1">
                      <Link href={`/rides/${request.refId?._id || ''}`} className="text-decoration-none">
                        {request.refId?.originName} → {request.refId?.destName}
                      </Link>
                    </h3>
                    <div className="small text-secondary">
                      {new Date(request.refId?.departureTime).toLocaleString()} · {request.seatsRequested || 1} seat{request.seatsRequested > 1 ? 's' : ''}
                    </div>
                  </div>
                  <span className={statusBadgeClass(request.status)}>{request.status}</span>
                </div>

                {request.status === 'declined' && (
                  <div className="p-3 rounded-3 mb-3" style={{ backgroundColor: '#f8d7da', color: '#842029' }}>
                    <strong>Declined</strong>
                    <div className="small mt-1">The driver declined your ride request.</div>
                  </div>
                )}

                {request.message && (
                  <p className="mb-2 small text-secondary">"{request.message}"</p>
                )}

                <div className="d-flex flex-wrap gap-2 mt-2">
                  <Link href={`/rides/${request.refId?._id || ''}`} className="btn btn-outline-primary btn-sm">
                    View ride
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
