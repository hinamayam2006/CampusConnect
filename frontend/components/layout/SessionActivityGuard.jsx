'use client';

import { useEffect } from 'react';
import useStore from '../../store/useStore';

const INACTIVITY_LIMIT_MS = 60 * 60 * 1000; // 1 hour

export default function SessionActivityGuard() {
  const { accessToken, refreshToken, logout } = useStore();

  useEffect(() => {
    const hasSession = !!accessToken || !!refreshToken;
    if (!hasSession) return;

    let timer;

    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        logout();
      }, INACTIVITY_LIMIT_MS);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((eventName) => window.addEventListener(eventName, resetTimer, { passive: true }));

    resetTimer();

    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((eventName) => window.removeEventListener(eventName, resetTimer));
    };
  }, [accessToken, refreshToken, logout]);

  return null;
}
