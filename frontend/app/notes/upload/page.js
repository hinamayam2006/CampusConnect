'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FolderOpen,
  BookOpen,
  FileText,
  ClipboardList,
  Check,
  X,
  Info,
  Upload,
  File,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { fetchMyNotes } from '@/lib/apiRequests';
import useRequireAuth from '@/lib/useRequireAuth';
import styles from './upload.module.css';

/* --- Material types --------------------------- */
const TYPES = [
  {
    id: 'lecture_notes',
    label: 'Lecture Notes',
    desc: 'Class notes & summaries',
    icon: BookOpen,
    tag: 'Lecture Notes',
  },
  {
    id: 'past_paper',
    label: 'Past Paper',
    desc: 'Previous exam papers',
    icon: FileText,
    tag: 'Past Paper',
  },
  {
    id: 'assignment',
    label: 'Assignment',
    desc: 'Coursework & assignments',
    icon: ClipboardList,
    tag: 'Assignment',
  },
];

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt';
const MAX_MB = 25;

export default function UploadNotePage() {
  const { isReady } = useRequireAuth();

  /* --- File state --- */
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef(null);

  /* --- Form state --- */
  const [materialType, setMaterialType] = useState('lecture_notes');
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [description, setDescription] = useState('');

  /* --- Submit state --- */
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  /* --- My recent uploads --- */
  const [recentUploads, setRecentUploads] = useState([]);
  const [loadingUploads, setLoadingUploads] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    fetchMyNotes({ limit: 4 })
      .then((res) => setRecentUploads(res.data?.items || []))
      .catch(() => setRecentUploads([]))
      .finally(() => setLoadingUploads(false));
  }, [isReady]);

  /* --- File helpers --- */
  const validateAndSetFile = useCallback((f) => {
    if (!f) return;
    setFileError('');
    if (f.size > MAX_MB * 1024 * 1024) {
      setFileError(`File is too large (max ${MAX_MB} MB).`);
      return;
    }
    setFile(f);
  }, []);

  const handleFileInput = (e) => {
    validateAndSetFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    validateAndSetFile(e.dataTransfer.files?.[0]);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const clearFile = (e) => {
    e.stopPropagation();
    setFile(null);
    setFileError('');
  };

  /* --- Submit --- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!file) { setError('Please select a file to upload.'); return; }
    if (!title.trim()) { setError('Please enter a title.'); return; }
    if (!courseCode.trim()) { setError('Please enter the course code.'); return; }
    if (!academicYear) { setError('Please select the academic year.'); return; }

    setSubmitting(true);
    setProgress(10);

    try {
      /* Step 1 -- Upload file to Cloudinary via backend */
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await api.post('/upload/notes', formData, {
        onUploadProgress: (evt) => {
          const pct = Math.round((evt.loaded / evt.total) * 70);
          setProgress(10 + pct);
        },
      });

      const uploadData = uploadRes.data?.data || uploadRes.data;
      setProgress(85);

      /* Step 2 -- Create note record */
      const selectedType = TYPES.find((t) => t.id === materialType);
      const tags = [selectedType?.tag, academicYear].filter(Boolean);

      await api.post('/notes', {
        title: title.trim(),
        description: description.trim(),
        course: courseCode.trim().toUpperCase(),
        subject: courseCode.trim().toUpperCase(),
        tags,
        fileUrl: uploadData.fileUrl || uploadData.url,
        previewImageUrl: uploadData.previewImageUrl || '',
        publicId: uploadData.publicId || '',
        resourceType: uploadData.resourceType || 'raw',
        fileFormat: uploadData.fileFormat || '',
        fileName: uploadData.fileName || file.name,
        fileType: uploadData.fileType || file.type,
        fileSize: uploadData.fileSize || file.size,
      });

      setProgress(100);
      setSuccess(true);

      /* Refresh recent uploads list */
      fetchMyNotes({ limit: 4 })
        .then((res) => setRecentUploads(res.data?.items || []))
        .catch(() => {});
    } catch (err) {
      setError(err.message || 'Upload failed. Please try again.');
      setProgress(0);
    } finally {
      setSubmitting(false);
    }
  };

  /* --- Reset after success --- */
  const handleUploadAnother = () => {
    setSuccess(false);
    setFile(null);
    setTitle('');
    setCourseCode('');
    setAcademicYear('');
    setDescription('');
    setProgress(0);
    setError('');
  };

  if (!isReady) return null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* -- Page header -- */}
        <div className={styles.pageTop}>
          <Link href="/notes" className={styles.backLink}>
            <ArrowLeft size={14} />
            Back
          </Link>
          <div>
            <h1 className={styles.pageTitle}>Upload a Note or Paper</h1>
            <p className={styles.pageSub}>Share your study materials with fellow students</p>
          </div>
        </div>

        <div className={styles.layout}>
          {/* ========== MAIN FORM CARD ========== */}
          <form className={styles.formCard} onSubmit={handleSubmit} noValidate>

            {/* Success State */}
            {success ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: '#F0FDF4', border: '2px solid #A7D4A7',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 1.25rem',
                }}>
                  <Check size={28} color="#16A34A" />
                </div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1A1A1A' }}>
                  Note Uploaded!
                </h3>
                <p style={{ color: '#6B6B6B', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  Your material has been submitted and will be visible after review.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                  <button type="button" onClick={handleUploadAnother} className={styles.submitBtn} style={{ width: 'auto', padding: '10px 22px' }}>
                    Upload Another
                  </button>
                  <Link href="/notes" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '10px 22px', background: '#fff', border: '1px solid #E8E2D9',
                    borderRadius: 12, fontSize: '0.85rem', fontWeight: 600, color: '#6B6B6B', textDecoration: 'none',
                  }}>
                    Browse Notes
                  </Link>
                </div>
              </div>
            ) : (
              <>
                {/* -- 1. Drop Zone -- */}
                <div className={styles.cardSection}>
                  <p className={styles.sectionLabel}>Select File</p>
                  <div
                    className={[
                      styles.dropZone,
                      dragging ? styles.dropZoneActive : '',
                      file ? styles.dropZoneHasFile : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => !file && fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && !file && fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className={styles.dzFileInput}
                      accept={ACCEPTED_TYPES}
                      onChange={handleFileInput}
                    />

                    {file ? (
                      <div className={styles.dzFileRow}>
                        <div className={styles.dzIconWrap}>
                          <Check size={22} />
                        </div>
                        <div className={styles.dzFileName}>
                          <strong>{file.name}</strong>
                          <span>{(file.size / (1024 * 1024)).toFixed(1)} MB -- ready to upload</span>
                        </div>
                        <button type="button" className={styles.dzClearBtn} onClick={clearFile} aria-label="Remove file">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className={styles.dzIconWrap}>
                          <FolderOpen size={26} />
                        </div>
                        <p className={styles.dzHeading}>Drag &amp; drop your file here</p>
                        <p className={styles.dzSub}>PDF, Word, PowerPoint, Excel, TXT -- up to {MAX_MB} MB</p>
                        <button
                          type="button"
                          className={styles.dzBrowseBtn}
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        >
                          Browse File
                        </button>
                      </>
                    )}
                  </div>
                  {fileError && (
                    <div className={styles.dzErrorMsg}>
                      <AlertCircle size={13} />
                      {fileError}
                    </div>
                  )}
                </div>

                <hr className={styles.divider} />

                {/* -- 2. Material Type -- */}
                <div className={styles.cardSection}>
                  <p className={styles.sectionLabel}>Material Type</p>
                  <div className={styles.typeTiles}>
                    {TYPES.map((t) => {
                      const Icon = t.icon;
                      const active = materialType === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          className={[styles.typeTile, active ? styles.typeTileActive : ''].filter(Boolean).join(' ')}
                          onClick={() => setMaterialType(t.id)}
                          aria-pressed={active}
                        >
                          {active && (
                            <span className={styles.tileCheckBadge}>
                              <Check size={10} />
                            </span>
                          )}
                          <span className={styles.tileIcon}>
                            <Icon size={18} />
                          </span>
                          <span className={styles.tileLabel}>{t.label}</span>
                          <span className={styles.tileDesc}>{t.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <hr className={styles.divider} />

                {/* -- 3. Form Fields -- */}
                <div className={styles.cardSection}>
                  <p className={styles.sectionLabel}>Details</p>
                  <div className={styles.fieldGrid}>
                    {/* Title */}
                    <div className={[styles.field, styles.fieldFull].join(' ')}>
                      <label className={styles.fieldLabel}>
                        Title <span className={styles.fieldReq}>*</span>
                      </label>
                      <input
                        type="text"
                        className={styles.fieldInput}
                        placeholder="e.g. Chapter 3 -- Data Structures"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={120}
                        required
                      />
                    </div>

                    {/* Course Code */}
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>
                        Course Code <span className={styles.fieldReq}>*</span>
                      </label>
                      <input
                        type="text"
                        className={styles.fieldInput}
                        placeholder="e.g. CS301"
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                        maxLength={20}
                        required
                      />
                    </div>

                    {/* Academic Year */}
                    <div className={styles.field}>
                      <label className={styles.fieldLabel}>
                        Academic Year <span className={styles.fieldReq}>*</span>
                      </label>
                      <select
                        className={styles.fieldSelect}
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        required
                      >
                        <option value="">Select year…</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                        <option value="Postgraduate">Postgraduate</option>
                      </select>
                    </div>

                    {/* Description */}
                    <div className={[styles.field, styles.fieldFull].join(' ')}>
                      <label className={styles.fieldLabel}>Description</label>
                      <textarea
                        className={styles.fieldTextarea}
                        placeholder="What does this note cover? Any topics, chapters or units to mention?"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={500}
                        rows={4}
                      />
                      <p className={styles.fieldHint}>{description.length}/500 characters</p>
                    </div>
                  </div>
                </div>

                {/* Upload progress */}
                {submitting && progress > 0 && (
                  <div className={styles.progressWrap}>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${progress}%` }} />
                    </div>
                    <p className={styles.progressLabel}>
                      {progress < 80 ? 'Uploading file…' : 'Creating note record…'}
                    </p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className={styles.dzErrorMsg}>
                    <AlertCircle size={13} />
                    {error}
                  </div>
                )}

                <hr className={styles.divider} />

                {/* Submit */}
                <button
                  type="submit"
                  className={[styles.submitBtn, file && title && courseCode && academicYear ? styles.submitBtnReady : ''].filter(Boolean).join(' ')}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className={styles.spinner} />
                      Uploading…
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Upload Note
                    </>
                  )}
                </button>
                <p className={styles.uploadHint}>
                  <Info size={12} color="#9E9E9E" />
                  Your note will be reviewed before going live.
                </p>
              </>
            )}
          </form>

          {/* ========== RIGHT SIDEBAR ========== */}
          <aside className={styles.sideCol}>
            {/* Upload Guidelines */}
            <div className={styles.sideCard}>
              <div className={styles.sideCardHead}>
                <Info size={13} />
                Upload Guidelines
              </div>
              <div className={styles.sideCardBody}>
                <ul className={styles.guideList}>
                  {[
                    'Only upload your own original notes or materials you have the right to share.',
                    'Accepted formats: PDF, Word, PowerPoint, Excel, TXT.',
                    'Maximum file size is 25 MB per upload.',
                    'Include an accurate title and course code so others can find your material.',
                    'Notes are reviewed before going live -- avoid plagiarised content.',
                    'Repeated policy violations may result in account suspension.',
                  ].map((rule, i) => (
                    <li key={i} className={styles.guideItem}>
                      <span className={styles.guideDot} />
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* My Uploads */}
            <div className={styles.sideCard}>
              <div className={styles.sideCardHead}>
                <File size={13} />
                My Recent Uploads
              </div>
              <div className={styles.sideCardBody} style={{ padding: '0.25rem 0' }}>
                {loadingUploads ? (
                  <div style={{ padding: '1rem', textAlign: 'center' }}>
                    <span className={styles.spinner} style={{ borderColor: '#C8BFB5', borderTopColor: 'transparent' }} />
                  </div>
                ) : recentUploads.length === 0 ? (
                  <p className={styles.uploadsEmpty}>No uploads yet.</p>
                ) : (
                  recentUploads.map((note) => (
                    <Link key={note._id} href={`/notes/${note._id}`} className={styles.uploadItem} style={{ padding: '0.7rem 1.1rem' }}>
                      <div className={styles.uploadItemIcon}>
                        <FileText size={15} />
                      </div>
                      <div className={styles.uploadItemBody}>
                        <p className={styles.uploadItemTitle}>{note.title}</p>
                        <p className={styles.uploadItemMeta}>{note.course || note.subject}</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
              {recentUploads.length > 0 && (
                <Link href="/notes?mine=true" className={styles.sideViewAll}>
                  View all my uploads
                  <ChevronRight size={12} />
                </Link>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
