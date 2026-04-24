// rides/matches/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import useRequireAuth from '../../../lib/useRequireAuth';
import styles from '../../shared/marketplace-rides.module.css';

export default function RideMatchesPage() {
  const { isReady } = useRequireAuth();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await api.get('/rides/matches/suggested');
        if (!cancelled && res.data.success) setRides(res.data.data || []);
      } catch {
        if (!cancelled) setRides([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady]);

  return (
    <div className="container py-4 py-md-5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h1 className="mb-1">Suggested rides</h1>
          <p className="text-secondary mb-0">Based on routes you search, view, or join.</p>
        </div>
        <Link href="/rides" className="btn btn-outline-secondary btn-sm">
          Hub
        </Link>
      </div>

      {!isReady || loading ? (
        <p>Loading…</p>
      ) : rides.length === 0 ? (
        <p className="text-secondary">Search or open a few rides — we will start matching patterns.</p>
      ) : (
        <div className="row g-3">
          {rides.map((ride) => (
            <div key={ride._id} className="col-md-6 col-lg-4">
              <Link href={`/rides/${ride._id}`} className="text-decoration-none text-reset">
                <div className={styles['mc-ride-card']}>
                  <div className={styles['mc-card-body']}>
                    <h3 className="h6 mb-1">
                      {ride.originName} → {ride.destName}
                    </h3>
                    <p className="small text-secondary mb-0">
                      {new Date(ride.departureTime).toLocaleString()} · {ride.driver?.name}
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
