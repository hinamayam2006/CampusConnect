'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import useRequireAuth from '../../../lib/useRequireAuth';
import FileTypeBadge from '../../../components/FileTypeBadge';
import { formatFileSize } from '../../../lib/uiHelpers';
import styles from '../notes.module.css';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
const ALLOWED_TYPES = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.webp'];

export default function NotesUploadPage() {
  const { isReady } = useRequireAuth();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [course, setCourse] = useState('');
  const [subject, setSubject] = useState('');
  const [tags, setTags] = useState('');
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const validateFile = (f) => {
    if (!f) return '';
    if (f.size > MAX_FILE_SIZE) {
      return `File is too large (${formatFileSize(f.size)}). Maximum allowed is 25 MB.`;
    }
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (!ALLOWED_TYPES.includes(ext)) {
      return `File type "${ext}" is not supported. Allowed: ${ALLOWED_TYPES.join(', ')}`;
    }
    return '';
  };

  const handleFilePick = (picked) => {
    if (!picked) {
      setFile(null);
      setFileError('');
      return;
    }
    const err = validateFile(picked);
    if (err) {
      setFileError(err);
      setFile(null);
      return;
    }
    setFileError('');
    setFile(picked);
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please provide a title for your notes.');
      return;
    }
    if (title.trim().length < 3) {
      toast.error('Title must be at least 3 characters long.');
      return;
    }
    if (!course.trim()) {
      toast.error('Course name is required.');
      return;
    }
    if (!subject.trim()) {
      toast.error('Subject is required.');
      return;
    }
    if (!description.trim()) {
      toast.error('Please add a description so others know what to expect.');
      return;
    }
    if (description.trim().length < 10) {
      toast.error('Description should be at least 10 characters.');
      return;
    }
    if (!file) {
      toast.error('Please choose a file to upload.');
      return;
    }
    const fErr = validateFile(file);
    if (fErr) {
      toast.error(fErr);
      return;
    }

    setSubmitting(true);
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await api.post('/upload/notes', fd, {
        timeout: 120000,
        onUploadProgress: (event) => {
          if (!event.total) return;
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        },
      });
      const {
        fileUrl,
        previewImageUrl,
        publicId,
        resourceType,
        fileFormat,
        fileName,
        fileType,
        fileSize,
        downloadFileName,
      } = uploadRes.data?.data || {};
      if (!fileUrl) {
        throw new Error('Upload completed but no file URL was returned. Please try again.');
      }
      setUploading(false);

      const body = {
        title: title.trim(),
        description: description.trim(),
        course: course.trim(),
        subject: subject.trim(),
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        fileUrl,
        previewImageUrl: previewImageUrl || '',
        publicId: publicId || '',
        resourceType: resourceType || '',
        fileFormat: fileFormat || '',
        fileName: downloadFileName || fileName || file?.name || '',
        fileType: fileType || file?.type || '',
        fileSize: fileSize || file?.size || 0,
      };

      const res = await api.post('/notes', body);
      if (res.data?.success && res.data?.data?._id) {
        toast.success('Notes uploaded successfully! Redirecting to your note…');
        router.push(`/notes/${res.data.data._id}`);
      } else {
        toast.error(res.data?.message || 'Note was uploaded but could not be saved. Please try again.');
      }
    } catch (err) {
      const msg =
        err.code === 'ECONNABORTED'
          ? 'Upload timed out. Please check your internet connection and try again.'
          : err.response?.status === 413
          ? 'File is too large for the server. Maximum allowed is 25 MB.'
          : err.response?.status === 415
          ? 'File type is not supported by the server.'
          : err.response?.data?.message ||
            err.response?.data?.errors?.[0]?.message ||
            err.message ||
            'Upload failed. Please try again later.';
      toast.error(msg);
      setUploading(false);
      setUploadProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isReady) {
    return (
      <div className={styles.page}>
        <div className="container" style={{ maxWidth: 720 }}>
          <div className={styles.surfaceCard} style={{ textAlign: 'center', padding: '3rem' }}>
            <div className={styles.emptyStateTitle}>Loading your session…</div>
            <p className={styles.emptyStateText}>Please wait while we verify your credentials.</p>
          </div>
        </div>
      </div>
    );
  }

  const tagCount = tags.split(',').map((t) => t.trim()).filter(Boolean).length;

  return (
    <div className={styles.page}>
      <div className={`container ${styles.container}`} style={{ maxWidth: 740 }}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Upload Notes</h1>
            <p className={styles.pageSubtitle}>Share your study materials with the campus community.</p>
          </div>
          <div className={styles.actionRow}>
            <Link href="/notes" className={styles.btnSecondary}>Cancel</Link>
          </div>
        </div>

        <form onSubmit={onSubmit} className={styles.formCard}>
          {/* Title */}
          <div className="mb-3">
            <label className={styles.formLabel}>
              Title <span className={styles.formRequired}>*</span>
            </label>
            <input
              className="form-control"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. DBMS Unit 3 - Normalization Notes"
              maxLength={120}
              required
            />
            <div className={styles.formHint}>{title.length}/120 characters</div>
          </div>

          {/* Course & Subject */}
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-6">
              <label className={styles.formLabel}>
                Course <span className={styles.formRequired}>*</span>
              </label>
              <input
                className="form-control"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. CS301"
                required
              />
            </div>
            <div className="col-12 col-md-6">
              <label className={styles.formLabel}>
                Subject <span className={styles.formRequired}>*</span>
              </label>
              <input
                className="form-control"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Database Management"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="mb-3">
            <label className={styles.formLabel}>
              Description <span className={styles.formRequired}>*</span>
            </label>
            <textarea
              className="form-control"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what's in these notes — topics covered, exam relevance, etc."
              maxLength={1000}
              required
            />
            <div className={styles.formHint}>{description.length}/1000 characters</div>
          </div>

          {/* Tags */}
          <div className="mb-3">
            <label className={styles.formLabel}>Tags</label>
            <input
              className="form-control"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="exam prep, unit 1, lecture notes"
            />
            <div className={styles.formHint}>
              Comma separated — helps others find your notes. {tagCount > 0 ? `${tagCount} tag${tagCount > 1 ? 's' : ''} added.` : 'No tags yet.'}
            </div>
          </div>

          <hr className={styles.divider} />

          {/* File upload */}
          <div className="mb-3">
            <label className={styles.formLabel}>
              File <span className={styles.formRequired}>*</span>
            </label>
            <input
              className="form-control mb-2"
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              onChange={(e) => handleFilePick(e.target.files?.[0] || null)}
              required
            />
            <div
              className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                handleFilePick(e.dataTransfer.files?.[0] || null);
              }}
            >
              Drop your file here
            </div>
            <div className={styles.formHint}>
              Accepted: PDF, DOC, DOCX, PPT, PPTX, JPG, PNG, WEBP — Max 25 MB
            </div>

            {fileError && (
              <div className={`${styles.alertDanger} mt-2`}>{fileError}</div>
            )}

            {file && !fileError && (
              <div className={`${styles.alertSuccess} mt-2`} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <FileTypeBadge fileType={file.type} fileName={file.name} />
                <span style={{ fontWeight: 600 }}>{file.name}</span>
                <span style={{ opacity: 0.7 }}>{formatFileSize(file.size)}</span>
              </div>
            )}

            {file?.type?.startsWith('image/') && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={URL.createObjectURL(file)}
                alt="Preview"
                style={{ maxHeight: 140, borderRadius: 'var(--cc-radius-sm)', border: '1px solid var(--cc-border)', marginTop: '0.75rem' }}
              />
            )}

            {uploading && (
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }} />
              </div>
            )}
            {uploading && (
              <div className={styles.formHint} style={{ marginTop: '0.35rem' }}>
                Uploading… {uploadProgress}% complete
              </div>
            )}
          </div>

          <button className={styles.btnPrimary} style={{ width: '100%', padding: '0.75rem' }} disabled={submitting || uploading}>
            {uploading ? `Uploading… ${uploadProgress}%` : submitting ? 'Saving your notes…' : 'Upload Notes'}
          </button>

          {submitting && (
            <div className={`${styles.alertInfo} mt-3`}>
              Please do not close this page while your upload is in progress.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
