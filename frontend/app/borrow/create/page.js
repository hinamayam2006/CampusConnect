'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import useRequireAuth from '../../../lib/useRequireAuth';
import { createBorrowItem, uploadImage } from '../../../lib/apiRequests';
import styles from '../../create-forms.module.css';

const BORROW_CATEGORIES = [
  'general',
  'electronics',
  'books-notes',
  'lab-tools',
  'sports',
  'calculator',
  'accessory',
  'other',
];

function RequiredLabel({ children }) {
  return (
    <span>
      <span className={styles['form-required-asterisk']} aria-hidden="true">*</span>
      {children}
    </span>
  );
}

export default function BorrowCreatePage() {
  const { isReady } = useRequireAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [condition, setCondition] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remaining = Math.max(0, 6 - images.length);
    if (remaining === 0) {
      toast.error('You can upload up to 6 images');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const urls = [];
      const batch = files.slice(0, remaining);
      for (let i = 0; i < batch.length; i++) {
        const res = await uploadImage(batch[i], (pct) => {
          const base = Math.round((i / batch.length) * 100);
          setUploadProgress(base + Math.round(pct / batch.length));
        });
        const url = res?.data?.url || '';
        if (url) urls.push(url);
      }

      if (urls.length) {
        setImages((prev) => [...prev, ...urls].slice(0, 6));
        toast.success('Image upload complete');
      } else {
        toast.error('Could not upload selected image(s)');
      }
    } catch (err) {
      toast.error(err?.message || 'Image upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  const removeImage = (urlToRemove) => {
    setImages((prev) => prev.filter((url) => url !== urlToRemove));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const payload = { title, description, category, condition, images };
      const res = await createBorrowItem(payload);
      if (!res?.success) throw new Error(res?.message || 'Failed to create listing');
      toast.success('Borrow item listed successfully');
      router.push('/borrow');
    } catch (err) {
      const firstFieldError = Array.isArray(err?.errors) && err.errors.length
        ? `${err.errors[0].field}: ${err.errors[0].message}`
        : '';
      const message = firstFieldError || err?.message || 'Could not create borrow listing';
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isReady) {
    return <div className="container py-5 text-secondary">Loading session...</div>;
  }

  return (
    <div className={`container py-4 py-md-5 ${styles['form-page-shell']}`}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">Post a borrow request</h1>
        <Link href="/borrow" className="btn btn-outline-secondary btn-sm">
          Cancel
        </Link>
      </div>

      <form onSubmit={onSubmit} className="bg-white p-3 p-md-4 rounded-3 shadow-sm border">
        <div className="alert alert-info py-2 px-3" role="alert">
          Describe the item you need. Other students can respond if they can lend it.
        </div>

        {formError && (
          <div className="alert alert-danger" role="alert">
            {formError}
          </div>
        )}

        <div className="mb-3">
          <label className="form-label">
            <RequiredLabel>Title</RequiredLabel>
          </label>
          <input
            className="form-control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
            maxLength={120}
          />
        </div>

        <div className="mb-3">
          <label className="form-label">
            <RequiredLabel>Description</RequiredLabel>
          </label>
          <textarea
            className="form-control"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={10}
            maxLength={2000}
          />
        </div>

        <div className="row g-2 mb-3">
          <div className="col-md-6">
            <label className="form-label">
              <RequiredLabel>Category</RequiredLabel>
            </label>
            <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)} required>
              {BORROW_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value
                    .split('-')
                    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
                    .join(' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Condition</label>
            <input
              className="form-control"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              maxLength={120}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="form-label">Images (optional, max 6)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            className="form-control"
            onChange={onFiles}
            disabled={uploading || images.length >= 6}
          />
          <div className="form-text">
            {uploading ? `Uploading... ${uploadProgress}%` : `${images.length}/6 image(s) selected`}
          </div>
          {uploading && (
            <div style={{ marginTop: '0.4rem', height: 4, background: '#E5E7EB', borderRadius: 9999, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#166534', borderRadius: 9999, width: `${uploadProgress}%`, transition: 'width 0.2s ease' }} />
            </div>
          )}
          {images.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mt-2">
              {images.map((url) => (
                <div key={url} className="position-relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Uploaded item" className={styles['form-image-preview']} />
                  <button
                    type="button"
                    className="btn btn-sm btn-danger position-absolute top-0 end-0 translate-middle p-0"
                    style={{ width: 24, height: 24, lineHeight: '20px', borderRadius: '999px' }}
                    onClick={() => removeImage(url)}
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting || uploading}>
          {submitting ? 'Publishing...' : 'Publish request'}
        </button>
      </form>
    </div>
  );
}
