'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { DEPARTMENTS } from '../../../lib/campusConstants';
import useRequireAuth from '../../../lib/useRequireAuth';
import { uploadImage } from '../../../lib/apiRequests';
import styles from '../../create-forms.module.css';

function RequiredLabel({ children }) {
  return (
    <span>
      <span className={styles['form-required-asterisk']} aria-hidden="true">*</span>
      {children}
    </span>
  );
}

export default function CreateListingPage() {
  const { isReady } = useRequireAuth();
  const router = useRouter();
  const [category, setCategory] = useState('general');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('SEECS');
  const [courseCode, setCourseCode] = useState('');
  const [semester, setSemester] = useState('');
  const [listingType, setListingType] = useState('sale');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('');
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 6);
    if (!files.length) return;

    setUploading(true);
    setUploadProgress(0);
    const urls = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const res = await uploadImage(files[i], (pct) => {
          const base = Math.round((i / files.length) * 100);
          setUploadProgress(base + Math.round(pct / files.length));
        }, 'listings');
        const url = res?.data?.url || '';
        if (url) urls.push(url);
      }

      setImages((prev) => [...prev, ...urls].slice(0, 6));
      toast.success('Images uploaded');
    } catch (err) {
      toast.error(err?.message || 'Image upload failed - check Cloudinary env on the server');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeImage = (urlToRemove) => {
    setImages((prev) => prev.filter((url) => url !== urlToRemove));
    toast.success('Image removed');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const body = {
        category,
        title,
        description,
        department,
        listingType,
        condition,
        images,
        courseCode: category === 'textbook' ? courseCode.toUpperCase() : '',
        semester: category === 'textbook' && semester !== '' ? Number(semester) : null,
        price: listingType === 'exchange' || price === '' ? null : Number(price),
      };

      const res = await api.post('/marketplace/listings', body);
      if (res.data?.success && res.data?.data?._id) {
        toast.success('Listing created');
        router.push(`/marketplace/${res.data.data._id}`);
      } else {
        toast.error(res.data?.message || 'Could not create listing');
      }
    } catch (err) {
      const msg =
        err.code === 'ECONNABORTED'
          ? 'Request timed out - is the API running (port 5000) and NEXT_PUBLIC_API_URL set?'
          : err.response?.data?.message ||
            err.response?.data?.errors?.[0]?.message ||
            err.message ||
            'Could not create listing';
      toast.error(msg);
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
        <h1 className="mb-0">New listing</h1>
        <Link href="/marketplace" className={`btn btn-outline-secondary btn-sm ${styles.backLink}`}>
          Cancel
        </Link>
      </div>

      <form onSubmit={onSubmit} className="bg-white p-3 p-md-4 rounded-3 shadow-sm border">
        <div className="mb-3">
          <label className="form-label">
            <RequiredLabel>Lane</RequiredLabel>
          </label>
          <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)} required>
            <option value="general">General items</option>
            <option value="textbook">Textbooks &amp; study material</option>
          </select>
        </div>

        {category === 'textbook' && (
          <div className="row g-2 mb-3">
            <div className="col-md-6">
              <label className="form-label">
                <RequiredLabel>Course code</RequiredLabel>
              </label>
              <input
                className="form-control"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">
                <RequiredLabel>Semester (1-8)</RequiredLabel>
              </label>
              <select
                className="form-select"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                required
              >
                <option value="">Select</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
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
          />
        </div>

        <div className="row g-2 mb-3">
          <div className="col-md-6">
            <label className="form-label">
              <RequiredLabel>Department</RequiredLabel>
            </label>
            <select className="form-select" value={department} onChange={(e) => setDepartment(e.target.value)} required>
              {DEPARTMENTS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">
              <RequiredLabel>Listing type</RequiredLabel>
            </label>
            <select className="form-select" value={listingType} onChange={(e) => setListingType(e.target.value)} required>
              <option value="sale">Sale</option>
              <option value="rent">Rent</option>
              <option value="exchange">Exchange</option>
            </select>
          </div>
        </div>

        {listingType !== 'exchange' && (
          <div className="mb-3">
            <label className="form-label">
              <RequiredLabel>Price (PKR)</RequiredLabel>
            </label>
            <input
              type="number"
              min={0}
              className="form-control"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>
        )}

        <div className="mb-3">
          <label className="form-label">Condition</label>
          <input
            className="form-control"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            placeholder="e.g. Like new"
          />
        </div>

        <div className="mb-4">
          <label className="form-label">Photos (max 6)</label>
          <input
            type="file"
            accept="image/*"
            multiple
            className="form-control"
            onChange={onFiles}
            disabled={uploading}
          />
          {uploading && (
            <div style={{ marginTop: '0.5rem', height: 4, background: '#E5E7EB', borderRadius: 9999, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: '#166534', borderRadius: 9999, width: `${uploadProgress}%`, transition: 'width 0.2s ease' }} />
            </div>
          )}
          {images.length > 0 && (
            <div className="d-flex flex-wrap gap-2 mt-2">
              {images.map((url) => (
                <div key={url} className={styles['form-image-preview-wrapper']} style={{ position: 'relative' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className={styles['form-image-preview']} />
                  <button
                    type="button"
                    onClick={() => removeImage(url)}
                    className={styles['form-image-remove-btn']}
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      background: '#DC2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '20px',
                      height: '20px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1
                    }}
                    title="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          className={`btn ${styles.submitPrimary} ${submitting || uploading ? styles.submitPrimaryBusy : ''}`}
          disabled={submitting || uploading}
        >
          {submitting ? 'Publishing...' : 'Publish listing'}
        </button>
      </form>
    </div>
  );
}
