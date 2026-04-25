'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import ListingManagement from '../../../components/ListingManagement';
import styles from '../marketplace-pages.module.css';
import hubStyles from '../../community.module.css';
import useRequireAuth from '../../../lib/useRequireAuth';

export default function MyListingsPage() {
  const { isReady } = useRequireAuth();
  const [activeTab, setActiveTab] = useState('active');

  const tabs = useMemo(
    () => [
      { key: 'active', label: 'Active' },
      { key: 'reserved', label: 'Reserved' },
      { key: 'past', label: 'Past' },
    ],
    []
  );

  if (!isReady) {
    return <div className="container py-5 text-secondary">Loading your listings...</div>;
  }

  return (
    <div className={hubStyles.page}>
      <div className="container">
      <div className={hubStyles.pageHeader}>
        <div className={hubStyles.headerLeft}>
          <h1 className={hubStyles.pageTitle}>My listings</h1>
          <p className={hubStyles.pageSubtitle}>
            Track what is live, what is reserved, and what has already been sold.
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <Link href="/marketplace" className={hubStyles.btnOutline}>
            Back to marketplace
          </Link>
          <Link href="/marketplace/create" className={hubStyles.btnPrimary}>
            New listing
          </Link>
        </div>
      </div>

      <div className={styles.tabBar} role="tablist" aria-label="Listing status filters">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
            role="tab"
            aria-selected={activeTab === tab.key}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ListingManagement showHeader={false} statusFilter={activeTab} />
      </div>
    </div>
  );
}
