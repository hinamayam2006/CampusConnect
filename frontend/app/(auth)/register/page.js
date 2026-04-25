'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutGrid,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';
import api from '../../../lib/api';
import toast from 'react-hot-toast';
import styles from '../auth.module.css';

const DEPARTMENTS = [
  'SEECS', 'ASAB', 'SADA', 'NBS', 'SCME', 'SNS', 'SMME',
  'USPCASE', 'NICE', 'IESE', 'IGIS', 'S3H', 'NLS',
];
const YEARS = [1, 2, 3, 4];

const STRENGTH_RULES = [
  { key: 'length',   label: '8+ characters', test: (p) => p.length >= 8 },
  { key: 'upper',    label: 'One uppercase',  test: (p) => /[A-Z]/.test(p) },
  { key: 'number',   label: 'One number',     test: (p) => /[0-9]/.test(p) },
  { key: 'special',  label: 'Special char',   test: (p) => /[!@#$%^&*(),.?":{}|<>_\-]/.test(p) },
];

const STEPS = [
  { title: 'Create your profile', desc: 'Name, department & year' },
  { title: 'Verify your email',   desc: 'email required' },
  { title: 'Start connecting',    desc: 'Access all features' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    department: '',
    year: '',
  });
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setFieldErrors({});
    const name = `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim();
    const payload = {
      name,
      email: formData.email,
      password: formData.password,
      department: formData.department,
      year: Number(formData.year),
    };
    try {
      const { data } = await api.post('/auth/register', payload);
      toast.success(data?.message || 'Account created! Please verify your email.');
      router.push('/login');
    } catch (err) {
      const response = err.response?.data;
      if (response?.errors && Array.isArray(response.errors)) {
        const errs = {};
        response.errors.forEach((e) => { if (e?.field) errs[e.field] = e.message; });
        setFieldErrors(errs);
      } else {
        toast.error(response?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const strength = STRENGTH_RULES.map((r) => ({ ...r, met: r.test(formData.password) }));

  return (
    <div className={styles['auth-split']}>
      <div className={styles['auth-left']}>
        <Link href="/" className={styles['auth-logo']}>
          <span className={styles['auth-logo__icon']}><LayoutGrid size={17} strokeWidth={2} /></span>
          <span className={styles['auth-logo__name']}>CampusConnect</span>
        </Link>
        <div className={styles['auth-tagline']}>
          <p className={styles['auth-eyebrow']}>Student Platform </p>
          <h1 className={styles['auth-headline']}>Join your<br /><em>campus community.</em></h1>
          <p className={styles['auth-subtext']}>
            Connect with thousands of students across campus — share notes, find rides, borrow gear, get tutored.
          </p>
          <ol className={styles['auth-steps']}>
            {STEPS.map((s, i) => (
              <li key={s.title} className={styles['auth-step']}>
                <span className={styles['auth-step__num']}>{i + 1}</span>
                <span>
                  <strong>{s.title}</strong>
                  <span className={styles['auth-step__desc']}> — {s.desc}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className={styles['auth-right']}>
        <div className={styles['auth-card']}>
          <p className={styles['auth-card__eyebrow']}>Get Started</p>
          <h2 className={styles['auth-card__heading']}>Create your<br />account</h2>
          <div className={styles['auth-divider']} />

          <form onSubmit={handleSubmit} className={styles['auth-form']} noValidate>
            <div className={styles['auth-field-row']}>
              <div className={styles['auth-field']}>
                <label className={styles['auth-label']} htmlFor="reg-first">First name</label>
                <input
                  id="reg-first"
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Ali"
                  required
                  className={`${styles['auth-input']}${fieldErrors.name ? ` ${styles['auth-input--error']}` : ''}`}
                />
              </div>
              <div className={styles['auth-field']}>
                <label className={styles['auth-label']} htmlFor="reg-last">Last name</label>
                <input
                  id="reg-last"
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Hassan"
                  required
                  className={styles['auth-input']}
                />
              </div>
            </div>
            {fieldErrors.name && <p className={styles['auth-field-error']}>{fieldErrors.name}</p>}

            <div className={styles['auth-field']}>
              <label className={styles['auth-label']} htmlFor="reg-email">Email address</label>
              <input
                id="reg-email"
                type="email"
                name="email"
                autoComplete="username"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@gmail.com"
                required
                className={`${styles['auth-input']}${fieldErrors.email ? ` ${styles['auth-input--error']}` : ''}`}
              />
              {fieldErrors.email && <p className={styles['auth-field-error']}>{fieldErrors.email}</p>}
            </div>

            <div className={styles['auth-field']}>
              <label className={styles['auth-label']} htmlFor="reg-password">Password</label>
              <div className={styles['auth-pw-wrap']}>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  onFocus={() => setPwFocused(true)}
                  onBlur={() => setPwFocused(false)}
                  placeholder="At least 8 characters"
                  required
                  className={`${styles['auth-input']}${fieldErrors.password ? ` ${styles['auth-input--error']}` : ''}`}
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
              {(pwFocused || formData.password.length > 0) && (
                <div className={styles['auth-strength']}>
                  {strength.map((r) => (
                    <span key={r.key} className={`${styles['auth-strength__row']}${r.met ? ` ${styles['auth-strength__row--met']}` : ''}`}>
                      {r.label}
                    </span>
                  ))}
                </div>
              )}
              {fieldErrors.password && <p className={styles['auth-field-error']}>{fieldErrors.password}</p>}
            </div>

            <div className={styles['auth-field-row']}>
              <div className={styles['auth-field']}>
                <label className={styles['auth-label']} htmlFor="reg-dept">Department</label>
                <select
                  id="reg-dept"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  required
                  className={`${styles['auth-select']}${fieldErrors.department ? ` ${styles['auth-select--error']}` : ''}`}
                >
                  <option value="">Select dept.</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                {fieldErrors.department && <p className={styles['auth-field-error']}>{fieldErrors.department}</p>}
              </div>
              <div className={styles['auth-field']}>
                <label className={styles['auth-label']} htmlFor="reg-year">Year</label>
                <select
                  id="reg-year"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  required
                  className={`${styles['auth-select']}${fieldErrors.year ? ` ${styles['auth-select--error']}` : ''}`}
                >
                  <option value="">Select year</option>
                  {YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}
                </select>
                {fieldErrors.year && <p className={styles['auth-field-error']}>{fieldErrors.year}</p>}
              </div>
            </div>

            <button type="submit" disabled={loading} className={styles['auth-btn']}>
              {loading ? 'Creating account…' : 'Create Account'}
              {!loading && <ArrowRight size={16} strokeWidth={2.2} />}
            </button>
          </form>

          <p className={`${styles['auth-card__footer']} ${styles['auth-card__footer--terms']}`}>
            By creating an account you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
          </p>
          <p className={styles['auth-card__footer']}>
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
