//marketplace/general/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import { DEPARTMENTS } from '../../../lib/campusConstants';
import useStore from '../../../store/useStore';
import ImageCarousel from '../../../components/ImageCarousel';
import styles from '../../shared/marketplace-rides.module.css';
import hubStyles from '../../community.module.css';

function formatPrice(listing) {
  if (listing.listingType === 'exchange') return 'Exchange';
  if (listing.price == null || listing.price === '') return '—';
  const p = `Rs ${listing.price}`;
  return listing.listingType === 'rent' ? `Rent ${p}` : p;
}

export default function GeneralMarketplacePage() {
  const { accessToken } = useStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [listingType, setListingType] = useState('');

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category: 'general' });
      if (search) params.set('search', search);
      if (department) params.set('department', department);
      if (listingType) params.set('listingType', listingType);
      const res = await api.get(`/marketplace/listings?${params}`);
      if (res.data.success) setItems(res.data.data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const params = new URLSearchParams({ category: 'general' });
        if (search) params.set('search', search);
        if (department) params.set('department', department);
        if (listingType) params.set('listingType', listingType);

        const res = await api.get(`/marketplace/listings?${params}`);
        if (cancelled) return;

        if (res.data.success) {
          setItems(res.data.data.items || []);
        } else {
          setItems([]);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    await fetchList();
    if (accessToken) {
      try {
        await api.post('/marketplace/search-log', {
          search,
          category: 'general',
          department: department || undefined,
        });
      } catch {
        /* optional */
      }
    }
  };

  return (
    <div className={hubStyles.page}>
      <div className="container">
      <div className={hubStyles.pageHeader}>
        <div className={hubStyles.headerLeft}>
          <h1 className={hubStyles.pageTitle}>General items</h1>
          <p className={hubStyles.pageSubtitle}>Everything that is not course-specific.</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <Link href="/marketplace" className={hubStyles.btnOutline}>
            Marketplace hub
          </Link>
          <Link href="/marketplace/textbooks" className={hubStyles.btnOutline}>
            Textbooks
          </Link>
        </div>
      </div>

      <form className={styles['mc-filters']} onSubmit={onSubmit}>
        <div className="row g-2 align-items-end">
          <div className="col-md-4">
            <label className="form-label">Search</label>
            <input
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Keywords…"
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">Department</label>
            <select className="form-select" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">Any</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3">
            <label className="form-label">Type</label>
            <select className="form-select" value={listingType} onChange={(e) => setListingType(e.target.value)}>
              <option value="">Any</option>
              <option value="sale">Sale</option>
              <option value="rent">Rent</option>
              <option value="exchange">Exchange</option>
            </select>
          </div>
          <div className="col-md-2">
            <button type="submit" className={hubStyles.btnPrimary} style={{ width: '100%', justifyContent: 'center' }}>
              Apply
            </button>
          </div>
        </div>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="row g-3">
          {items.map((item) => {
            return (
              <div key={item._id} className="col-6 col-lg-3">
                <Link href={`/marketplace/${item._id}`} className="text-decoration-none text-reset">
                  <div className={styles['mc-listing-card']}>
                    <div style={{ position: 'relative' }}>
                      {item.images?.length ? (
                        <ImageCarousel images={item.images} alt={item.title} aspectRatio="4 / 3" showDots={false} />
                      ) : (
                        <div className={styles['mc-img-ph']} />
                      )}
                      {item.status === 'sold' && (
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'inherit', zIndex: 10 }}>
                          <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '0.4rem 1.2rem', fontWeight: 'bold', letterSpacing: '2px', borderRadius: '6px', transform: 'rotate(-10deg)', fontSize: '1.2rem', border: '3px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>SOLD</span>
                        </div>
                      )}
                      {item.status === 'reserved' && (
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'inherit', zIndex: 10 }}>
                          <span style={{ backgroundColor: '#f59e0b', color: 'white', padding: '0.4rem 1rem', fontWeight: 'bold', letterSpacing: '1px', borderRadius: '6px', fontSize: '1rem', border: '2px solid white', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>RESERVED</span>
                        </div>
                      )}
                    </div>
                    <div className={styles['mc-card-body']}>
                      <span className={styles['mc-badge']}>{item.listingType}</span>
                      <h3 className={hubStyles.cardTitle} style={{ marginTop: '0.35rem' }}>{item.title}</h3>
                      <p className={hubStyles.cardCategory} style={{ textTransform: 'none', letterSpacing: 0 }}>{item.department}</p>
                      <p className={`${styles['mc-price']} mb-0`}>{formatPrice(item)}</p>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
      {!loading && items.length === 0 && <p className="text-secondary">No listings match these filters.</p>}
      </div>
    </div>
  );
}
