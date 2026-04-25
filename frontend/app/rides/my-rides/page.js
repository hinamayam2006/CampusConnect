'use client';

import Link from 'next/link';
import { PlusCircle, ChevronLeft } from 'lucide-react';
import RideManagement from '../../../components/RideManagement';
import useRequireAuth from '../../../lib/useRequireAuth';
import styles from '../../community.module.css';

export default function MyRidesPage() {
  const { isReady } = useRequireAuth();

  if (!isReady) {
    return (
      <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        Loading your rides…
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>My Rides</h1>
            <p className={styles.pageSubtitle}>Trips you host and rides you have joined.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link href="/rides" className={styles.btnOutline}>
              <ChevronLeft size={15} /> Rides Hub
            </Link>
            <Link href="/rides/create" className={styles.btnPrimary}>
              <PlusCircle size={16} /> Offer a Ride
            </Link>
          </div>
        </div>

        <div style={{ animation: 'fadeInUp 0.6s ease both', animationDelay: '0.1s' }}>
          <RideManagement showHeader={false} />
        </div>
      </div>
    </div>
  );
}
