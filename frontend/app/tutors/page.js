'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, GraduationCap, ArrowRight, Star } from 'lucide-react';
import styles from '../tutoring/tutoring.module.css';
import { fetchTutors } from '../../lib/apiRequests';
import useRequireAuth from '../../lib/useRequireAuth';
import StarRating from '../../components/StarRating';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function TutorCard({ tutor }) {
  const subjects = tutor.subjects || tutor.courses || [];
  const hourlyRate = tutor.hourlyRate;
  const isFree = tutor.isFree || hourlyRate === 0;

  return (
    <div className={styles.tutorCard}>
      <div className={styles.tutorCardTop}>
        <div className={styles.tutorAvatar}>
          {tutor.user?.avatar
            ? <img src={tutor.user.avatar} alt={tutor.user?.name} className={styles.tutorAvatarImg} />
            : initials(tutor.user?.name)
          }
        </div>
        <div className={styles.tutorInfo}>
          <h3 className={styles.tutorName}>{tutor.user?.name || 'Tutor'}</h3>
          <div className={styles.tutorMeta}>
            {tutor.user?.department && <span className={styles.tutorDept}>{tutor.user.department}</span>}
            {isFree
              ? <span className={styles.tutorFreeBadge}>Free</span>
              : hourlyRate > 0
                ? <span className={styles.tutorPaidBadge}>PKR {hourlyRate}/hr</span>
                : null
            }
          </div>
          {tutor.averageRating > 0 && (
            <div className={styles.tutorRating}>
              <StarRating value={tutor.averageRating} size={12} readOnly />
              <span className={styles.tutorRatingVal}>{tutor.averageRating.toFixed(1)}</span>
              {tutor.reviewCount > 0 && <span className={styles.tutorRatingCount}>({tutor.reviewCount})</span>}
            </div>
          )}
        </div>
      </div>
      <div className={styles.tutorCardBody}>
        {tutor.bio && <p className={styles.tutorBio}>{tutor.bio}</p>}
        {subjects.length > 0 && (
          <div className={styles.subjectList}>
            {subjects.slice(0, 4).map((s, i) => (
              <span key={i} className={styles.subjectPill}>{s}</span>
            ))}
            {subjects.length > 4 && <span className={styles.subjectPill}>+{subjects.length - 4}</span>}
          </div>
        )}
      </div>
      <div className={styles.tutorCardFooter}>
        {isFree
          ? <span className={styles.tutorRate} style={{ color: '#16A34A' }}>Free</span>
          : hourlyRate > 0
            ? <span className={styles.tutorRate}>PKR {hourlyRate}/hr</span>
            : <span className={styles.tutorRate} style={{ color: '#9E9E9E' }}>Rate on request</span>
        }
        <Link href={'/tutors/' + tutor._id} className={styles.btnPrimary} style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>
          View Profile <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

export default function TutorsPage() {
  useRequireAuth();
  const [tutors, setTutors]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [q, setQ]                     = useState('');
  const [sortBy, setSortBy]           = useState('rating');
  const [availOnly, setAvailOnly]     = useState(false);
  const [freeOnly, setFreeOnly]       = useState(false);
  const [maxRate, setMaxRate]         = useState('');
  const [dayFilter, setDayFilter]     = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchTutors({ sort: sortBy });
        const raw = res?.data?.data?.items ?? res?.data?.items ?? res?.data?.data ?? res?.data ?? [];
        setTutors(Array.isArray(raw) ? raw : []);
      } catch {
        setError('Could not load tutors.');
      } finally {
        setLoading(false);
      }
    })();
  }, [sortBy]);

  const filtered = useMemo(() => {
    let list = [...tutors];
    if (q) {
      const lq = q.toLowerCase();
      list = list.filter((t) =>
        t.user?.name?.toLowerCase().includes(lq) ||
        (t.subjects || t.courses || []).some((s) => s.toLowerCase().includes(lq)) ||
        t.bio?.toLowerCase().includes(lq)
      );
    }
    if (availOnly) list = list.filter((t) => t.availabilitySlots && t.availabilitySlots.length > 0);
    if (freeOnly)  list = list.filter((t) => t.isFree || t.hourlyRate === 0);
    if (maxRate)   list = list.filter((t) => t.isFree || t.hourlyRate <= Number(maxRate));
    if (dayFilter) list = list.filter((t) => (t.availabilitySlots || []).some((s) => s.day === dayFilter));
    return list;
  }, [tutors, q, availOnly, freeOnly, maxRate, dayFilter]);

  const skeletons = Array.from({ length: 6 }, (_, i) => (
    <div key={i} className={styles.skeleton} style={{ height: 240 }} />
  ));

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Find a Tutor</h1>
            <p className={styles.pageSubtitle}>Connect with students offering peer-to-peer tutoring sessions.</p>
          </div>
          <div className={styles.actionRow}>
            <Link href="/tutors/become" className={styles.btnSecondary}><GraduationCap size={15} /> Become a Tutor</Link>
            <Link href="/tutoring" className={styles.btnPrimary}>My Sessions <ArrowRight size={14} /></Link>
          </div>
        </div>

        <div className={styles.filterBar}>
          <div className={styles.searchWrap}>
            <Search size={14} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Search by name, subject, department…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Sort:</span>
            <select className={styles.filterSelect} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="rating">Top Rated</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="recent">Newest</option>
            </select>
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Day:</span>
            <select className={styles.filterSelect} value={dayFilter} onChange={(e) => setDayFilter(e.target.value)}>
              <option value="">Any Day</option>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className={styles.pillGroup}>
            <button
              type="button"
              className={freeOnly ? `${styles.pill} ${styles.pillActive}` : styles.pill}
              onClick={() => setFreeOnly((v) => !v)}
            >Free Only</button>
            <button
              type="button"
              className={availOnly ? `${styles.pill} ${styles.pillActive}` : styles.pill}
              onClick={() => setAvailOnly((v) => !v)}
            >Available</button>
          </div>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}
        {!loading && !error && <p className={styles.resultsCount}>{filtered.length} tutor{filtered.length !== 1 ? 's' : ''} found</p>}

        {loading ? (
          <div className={styles.grid}>{skeletons}</div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <GraduationCap size={40} className={styles.emptyIcon} />
            <h3 className={styles.emptyStateTitle}>No tutors found</h3>
            <p className={styles.emptyStateText}>Try changing your filters or be the first to offer tutoring.</p>
            <Link href="/tutors/become" className={styles.btnPrimary}>Become a Tutor <ArrowRight size={14} /></Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((t) => <TutorCard key={t._id} tutor={t} />)}
          </div>
        )}
      </div>
    </div>
  );
}
