'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import useRequireAuth from '../../../lib/useRequireAuth';
import { createBorrowItem } from '../../../lib/apiRequests';

export default function BorrowCreatePage() {
  const { isReady } = useRequireAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [condition, setCondition] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { title, description, category, condition, images: [] };
      const res = await createBorrowItem(payload);
      if (!res?.success) throw new Error(res?.message || 'Failed to create listing');
      toast.success('Borrow item listed successfully');
      router.push('/borrow');
    } catch (err) {
      toast.error(err?.message || 'Could not create borrow listing');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isReady) {
    return <div className="container py-5 text-secondary">Loading session...</div>;
  }

  return (
    <div className="container py-4 py-md-5 form-page-shell">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">List an item to borrow</h1>
        <Link href="/borrow" className="btn btn-outline-secondary btn-sm">
          Cancel
        </Link>
      </div>

      <form onSubmit={onSubmit} className="bg-white p-3 p-md-4 rounded-3 shadow-sm border">
        <div className="mb-3">
          <label className="form-label">Title</label>
          <input className="form-control" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>

        <div className="mb-3">
          <label className="form-label">Description</label>
          <textarea
            className="form-control"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="row g-2 mb-3">
          <div className="col-md-6">
            <label className="form-label">Category</label>
            <input className="form-control" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Condition</label>
            <input className="form-control" value={condition} onChange={(e) => setCondition(e.target.value)} />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Publishing...' : 'Publish item'}
        </button>
      </form>
    </div>
  );
}
