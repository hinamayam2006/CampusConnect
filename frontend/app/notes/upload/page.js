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

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png';
const MAX_MB = 25;
const COVER_ACCEPTED_TYPES = '.jpg,.jpeg,.png';
const COVER_MAX_MB = 5;
const COVER_WIDTH = 550;
const COVER_HEIGHT = 300;

export default function UploadNotePage() {
  const { isReady } = useRequireAuth();

  /* --- File state --- */
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [coverImage, setCoverImage] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [coverError, setCoverError] = useState('');

  /* --- Form state --- */
  const [materialType, setMaterialType] = useState('lecture_notes');
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [description, setDescription] = useState('');

  /* --- Submit state --- */
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadingIndex, setUploadingIndex] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
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
  const validateAndAddFiles = useCallback((incoming) => {
    const list = Array.from(incoming || []);
    if (!list.length) return;

    const allowedExts = ACCEPTED_TYPES.split(',').map((t) => t.trim().replace('.', '').toLowerCase());
    const valid = [];
    let errorMsg = '';

    list.forEach((f) => {
      const ext = String(f.name || '').split('.').pop().toLowerCase();
      if (f.size > MAX_MB * 1024 * 1024) {
        if (!errorMsg) errorMsg = `File is too large (max ${MAX_MB} MB).`;
        return;
      }
      if (!allowedExts.includes(ext)) {
        if (!errorMsg) errorMsg = 'Unsupported file type selected.';
        return;
      }
      valid.push(f);
    });

    if (errorMsg) setFileError(errorMsg);
    if (!valid.length) return;

    setFileError('');
    setFiles((prev) => {
      const merged = [...prev];
      valid.forEach((f) => {
        const key = `${f.name}-${f.size}-${f.lastModified}`;
        if (!merged.some((m) => `${m.name}-${m.size}-${m.lastModified}` === key)) {
          merged.push(f);
        }
      });
      return merged;
    });
  }, []);

  const handleFileInput = (e) => {
    validateAndAddFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    validateAndAddFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const clearFile = (e, fileToRemove) => {
    e.stopPropagation();
    setFiles((prev) => prev.filter((f) => f !== fileToRemove));
  };

  const clearAllFiles = (e) => {
    e.stopPropagation();
    setFiles([]);
    setFileError('');
  };

  const readImageDimensions = (f) => new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(f);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image'));
    };
    img.src = url;
  });

  const validateAndSetCover = useCallback(async (f) => {
    if (!f) return;
    setCoverError('');

    const typeOk = ['image/jpeg', 'image/png'].includes(String(f.type || '').toLowerCase());
    if (!typeOk) {
      setCoverError('Cover image must be a JPG or PNG.');
      return;
    }

    if (f.size > COVER_MAX_MB * 1024 * 1024) {
      setCoverError(`Cover image is too large (max ${COVER_MAX_MB} MB).`);
      return;
    }

    try {
      await readImageDimensions(f); // validate it's a readable image
    } catch {
      setCoverError('Could not read cover image. Please try another file.');
      return;
    }

    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverImage(f);
    setCoverPreview(URL.createObjectURL(f));
  }, [coverPreview]);

  const handleCoverInput = async (e) => {
    await validateAndSetCover(e.target.files?.[0]);
    e.target.value = '';
  };

  const clearCover = (e) => {
    e.stopPropagation();
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview('');
    setCoverImage(null);
    setCoverError('');
  };

  useEffect(() => () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  /* --- Submit --- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!files.length) { setError('Please select at least one file to upload.'); return; }
    if (!title.trim()) { setError('Please enter a title.'); return; }
    if (!courseCode.trim()) { setError('Please enter the course code.'); return; }
    if (!academicYear) { setError('Please select the academic year.'); return; }

    setSubmitting(true);
    setProgress(10);

    try {
      let coverUrl = '';
      if (coverImage) {
        const coverData = new FormData();
        coverData.append('image', coverImage);
        const coverRes = await api.post('/upload/image?folder=campusconnect/notes', coverData);
        coverUrl = coverRes.data?.data?.url || coverRes.data?.url || '';
      }

      const selectedType = TYPES.find((t) => t.id === materialType);
      const tags = [selectedType?.tag, academicYear].filter(Boolean);
      const totalFiles = files.length;

      // Upload all files first, collect their metadata
      const uploadedFiles = [];
      setUploadingIndex(0);
      setUploadedCount(0);
      for (let i = 0; i < totalFiles; i += 1) {
        const currentFile = files[i];
        setUploadingIndex(i + 1);

        const formData = new FormData();
        formData.append('file', currentFile);

        const uploadRes = await api.post('/upload/notes', formData, {
          onUploadProgress: (evt) => {
            if (!evt.total) return;
            const filePct = evt.loaded / evt.total;
            const overallPct = Math.round(((i + filePct) / totalFiles) * 85);
            setProgress(Math.min(90, Math.max(10, overallPct)));
          },
        });

        const uploadData = uploadRes.data?.data || uploadRes.data;
        uploadedFiles.push({
          fileUrl: uploadData.fileUrl || uploadData.url,
          publicId: uploadData.publicId || '',
          resourceType: uploadData.resourceType || 'raw',
          fileFormat: uploadData.fileFormat || '',
          fileName: uploadData.fileName || currentFile.name,
          fileType: uploadData.fileType || currentFile.type,
          fileSize: uploadData.fileSize || currentFile.size,
        });

        setUploadedCount((prev) => prev + 1);
      }

      setProgress(92);

      // Create ONE note with the first file as primary and the rest as additionalFiles
      const [primary, ...rest] = uploadedFiles;
      const previewImageUrl = coverUrl || '';

      await api.post('/notes', {
        title: title.trim(),
        description: description.trim(),
        course: courseCode.trim().toUpperCase(),
        subject: courseCode.trim().toUpperCase(),
        tags,
        fileUrl: primary.fileUrl,
        previewImageUrl,
        publicId: primary.publicId,
        resourceType: primary.resourceType,
        fileFormat: primary.fileFormat,
        fileName: primary.fileName,
        fileType: primary.fileType,
        fileSize: primary.fileSize,
        additionalFiles: rest,
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
    setFiles([]);
    setTitle('');
    setCourseCode('');
    setAcademicYear('');
    setDescription('');
    setCoverImage(null);
    setCoverPreview('');
    setCoverError('');
    setUploadingIndex(0);
    setUploadedCount(0);
    setProgress(0);
    setError('');
  };

  if (!isReady) return null;

  const successCount = uploadedCount || files.length || 1;

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

        <div className={styles.banner}>
          <AlertCircle size={14} />
          <span>Notes only. Admins review activity, and unethical uploads will be removed.</span>
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
                  {successCount} Note{successCount === 1 ? '' : 's'} Uploaded!
                </h3>
                <p style={{ color: '#6B6B6B', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                  Your material is now live! Our community moderation system ensures quality content through user reporting.
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
                  <p className={styles.sectionLabel}>Select Files</p>
                  <div
                    className={[
                      styles.dropZone,
                      dragging ? styles.dropZoneActive : '',
                      files.length ? styles.dropZoneHasFile : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className={styles.dzFileInput}
                      accept={ACCEPTED_TYPES}
                      multiple
                      onChange={handleFileInput}
                    />

                    {files.length ? (
                      <div className={styles.dzFileList}>
                        <div className={styles.dzFileHeader}>
                          <div>
                            <strong>{files.length} file{files.length === 1 ? '' : 's'} selected</strong>
                            <span>Up to {MAX_MB} MB each</span>
                          </div>
                          <button type="button" className={styles.dzClearAllBtn} onClick={clearAllFiles}>
                            Clear all
                          </button>
                        </div>
                        <div className={styles.dzFileItems}>
                          {files.map((currentFile) => {
                            const key = `${currentFile.name}-${currentFile.size}-${currentFile.lastModified}`;
                            return (
                              <div key={key} className={styles.dzFileRow}>
                                <div className={styles.dzIconWrap}>
                                  <Check size={20} />
                                </div>
                                <div className={styles.dzFileName}>
                                  <strong>{currentFile.name}</strong>
                                  <span>{(currentFile.size / (1024 * 1024)).toFixed(1)} MB -- ready to upload</span>
                                </div>
                                <button
                                  type="button"
                                  className={styles.dzClearBtn}
                                  onClick={(e) => clearFile(e, currentFile)}
                                  aria-label={`Remove ${currentFile.name}`}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          className={styles.dzBrowseBtn}
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        >
                          Add more files
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className={styles.dzIconWrap}>
                          <FolderOpen size={26} />
                        </div>
                        <p className={styles.dzHeading}>Drag &amp; drop your files here</p>
                        <p className={styles.dzSub}>PDF, Word, PowerPoint, Excel, TXT, JPG, PNG -- up to {MAX_MB} MB each</p>
                        <button
                          type="button"
                          className={styles.dzBrowseBtn}
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        >
                          Browse Files
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

                {/* -- 2. Cover Image -- */}
                <div className={styles.cardSection}>
                  <p className={styles.sectionLabel}>Cover Image (optional)</p>
                  <div
                    className={styles.coverCard}
                    role="button"
                    tabIndex={0}
                    onClick={() => coverInputRef.current?.click()}
                    onKeyDown={(e) => e.key === 'Enter' && coverInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={coverInputRef}
                      className={styles.dzFileInput}
                      accept={COVER_ACCEPTED_TYPES}
                      onChange={handleCoverInput}
                    />
                    {coverPreview ? (
                      <div className={styles.coverPreview}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coverPreview} alt="Cover preview" className={styles.coverImg} />
                        <button type="button" className={styles.coverRemove} onClick={clearCover}>
                          Remove cover
                        </button>
                      </div>
                    ) : (
                      <div className={styles.coverPlaceholder}>
                        <Upload size={16} />
                        <div>
                          <strong>Add a cover image</strong>
                          <span>{COVER_WIDTH}x{COVER_HEIGHT}px recommended (JPG/PNG)</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className={styles.coverHint}>Max {COVER_MAX_MB} MB · {COVER_WIDTH}x{COVER_HEIGHT}px recommended · Cover will be used for all selected files.</p>
                  {coverError && (
                    <div className={styles.dzErrorMsg}>
                      <AlertCircle size={13} />
                      {coverError}
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
                        Uploading file {uploadingIndex}/{files.length} • {uploadedCount}/{files.length} done
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
                  className={[styles.submitBtn, files.length && title && courseCode && academicYear ? styles.submitBtnReady : ''].filter(Boolean).join(' ')}
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
                      Upload Notes
                    </>
                  )}
                </button>
                  <p className={styles.uploadHint}>
                    <Info size={12} color="#9E9E9E" />
                    Each file becomes a separate note. Community reports help maintain quality.
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
                    'Accepted formats: PDF, Word, PowerPoint, Excel, TXT, JPG, PNG.',
                    'Maximum file size is 25 MB per upload. Each file becomes a separate note.',
                    `Optional cover image: ${COVER_WIDTH}x${COVER_HEIGHT}px (JPG/PNG), up to ${COVER_MAX_MB} MB.`,
                    'Include an accurate title and course code so others can find your material.',
                    'Content is moderated by community reporting -- ensure your material is original and helpful.',
                    'Repeated valid reports may result in content removal or account suspension.',
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
