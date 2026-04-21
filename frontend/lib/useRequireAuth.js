'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useStore from '../store/useStore';
import api from './api';

/**
 * Redirects to /login if not authenticated after Zustand persist has rehydrated.
 * Always wait for `isReady` before firing protected API calls (avoids 401 + stuck refresh).
 */
export default function useRequireAuth() {
  const { user, accessToken, refreshToken, tokenExpiry, logout, setAccessToken } = useStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(() => {
    try {
      return useStore.persist.hasHydrated();
    } catch {
      return true;
    }
  });
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    try {
      if (hydrated || useStore.persist.hasHydrated()) return;
      const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
      return unsub;
    } catch {
      return undefined;
    }
  }, [hydrated]);

  const hasSession = !!user && (!!accessToken || !!refreshToken);

  useEffect(() => {
    if (!hydrated) return;

    let cancelled = false;

    const verifyAuth = async () => {
      if (!hasSession) {
        logout();
        if (!cancelled) {
          setAuthChecked(false);
          router.replace('/login');
        }
        return;
      }

      const isExpired = !tokenExpiry || Date.now() >= Number(tokenExpiry);
      if (!isExpired) {
        if (!cancelled) setAuthChecked(true);
        return;
      }

      if (!refreshToken) {
        logout();
        if (!cancelled) {
          setAuthChecked(false);
          router.replace('/login');
        }
        return;
      }

      try {
        const response = await api.post(
          '/auth/refresh',
          { refreshToken },
          { timeout: 15000 }
        );

        const nextAccessToken = response?.data?.data?.accessToken;
        if (!nextAccessToken) {
          throw new Error('No access token returned from refresh endpoint');
        }

        const nextExpiry = Date.now() + 15 * 60 * 1000;
        setAccessToken(nextAccessToken, nextExpiry);
        if (!cancelled) setAuthChecked(true);
      } catch {
        logout();
        if (!cancelled) {
          setAuthChecked(false);
          router.replace('/login');
        }
      }
    };

    setAuthChecked(false);
    verifyAuth();

    return () => {
      cancelled = true;
    };
  }, [hydrated, hasSession, tokenExpiry, refreshToken, logout, setAccessToken, router]);

  const isReady = hydrated && authChecked;

  return { user, accessToken, isReady, hydrated };
}
