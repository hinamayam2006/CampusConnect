'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import styles from './appeal.module.css';

export default function AppealPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !message) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/appeal/submit', {
        email: email.trim(), // L-9 FIX: backend expects 'email', not 'userEmail'
        message: message.trim()
      });

      if (response.data.success) {
        toast.success(response.data.message);
        // Clear form
        setEmail('');
        setMessage('');
        // Redirect to home after delay
        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit appeal');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.appealContainer}>
      <div className={styles.appealCard}>
        <div className={styles.appealHeader}>
          <h1 className={styles.appealTitle}>Account Suspension Appeal</h1>
          <p className={styles.appealSubtitle}>
            If you believe your account was suspended in error, you can submit an appeal here.
          </p>
        </div>

        <div className={styles.appealContent}>
          <div className={styles.infoBox}>
            <h3>Before Submitting an Appeal:</h3>
            <ul>
              <li>Ensure you&apos;re using the email address associated with your suspended account</li>
              <li>Provide a detailed explanation of your situation</li>
              <li>Include any relevant evidence or context</li>
              <li>Be respectful and professional in your message</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className={styles.appealForm}>
            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.formLabel}>
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                className={styles.formInput}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="message" className={styles.formLabel}>
                Appeal Message *
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please explain why you believe your account suspension should be reviewed. Include any relevant details, evidence, or context that would help us understand your situation..."
                className={styles.formTextarea}
                rows={8}
                required
              />
              <p className={styles.charCount}>
                {message.length} characters
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={styles.submitButton}
            >
              {submitting ? 'Submitting...' : 'Submit Appeal'}
            </button>
          </form>

          <div className={styles.alternativeBox}>
            <h3>Alternative: Reply to Suspension Email</h3>
            <p>
              If you received a suspension email, you can simply reply to that email with your appeal. 
              This will be delivered directly to our administration team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
