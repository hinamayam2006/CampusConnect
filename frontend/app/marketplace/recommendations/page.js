// marketplace/recommendations/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import useRequireAuth from '../../../lib/useRequireAuth';
import styles from '../../shared/marketplace-rides.module.css';

function ListingCard({ item }) {
  const img = item.images?.[0];
  return (
    <div className={styles['mc-listing-card']}>
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" className={styles['mc-img-ph']} />
      ) : (
        <div className={styles['mc-img-ph']} />
      )}
      <div className={styles['mc-card-body']}>
        <span className={`${styles['mc-badge']} mb-1`}>{item.category}</span>
        <h3 className="h6 mb-1">{item.title}</h3>
        <p className="text-secondary small flex-grow-1">{item.department}</p>
        <Link href={`/marketplace/${item._id}`} className="btn btn-sm btn-outline-primary mt-2">
          View
        </Link>
      </div>
    </div>
  );
}

export default function MarketplaceRecommendationsPage() {
  const { isReady } = useRequireAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await api.get('/marketplace/recommendations');
        if (!cancelled && res.data.success) setItems(res.data.data || []);
      } catch {
        if (!cancelled) setItems([]);
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
      <h1 className="mb-2">Recommended for you</h1>
      <p className="text-secondary mb-4">
        Pulled from your marketplace views and searches, then blended with trending listings.
      </p>
      {!isReady || loading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-secondary">Browse a few listings — we will start tailoring picks.</p>
      ) : (
        <div className="row g-3">
          {items.map((item) => (
            <div key={item._id} className="col-6 col-lg-3">
              <ListingCard item={item} />
            </div>
          ))}
        </div>
      )}
      <Link href="/marketplace" className="btn btn-link mt-3">
        ← Back to marketplace hub
      </Link>
    </div>
  );
}
