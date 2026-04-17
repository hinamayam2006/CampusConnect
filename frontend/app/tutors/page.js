'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useRequireAuth from '../../lib/useRequireAuth';
import Pagination from '../../components/Pagination';
import { fetchTutors } from '../../lib/apiRequests';
import styles from '../tutoring/tutoring.module.css';

export default function TutorsPage() {
  const { isReady } = useRequireAuth();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [priceFilter, setPriceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('rating');
  const [availabilityOnly, setAvailabilityOnly] = useState(false);
  const [minRating, setMinRating] = useState('0');
  const [dayFilter, setDayFilter] = useState('all');
  const [maxRate, setMaxRate] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(id);
  }, [q]);

  const params = useMemo(() => {
    const trimmed = debouncedQ.trim();
    return trimmed ? { q: trimmed, page, limit: 12 } : { page, limit: 12 };
  }, [debouncedQ, page]);

  const filteredItems = useMemo(() => {
    let next = [...items];

    if (priceFilter === 'free') {
      next = next.filter((t) => t.isFree);
    } else if (priceFilter === 'paid') {
      next = next.filter((t) => !t.isFree);
    }

    if (availabilityOnly) {
      next = next.filter((t) => (t.availabilitySlots || []).length > 0);
    }

    const minR = Number(minRating);
    if (minR > 0) {
      next = next.filter((t) => (t.averageRating || 0) >= minR);
    }

    if (dayFilter !== 'all') {
      const dayNum = Number(dayFilter);
      next = next.filter((t) =>
        (t.availabilitySlots || []).some((s) => s.day === dayNum)
      );
    }

    if (maxRate && Number(maxRate) > 0) {
      next = next.filter((t) => t.isFree || (t.hourlyRate || 0) <= Number(maxRate));
    }

    if (sortBy === 'rating') {
      next.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    } else if (sortBy === 'sessions') {
      next.sort((a, b) => (b.totalSessions || 0) - (a.totalSessions || 0));
    } else if (sortBy === 'rate') {
      next.sort((a, b) => (a.hourlyRate || 0) - (b.hourlyRate || 0));
    } else if (sortBy === 'newest') {
      next.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return next;
  }, [items, priceFilter, availabilityOnly, sortBy, minRating, dayFilter, maxRate]);

  const pageStats = useMemo(() => {
    const totalShown = filteredItems.length;
    const freeCount = filteredItems.filter((t) => t.isFree).length;
    const avgRating = totalShown
      ? filteredItems.reduce((sum, t) => sum + (t.averageRating || 0), 0) / totalShown
      : 0;
    return { totalShown, freeCount, avgRating };
  }, [filteredItems]);

  useEffect(() => {
    if (!isReady) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchTutors(params);
        if (!cancelled) {
          setItems(res.data?.items || []);
          setTotalPages(res.data?.totalPages || 1);
          setTotal(res.data?.total || 0);
        }
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || err.message || 'Failed to load tutors');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, isReady]);

  if (!isReady) {
    return (
      <div className={styles.page}>
        <div className="container">
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeleton} style={{ width: '60%', height: 18, marginBottom: 10 }} />
                <div className={styles.skeleton} style={{ width: '40%', height: 14 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={`container ${styles.container}`}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Find your perfect tutor</h1>
            <p className={styles.pageSubtitle}>Compare courses, ratings, and availability in one place.</p>
          </div>
          <div className={styles.actionRow}>
            <Link href="/tutors/become" className={styles.btnPrimary}>
              Become a tutor
            </Link>
            <Link href="/tutoring" className={styles.btnSecondary}>
              Tutoring hub
            </Link>
          </div>
        </div>

        <div className={styles.surfaceCard} style={{ marginBottom: '0.75rem', padding: '0.85rem 1rem' }}>
          <div className={styles.filterBar}>
            <input
              className={styles.searchInput}
              placeholder="Search course, bio, or name…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
            <div className={styles.filterGroup}>
              <select
                className={styles.filterSelect}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="rating">Sort: Rating</option>
                <option value="sessions">Sort: Sessions</option>
                <option value="rate">Sort: Rate ↑</option>
                <option value="newest">Sort: Newest</option>
              </select>
              <select
                className={styles.filterSelect}
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
              >
                <option value="all">All prices</option>
                <option value="free">Free only</option>
                <option value="paid">Paid only</option>
              </select>
              <select
                className={styles.filterSelect}
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
              >
                <option value="0">Any rating</option>
                <option value="3">3+ ⭐</option>
                <option value="3.5">3.5+ ⭐</option>
                <option value="4">4+ ⭐</option>
                <option value="4.5">4.5+ ⭐</option>
              </select>
              <select
                className={styles.filterSelect}
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value)}
              >
                <option value="all">Any day</option>
                <option value="0">Sunday</option>
                <option value="1">Monday</option>
                <option value="2">Tuesday</option>
                <option value="3">Wednesday</option>
                <option value="4">Thursday</option>
                <option value="5">Friday</option>
                <option value="6">Saturday</option>
              </select>
              <input
                type="number"
                className={styles.filterInput}
                placeholder="Max rate"
                value={maxRate}
                min="0"
                onChange={(e) => setMaxRate(e.target.value)}
              />
              <label className={styles.filterChip} style={{ cursor: 'pointer', gap: '0.35rem' }}>
                <input
                  type="checkbox"
                  checked={availabilityOnly}
                  onChange={(e) => setAvailabilityOnly(e.target.checked)}
                  style={{ accentColor: 'var(--cc-primary)' }}
                />
                Has slots
              </label>
            </div>
            <span style={{ whiteSpace: 'nowrap', fontSize: '0.8rem', fontWeight: 600, color: 'var(--cc-muted)' }}>
              {loading ? 'Loading…' : `${total} found`}
            </span>
          </div>
          {(priceFilter !== 'all' || minRating !== '0' || dayFilter !== 'all' || maxRate || availabilityOnly || q) && (
            <div className={styles.activeFilters}>
              <span style={{ fontSize: '0.72rem', color: 'var(--cc-muted)', fontWeight: 600 }}>Active:</span>
              {priceFilter !== 'all' && <span className={styles.activeFilterTag}>{priceFilter === 'free' ? 'Free' : 'Paid'}</span>}
              {minRating !== '0' && <span className={styles.activeFilterTag}>{minRating}+ ⭐</span>}
              {dayFilter !== 'all' && <span className={styles.activeFilterTag}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayFilter]}</span>}
              {maxRate && <span className={styles.activeFilterTag}>≤ Rs {maxRate}/hr</span>}
              {availabilityOnly && <span className={styles.activeFilterTag}>Has slots</span>}
              {q && <span className={styles.activeFilterTag}>&ldquo;{q}&rdquo;</span>}
              <button
                type="button"
                className={`${styles.btnOutlineDanger} ${styles.btnSmall}`}
                style={{ padding: '0.15rem 0.5rem', fontSize: '0.72rem' }}
                onClick={() => {
                  setPriceFilter('all');
                  setSortBy('rating');
                  setAvailabilityOnly(false);
                  setMinRating('0');
                  setDayFilter('all');
                  setMaxRate('');
                  setQ('');
                }}
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {!loading && (
          <div className={styles.statGrid} style={{ marginBottom: '0.75rem' }}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{pageStats.totalShown}</div>
              <div className={styles.statLabel}>Showing</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{pageStats.freeCount}</div>
              <div className={styles.statLabel}>Free</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{pageStats.avgRating.toFixed(1)}</div>
              <div className={styles.statLabel}>Avg Rating</div>
            </div>
          </div>
        )}

        {error && <div className={styles.alertDanger}>{error}</div>}

        <div className={styles.cardGrid}>
          {loading && (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={`sk-${idx}`}>
                <div className={styles.skeletonCard}>
                  <div style={{ display: 'flex', gap: '0.6rem', marginBottom: 10 }}>
                    <div className={styles.skeleton} style={{ width: 40, height: 40, borderRadius: '50%' }} />
                    <div style={{ flex: 1 }}>
                      <div className={styles.skeleton} style={{ width: '65%', height: 14, marginBottom: 5 }} />
                      <div className={styles.skeleton} style={{ width: '40%', height: 11 }} />
                    </div>
                  </div>
                  <div className={styles.skeleton} style={{ width: '85%', height: 12, marginBottom: 6 }} />
                  <div className={styles.skeleton} style={{ width: '55%', height: 12, marginBottom: 10 }} />
                  <div className={styles.skeleton} style={{ width: '35%', height: 28, borderRadius: 999 }} />
                </div>
              </div>
            ))
          )}

          {!loading && filteredItems.map((t) => (
            <div key={t._id} className={styles.tutorCard}>
              <div className={styles.tutorCardHeader}>
                {t.user?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.user.avatar} alt={t.user?.name || 'Tutor'} className={styles.avatar} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '50%' }} />
                ) : (
                  <div className={styles.avatar} style={{ width: 40, height: 40, fontSize: '0.9rem' }}>
                    {String(t.user?.name || 'T').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className={styles.tutorCardHeaderInfo}>
                  <h5 className={styles.tutorCardName}>{t.user?.name || 'Tutor'}</h5>
                  <div className={styles.tutorCardDept}>
                    {t.user?.department || ''}{t.user?.year ? ` · Year ${t.user.year}` : ''}
                  </div>
                </div>
                <div className={styles.ratePill}>
                  {t.isFree ? 'Free' : `Rs ${t.hourlyRate}/hr`}
                </div>
              </div>

              {(t.courses || []).length > 0 && (
                <div className={styles.tagRow} style={{ marginBottom: '0.4rem' }}>
                  {(t.courses || []).slice(0, 3).map((c) => (
                    <span key={c} className={styles.tag}>{c}</span>
                  ))}
                  {(t.courses || []).length > 3 && (
                    <span className={`${styles.tag} ${styles.tagSoft}`}>+{(t.courses || []).length - 3}</span>
                  )}
                </div>
              )}

              <p className={styles.tutorCardBio}>
                {String(t.bio || 'No bio available.').slice(0, 100)}{String(t.bio || '').length > 100 ? '…' : ''}
              </p>

              <div className={styles.metaRow} style={{ marginBottom: '0.6rem' }}>
                <span>⭐ {Number(t.averageRating || 0).toFixed(1)}</span>
                <span>{t.totalSessions || 0} sessions</span>
                {(t.availabilitySlots || []).length > 0 && (
                  <span>{t.availabilitySlots.length} slots</span>
                )}
              </div>

              <div className={styles.tutorCardFooter}>
                <Link href={`/tutors/${t._id}`} className={`${styles.btnPrimary} ${styles.btnSmall}`} style={{ flex: 1 }}>View Profile</Link>
                <Link href={`/tutors/${t._id}/book`} className={`${styles.btnSecondary} ${styles.btnSmall}`}>Book</Link>
              </div>
            </div>
          ))}

          {!loading && !filteredItems.length && !error && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>🔍</div>
                <div className={styles.emptyStateTitle}>No tutors match these filters</div>
                <div className={styles.emptyStateText}>Try changing the price filter, search term, or slot requirement.</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`${styles.btnSecondary} ${styles.btnSmall}`}
                    onClick={() => {
                      setPriceFilter('all');
                      setSortBy('rating');
                      setAvailabilityOnly(false);
                      setMinRating('0');
                      setDayFilter('all');
                      setMaxRate('');
                      setQ('');
                    }}
                  >
                    Reset filters
                  </button>
                  <Link href="/tutors/become" className={`${styles.btnPrimary} ${styles.btnSmall}`}>Become a tutor</Link>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="d-flex justify-content-center mt-4">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}
