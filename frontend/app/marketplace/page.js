// marketplace/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  PlusCircle,
  ShoppingBag,
  Tag,
  ArrowRight,
  Package,
  BookOpen,
  Monitor,
  Sofa,
  Shirt,
  UtensilsCrossed,
  LayoutGrid,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import useStore from '../../store/useStore';
import styles from '../community.module.css';

const CATEGORIES = [
  { label: 'All',         value: '',            icon: LayoutGrid },
  { label: 'Books',       value: 'books',       icon: BookOpen },
  { label: 'Electronics', value: 'electronics', icon: Monitor },
  { label: 'Furniture',   value: 'furniture',   icon: Sofa },
  { label: 'Clothing',    value: 'clothing',    icon: Shirt },
  { label: 'Kitchen',     value: 'kitchen',     icon: UtensilsCrossed },
  { label: 'Other',       value: 'other',       icon: Package },
];

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
    books: styles.imgFallbackBooks,
    electronics: styles.imgFallbackElec,
    furniture: styles.imgFallbackFurniture,
    clothing: styles.imgFallbackClothing,
    kitchen: styles.imgFallbackKitchen,
  };
  return map[(category || '').toLowerCase()] || styles.imgFallbackDefault;
}

function getCategoryIcon(category) {
  const map = { books: BookOpen, electronics: Monitor, furniture: Sofa, clothing: Shirt, kitchen: UtensilsCrossed };
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
  const { user, accessToken } = useStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [listingType, setListingType] = useState('');

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)      params.set('search', search);
      if (category)    params.set('category', category);
      if (listingType) params.set('listingType', listingType);
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
    fetchListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, listingType]);

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
    await fetchListings();
    if (accessToken) {
      try {
        await api.post('/marketplace/search-log', { search, category });
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
            <Link href="/marketplace/my-listings" className={styles.btnOutline}>
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
                  placeholder="Search listings, electronics, books..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button type="submit" className={styles.btnPrimary} style={{ padding: '0.6rem 1.1rem' }}>
                Search
              </button>
            </div>
          </form>

          {/* Category Pills */}
          <div className={styles.pillGroup} style={{ marginTop: '0.75rem' }}>
            {CATEGORIES.map(({ label, value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                className={`${styles.pill} ${category === value ? styles.pillActive : ''}`}
                onClick={() => { setCategory(value); }}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
            <div className={styles.filterDivider} />
            {TYPES.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                className={`${styles.pill} ${listingType === value ? styles.pillActive : ''}`}
                onClick={() => setListingType(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <p className={styles.resultsCount}>
            {filtered.length} listing{filtered.length !== 1 ? 's' : ''} found
            {(category || listingType) ? ` · filtered` : ''}
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
                const img = item.images?.[0];
                const priceBadgeClass = getPriceBadgeClass(item, styles);
                const priceText = formatPrice(item);
                const initials = getInitials(item.seller?.name || item.owner?.name || '');
                const sellerName = item.seller?.name || item.owner?.name || 'Campus member';
                return (
                  <div key={item._id} className={styles.card}>
                    <div className={styles.cardImageWrap}>
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={item.title} className={styles.cardImage} />
                      ) : (
                        <div className={`${styles.cardImagePlaceholder} ${getCategoryFallback(item.category, styles)}`}>
                          {getCategoryIcon(item.category)}
                        </div>
                      )}
                      <span className={`${styles.cardBadge} ${priceBadgeClass}`}>
                        <Tag size={10} /> {item.listingType || 'Sale'}
                      </span>
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

        {/* Quick Links */}
        {!loading && (
          <div style={{ marginTop: '2.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/marketplace/textbooks" className={styles.btnOutline}>
              <BookOpen size={15} /> Textbooks
            </Link>
            <Link href="/marketplace/my-requests" className={styles.btnOutline}>
              My Requests
            </Link>
            <Link href="/marketplace/recommendations" className={styles.btnOutline}>
              Recommended for You
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
