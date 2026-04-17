'use client';

import { useState } from 'react';
import StarRating from './StarRating';

export default function ReviewForm({ onSubmit, disabled = false, buttonLabel = 'Submit review' }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating || saving || disabled) return;
    setSaving(true);
    try {
      await onSubmit({ rating, comment });
      setRating(0);
      setComment('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-3 p-3 bg-white">
      <div className="mb-2 fw-semibold">Leave a review</div>
      <StarRating value={rating} onChange={setRating} disabled={saving || disabled} />
      <textarea
        className="form-control mt-2"
        rows={3}
        placeholder="Share quick feedback (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={saving || disabled}
      />
      <button className="btn btn-primary mt-3" disabled={saving || disabled || !rating}>
        {saving ? 'Submitting…' : buttonLabel}
      </button>
    </form>
  );
}
