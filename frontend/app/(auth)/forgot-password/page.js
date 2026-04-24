'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import styles from '../auth.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setMessage({ type: 'success', text: data?.message || 'If the email exists, a reset link was sent.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to send reset email.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles['auth-container']}>
      <div className={styles['auth-card']}>
        <div className={styles['auth-header']}>
          <h1>Forgot password</h1>
          <p>Enter your email and we&apos;ll send a reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles['auth-form']}>
          <div className={styles['form-group']}>
            <label className={styles['form-label']}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              required
              className={styles['form-control']}
            />
          </div>

          {message.text && (
            <div
              className={`${styles['auth-message']} ${message.type === 'success' ? styles['auth-message--success'] : styles['auth-message--error']}`}
            >
              {message.text}
            </div>
          )}

          <button type="submit" disabled={loading} className={styles['auth-submit-btn']}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className={styles['auth-footer']}>
          <p>
            Remembered it? <Link href="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}