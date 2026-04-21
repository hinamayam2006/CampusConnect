'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react'; // Added icons
import api from '../../../lib/api';
import toast from 'react-hot-toast';

const DEPARTMENTS = ['SEECS', 'ASAB', 'SADA', 'NBS', 'SCME', 'SNS', 'SMME', 'USPCASE', 'NICE', 'IESE', 'IGIS', 'S3H', 'NLS'];
const YEARS = [1, 2, 3, 4];

export default function RegisterPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false); // New state
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    year: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const getPasswordStrength = (pass) => {
    return {
      length: pass.length >= 8,
      specialChar: /[!@#$%^&*(),.?":{}|<>_\-]/.test(pass),
      number: /[0-9]/.test(pass),
      upperCase: /[A-Z]/.test(pass),
    };
  };

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
      const payload = { ...formData, year: Number(formData.year) };
      const { data } = await api.post('/auth/register', payload);
      toast.success(data?.message || 'Account created. Please check your email to verify your account.');
      router.push('/login');
    } catch (err) {
      const response = err.response?.data;
      if (response?.errors && Array.isArray(response.errors)) {
        const fieldErrors = {};
        response.errors.forEach((e) => { if (e?.field) fieldErrors[e.field] = e.message; });
        setErrors(fieldErrors);
      } else {
        toast.error(response?.message || 'Something went wrong.');
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
          {/* Name & Email Fields same as your original */}
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

          {/* Updated Password Field with Toggle */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-field-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                placeholder="At least 8 characters"
                className={`form-control password-input ${errors.password ? 'is-invalid' : ''}`}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Strength indicator remains same */}
            {(isPasswordFocused || formData.password.length > 0) && (
              <div className="password-strength-indicator mt-2">
                {Object.entries(getPasswordStrength(formData.password)).map(([key, reached]) => (
                  <div key={key} className={`strength-requirement ${reached ? 'met' : ''}`}>
                    <span className="strength-icon">{reached ? '✅' : '○'}</span>
                    {key === 'length' ? '8+ characters' : key === 'specialChar' ? 'Special char' : key === 'number' ? 'One number' : 'One uppercase'}
                  </div>
                ))}
              </div>
            )}
            {errors.password && <div className="invalid-feedback d-block">{errors.password}</div>}
          </div>

          {/* Department and Year */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Department</label>
              <select name="department" value={formData.department} onChange={handleChange} className="form-select">
                <option value="">Select</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <select name="year" value={formData.year} onChange={handleChange} className="form-select">
                <option value="">Select</option>
                {YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading} className="auth-submit-btn">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link href="/login" className="btn-link fw-bold">Log in</Link></p>
        </div>
      </div>
    </div>
  );
}