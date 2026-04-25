'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquare, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import useRequireAuth from '../../lib/useRequireAuth';
import { submitFeedback } from '../../lib/apiTickets';
import StarRating from '../../components/StarRating';
import hubStyles from '../community.module.css';
import uploadStyles from '../notes/upload/upload.module.css'; // Reusing some clean styles

const FEEDBACK_CATEGORIES = [
  'UI/UX',
  'Performance',
  'New Feature Idea',
  'General',
  'Other',
];

export default function FeedbackPage() {
  const { isReady } = useRequireAuth();
  const router = useRouter();

  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isReady) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category) return toast.error('Please select a category');
    if (!description.trim() || description.trim().length < 10) {
      return toast.error('Please provide a description (at least 10 characters)');
    }

    setSubmitting(true);
    try {
      await submitFeedback({
        category,
        title: title.trim(),
        description: description.trim(),
        rating: rating || undefined,
      });
      setSuccess(true);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={hubStyles.page}>
      <div className="container" style={{ maxWidth: 800 }}>
        {/* Header */}
        <div className={hubStyles.pageHeader}>
          <div className={hubStyles.headerLeft}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#6B7280', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '0.75rem', fontWeight: 600 }}>
              <ArrowLeft size={14} /> Back
            </Link>
            <h1 className={hubStyles.pageTitle}>Submit Feedback</h1>
            <p className={hubStyles.pageSubtitle}>
              We&apos;d love to hear your thoughts on how to improve CampusConnect!
            </p>
          </div>
        </div>

        {success ? (
          <div className={uploadStyles.formCard} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: '#F0FDF4', color: '#16A34A', marginBottom: '1.5rem' }}>
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: '#111827' }}>Thank You!</h2>
            <p style={{ color: '#6B7280', maxWidth: 400, margin: '0 auto 2rem' }}>
              Your feedback has been submitted successfully. We appreciate your time and effort in making CampusConnect better for everyone.
            </p>
            <button
              onClick={() => router.push('/')}
              className={hubStyles.btnPrimary}
              style={{ padding: '0.6rem 1.5rem', margin: '0 auto' }}
            >
              Return to Dashboard
            </button>
          </div>
        ) : (
          <form className={uploadStyles.formCard} onSubmit={handleSubmit} noValidate>
            <div className={uploadStyles.cardSection}>
              <div className="d-flex align-items-center gap-2 mb-3">
                <MessageSquare size={18} color="#4F46E5" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>Share Your Thoughts</h3>
              </div>

              <div className={uploadStyles.fieldGrid}>
                {/* Category */}
                <div className={uploadStyles.field}>
                  <label className={uploadStyles.fieldLabel}>
                    Category <span className={uploadStyles.fieldReq}>*</span>
                  </label>
                  <select
                    className={uploadStyles.fieldSelect}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="">Select a category...</option>
                    {FEEDBACK_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Rating (Optional) */}
                <div className={uploadStyles.field}>
                  <label className={uploadStyles.fieldLabel}>How would you rate your experience? (Optional)</label>
                  <div style={{ paddingTop: '0.5rem' }}>
                    <StarRating value={rating} onChange={setRating} />
                  </div>
                </div>

                {/* Title */}
                <div className={`${uploadStyles.field} ${uploadStyles.fieldFull}`}>
                  <label className={uploadStyles.fieldLabel}>Title (Optional)</label>
                  <input
                    type="text"
                    className={uploadStyles.fieldInput}
                    placeholder="Short summary of your feedback"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={150}
                  />
                </div>

                {/* Description */}
                <div className={`${uploadStyles.field} ${uploadStyles.fieldFull}`}>
                  <label className={uploadStyles.fieldLabel}>
                    Description <span className={uploadStyles.fieldReq}>*</span>
                  </label>
                  <textarea
                    className={uploadStyles.fieldTextarea}
                    placeholder="Tell us what you like, what you dislike, or a feature you wish existed..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    required
                    maxLength={4000}
                  />
                  <div className={uploadStyles.fieldHint} style={{ textAlign: 'right' }}>
                    {description.length}/4000
                  </div>
                </div>
              </div>
            </div>

            <hr className={uploadStyles.divider} />

            <div className="d-flex justify-content-end gap-3" style={{ padding: '0 1.25rem 1.5rem' }}>
              <Link href="/" className="btn btn-outline-secondary" style={{ borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem' }}>
                Cancel
              </Link>
              <button
                type="submit"
                className={hubStyles.btnPrimary}
                disabled={submitting}
                style={{ padding: '0.6rem 1.5rem' }}
              >
                {submitting ? 'Submitting...' : (
                  <>
                    <Send size={16} /> Submit Feedback
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
