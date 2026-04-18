'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react'; // Added icons
import api from '../../../lib/api';
import useStore from '../../../store/useStore';

export default function LoginPage() {
  const router = useRouter();
  const { user, setUser } = useStore();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPassword, setShowPassword] = useState(false); // New state

  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

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
      const tokenExpiry = Date.now() + (15 * 60 * 1000); 
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

      setFormData({ email: '', password: '' });
      setLoading(false);
      setTimeout(() => {
        router.push('/');
      }, 1000);

    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed';
      setMessage({ type: 'error', text: errorMessage });
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
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              autoComplete="username"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@university.edu"
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-field-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                readOnly 
                onFocus={(e) => e.target.removeAttribute('readonly')}
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Your password"
                required
                className="form-control password-input"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {message.text && (
            <div className={`auth-message ${message.type}`}>
              {message.text}
            </div>
          )}

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don&apos;t have an account? 
            <Link href="/register" className="btn-link fw-bold"> Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}