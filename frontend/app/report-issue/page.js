'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Send, CheckCircle2, Image as ImageIcon, X } from 'lucide-react';
import toast from 'react-hot-toast';
import useRequireAuth from '../../lib/useRequireAuth';
import api from '../../lib/api';
import { submitIssueReport } from '../../lib/apiTickets';
import hubStyles from '../community.module.css';
import uploadStyles from '../notes/upload/upload.module.css';

const ISSUE_CATEGORIES = [
  'Bug',
  'Harassment',
  'Technical Issue',
  'Scam/Fraud',
  'Inappropriate Content',
  'Other',
];

export default function ReportIssuePage() {
  const { isReady } = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [category, setCategory] = useState('');
  const [targetId, setTargetId] = useState(() => searchParams.get('targetId') || '');
  const [targetType, setTargetType] = useState(() => searchParams.get('targetType') || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Sync state with URL params when they change
  useEffect(() => {
    const timer = setTimeout(() => {
      const tid = searchParams.get('targetId');
      const ttype = searchParams.get('targetType');
      if (tid) setTargetId(tid);
      if (ttype) setTargetType(ttype);
    }, 0);

    return () => clearTimeout(timer);
  }, [searchParams]);

  if (!isReady) return null;

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 3);
    if (!files.length) return;

    setUploading(true);
    setUploadProgress(0);
    const urls = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const fd = new FormData();
        fd.append('image', files[i]);
        const res = await api.post('/upload/image', fd, {
          onUploadProgress: (evt) => {
            if (evt.total) {
              const fileBase = Math.round((i / files.length) * 100);
              const fileChunk = Math.round((evt.loaded / evt.total) * (100 / files.length));
              setUploadProgress(fileBase + fileChunk);
            }
          },
        });
        if (res.data.success) urls.push(res.data.data.url);
      }
      setImages((prev) => [...prev, ...urls].slice(0, 3));
      toast.success('Screenshots attached');
    } catch {
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeImage = (indexToRemove) => {
    setImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category) return toast.error('Please select an issue type');
    if (!description.trim() || description.trim().length < 10) {
      return toast.error('Please provide a description (at least 10 characters)');
    }

    setSubmitting(true);
    try {
      await submitIssueReport({
        category,
        title: title.trim(),
        description: description.trim(),
        targetId: targetId.trim(),
        targetType: targetType.trim(),
        images,
      });
      setSuccess(true);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={hubStyles.page}>
      <div className="container" style={{ maxWidth: 800 }}>
        <div className={hubStyles.pageHeader}>
          <div className={hubStyles.headerLeft}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#6B7280', fontSize: '0.85rem', textDecoration: 'none', marginBottom: '0.75rem', fontWeight: 600 }}>
              <ArrowLeft size={14} /> Back
            </Link>
            <h1 className={hubStyles.pageTitle}>Report an Issue</h1>
            <p className={hubStyles.pageSubtitle}>
              Found a bug or encountered inappropriate behavior? Let us know so we can fix it.
            </p>
          </div>
        </div>

        {success ? (
          <div className={uploadStyles.formCard} style={{ textAlign: 'center', padding: '4rem 2rem' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 64, height: 64, borderRadius: '50%', background: '#FEF2F2', color: '#DC2626', marginBottom: '1.5rem' }}>
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', color: '#111827' }}>Report Submitted</h2>
            <p style={{ color: '#6B7280', maxWidth: 400, margin: '0 auto 2rem' }}>
              Thank you for reporting this. Our administration team takes these reports seriously and will investigate the issue shortly.
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
                <AlertTriangle size={18} color="#DC2626" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>Issue Details</h3>
              </div>

              <div className={uploadStyles.fieldGrid}>
                {/* Category */}
                <div className={uploadStyles.field}>
                  <label className={uploadStyles.fieldLabel}>
                    Issue Type <span className={uploadStyles.fieldReq}>*</span>
                  </label>
                  <select
                    className={uploadStyles.fieldSelect}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                  >
                    <option value="">Select an issue type...</option>
                    {ISSUE_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Target ID */}
                <div className={uploadStyles.field}>
                  <label className={uploadStyles.fieldLabel}>Reported User ID or Link (Optional)</label>
                  <input
                    type="text"
                    className={uploadStyles.fieldInput}
                    placeholder="Paste ID or link to listing/profile"
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                  />
                </div>

                {/* Title */}
                <div className={`${uploadStyles.field} ${uploadStyles.fieldFull}`}>
                  <label className={uploadStyles.fieldLabel}>Short Summary (Optional)</label>
                  <input
                    type="text"
                    className={uploadStyles.fieldInput}
                    placeholder="e.g. Cannot upload a file in Chrome"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={150}
                  />
                </div>

                {/* Description */}
                <div className={`${uploadStyles.field} ${uploadStyles.fieldFull}`}>
                  <label className={uploadStyles.fieldLabel}>
                    Detailed Description <span className={uploadStyles.fieldReq}>*</span>
                  </label>
                  <textarea
                    className={uploadStyles.fieldTextarea}
                    placeholder="Please provide as much detail as possible. What happened? How can we reproduce it?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    required
                    maxLength={4000}
                  />
                </div>

                {/* Screenshots */}
                <div className={`${uploadStyles.field} ${uploadStyles.fieldFull}`}>
                  <label className={uploadStyles.fieldLabel}>Attach Screenshots (Max 3)</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="form-control"
                    onChange={handleFiles}
                    disabled={uploading || images.length >= 3}
                    style={{ fontSize: '0.9rem' }}
                  />
                  {uploading && (
                    <div style={{ marginTop: '0.5rem', height: 4, background: '#E5E7EB', borderRadius: 9999, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#4F46E5', borderRadius: 9999, width: `${uploadProgress}%`, transition: 'width 0.2s ease' }} />
                    </div>
                  )}
                  {images.length > 0 && (
                    <div className="d-flex flex-wrap gap-2 mt-3">
                      {images.map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <button
                            type="button"
                            onClick={() => removeImage(idx)}
                            aria-label={`Remove screenshot ${idx + 1}`}
                            title="Remove screenshot"
                            style={{
                              position: 'absolute',
                              top: 6,
                              right: 6,
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              border: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'rgba(17, 24, 39, 0.8)',
                              color: '#fff',
                              padding: 0,
                              cursor: 'pointer',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                disabled={submitting || uploading}
                style={{ padding: '0.6rem 1.5rem', background: '#DC2626', borderColor: '#DC2626' }}
              >
                {submitting ? 'Submitting...' : (
                  <>
                    <AlertTriangle size={16} /> Submit Report
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
