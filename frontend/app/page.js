'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { useUserRoles } from '../context/UserRoleContext';
import api from '../lib/api';
import {
  ShoppingBag,
  BookOpen,
  Car,
  Bell,
  BookMarked,
  TrendingUp,
  FileText,
  Upload,
  Package,
  Clipboard,
  Search,
  Download,
  ArrowUpRight,
} from 'lucide-react';
import styles from './home.module.css';

export default function Home() {
  const { user, accessToken, setUnreadCount } = useStore();
  const { isTutor, isLoadingRoles } = useUserRoles();

  const [particles, setParticles] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState({
    itemsForSale: 0,
    borrowRequests: 0,
    upcomingRides: 0,
    unreadNotifications: 0,
  });
  const fetchingDashboardRef = useRef(false);

  const [activities, setActivities] = useState([]);
  const [recentNotes, setRecentNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [upcomingRides, setUpcomingRides] = useState([]);
  const [ridesLoading, setRidesLoading] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // FIX: If logged out, reset loading immediately
      if (!user || !accessToken) {
        setStatsLoading(false);
        return;
      }

      if (fetchingDashboardRef.current) {
        return;
      }

      fetchingDashboardRef.current = true;

      try {
        setStatsLoading(true);
        setNotesLoading(true);
        setRidesLoading(true);
        const [statsRes, activityRes, notesRes, ridesRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/activity'),
          api.get('/notes?limit=6&page=1'),
          api.get('/rides?limit=4'),
        ]);

        if (statsRes.data.success) {
          setStats(statsRes.data.data);
          setUnreadCount(statsRes.data.data.unreadNotifications ?? 0);
        }
        if (activityRes.data.success) setActivities(activityRes.data.data);
        if (notesRes.data.success) setRecentNotes(notesRes.data.data?.items ?? []);
        const rawRides = ridesRes.data?.data?.items ?? ridesRes.data?.data ?? ridesRes.data?.items ?? [];
        setUpcomingRides(Array.isArray(rawRides) ? rawRides : []);
      } catch (err) {
        const status = err.response?.status || err.status;
        if (status === 429) {
          toast.error('Too many requests. Please wait a few seconds and try again.');
        } else {
          toast.error('Unable to load dashboard right now.');
        }
        console.error('Dashboard error:', err);
      } finally {
        setStatsLoading(false);
        setNotesLoading(false);
        setRidesLoading(false);
        fetchingDashboardRef.current = false;
      }
    };

    fetchDashboardData();
    // Fetch fresh data on mount and whenever user/token changes
  }, [user, accessToken, setUnreadCount]);

  // 2. Particle Logic
  const handleMouseMove = (e) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const p1 = {
      id: Date.now() + Math.random(),
      x: e.clientX + (Math.random() * 10 - 5),
      y: e.clientY + (Math.random() * 10 - 5),
      type: Math.random() > 0.5 ? 'sparkle' : 'dot',
      size: Math.random() * 8 + 3,
    };
    setParticles((prev) => [...prev.slice(-60), p1]);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setParticles((prev) => prev.filter((p) => Date.now() - p.id < 800));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // ═══════════════════════════════════════════════════════════
  // DASHBOARD RENDER
  // ═══════════════════════════════════════════════════════════
  if (user) {
    const firstName = user.name?.split(' ')[0] || 'User';

    const hour = new Date().getHours();
    const greeting =
      hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });

    const metricCards = [
      {
        label: 'Active Listings',
        value: stats.itemsForSale,
        icon: <ShoppingBag size={18} />,
        badge: stats.itemsForSale > 0 ? `${stats.itemsForSale} for sale` : 'None active',
        badgeColor: 'badge--blue',
      },
      {
        label: 'Upcoming Rides',
        value: stats.upcomingRides,
        icon: <Car size={18} />,
        badge: stats.upcomingRides > 0 ? `↑ ${stats.upcomingRides} today` : 'No rides',
        badgeColor: 'badge--green',
      },
      {
        label: 'Borrow Requests',
        value: stats.borrowRequests,
        icon: <Package size={18} />,
        badge: stats.borrowRequests > 0 ? `${stats.borrowRequests} pending` : 'None',
        badgeColor: 'badge--amber',
      },
      {
        label: 'Notifications',
        value: stats.unreadNotifications,
        icon: <Bell size={18} />,
        badge: stats.unreadNotifications > 0 ? `${stats.unreadNotifications} unread` : 'All read',
        badgeColor: stats.unreadNotifications > 0 ? 'badge--red' : 'badge--neutral',
      },
    ];

    const quickActions = [
      {
        label: 'Upload Note',
        href: '/notes/upload',
        icon: <Upload size={18} />,
        iconBg: '#2563EB',
      },
      {
        label: 'Post Ride',
        href: '/rides/create',
        icon: <Car size={18} />,
        iconBg: '#059669',
      },
      {
        label: 'Post Need',
        href: '/lostnfound/create',
        icon: <Clipboard size={18} />,
        iconBg: '#7C3AED',
      },
      {
        label: 'List Item',
        href: '/marketplace/create',
        icon: <ShoppingBag size={18} />,
        iconBg: '#D97706',
      },
    ];

    /* Note pill color derived from subject/tag */
    const pillColors = ['pill--blue', 'pill--amber', 'pill--green', 'pill--purple'];
    const getPillClass = (note, idx) => pillColors[idx % pillColors.length];
    const getPillLabel = (note) => {
      if (note.tags && note.tags.length > 0) return note.tags[0].toUpperCase();
      if (note.subject) return note.subject.slice(0, 12).toUpperCase();
      return 'NOTE';
    };

    return (
      <div className={styles['dashboard-container']}>

        {/* ── Top Header ── */}
        <header className={styles['dash-header']}>
          <div className={styles['dash-header__left']}>
            <h1 className={styles['dash-header__greeting']}>
              {greeting}, {firstName} <span className={styles['dash-star']}>✦</span>
            </h1>
            <p className={styles['dash-header__date']}>{today}</p>
          </div>
          <div className={styles['dash-header__right']}>
            <div className={styles['dash-search']}>
              <Search size={15} strokeWidth={2} className={styles['dash-search__icon']} />
              <input
                type="text"
                placeholder="Search CampusConnect…"
                className={styles['dash-search__input']}
                readOnly
              />
            </div>
            <Link href="/notifications" className={styles['dash-bell']} aria-label="Notifications">
              <Bell size={17} strokeWidth={1.8} />
              {stats.unreadNotifications > 0 && <span className={styles['dash-bell__dot']} />}
            </Link>
          </div>
        </header>

        {/* ── Metric Cards Row ── */}
        <div className={styles['metric-grid']}>
          {metricCards.map((card) => (
            <div key={card.label} className={styles['metric-card']}>
              <span className={`${styles['metric-card__badge']} ${styles[card.badgeColor]}`}>{statsLoading ? '…' : card.badge}</span>
              <div className={styles['metric-card__icon']}>{card.icon}</div>
              <span className={styles['metric-card__value']}>{statsLoading ? '—' : card.value}</span>
              <span className={styles['metric-card__label']}>{card.label}</span>
            </div>
          ))}
        </div>

        {/* ── Body: 2-column grid ── */}
        <div className={styles['dash-body']}>

          {/* Left column */}
          <div className={styles['dash-left']}>

            {/* Recent Notes & Papers */}
            <div className={styles['dash-section-card']}>
              <div className={styles['dash-section-card__header']}>
                <div className={styles['dash-section-card__title']}>
                  <FileText size={16} strokeWidth={1.8} />
                  Recent Notes &amp; Papers
                </div>
                <Link href="/notes" className={styles['dash-viewall']}>View all <ArrowUpRight size={13} /></Link>
              </div>

              {notesLoading ? (
                <p className={styles['dash-empty']}>Loading…</p>
              ) : recentNotes.length === 0 ? (
                <p className={styles['dash-empty']}>No notes uploaded yet.</p>
              ) : (
                <ul className={styles['notes-list']}>
                  {recentNotes.map((note, idx) => (
                    <li key={note._id} className={styles['notes-list__item']}>
                      <div className={styles['notes-list__icon']}>
                        <FileText size={16} strokeWidth={1.6} />
                      </div>
                      <div className={styles['notes-list__body']}>
                        <Link href={`/notes/${note._id}`} className={styles['notes-list__title']}>
                          {note.title}
                        </Link>
                        <span className={styles['notes-list__meta']}>
                          {note.course} · {note.uploadedBy?.name || 'Unknown'}
                        </span>
                      </div>
                      <span className={`${styles['notes-pill']} ${styles[getPillClass(note, idx)]}`}>
                        {getPillLabel(note)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Sub-dashboards row */}
            <div className={styles['sub-dash-grid']}>
              <Link href="/dashboard/student" className={styles['sub-dash-card']}>
                <BookOpen size={20} strokeWidth={1.7} />
                <span>My Bookings</span>
              </Link>
              {!isLoadingRoles && isTutor && (
                <Link href="/dashboard/tutor" className={`${styles['sub-dash-card']} ${styles['sub-dash-card--dark']}`}>
                  <BookMarked size={20} strokeWidth={1.7} />
                  <span>Tutor Centre</span>
                </Link>
              )}
              <Link href="/dashboard/uploader" className={styles['sub-dash-card']}>
                <Download size={20} strokeWidth={1.7} />
                <span>My Uploads</span>
              </Link>
              {!isLoadingRoles && isTutor && (
                <Link href="/dashboard/tutor/earnings" className={styles['sub-dash-card']}>
                  <TrendingUp size={20} strokeWidth={1.7} />
                  <span>Earnings</span>
                </Link>
              )}
            </div>

          </div>

          {/* Right column */}
          <aside className={styles['dash-right']}>

            {/* Quick Actions (dark box) */}
            <div className={styles['qa-box']}>
              <p className={styles['qa-box__eyebrow']}>Quick Actions</p>
              <div className={styles['qa-grid']}>
                {quickActions.map((action) => (
                  <Link key={action.label} href={action.href} className={styles['qa-item']}>
                    <span className={styles['qa-item__icon']} style={{ background: action.iconBg }}>
                      {action.icon}
                    </span>
                    <span className={styles['qa-item__label']}>{action.label}</span>
                  </Link>
                ))}
              </div>

              {/* Recent activity strip */}
              <div className={styles['qa-activity']}>
                <p className={styles['qa-activity__heading']}>Recent Activity</p>
                {activities.slice(0, 4).length === 0 ? (
                  <p className={styles['qa-activity__empty']}>No recent activity.</p>
                ) : (
                  activities.slice(0, 4).map((a) => (
                    <div key={a._id} className={styles['qa-activity__item']}>
                      <span className={styles['qa-activity__dot']} />
                      <span className={styles['qa-activity__text']}>
                        {a.link
                          ? <Link href={a.link}>{a.message}</Link>
                          : a.message}
                      </span>
                    </div>
                  ))
                )}
                {activities.length > 4 && (
                  <Link href="/notifications" className={styles['qa-activity__more']}>
                    View all activity <ArrowUpRight size={12} />
                  </Link>
                )}
              </div>
            </div>

            {/* Upcoming Rides Widget */}
            <div className={styles['dash-widget-card']}>
              <div className={styles['dash-widget-head']}>
                <span className={styles['dash-widget-title']}>
                  <Car size={14} strokeWidth={1.8} />
                  Upcoming Rides
                </span>
                <Link href="/rides" className={styles['dash-viewall']}>
                  View all <ArrowUpRight size={12} />
                </Link>
              </div>
              {ridesLoading ? (
                <p className={styles['dash-widget-empty']}>Loading…</p>
              ) : upcomingRides.length === 0 ? (
                <p className={styles['dash-widget-empty']}>No rides posted yet.</p>
              ) : (
                <div className={styles['dash-ride-list']}>
                  {upcomingRides.slice(0, 4).map((ride, idx) => {
                    const dotColors = ['#3B82F6', '#22C55E', '#92400E', '#8B5CF6'];
                    const dotColor = dotColors[idx % dotColors.length];
                    const seats = ride.seatsAvailable ?? ride.availableSeats ?? 0;
                    return (
                      <div key={ride._id} className={styles['dash-ride-item']}>
                        <span className={styles['dash-ride-dot']} style={{ background: dotColor }} />
                        <div className={styles['dash-ride-body']}>
                          <span className={styles['dash-ride-route']}>
                            {ride.from || ride.origin} → {ride.to || ride.destination}
                          </span>
                          <span className={styles['dash-ride-time']}>
                            {ride.departureTime
                              ? new Date(ride.departureTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
                              : ride.date
                              ? new Date(ride.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              : ''}
                          </span>
                        </div>
                        <span className={styles['dash-ride-seats']}>{seats} seat{seats !== 1 ? 's' : ''}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Your Trust Score — only shown when user has reviews */}
            {(() => {
              const rating = Number(user?.averageRating ?? stats?.averageRating ?? 0);
              if (rating === 0) return null;
              const reviewCount = user?.reviewCount ?? user?.totalReviews ?? null;
              const topLabel = rating >= 4.8 ? 'Top 5% in your department'
                : rating >= 4.5 ? 'Top 15% in your department'
                : rating >= 4.0 ? 'Top 30% in your department'
                : rating >= 3.5 ? 'Top 50% in your department'
                : null;
              const pct = (rating / 5) * 100;
              return (
                <div className={styles['dash-trust-card']}>
                  <div className={styles['dash-trust-header']}>
                    <span className={styles['dash-trust-title']}>Your Trust Score</span>
                    {reviewCount != null && (
                      <span className={styles['dash-trust-review-count']}>Based on {reviewCount} review{reviewCount !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                  <div className={styles['dash-trust-score']}>
                    {rating.toFixed(1)}
                    <span className={styles['dash-trust-star']}>★</span>
                  </div>
                  <div className={styles['dash-trust-bar-track']}>
                    <div
                      className={styles['dash-trust-bar-fill']}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className={styles['dash-trust-sub']}>
                    {topLabel || 'Based on your reviews & activity'}
                  </p>
                </div>
              );
            })()}

          </aside>

        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // LANDING PAGE RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className={styles['landing-container']} onMouseMove={handleMouseMove}>
      <div className={styles['star-field']}>
        <div className={styles['stars-sm']}></div>
        <div className={styles['stars-md']}></div>
        <div className={styles['stars-lg']}></div>
      </div>
      {particles.map((p) => (
        <div
          key={p.id}
          className={`${styles.particle} ${styles[p.type]}`}
          style={{ left: p.x, top: p.y, width: p.size, height: p.size }}
        />
      ))}
      <div className={styles['landing-content']}>
        <h1 className={styles['landing-title']}>CampusConnect</h1>
        <p className={styles['landing-subtitle']}>
          Buy, sell, borrow, carpool, and share notes — all in one place for students.
        </p>
        <div className={styles['landing-actions']}>
          <Link href="/register" className="btn btn-primary">
            Get Started
          </Link>
          <Link href="/marketplace" className="btn btn-secondary">
            Browse Listings
          </Link>
        </div>
      </div>
    </div>
  );
}