'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  LayoutGrid,
  ShoppingBag,
  FileText,
  Car,
  Repeat,
  Search,
  GraduationCap,
  User,
  Bell,
  LogOut,
} from 'lucide-react';
import useStore from '../../store/useStore';
import styles from './Sidebar.module.css';

/* ─── Navigation structure ─── */
const NAV_SECTIONS = [
  {
    label: 'MAIN',
    items: [
      { label: 'Dashboard',      href: '/',            icon: LayoutGrid,   exact: true },
      { label: 'Marketplace',    href: '/marketplace', icon: ShoppingBag              },
      { label: 'Notes & Papers', href: '/notes',       icon: FileText                 },
      { label: 'Rides',          href: '/rides',       icon: Car                      },
    ],
  },
  {
    label: 'COMMUNITY',
    items: [
      { label: 'Borrow',        href: '/borrow',     icon: Repeat        },
      { label: 'Lost & Found',  href: '/needboard',  icon: Search },
      { label: 'Tutoring',      href: '/tutoring',   icon: GraduationCap },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { label: 'My Profile',     href: null,              icon: User, isDynamic: true  },
      { label: 'Notifications',  href: '/notifications',  icon: Bell, hasBadge: true   },
    ],
  },
];

/* ─── Helpers ─── */

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

const YEAR_SUFFIXES = { 1: 'st', 2: 'nd', 3: 'rd', 4: 'th' };

function formatYear(year) {
  if (!year) return '';
  return `${year}${YEAR_SUFFIXES[year] || 'th'} Year`;
}

/* ─── Component ─── */

export default function Sidebar() {
  const { user, logout, unreadCount } = useStore();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = useCallback(() => {
    logout();
    toast.success('Logged out successfully');
    router.push('/login');
  }, [logout, router]);

  // Only render for authenticated users
  if (!user) return null;

  const isActive = (href, exact) => {
    if (!href) return false;
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const resolveHref = (item) => {
    if (item.isDynamic && item.label === 'My Profile') {
      return `/profile/${user._id}`;
    }
    return item.href;
  };

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <Link href="/" className={styles['sidebar-logo']}>
        <span className={styles['sidebar-logo__icon']}>
          <LayoutGrid size={17} strokeWidth={2} />
        </span>
        <span className={styles['sidebar-logo__text']}>CampusConnect</span>
      </Link>

      {/* Navigation */}
      <nav className={styles['sidebar-nav']} aria-label="Main navigation">
        {NAV_SECTIONS.map(({ label, items }) => (
          <div key={label} className={styles['sidebar-section']}>
            <span className={styles['sidebar-section__label']}>{label}</span>

            {items.map((item) => {
              const href = resolveHref(item);
              const active = isActive(href, item.exact);
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={href || '#'}
                  className={`${styles['sidebar-nav-link']}${active ? ` ${styles['sidebar-nav-link--active']}` : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon size={16} strokeWidth={1.9} aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.hasBadge && unreadCount > 0 && (
                    <span className={styles['sidebar-badge']} aria-label={`${unreadCount} unread`}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Logout */}
      <button className={styles['sidebar-logout']} onClick={handleLogout} type="button">
        <LogOut size={15} strokeWidth={1.9} aria-hidden="true" />
        <span>Log out</span>
      </button>

      {/* User strip */}
      <div className={styles['sidebar-user']}>
        <div className={styles['sidebar-user__avatar']} aria-hidden="true">
          {getInitials(user.name)}
        </div>
        <div className={styles['sidebar-user__info']}>
          <span className={styles['sidebar-user__name']}>{user.name}</span>
          <span className={styles['sidebar-user__meta']}>
            {user.department}
            {user.year ? ` · ${formatYear(user.year)}` : ''}
          </span>
        </div>
      </div>
    </aside>
  );
}
