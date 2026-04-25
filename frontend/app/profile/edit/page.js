'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useStore from '../../../store/useStore';
import useRequireAuth from '../../../lib/useRequireAuth';

export default function ProfileEditPage() {
  const router = useRouter();
  const { isReady } = useRequireAuth();
  const { user } = useStore();

  useEffect(() => {
    if (!isReady) return;
    if (!user?._id) {
      router.replace('/login');
      return;
    }
    router.replace(`/profile/${user._id}`);
  }, [isReady, user, router]);

  return (
    <div className="container py-5 text-secondary">Redirecting to your profile editor...</div>
  );
}
