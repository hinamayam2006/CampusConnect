'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../../../lib/api';
import useStore from '../../../store/useStore';
import toast from 'react-hot-toast';

const DEPARTMENTS = ['CS', 'EE', 'ME', 'CE', 'BBA', 'Economics', 'Law', 'Medicine', 'Other'];
const YEARS = [1, 2, 3, 4];

export default function RegisterPage() {
  const router = useRouter();
  const { user, setUser } = useStore();

  // Password Logic from updated code
  const getPasswordStrength = (pass) => {
    return {
      length: pass.length >= 8,
      specialChar: /[!@#$%^&*(),.?":{}|<>_\-]/.test(pass),
      number: /[0-9]/.test(pass),
      upperCase: /[A-Z]/.test(pass),
    };
  };

  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    year: '',
    location: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Auto-redirect if already logged in (industry standard)
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const payload = {
        ...formData,
        year: Number(formData.year),
      };

      const { data } = await api.post('/auth/register', payload);

      // SUCCESS: Save user and both tokens (access + refresh) with expiry time
      const tokenExpiry = Date.now() + (15 * 60 * 1000); // 15 minutes from now
      setUser(
        data.data.user,
        data.data.accessToken,
        data.data.refreshToken,
        tokenExpiry
      );

      toast.success('Account created! Welcome to CampusConnect.');
      router.push('/');
    } catch (err) {
      const response = err.response?.data;

      // Defensive error handling: check if errors array exists before using it
      if (response?.errors && Array.isArray(response.errors)) {
        const fieldErrors = {};
        response.errors.forEach((e) => {
          if (e?.field && e?.message) {
            fieldErrors[e.field] = e.message;
          }
        });
        setErrors(fieldErrors);
      } else if (response?.message) {
        // Fallback to generic error message
        toast.error(response.message);
      } else {
        // Last resort: show generic error
        toast.error('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Create an account</h1>
          <p>Join your campus community</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Name */}
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ali Hassan"
              className={`form-control ${errors.name ? 'is-invalid' : ''}`}
            />
            {errors.name && <div className="invalid-feedback">{errors.name}</div>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@university.edu"
              className={`form-control ${errors.email ? 'is-invalid' : ''}`}
            />
            {errors.email && <div className="invalid-feedback">{errors.email}</div>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
              placeholder="At least 8 characters"
              className={`form-control ${errors.password ? 'is-invalid' : ''}`}
            />

            {/* Password Strength Checklist */}
            {(isPasswordFocused || formData.password.length > 0) && (
              <div className="password-strength-indicator">
                <span className="strength-label">Security Requirements</span>
                {Object.entries(getPasswordStrength(formData.password)).map(([key, reached]) => {
                  const labels = {
                    length: "8+ characters",
                    specialChar: "Special char (!@#$%^&*()_-)",
                    number: "At least one number",
                    upperCase: "One uppercase letter"
                  };
                  return (
                    <div key={key} className={`strength-requirement ${reached ? 'met' : ''}`}>
                      <span className="strength-icon">{reached ? '✅' : '○'}</span>
                      {labels[key]}
                    </div>
                  );
                })}
              </div>
            )}
            {errors.password && <div className="invalid-feedback">{errors.password}</div>}
          </div>

          {/* Department + Year */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Department</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className={`form-select ${errors.department ? 'is-invalid' : ''}`}
              >
                <option value="">Select</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.department && <div className="invalid-feedback">{errors.department}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <select
                name="year"
                value={formData.year}
                onChange={handleChange}
                className={`form-select ${errors.year ? 'is-invalid' : ''}`}
              >
                <option value="">Select</option>
                {YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}
              </select>
              {errors.year && <div className="invalid-feedback">{errors.year}</div>}
            </div>
          </div>

          {/* Location */}
          <div className="form-group">
            <label className="form-label">Your Area <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(for carpool)</span></label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. G-11, F-7, DHA Phase 2"
              className="form-control"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="auth-submit-btn"
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?
            <Link href="/login" className="btn-link fw-bold">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}