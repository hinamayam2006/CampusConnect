// marketplace/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  PlusCircle,
  ShoppingBag,
  Tag,
  ArrowRight,
  Package,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import useStore from '../../store/useStore';
import ImageCarousel from '../../components/ImageCarousel';
import styles from '../community.module.css';

const TYPES = [
  { label: 'All Types', value: '' },
  { label: 'Sale',      value: 'sale' },
  { label: 'Rent',      value: 'rent' },
  { label: 'Exchange',  value: 'exchange' },
];

function formatPrice(listing) {
  if (!listing) return '—';
  if (listing.listingType === 'exchange') return 'Exchange';
  if (listing.listingType === 'free' || listing.price == null || listing.price === 0) return 'Free';
  return `Rs ${Number(listing.price).toLocaleString()}`;
}

function getPriceBadgeClass(listing, styles) {
  if (!listing) return '';
  if (listing.listingType === 'exchange') return styles.cardBadgeExchange;
  if (listing.listingType === 'rent') return styles.cardBadgeRent;
  if (listing.price == null || listing.price === 0 || listing.listingType === 'free') return styles.cardBadgeFree;
  return styles.cardBadgeSale;
}

function getInitials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function getCategoryFallback(category, styles) {
  const map = {
    textbook: styles.imgFallbackBooks,
    general: styles.imgFallbackDefault,
  };
  return map[(category || '').toLowerCase()] || styles.imgFallbackDefault;
}

function getCategoryIcon(category) {
  const map = { textbook: BookOpen, general: Package };
  const Icon = map[(category || '').toLowerCase()] || Package;
  return <Icon size={28} />;
}

