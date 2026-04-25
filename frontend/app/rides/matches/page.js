'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Sparkles, Car } from 'lucide-react';
import api from '../../../lib/api';
import useRequireAuth from '../../../lib/useRequireAuth';
import styles from '../../community.module.css';
import rideStyles from '../../shared/marketplace-rides.module.css';

export default function RideMatchesPage() {
  const { isReady } = useRequireAuth();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    const timer = setTimeout(() => {
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
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isReady]);

  if (!isReady) {
    return <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>Suggested Rides</h1>
            <p className={styles.pageSubtitle}>Based on routes you search, view, or join.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link href="/rides" className={styles.btnOutline}>
              <ChevronLeft size={15} /> Rides Hub
            </Link>
            <Link href="/rides/browse" className={styles.btnPrimary}>
              <Car size={16} /> Browse All
            </Link>
          </div>
        </div>

        {loading ? (
          <div className={rideStyles.emptyPanel}>Searching for matches…</div>
        ) : rides.length === 0 ? (
          <div className={rideStyles.emptyPanel}>
            <Sparkles size={32} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
            <p>Search or open a few rides — we will start matching patterns.</p>
          </div>
        ) : (
          <div className="row g-3" style={{ animation: 'fadeInUp 0.5s ease both' }}>
            {rides.map((ride) => (
              <div key={ride._id} className="col-md-6 col-lg-4">
                <Link href={`/rides/${ride._id}`} className="text-decoration-none text-reset">
                  <div className={rideStyles['mc-ride-card']}>
                    <div className={rideStyles['mc-card-body']}>
                      <h3 className={styles.cardTitle} style={{ fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                        {ride.originName} → {ride.destName}
                      </h3>
                      <p className="small text-secondary mb-0">
                        {new Date(ride.departureTime).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })} · {ride.driver?.name}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
