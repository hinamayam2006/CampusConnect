'use client';

import Link from 'next/link';
import useStore from '../store/useStore';

export default function Home() {
  const { user } = useStore();

  // ═══════════════════════════════════════════════════════════
  // DASHBOARD - Logged-In Users
  // ═══════════════════════════════════════════════════════════
  if (user) {
    const firstName = user.name?.split(' ')[0] || 'User';

    // Module definitions with icons, descriptions, and links
    const modules = [
      {
        id: 'marketplace',
        name: 'Marketplace',
        icon: '🏪',
        description: 'Buy, sell, and trade items within your campus',
        count: '3 active',
        links: [
          { label: 'Browse', href: '/marketplace', icon: '🔍' },
          { label: 'Create', href: '/marketplace/create', icon: '➕' },
          { label: 'My Items', href: '/marketplace/my', icon: '📦' },
        ],
      },
      {
        id: 'notes',
        name: 'Notes & Papers',
        icon: '📝',
        description: 'Share and discover study notes and research papers',
        count: '5 new',
        links: [
          { label: 'Browse', href: '/notes', icon: '🔍' },
          { label: 'Upload', href: '/notes/upload', icon: '⬆️' },
          { label: 'Recent', href: '/notes', icon: '⏰' },
        ],
      },
      {
        id: 'rides',
        name: 'Rides',
        icon: '🚗',
        description: 'Find and offer rides to nearby locations',
        count: '2 joined',
        links: [
          { label: 'Browse', href: '/rides', icon: '🔍' },
          { label: 'Post', href: '/rides/create', icon: '➕' },
          { label: 'My Rides', href: '/rides/my', icon: '🚙' },
        ],
      },
      {
        id: 'borrow',
        name: 'Borrow',
        icon: '📕',
        description: 'Borrow and lend items with other students',
        count: '1 pending',
        links: [
          { label: 'Requests', href: '/borrow', icon: '📑' },
          { label: 'Create', href: '/borrow/create', icon: '➕' },
          { label: 'History', href: '/borrow', icon: '📚' },
        ],
      },
      {
        id: 'needs',
        name: 'Needs',
        icon: '💬',
        description: 'Post and respond to campus needs and requests',
        count: '2 responses',
        links: [
          { label: 'Browse', href: '/needs', icon: '🔍' },
          { label: 'Post', href: '/needs/create', icon: '➕' },
          { label: 'My Needs', href: '/needs', icon: '📌' },
        ],
      },
      {
        id: 'tutoring',
        name: 'Tutoring',
        icon: '👨‍🏫',
        description: 'Find tutors or offer your expertise to others',
        count: '4 available',
        links: [
          { label: 'Browse', href: '/tutoring', icon: '🔍' },
          { label: 'Sessions', href: '/tutoring/my', icon: '📅' },
          { label: 'Profile', href: '/profile/edit', icon: '✏️' },
        ],
      },
      {
        id: 'profile',
        name: 'Profile',
        icon: '👤',
        description: 'Manage your account and settings',
        count: null,
        links: [
          { label: 'View', href: `/profile/${user?._id}`, icon: '👁️' },
          { label: 'Edit', href: '/profile/edit', icon: '✏️' },
          { label: 'Settings', href: '/profile/edit', icon: '⚙️' },
        ],
      },
    ];

    // Quick action buttons (most frequently used)
    const quickActions = [
      { label: 'Create Listing', href: '/marketplace/create', icon: '🏪', primary: true },
      { label: 'Post Ride', href: '/rides/create', icon: '🚗' },
      { label: 'Upload Note', href: '/notes/upload', icon: '📝' },
      { label: 'Request Borrow', href: '/borrow/create', icon: '📕' },
      { label: 'Post Need', href: '/needs/create', icon: '💬' },
    ];

    // Recent activity (mock data - would come from backend)
    const recentActivity = [
      {
        id: 1,
        title: 'You posted a new ride to F-11 Markaz',
        time: '2 hours ago',
        icon: '🚗',
      },
      {
        id: 2,
        title: 'Ali Hassan borrowed your notes on OOP',
        time: '5 hours ago',
        icon: '📕',
      },
      {
        id: 3,
        title: 'Your listing sold: Gaming Mouse',
        time: '1 day ago',
        icon: '🏪',
      },
    ];

    return (
      <div className="dashboard-container">
        {/* Welcome Section */}
        <section className="welcome-section">
          <div className="welcome-header">
            <div>
              <h1>Welcome back, {firstName}! 👋</h1>
              <p>Let&apos;s make the most of your campus community</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={`quick-action-btn ${action.primary ? 'primary' : ''}`}
              >
                <span className="quick-action-icon">{action.icon}</span>
                <span>{action.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Modules Grid */}
        <section>
          <div className="modules-grid">
            {modules.map((module) => (
              <div key={module.id} className={`module-card ${module.id}`}>
                {/* Header */}
                <div className="module-card-header">
                  <div className="module-icon">{module.icon}</div>
                  <div className="module-title">
                    <h3>{module.name}</h3>
                  </div>
                  {module.count && <span className="module-count">{module.count}</span>}
                </div>

                {/* Description */}
                <p className="module-description">{module.description}</p>

                {/* Links */}
                <div className="module-links">
                  {module.links.map((link) => (
                    <Link key={link.label} href={link.href} className="module-link">
                      <span className="module-link-icon">{link.icon}</span>
                      <span>{link.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Activity Section */}
        {recentActivity.length > 0 && (
          <section className="activity-section">
            <div className="activity-header">
              <h2>📊 Recent Activity</h2>
            </div>
            <div className="activity-list">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">{activity.icon}</div>
                  <div className="activity-content">
                    <div className="activity-title">{activity.title}</div>
                    <div className="activity-meta">{activity.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // LANDING PAGE - Guests/Logged Out Users
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="landing-container">
      <div className="landing-content">
        <h1 className="landing-title">CampusConnect</h1>
        <p className="landing-subtitle">
          Buy, sell, borrow, carpool, and share notes — all in one place for students.
        </p>

        <div className="landing-actions">
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