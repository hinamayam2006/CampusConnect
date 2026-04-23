'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useStore from '../../store/useStore';

const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1 hour
const PROTECTED_PREFIXES = [
  '/borrow',
  '/lostnfound',
  '/notes',
  '/rides',
  '/tutoring',
  '/notifications',
  '/dashboard',
  '/profile',
];

function isProtectedPath(pathname = '') {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function SessionActivityGuard() {
  const { accessToken, refreshToken, logout } = useStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const hasSession = !!accessToken || !!refreshToken;
    if (hasSession) return;

    if (isProtectedPath(pathname)) {
      router.replace('/login');
    }
  }, [accessToken, refreshToken, pathname, router]);

  useEffect(() => {
    const hasSession = !!accessToken || !!refreshToken;
    if (!hasSession) return;

    let timer;

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        logout();
        if (isProtectedPath(pathname)) {
          router.replace('/login');
        }
      }, INACTIVITY_LIMIT_MS);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));

    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [accessToken, refreshToken, logout, pathname, router]);

  return null;
}
