'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import useStore from '../../store/useStore';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useStore();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  // Determine if we're on an auth page
  const isLoginPage = pathname === '/login';
  const isRegisterPage = pathname === '/register';
  const isAuthPage = isLoginPage || isRegisterPage;

  return (
    <nav className="navbar navbar-expand-lg navbar-light">
      <div className="container">
        {/* Brand */}
        <Link href="/" className="navbar-brand">
          CampusConnect
        </Link>

        {/* Mobile toggle */}
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* Navbar Content */}
        <div className="collapse navbar-collapse" id="navbarNav">
          {/* Logged-in Navigation */}
          {user && (
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <Link
                  href="/marketplace"
                  className={`nav-link ${pathname.startsWith('/marketplace') ? 'active' : ''}`}
                >
                  🛍️ Marketplace
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  href="/notes"
                  className={`nav-link ${pathname.startsWith('/notes') ? 'active' : ''}`}
                >
                  📝 Notes
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  href="/borrow"
                  className={`nav-link ${pathname.startsWith('/borrow') ? 'active' : ''}`}
                >
                  📕 Borrow
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  href="/rides"
                  className={`nav-link ${pathname.startsWith('/rides') ? 'active' : ''}`}
                >
                  🚗 Rides
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  href="/needs"
                  className={`nav-link ${pathname.startsWith('/needs') ? 'active' : ''}`}
                >
                  💬 Needs
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  href="/tutoring"
                  className={`nav-link ${pathname.startsWith('/tutoring') ? 'active' : ''}`}
                >
                  👨‍🏫 Tutoring
                </Link>
              </li>
            </ul>
          )}

          {/* Right Side: Auth Buttons or User Menu */}
          <div className="nav-auth-buttons">
            {user ? (
              <>
                <Link
                  href={`/profile/${user._id}`}
                  className="nav-btn profile"
                >
                  👤 {user.name.split(' ')[0]}
                </Link>
                <button
                  onClick={handleLogout}
                  className="nav-btn logout"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className={`nav-btn login ${isLoginPage ? 'active' : ''}`}
                >
                  Log In
                </Link>
                <Link
                  href="/register"
                  className={`nav-btn register ${isRegisterPage ? 'active' : ''}`}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}