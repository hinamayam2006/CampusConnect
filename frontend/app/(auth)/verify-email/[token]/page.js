'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../../../lib/api';

export default function VerifyEmailPage() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('Verifying your email...');

  const token = params?.token;

  useEffect(() => {
    let active = true;

    if (!token) {
      return () => {
        active = false;
      };
    }

    const verify = async () => {
      try {
        const { data } = await api.get(`/auth/verify-email/${token}`);
        if (!active) return;
        setStatus('success');
        setMessage(data?.message || 'Email verified successfully.');
      } catch (err) {
        if (!active) return;
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification failed.');
      }
    };

    verify();

    return () => {
      active = false;
    };
  }, [token]);

  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Email Verification</h1>
            <p>Verification token is missing.</p>
          </div>

          <div className="auth-form">
            <div className="auth-message error">Verification token is missing.</div>
            <Link href="/login" className="auth-submit-btn d-inline-flex align-items-center justify-content-center text-decoration-none">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Email Verification</h1>
          <p>{message}</p>
        </div>

        <div className="auth-form">
          {status === 'verifying' ? (
            <div className="auth-message">Please wait while we verify your account.</div>
          ) : status === 'success' ? (
            <>
              <div className="auth-message success">Your email is verified. You can log in now.</div>
              <button type="button" className="auth-submit-btn" onClick={() => router.push('/login')}>
                Go to Login
              </button>
            </>
          ) : (
            <>
              <div className="auth-message error">{message}</div>
              <Link href="/login" className="auth-submit-btn d-inline-flex align-items-center justify-content-center text-decoration-none">
                Back to Login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}