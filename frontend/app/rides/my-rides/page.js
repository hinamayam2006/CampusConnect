'use client';

import Link from 'next/link';
import RideManagement from '../../../components/RideManagement';
import styles from '../rides-pages.module.css';
import useRequireAuth from '../../../lib/useRequireAuth';

export default function MyRidesPage() {
  const { isReady } = useRequireAuth();

  if (!isReady) {
    return <div className="container py-5 text-secondary">Loading your rides...</div>;
  }

  return (
    <div className="container py-4 py-md-5">
      <div className={styles.pageHero}>
        <div>
          <h1 className={styles.pageTitle}>My rides</h1>
          <p className={styles.pageSubtitle}>
            Keep track of the rides you host and the trips you have joined.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link href="/rides" className="btn btn-outline-secondary btn-sm">
            Back to carpooling
          </Link>
          <Link href="/rides/create" className="btn btn-primary btn-sm">
            Offer a ride
          </Link>
        </div>
      </div>

      <RideManagement showHeader={false} />
    </div>
  );
}
