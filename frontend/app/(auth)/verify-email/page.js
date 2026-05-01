'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import useStore from '../../../store/useStore';
import styles from '../auth.module.css';

function ResendLink({ email }) {
  const { showToast } = useStore();
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || loading || cooldown) return;
    setLoading(true);
    try {
      await api.post('/auth/resend-verification', { email });
      showToast('success', 'Verification email resent! Check your inbox.');
      setCooldown(60);
    } catch (err) {
      const apiMessage = err.response?.data?.message || 'Could not resend verification email.';
      showToast('error', apiMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles['auth-resend']}>
      <button
        type="button"
        className={styles['auth-resend-btn']}
        onClick={handleResend}
        disabled={!email || loading || cooldown}
      >
        {loading
          ? 'Sending…'
          : cooldown
            ? `Resend available in ${cooldown}s`
            : 'Resend verification link'}
      </button>
      {!email && (
        <p className={styles['auth-resend-note']}>
          Log in once to resend the verification email.
        </p>
      )}
    </div>
  );
}

export default function VerifyEmailInfoPage() {
  const { pendingVerificationEmail } = useStore();

  return (
    <div className={styles['auth-container']}>
      <div className={styles['auth-card']}>
        <div className={styles['auth-header']}>
          <h1>Verify your email</h1>
          <p>Check your inbox for a verification link to activate your account.</p>
        </div>

        <div className={styles['auth-form']}>
          <div className={styles['auth-message']}>
            Didn&apos;t get the email? You can resend the link below.
          </div>
          <ResendLink email={pendingVerificationEmail} />
          <Link href="/login" className={styles['auth-submit-btn']}>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
