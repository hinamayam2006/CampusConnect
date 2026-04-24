'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../lib/api';
import styles from '../../auth.module.css';

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const getPasswordStrength = (pass) => {
    return {
      length: pass.length >= 8,
      specialChar: /[!@#$%^&*(),.?":{}|<>_\-]/.test(pass),
      number: /[0-9]/.test(pass),
      upperCase: /[A-Z]/.test(pass),
    };
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const token = params?.token;
      await api.post(`/auth/reset-password/${token}`, formData);
      setMessage({ type: 'success', text: 'Password reset successfully. Redirecting to login...' });
      setTimeout(() => router.push('/login'), 1500);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Unable to reset password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles['auth-container']}>
      <div className={styles['auth-card']}>
        <div className={styles['auth-header']}>
          <h1>Reset password</h1>
          <p>Create a new password for your CampusConnect account.</p>
        </div>

        <form onSubmit={handleSubmit} className={styles['auth-form']}>
          <div className={styles['form-group']}>
            <label className={styles['form-label']}>New Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className={styles['form-control']}
              placeholder="Enter a new password"
            />
            <div className={styles['password-strength-indicator']}>
              {Object.entries(getPasswordStrength(formData.password)).map(([key, reached]) => (
                <div
                  key={key}
                  className={`${styles['strength-requirement']}${reached ? ` ${styles['strength-requirement--met']}` : ''}`}
                >
                  <span className={styles['strength-icon']}>{reached ? '✅' : '○'}</span>
                  {key === 'length'
                    ? '8+ characters'
                    : key === 'specialChar'
                      ? 'Special character'
                      : key === 'number'
                        ? 'One number'
                        : 'One uppercase'}
                </div>
              ))}
            </div>
          </div>

          <div className={styles['form-group']}>
            <label className={styles['form-label']}>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className={styles['form-control']}
              placeholder="Confirm your password"
            />
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <div className={styles['invalid-feedback']}>Passwords do not match.</div>
            )}
          </div>

          {message.text && (
            <div
              className={`${styles['auth-message']} ${message.type === 'success' ? styles['auth-message--success'] : styles['auth-message--error']}`}
            >
              {message.text}
            </div>
          )}

          <button type="submit" disabled={loading} className={styles['auth-submit-btn']}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}