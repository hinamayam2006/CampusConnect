'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../../lib/api';
import useStore from '../../../store/useStore';


export default function LoginPage() {
  const router = useRouter();
  const { user, setUser } = useStore();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Auto-redirect if already logged in (industry standard)
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // Auto-clear error messages after 4 seconds
  useEffect(() => {
    if (message.type === 'error' && message.text) {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', formData);

      // SUCCESS: Save user and both tokens (access + refresh) with expiry time
      const tokenExpiry = Date.now() + (15 * 60 * 1000); // 15 minutes from now
      setUser(
        data.data.user,
        data.data.accessToken,
        data.data.refreshToken,
        tokenExpiry
      );

      setMessage({
        type: 'success',
        text: `Welcome back, ${data.data.user.name.split(' ')[0]}!`,
      });

      // Clear data ONLY on success
      setFormData({ email: '', password: '' });
      setLoading(false);
      setTimeout(() => {
        router.push('/');
      }, 1000);

    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed';

      setMessage({
        type: 'error',
        text: errorMessage,
      });

      // Clear password field on any error (security best practice)
      setFormData((prev) => ({ ...prev, password: '' }));

      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Welcome back</h1>
          <p>Log in to your CampusConnect account</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Email Field */}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@university.edu"
              required
              className="form-control"
            />
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Your password"
              required
              className="form-control"
            />
          </div>

          {/* Message Alert */}
          {message.text && (
            <div className={`auth-message ${message.type}`}>
              {message.text}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="auth-submit-btn"
          >
            {loading ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Logging in...
              </>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don&apos;t have an account?
            <Link href="/register" className="btn-link fw-bold">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}