// rides/browse/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import useStore from '../../../store/useStore';

export default function RidesBrowsePage() {
  const { accessToken } = useStore();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [originName, setOriginName] = useState('');
  const [destName, setDestName] = useState('');

  const fetchRides = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (originName) params.set('originName', originName);
      if (destName) params.set('destName', destName);
      const res = await api.get(`/rides?${params}`);
      if (res.data.success) setRides(res.data.data || []);
    } catch (err) {
      setRides([]);
      if (err.response?.status === 429) {
        toast.error('Too many requests right now. Please wait a moment and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    await fetchRides();
    if (accessToken) {
      try {
        await api.post('/rides/search-log', { originName, destName });
      } catch {
        /* optional */
      }
    }
  };

  return (
    <div className="container py-4 py-md-5">
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h1 className="mb-1">Find a ride</h1>
          <p className="text-secondary mb-0">Upcoming trips from the community.</p>
        </div>
        <Link href="/rides" className="btn btn-outline-secondary btn-sm">
          Hub
        </Link>
      </div>

      <form className="mc-filters" onSubmit={onSubmit}>
        <div className="row g-2 align-items-end">
          <div className="col-md-5">
            <label className="form-label small">Pickup area</label>
            <input className="form-control" value={originName} onChange={(e) => setOriginName(e.target.value)} placeholder="e.g. H-12" />
          </div>
          <div className="col-md-5">
            <label className="form-label small">Drop-off</label>
            <input className="form-control" value={destName} onChange={(e) => setDestName(e.target.value)} placeholder="e.g. SEECS" />
          </div>
          <div className="col-md-2">
            <button type="submit" className="btn btn-primary w-100">
              Search
            </button>
          </div>
        </div>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="row g-3">
          {rides.map((ride) => (
            <div key={ride._id} className="col-md-6 col-lg-4">
              <Link href={`/rides/${ride._id}`} className="text-decoration-none text-reset">
                <div className="mc-ride-card">
                  <div className="mc-card-body">
                    <span className="mc-badge">{ride.recurring?.enabled ? 'Recurring' : 'One-time'}</span>
                    <h3 className="h6 mt-2 mb-1">
                      {ride.originName} → {ride.destName}
                    </h3>
                    <p className="small text-secondary mb-1">
                      {new Date(ride.departureTime).toLocaleString()} · {ride.seatsAvailable} seats
                    </p>
                    <p className="small mb-0">
                      Driver: {ride.driver?.name} · ★ {ride.driver?.trustScore ?? '—'}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
      {!loading && rides.length === 0 && <p className="text-secondary">No rides match that search.</p>}
    </div>
  );
}
