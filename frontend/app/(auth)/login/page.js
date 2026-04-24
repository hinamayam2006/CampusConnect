'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutGrid,
  FileText,
  Car,
  GraduationCap,
  Package,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';
import api from '../../../lib/api';
import useStore from '../../../store/useStore';
import styles from '../auth.module.css';

const FEATURE_BADGES = [
  { label: 'Notes & Papers', Icon: FileText },
  { label: 'Carpool Rides', Icon: Car },
  { label: 'Peer Tutoring', Icon: GraduationCap },
  { label: 'Borrow Items', Icon: Package },
];

export default function LoginPage() {
  const router = useRouter();
  const { user, setUser } = useStore();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { if (user) router.push('/'); }, [user, router]);

  useEffect(() => {
    if (message.type !== 'error' || !message.text) return;
    const t = setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    return () => clearTimeout(t);
  }, [message]);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', formData);
      const tokenExpiry = Date.now() + 15 * 60 * 1000;
      setUser(data.data.user, data.data.accessToken, data.data.refreshToken, tokenExpiry);
      setFormData({ email: '', password: '' });
      setLoading(false);
      router.push('/');
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Login failed. Please try again.' });
      setFormData((prev) => ({ ...prev, password: '' }));
      setLoading(false);
    }
  };

  return (
    <div className={styles['auth-split']}>
      <div className={styles['auth-left']}>
        <Link href="/" className={styles['auth-logo']}>
          <span className={styles['auth-logo__icon']}><LayoutGrid size={17} strokeWidth={2} /></span>
          <span className={styles['auth-logo__name']}>CampusConnect</span>
        </Link>
        <div className={styles['auth-tagline']}>
          <p className={styles['auth-eyebrow']}>Student Platform · NUST</p>
          <h1 className={styles['auth-headline']}>Your campus, <em>connected.</em></h1>
          <p className={styles['auth-subtext']}>
            Notes, rides, tutors, borrowing — everything your student life needs, all in one place.
          </p>
          <div className={styles['auth-badges']}>
            {FEATURE_BADGES.map(({ label, Icon }) => (
              <span key={label} className={styles['auth-badge']}>
                <Icon size={14} strokeWidth={1.8} />{label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className={styles['auth-right']}>
        <div className={styles['auth-card']}>
          <p className={styles['auth-card__eyebrow']}>Welcome Back</p>
          <h2 className={styles['auth-card__heading']}>Sign in to<br />your account</h2>
          <div className={styles['auth-divider']} />

          <form onSubmit={handleSubmit} className={styles['auth-form']} noValidate>
            <div className={styles['auth-field']}>
              <label className={styles['auth-label']} htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="username"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@seecs.edu.pk"
                required
                className={styles['auth-input']}
              />
            </div>

            <div className={styles['auth-field']}>
              <div className={styles['auth-label-row']}>
                <label className={styles['auth-label']} htmlFor="login-password">Password</label>
                <Link href="/forgot-password" className={styles['auth-label-link']}>Forgot password?</Link>
              </div>
              <div className={styles['auth-pw-wrap']}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••••"
                  required
                  className={styles['auth-input']}
                />
                <button
                  type="button"
                  className={styles['auth-pw-toggle']}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            {message.text && (
              <div
                className={`${styles['auth-alert']} ${message.type === 'success' ? styles['auth-alert--success'] : styles['auth-alert--error']}`}
                role="alert"
              >
                {message.text}
              </div>
            )}

            <button type="submit" disabled={loading} className={styles['auth-btn']}>
              {loading ? 'Signing in…' : 'Sign In'}
              {!loading && <ArrowRight size={16} strokeWidth={2.2} />}
            </button>
          </form>

          <p className={styles['auth-card__footer']}>
            Don&apos;t have an account? <Link href="/register">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
