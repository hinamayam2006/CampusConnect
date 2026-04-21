'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '../../../../lib/api';

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
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Reset password</h1>
          <p>Create a new password for your CampusConnect account.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="form-control"
              placeholder="Enter a new password"
            />
            <div className="password-strength-indicator mt-2">
              {Object.entries(getPasswordStrength(formData.password)).map(([key, reached]) => (
                <div key={key} className={`strength-requirement ${reached ? 'met' : ''}`}>
                  <span className="strength-icon">{reached ? '✅' : '○'}</span>
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

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="form-control"
              placeholder="Confirm your password"
            />
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <div className="invalid-feedback d-block">Passwords do not match.</div>
            )}
          </div>

          {message.text && <div className={`auth-message ${message.type}`}>{message.text}</div>}

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}