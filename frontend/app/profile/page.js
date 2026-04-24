'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useStore from '../../store/useStore';
import useRequireAuth from '../../lib/useRequireAuth';

export default function ProfileRedirectPage() {
  const router = useRouter();
  const { isReady } = useRequireAuth();
  const { user } = useStore();

  useEffect(() => {
    if (!isReady) return;
    if (user?._id) {
      router.replace(`/profile/${user._id}`);
    }
  }, [isReady, user, router]);

  return (
    <div style={{ minHeight: '100vh', background: '#F2EDE4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, border: '3px solid #1A1A1A', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
