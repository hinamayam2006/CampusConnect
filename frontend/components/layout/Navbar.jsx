'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn } from 'lucide-react';
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
            <img src="/logo.png" alt="CC" width="22" height="22" style={{ filter: 'brightness(0) invert(100%)', objectFit: 'contain', transform: 'translateX(1px)' }} />
          </span>
          CampusConnect
        </Link>

        <div className="guest-navbar__actions">
          <Link href="/marketplace" className="nav-btn explore">
            Explore
          </Link>
          <Link
            href="/login"
            className={`nav-btn login${isLoginPage ? ' active' : ''}`}
          >
            <LogIn size={15} style={{ marginRight: '0.35rem', verticalAlign: 'middle' }} />
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
