'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import { useUserRoles } from '../context/UserRoleContext';
import api from '../lib/api';
import { resolveNotificationTarget } from '../lib/apiRequests';
import {
  ShoppingBag,
  BookOpen,
  Car,
  Bell,
  BookMarked,
  TrendingUp,
  Upload,
  Package,
  Clipboard,
  Search,
  Download,
  ArrowUpRight,
  ShieldCheck,
  PenLine,
  BookOpenText,
  CarFront,
  Package2,
} from 'lucide-react';
import styles from './home.module.css';

export default function Home() {
  const router = useRouter();
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
  const [upcomingRides, setUpcomingRides] = useState([]);
  const [ridesLoading, setRidesLoading] = useState(false);
  const [dashboardSearch, setDashboardSearch] = useState('');

  const landingFeatures = [
    {
      title: 'Marketplace',
      value: 'Buy and sell essentials in seconds.',
      href: '/marketplace',
      icon: <ShoppingBag size={18} />,
    },
    {
      title: 'Notes & tutors',
      value: 'Find notes and study support fast.',
      href: '/notes',
      icon: <BookOpen size={18} />,
    },
    {
      title: 'Rides & requests',
      value: 'Coordinate trips and requests clearly.',
      href: '/rides',
      icon: <Car size={18} />,
    },
    {
      title: 'Lost and Found',
      value: 'Report lost items and reunite with your gear.',
      href: '/register',
      icon: <ShieldCheck size={18} />,
    },
  ];

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
        setRidesLoading(true);
        const [statsRes, activityRes, ridesRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/activity'),
          api.get('/rides?limit=4'),
        ]);

        if (statsRes.data.success) {
          setStats(statsRes.data.data);
          setUnreadCount(statsRes.data.data.unreadNotifications ?? 0);
        }
        if (activityRes.data.success) setActivities(activityRes.data.data);
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

  const openDashboardNotification = async (item) => {
    if (!item?.link) return;

    if (item.kind === 'notification') {
      try {
        const response = await resolveNotificationTarget(item._id);
        const targetPath = response?.data?.path;
        if (targetPath) {
          router.push(targetPath);
          return;
        }
      } catch (error) {
        toast.error(error?.message || 'This notification no longer has a valid destination.');
        router.push('/notifications');
        return;
      }
    }

    router.push(item.link);
  };

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

    const filteredNotifications = activities.filter((item) => {
      const query = dashboardSearch.trim().toLowerCase();
      if (!query) return true;
      return [item.message, item.link].filter(Boolean).join(' ').toLowerCase().includes(query);
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
        label: 'Post Lost/Found',
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

    return (
      <div className={styles['dashboard-container']}>

        {/* ── Top Header ── */}
        <header className={styles['dash-header']}>
          <div className={styles['dash-header__left']}>
            <h1 className={styles['dash-header__greeting']}>
              {greeting}, {firstName}
            </h1>
            <p className={styles['dash-header__date']}>{today}</p>
          </div>
          <div className={styles['dash-header__right']}>
            <div className={styles['dash-search']}>
              <Search size={15} strokeWidth={2} className={styles['dash-search__icon']} />
              <input
                type="search"
                placeholder="Search dashboard…"
                className={styles['dash-search__input']}
                value={dashboardSearch}
                onChange={(e) => setDashboardSearch(e.target.value)}
                aria-label="Search dashboard"
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

            {/* Recent Notifications */}
            <div className={styles['dash-section-card']}>
              <div className={styles['dash-section-card__header']}>
                <div className={styles['dash-section-card__title']}>
                  <Bell size={16} strokeWidth={1.8} />
                  Recent Notifications
                </div>
                <Link href="/notifications" className={styles['dash-viewall']}>View all <ArrowUpRight size={13} /></Link>
              </div>

              {statsLoading ? (
                <p className={styles['dash-empty']}>Loading…</p>
              ) : filteredNotifications.length === 0 ? (
                <p className={styles['dash-empty']}>No recent notifications.</p>
              ) : (
                <ul className={styles['notifications-list']}>
                  {filteredNotifications.slice(0, 6).map((item) => (
                    <li key={item._id} className={styles['notifications-list__item']}>
                      <span className={styles['notifications-list__dot']} />
                      <div className={styles['notifications-list__body']}>
                        {item.link ? (
                          <button
                            type="button"
                            className={styles['notifications-list__titleButton']}
                            onClick={() => openDashboardNotification(item)}
                          >
                            {item.message}
                          </button>
                        ) : (
                          <p className={styles['notifications-list__title']}>{item.message}</p>
                        )}
                        <span className={styles['notifications-list__meta']}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Just now'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Shortcuts */}
            <div className={styles['dashboard-shortcuts']}>
              <div className={styles['dashboard-shortcuts__header']}>
                <p className={styles['dashboard-shortcuts__eyebrow']}>Your Spaces</p>
                <p className={styles['dashboard-shortcuts__sub']}>Jump back into the parts you use most often.</p>
              </div>
              <div className={styles['dashboard-shortcuts__grid']}>
                <Link href="/dashboard/student" className={styles['sub-dash-card']}>
                  <BookOpen size={20} strokeWidth={1.7} />
                  <span>My Bookings (Student)</span>
                </Link>
                <Link href="/dashboard/uploader" className={styles['sub-dash-card']}>
                  <Download size={20} strokeWidth={1.7} />
                  <span>My Uploads</span>
                </Link>
                {!isLoadingRoles && isTutor && (
                  <Link href="/dashboard/tutor" className={styles['sub-dash-card']}>
                    <BookMarked size={20} strokeWidth={1.7} />
                    <span>Tutor Centre</span>
                  </Link>
                )}
                {!isLoadingRoles && isTutor && (
                  <Link href="/dashboard/tutor/earnings" className={styles['sub-dash-card']}>
                    <TrendingUp size={20} strokeWidth={1.7} />
                    <span>Earnings</span>
                  </Link>
                )}
              </div>
            </div>

          </div>

          {/* Right column */}
          <aside className={styles['dash-right']}>

            {/* Quick Actions (dark box) */}
            <div className={styles['qa-box']}>
              <div className={styles['qa-box__head']}>
                <p className={styles['qa-box__eyebrow']}>Quick Actions</p>
                <p className={styles['qa-box__sub']}>Shortcuts to the most-used campus tools</p>
              </div>
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
                            {ride.originName || ride.from || ride.origin} → {ride.destName || ride.to || ride.destination}
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
      <div className={styles['landing-doodles']} aria-hidden="true">
        <PenLine className={`${styles['doodle']} ${styles['doodle--top-left']}`} size={70} strokeWidth={1.6} />
        <BookOpenText className={`${styles['doodle']} ${styles['doodle--top-right']}`} size={84} strokeWidth={1.6} />
        <CarFront className={`${styles['doodle']} ${styles['doodle--bottom-left']}`} size={78} strokeWidth={1.6} />
        <Package2 className={`${styles['doodle']} ${styles['doodle--bottom-right']}`} size={72} strokeWidth={1.6} />
      </div>
      {particles.map((p) => (
        <div
          key={p.id}
          className={`${styles.particle} ${styles[p.type]}`}
          style={{ left: p.x, top: p.y, width: p.size, height: p.size }}
        />
      ))}
      <div className={styles['landing-shell']}>
        <section className={styles['landing-hero']}>
          <div className={styles['landing-content']}>
            <h1 className={styles['landing-title']}>CampusConnect</h1>
            <p className={styles['landing-subtitle']}>
              Buy, sell, borrow, carpool, and share notes without jumping between apps.
              Everything stays in one student-focused space.
            </p>
            <div className={styles['landing-actions']}>
              <Link href="/register" className={`${styles['landing-btn']} ${styles['landing-btn--primary']}`}>
                Get Started
              </Link>
              <Link href="/marketplace" className={`${styles['landing-btn']} ${styles['landing-btn--secondary']}`}>
                Browse Listings
              </Link>
            </div>
          </div>
        </section>

        <section className={styles['landing-features']} aria-label="CampusConnect features">
          <div className={styles['landing-features__grid']}>
            {landingFeatures.map((feature) => (
              <Link key={feature.title} href={feature.href} className={styles['feature-card']}>
                <span className={styles['feature-card__icon']}>
                  {feature.icon}
                </span>
                <h2 className={styles['feature-card__title']}>{feature.title}</h2>
                <p className={styles['feature-card__text']}>{feature.value}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles['landing-bottom']}>
          <footer className={styles['landing-footer']}>
            <p className={styles['landing-footer__copy']}>
              CampusConnect © {new Date().getFullYear()} · Built for students to share more and waste less.
            </p>
          </footer>
        </section>
      </div>
    </div>
  );
}