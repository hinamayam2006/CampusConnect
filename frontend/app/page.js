'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import useStore from '../store/useStore';
import api from '../lib/api'; 
import { 
  ShoppingBag, 
  BookOpen, 
  Car, 
  PlusCircle, 
  FileUp, 
  Bell
} from 'lucide-react';

export default function Home() {
  const { user, accessToken, setUnreadCount } = useStore();
  
  const [particles, setParticles] = useState([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [stats, setStats] = useState({
    itemsForSale: 0,
    borrowRequests: 0,
    upcomingRides: 0,
    unreadNotifications: 0
  });
  const fetchingDashboardRef = useRef(false);
  const lastDashboardFetchRef = useRef(0);

  // 1. Unified State for Activity (Renamed to avoid shadowing)
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      // FIX: If logged out, reset loading immediately
      if (!user || !accessToken) {
        setStatsLoading(false);
        return;
      }

      const now = Date.now();
      if (fetchingDashboardRef.current || now - lastDashboardFetchRef.current < 5000) {
        return;
      }

      fetchingDashboardRef.current = true;
      lastDashboardFetchRef.current = now;

      try {
        setStatsLoading(true);
        const [statsRes, activityRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/activity')
        ]);

        if (statsRes.data.success) {
          setStats(statsRes.data.data);
          setUnreadCount(statsRes.data.data.unreadNotifications ?? 0);
        }
        if (activityRes.data.success) setActivities(activityRes.data.data);
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
        fetchingDashboardRef.current = false;
      }
    };

    fetchDashboardData();
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
    const recentActivities = activities.slice(0, 5);

    const kpiData = [
      { label: 'Items for Sale', value: statsLoading ? '...' : stats.itemsForSale, icon: <ShoppingBag size={20} />, color: 'var(--primary)' },
      { label: 'Borrow Requests', value: statsLoading ? '...' : stats.borrowRequests, icon: <BookOpen size={20} />, color: 'var(--accent-orange)' },
      { label: 'Upcoming Rides', value: statsLoading ? '...' : stats.upcomingRides, icon: <Car size={20} />, color: 'var(--accent-green)' },
      { label: 'Alerts', value: statsLoading ? '...' : stats.unreadNotifications, icon: <Bell size={20} />, color: stats.unreadNotifications > 0 ? '#ef4444' : '#64748b' },
    ];

    const topQuickActions = [
      { label: 'Sell an Item', desc: 'Post books or gear', href: '/marketplace/create', icon: <PlusCircle size={24} />, primary: true },
      { label: 'Offer a Ride', desc: 'Share your route', href: '/rides/create', icon: <Car size={24} />, primary: false },
      { label: 'Share Notes', desc: 'Upload PDFs', href: '/notes/upload', icon: <FileUp size={24} />, primary: false },
    ];

    return (
      <div className="dashboard-container">
        <section className="welcome-section">
          <div className="welcome-header">
            <div>
              <h1>Welcome back, {firstName}!</h1>
              <p>Here is what&apos;s happening on campus today.</p>
            </div>
          </div>

          <div className="kpi-grid">
            {kpiData.map((kpi, i) => (
              <div key={i} className="kpi-card" style={{ borderLeft: `4px solid ${kpi.color}` }}>
                <div className="kpi-icon">{kpi.icon}</div>
                <div className="kpi-info">
                  <span className="kpi-value">{kpi.value}</span>
                  <span className="kpi-label">{kpi.label}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="section-header"><h2>Quick Actions</h2></div>
          <div className="quick-actions-grid">
            {topQuickActions.map((action) => (
              <Link key={action.label} href={action.href} className="action-card">
                <div className={`action-icon-circle ${action.primary ? 'primary' : ''}`}>
                  {action.icon}
                </div>
                <div className="action-text">
                  <span className="action-label">{action.label}</span>
                  <span className="action-desc">{action.desc}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="activity-section">
          <div className="activity-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Bell size={20} color="var(--text-secondary)" />
              <h2>Recent Activity</h2>
            </div>
            {activities.length > 0 && (
              <Link href="/notifications" className="view-all-link">View All</Link>
            )}
          </div>

          <div className="activity-list">
            {recentActivities.length > 0 ? (
              recentActivities.map((notif) => (
                <div key={notif._id} className="activity-item">
                  <div className="activity-icon"><Bell size={18} /></div>
                  <div className="activity-content">
                    <div className="activity-title">
                      {notif.link ? (
                        <Link href={notif.link}>{notif.message}</Link>
                      ) : (
                        notif.message
                      )}
                    </div>
                    <div className="activity-meta">
                      {notif.kind === 'activity' ? 'Activity' : 'Alert'}
                      {notif.createdAt ? ` · ${new Date(notif.createdAt).toLocaleString()}` : ''}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-activity">
                <p>No new activity. You&apos;re all caught up!</p>
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // LANDING PAGE RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="landing-container" onMouseMove={handleMouseMove}>
      <div className="star-field">
        <div className="stars-sm"></div>
        <div className="stars-md"></div>
        <div className="stars-lg"></div>
      </div>
      {particles.map((p) => (
        <div key={p.id} className={`particle ${p.type}`} style={{ left: p.x, top: p.y, width: p.size, height: p.size }} />
      ))}
      <div className="landing-content">
        <h1 className="landing-title">CampusConnect</h1>
        <p className="landing-subtitle">Buy, sell, borrow, carpool, and share notes — all in one place for students.</p>
        <div className="landing-actions">
          <Link href="/register" className="btn btn-primary">Get Started</Link>
          <Link href="/marketplace" className="btn btn-secondary">Browse Listings</Link>
        </div>
      </div>
    </div>
  );
}