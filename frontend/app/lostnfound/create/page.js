'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import useRequireAuth from '../../../lib/useRequireAuth';
import { createLostnFoundItem } from '../../../lib/apiRequests';

export default function LostnFoundCreatePage() {
  const { isReady } = useRequireAuth();
  const router = useRouter();

  const [postType, setPostType] = useState('lost');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [location, setLocation] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        postType,
        title,
        description,
        category,
        location,
        contactInfo,
        images: [],
      };
      const res = await createLostnFoundItem(payload);
      if (!res?.success) throw new Error(res?.message || 'Failed to create post');
      toast.success('Post published successfully');
      router.push('/lostnfound');
    } catch (err) {
      toast.error(err?.message || 'Could not create post');
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
        <h1 className="mb-0">Post Lost &amp; Found</h1>
        <Link href="/lostnfound" className="btn btn-outline-secondary btn-sm">
          Cancel
        </Link>
      </div>

      <form onSubmit={onSubmit} className="bg-white p-3 p-md-4 rounded-3 shadow-sm border">
        <div className="mb-3">
          <label className="form-label">Type</label>
          <select className="form-select" value={postType} onChange={(e) => setPostType(e.target.value)}>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </select>
        </div>

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
            <label className="form-label">Location</label>
            <input className="form-control" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Contact info</label>
          <input className="form-control" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} />
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Publishing...' : 'Publish post'}
        </button>
      </form>
    </div>
  );
}
