'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';
import useStore from '../../store/useStore';

/**
 * Guest-only top navbar.
 * Returns null when the user is authenticated (Sidebar handles navigation)
 * or when on a standalone auth page (login, register, etc.).
 */

const AUTH_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
];

export default function Navbar() {
  const user = useStore((s) => s.user);
  const pathname = usePathname();

  // Sidebar handles authenticated navigation
  if (user) return null;

  // Auth pages are standalone split-screen layouts — no navbar needed
  const isAuthPage = AUTH_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (isAuthPage) return null;

  const isLoginPage = pathname === '/login';
  const isRegisterPage = pathname === '/register';

  return (
    <nav className="guest-navbar" role="navigation" aria-label="Site navigation">
      <div className="guest-navbar__inner">
        <Link href="/" className="guest-navbar__brand">
          <span className="guest-navbar__logo-icon" aria-hidden="true">
            <LayoutGrid size={17} strokeWidth={2} />
          </span>
          CampusConnect
        </Link>

        <div className="guest-navbar__actions">
          <Link
            href="/login"
            className={`nav-btn login${isLoginPage ? ' active' : ''}`}
          >
            Log In
          </Link>
          <Link
            href="/register"
            className={`nav-btn register${isRegisterPage ? ' active' : ''}`}
          >
            Sign Up
          </Link>
        </div>
      </div>
    </nav>
  );
}
