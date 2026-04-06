'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useStore from '../store/useStore';

// Use this hook at the top of any page that requires login
// It will redirect to /login if user is not authenticated
export default function useRequireAuth() {
  const { user, token } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!user || !token) {
      router.push('/login');
    }
  }, [user, token, router]);

  return { user, token };
}