'use client';

import { useState } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';

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
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Forgot password</h1>
          <p>Enter your email and we&apos;ll send a reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              required
              className="form-control"
            />
          </div>

          {message.text && <div className={`auth-message ${message.type}`}>{message.text}</div>}

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Remembered it? <Link href="/login" className="btn-link fw-bold">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}