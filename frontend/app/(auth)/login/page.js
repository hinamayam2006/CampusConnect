'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
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
import SuspensionModal from '../../../components/SuspensionModal';
import styles from '../auth.module.css';

const FEATURE_BADGES = [
  { label: 'Notes & Papers', Icon: FileText },
  { label: 'Carpool Rides', Icon: Car },
  { label: 'Peer Tutoring', Icon: GraduationCap },
  { label: 'Borrow Items', Icon: Package },
];

export default function LoginPage() {
  const router = useRouter();
  const { user, setUser, setPendingVerificationEmail, showToast } = useStore();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [suspensionData, setSuspensionData] = useState({ reason: '', email: '' });
  const [verifyNotice, setVerifyNotice] = useState({ email: '', cooldown: 0 });

  useEffect(() => { if (user) router.push('/'); }, [user, router]);

  useEffect(() => {
    if (message.type !== 'error' || !message.text) return;
    const t = setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    return () => clearTimeout(t);
  }, [message]);

  useEffect(() => {
    if (!verifyNotice.cooldown) return;
    const timer = setInterval(() => {
      setVerifyNotice((prev) => ({ ...prev, cooldown: Math.max(prev.cooldown - 1, 0) }));
    }, 1000);
    return () => clearInterval(timer);
  }, [verifyNotice.cooldown]);

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setVerifyNotice({ email: '', cooldown: 0 });
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', formData);
      const tokenExpiry = Date.now() + 15 * 60 * 1000;
      setUser(data.data.user, data.data.accessToken, data.data.refreshToken, tokenExpiry);
      setFormData({ email: '', password: '' });
      setLoading(false);
      router.push('/');
    } catch (err) {
      const apiMessage = err.response?.data?.message;
      const errorCode = err.response?.data?.code;
      const status = err.response?.status;
      const suspended = err.response?.data?.suspended;

      if (suspended) {
        // Show suspension modal instead of error message
        setSuspensionData({
          reason: apiMessage || 'Violation of community guidelines',
          email: formData.email
        });
        setShowSuspensionModal(true);
      } else if (status === 403 && (errorCode === 'EMAIL_NOT_VERIFIED' || /verify your email/i.test(apiMessage || ''))) {
        setPendingVerificationEmail(formData.email);
        setVerifyNotice({ email: formData.email, cooldown: 0 });
        setMessage({ type: '', text: '' });
      } else {
        // Show regular error message
        const text = apiMessage || 'Login failed. Please try again.';
        setMessage({ type: 'error', text });
      }

      setFormData((prev) => ({ ...prev, password: '' }));
      setLoading(false);
    }
  };

  return (
    <div className={styles['auth-split']}>
      <div className={styles['auth-left']}>
        <Link href="/" className={styles['auth-logo']}>
          <span className={styles['auth-logo__icon']}>
            <img src="/logo.png" alt="CC" width="24" height="24" className={styles['auth-logo__image']} />
          </span>
          <span className={styles['auth-logo__name']}>CampusConnect</span>
        </Link>
        <div className={styles['auth-tagline']}>
          <p className={styles['auth-eyebrow']}>Student Platform </p>
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
                placeholder="you@gmail.com"
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

            {verifyNotice.email && (
              <div className={`${styles['auth-alert']} ${styles['auth-alert--warning']}`} role="alert">
                <div>Your account isn&apos;t verified yet.</div>
                <button
                  type="button"
                  className={styles['auth-resend-btn']}
                  onClick={async () => {
                    if (verifyNotice.cooldown) return;
                    try {
                      await api.post('/auth/resend-verification', { email: verifyNotice.email });
                      showToast('success', 'Verification email resent! Check your inbox.');
                      setVerifyNotice((prev) => ({ ...prev, cooldown: 60 }));
                    } catch (resendErr) {
                      const resendMessage = resendErr.response?.data?.message || 'Could not resend verification email.';
                      showToast('error', resendMessage);
                    }
                  }}
                  disabled={verifyNotice.cooldown > 0}
                >
                  {verifyNotice.cooldown > 0
                    ? `Resend available in ${verifyNotice.cooldown}s`
                    : `Resend verification link to ${verifyNotice.email}`}
                </button>
              </div>
            )}

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

      {/* Suspension Modal */}
      <SuspensionModal
        isOpen={showSuspensionModal}
        onClose={() => setShowSuspensionModal(false)}
        suspensionReason={suspensionData.reason}
        userEmail={suspensionData.email}
      />
    </div>
  );
}
