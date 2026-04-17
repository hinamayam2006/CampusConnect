'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useStore from '../store/useStore';

/**
 * Redirects to /login if not authenticated after Zustand persist has rehydrated.
 * Always wait for `isReady` before firing protected API calls (avoids 401 + stuck refresh).
 */
export default function useRequireAuth() {
  const { user, accessToken, refreshToken } = useStore();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(() => {
    try {
      return useStore.persist.hasHydrated();
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      if (useStore.persist.hasHydrated()) {
        setHydrated(true);
        return;
      }
      const unsub = useStore.persist.onFinishHydration(() => setHydrated(true));
      return unsub;
    } catch {
      setHydrated(true);
    }
  }, []);

  const hasSession = !!user && (!!accessToken || !!refreshToken);

  useEffect(() => {
    if (!hydrated) return;
    if (!hasSession) {
      router.replace('/login');
    }
  }, [hydrated, hasSession, router]);

  const isReady = hydrated && hasSession;

  return { user, accessToken, isReady, hydrated };
}
