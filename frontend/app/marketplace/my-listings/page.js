'use client';

import Link from 'next/link';
import ListingManagement from '../../../components/ListingManagement';
import styles from '../marketplace-pages.module.css';
import useRequireAuth from '../../../lib/useRequireAuth';

export default function MyListingsPage() {
  const { isReady } = useRequireAuth();

  if (!isReady) {
    return <div className="container py-5 text-secondary">Loading your listings...</div>;
  }

  return (
    <div className="container py-4 py-md-5">
      <div className={styles.pageHero}>
        <div>
          <h1 className={styles.pageTitle}>My listings</h1>
          <p className={styles.pageSubtitle}>
            Manage what you have posted and keep your marketplace uploads up to date.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link href="/marketplace" className="btn btn-outline-secondary btn-sm">
            Back to marketplace
          </Link>
          <Link href="/marketplace/create" className="btn btn-primary btn-sm">
            New listing
          </Link>
        </div>
      </div>

      <ListingManagement showHeader={false} />
    </div>
  );
}