function SkeletonCards() {
  return (
    <div className={styles.skeletonGrid}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={styles.skeleton}>
          <div className={styles.skeletonImage} />
          <div className={styles.skeletonBody}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} style={{ animationDelay: '0.1s' }} />
            <div className={styles.skeletonLine} style={{ animationDelay: '0.15s' }} />
            <div className={styles.skeletonLine} style={{ animationDelay: '0.2s' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MarketplacePage() {
  const router = useRouter();
  const { user, accessToken } = useStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [listingType, setListingType] = useState('');
  const [showSold, setShowSold] = useState(false);
  const isLoggedIn = Boolean(user && accessToken);

  const requireLoginBeforeNavigate = (e, targetPath, featureLabel) => {
    if (isLoggedIn) return;
    e.preventDefault();
    toast.error(`Please log in to view ${featureLabel}.`);
    router.push(`/login?redirect=${encodeURIComponent(targetPath)}`);
  };

  const fetchListings = async () => {
    try {
      const params = new URLSearchParams();
      if (search)      params.set('search', search);
      if (listingType) params.set('listingType', listingType);
      if (showSold)    params.set('showSold', 'true');
      const res = await api.get(`/marketplace/listings?${params}`);
      if (res.data.success) setItems(res.data.data?.items || res.data.data || []);
    } catch {
      toast.error('Could not load listings. Please try again.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (listingType) params.set('listingType', listingType);
        if (showSold) params.set('showSold', 'true');

        const res = await api.get(`/marketplace/listings?${params}`);
        if (cancelled) return;

        if (res.data.success) {
          setItems(res.data.data?.items || res.data.data || []);
        } else {
          setItems([]);
        }
      } catch {
        if (!cancelled) {
          toast.error('Could not load listings. Please try again.');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingType, showSold]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.title, item.description, item.category, item.department]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [items, search]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    await fetchListings();
    if (accessToken) {
      try {
        await api.post('/marketplace/search-log', { search });
      } catch { /* optional */ }
    }
  };

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>Marketplace</h1>
            <p className={styles.pageSubtitle}>
              Buy, sell, rent, or exchange items across campus.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <Link href="/marketplace/general" className={styles.btnOutline}>
              General items
            </Link>
            <Link href="/marketplace/textbooks" className={styles.btnOutline}>
              <BookOpen size={15} /> Textbooks
            </Link>
            <Link
              href="/marketplace/my-requests"
              className={styles.btnOutline}
              onClick={(e) => requireLoginBeforeNavigate(e, '/marketplace/my-requests', 'My Requests')}
            >
              My Requests
            </Link>
            <Link
              href="/marketplace/recommendations"
              className={styles.btnOutline}
              onClick={(e) => requireLoginBeforeNavigate(e, '/marketplace/recommendations', 'Recommendations for You')}
            >
              Recommended
            </Link>
            <Link
              href="/marketplace/my-listings"
              className={styles.btnOutline}
              onClick={(e) => requireLoginBeforeNavigate(e, '/marketplace/my-listings', 'My Listings')}
            >
              My Listings
            </Link>
            {user && (
              <Link href="/marketplace/create" className={styles.btnPrimary}>
                <PlusCircle size={16} /> New Listing
              </Link>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className={styles.filterBar}>
          <form onSubmit={handleSearch}>
            <div className={styles.filterRow}>
              <div className={styles.searchWrap}>
                <Search size={16} className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Search general items or textbooks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="submit" className={styles.btnPrimary} style={{ padding: '0.6rem 1.1rem' }}>
                Search
              </button>
            </div>
          </form>

          {/* Listing type filters for current hub view */}
          <div className={styles.pillGroup} style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className={styles.pillGroup}>
              {TYPES.map(({ label, value }) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.pill} ${listingType === value ? styles.pillActive : ''}`}
                  onClick={() => {
                    setLoading(true);
                    setListingType(value);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none' }}>
              <input 
                type="checkbox" 
                checked={showSold} 
                onChange={(e) => {
                  setLoading(true);
                  setShowSold(e.target.checked);
                }} 
              />
              Show Sold Items
            </label>
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <p className={styles.resultsCount}>
            {filtered.length} listing{filtered.length !== 1 ? 's' : ''} found
            {listingType ? ` · filtered` : ''}
          </p>
        )}

        {/* Loading */}
        {loading && <SkeletonCards />}

        {/* Grid */}
        {!loading && (
          <div className={styles.grid}>
            {filtered.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}><ShoppingBag size={48} /></div>
                <p className={styles.emptyTitle}>No listings found</p>
                <p className={styles.emptyText}>
                  Try a different search term or category filter.
                </p>
                {user && (
                  <Link href="/marketplace/create" className={styles.btnPrimary}>
                    <PlusCircle size={16} /> Be the first to list something
                  </Link>
                )}
              </div>
            ) : (
              filtered.map((item) => {
                const priceBadgeClass = getPriceBadgeClass(item, styles);
                const priceText = formatPrice(item);
                const initials = getInitials(item.seller?.name || item.owner?.name || '');
                const sellerName = item.seller?.name || item.owner?.name || 'Campus member';
                return (
                  <div key={item._id} className={styles.card}>
                    <div className={styles.cardImageWrap}>
                      {item.images?.length ? (
                        <ImageCarousel
                          images={item.images}
                          alt={item.title}
                          imageClassName={styles.cardImage}
                          showDots={false}
                        />
                      ) : (
                        <div className={`${styles.cardImagePlaceholder} ${getCategoryFallback(item.category, styles)}`}>
                          {getCategoryIcon(item.category)}
                        </div>
                      )}
                      <span className={`${styles.cardBadge} ${priceBadgeClass}`}>
                        <Tag size={10} /> {item.listingType || 'Sale'}
                      </span>
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

                    <div className={styles.cardBody}>
                      <p className={styles.cardCategory}>
                        {item.category || 'General'}
                        {item.department ? ` · ${item.department}` : ''}
                      </p>
                      <p className={styles.cardTitle}>{item.title}</p>

                      <p className={`${styles.cardPrice} ${priceText === 'Free' ? styles.cardPriceFree : ''}`}>
                        {priceText}
                      </p>

                      <div className={styles.ownerRow}>
                        <div className={styles.ownerAvatar}>{initials || '?'}</div>
                        <span className={styles.ownerName}>{sellerName}</span>
                      </div>

                      <div className={styles.cardActions}>
                        <Link href={`/marketplace/${item._id}`} className={styles.cardBtn}>
                          View Details <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>
    </div>
  );
}
