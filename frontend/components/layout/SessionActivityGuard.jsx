'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useStore from '../../store/useStore';
import api from '../../lib/api';

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

let hasValidatedSessionThisBoot = false;
let sessionValidationPromise = null;

function isProtectedPath(pathname = '') {
  return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function SessionActivityGuard({ children }) {
  const { accessToken, refreshToken, logout } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const sessionValidatedRef = useRef(false);

  useEffect(() => {
    let unsub;

    const timer = setTimeout(() => {
      try {
        if (useStore.persist.hasHydrated()) {
          setHydrated(true);
          return;
        }
      } catch {
        // Ignore and rely on hydration callback below.
      }

      unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
    }, 0);

    return () => {
      clearTimeout(timer);
      if (typeof unsub === 'function') unsub();
    };
  }, []);

  // Redirect if no session and trying to access protected pages
  useEffect(() => {
    if (!hydrated) return;
    const hasSession = !!accessToken || !!refreshToken;
    if (!hasSession && isProtectedPath(pathname)) {
      router.replace('/login');
    }
  }, [hydrated, accessToken, refreshToken, pathname, router]);

  // Validate persisted session against backend so stale localStorage cannot look "logged in".
  // Runs ONLY ONCE per app load to prevent spamming /auth/me on every navigation.
  useEffect(() => {
    if (!hydrated || sessionValidatedRef.current || hasValidatedSessionThisBoot) return;
    const hasSession = !!accessToken || !!refreshToken;
    if (!hasSession) return;

    let cancelled = false;

    const validateSession = async () => {
      try {
        setIsValidating(true);
        if (!sessionValidationPromise) {
          sessionValidationPromise = api.get('/auth/me', { timeout: 12000 });
        }

        await sessionValidationPromise;
        hasValidatedSessionThisBoot = true;
        if (!cancelled) sessionValidatedRef.current = true;
      } catch {
        if (cancelled) return;
        logout();
        if (isProtectedPath(window.location.pathname)) {
          router.replace('/login');
        }
      } finally {
        if (!cancelled) setIsValidating(false);
        sessionValidationPromise = null;
      }
    };

    validateSession();

    return () => {
      cancelled = true;
    };
  }, [hydrated, accessToken, refreshToken, logout, router]);

  // Reset validation state when there is no active session.
  useEffect(() => {
    const hasSession = !!accessToken || !!refreshToken;
    if (!hasSession) {
      sessionValidatedRef.current = false;
      hasValidatedSessionThisBoot = false;
      sessionValidationPromise = null;
    }
  }, [accessToken, refreshToken]);

  // Inactivity timeout handling
  useEffect(() => {
    if (!hydrated) return;
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
  }, [hydrated, accessToken, refreshToken, logout, pathname, router]);

  // Render nothing until hydration is complete to avoid flash
  if (!hydrated) return null;

  // If on a protected route without a session, children are not rendered (redirect already triggered)
  const hasSession = !!accessToken || !!refreshToken;
  if (!hasSession && isProtectedPath(pathname)) return null;

  return (
    <>
      {hasSession && isValidating && (
        <div className="session-validation">
          <div className="session-validation__card">
            <span className="session-validation__spinner" aria-hidden="true" />
            <span>Logging you in…</span>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
