'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import useRequireAuth from '../../../lib/useRequireAuth';
import DownloadButton from '../../../components/DownloadButton';
import BookmarkButton from '../../../components/BookmarkButton';
import ReviewForm from '../../../components/ReviewForm';
import ReportModal from '../../../components/ReportModal';
import {
  submitNoteReview,
  reportNote,
  fetchNoteReviews,
} from '../../../lib/apiRequests';
import StarRating from '../../../components/StarRating';
import FileTypeBadge from '../../../components/FileTypeBadge';
import RelativeTime from '../../../components/RelativeTime';
import ReviewsList from '../../../components/ReviewsList';
import { formatFileSize } from '../../../lib/uiHelpers';
import styles from '../notes.module.css';

export default function NoteDetailPage() {
  const params = useParams();
  const noteId = params?.id;
  const { accessToken, isReady, user } = useRequireAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState(null);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (!isReady) return undefined;
    if (!noteId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const [noteRes, reviewRes] = await Promise.all([
          api.get(`/notes/${noteId}`),
          fetchNoteReviews(noteId),
        ]);
        if (!cancelled) {
          const data = noteRes.data?.data || null;
          setNote(data);
          setHasDownloaded(Boolean(data?.hasDownloaded));
          setIsBookmarked(Boolean(data?.isBookmarked));
          setReviews(reviewRes?.data?.items || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'Failed to load note. It may have been removed or is no longer available.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [noteId, isReady]);

  if (!isReady) {
    return (
      <div className={styles.page}>
        <div className="container" style={{ maxWidth: 920 }}>
          <div className={styles.surfaceCard} style={{ textAlign: 'center', padding: '3rem' }}>
            <div className={styles.emptyStateTitle}>Loading your session…</div>
            <p className={styles.emptyStateText}>Please wait while we verify your credentials.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleReview = async ({ rating, comment }) => {
    try {
      await submitNoteReview(noteId, { rating, comment });
      toast.success('Review submitted successfully! Thank you for your feedback.');
      const reviewRes = await fetchNoteReviews(noteId);
      setReviews(reviewRes?.data?.items || []);
    } catch (err) {
      toast.error(err?.message || 'Could not submit your review. Please try again.');
    }
  };

  const handleReport = async ({ reason, comment }) => {
    try {
      await reportNote(noteId, { reason, comment });
      toast.success('Report submitted. Our team will review it shortly.');
    } catch (err) {
      toast.error(err?.message || 'Could not submit your report. Please try again later.');
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className="container" style={{ maxWidth: 920 }}>
          <div className="row g-3">
            <div className="col-12 col-lg-7">
              <div className={styles.skeletonCard}>
                <div className={styles.skeleton} style={{ height: 300 }} />
              </div>
            </div>
            <div className="col-12 col-lg-5">
              <div className={styles.skeletonCard}>
                <div className={styles.skeleton} style={{ height: 20, width: '60%', marginBottom: '1rem' }} />
                <div className={styles.skeleton} style={{ height: 14, width: '100%', marginBottom: '0.5rem' }} />
                <div className={styles.skeleton} style={{ height: 14, width: '80%', marginBottom: '1rem' }} />
                <div className={styles.skeleton} style={{ height: 36, marginBottom: '0.5rem' }} />
                <div className={styles.skeleton} style={{ height: 36 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className="container" style={{ maxWidth: 920 }}>
          <div className={styles.alertDanger}>{error}</div>
          <Link href="/notes" className={`${styles.btnSecondary} ${styles.btnSmall} mt-2`}>Back to Notes</Link>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className={styles.page}>
        <div className="container" style={{ maxWidth: 920 }}>
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📄</div>
            <div className={styles.emptyStateTitle}>Note not found</div>
            <p className={styles.emptyStateText}>This note may have been removed or is no longer available.</p>
            <Link href="/notes" className={styles.btnPrimary}>Back to Notes</Link>
          </div>
        </div>
      </div>
    );
  }

  const isOwnNote = !!(note?.uploadedBy?._id && user?._id && String(note.uploadedBy._id) === String(user._id));

  return (
    <div className={styles.page}>
      <div className={`container ${styles.container}`} style={{ maxWidth: 940 }}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>{note.title}</h1>
            <p className={styles.pageSubtitle}>{note.course} • {note.subject}</p>
          </div>
          <div className={styles.actionRow}>
            <Link href="/notes" className={styles.btnSecondary}>Back to Notes</Link>
          </div>
        </div>

        <div className="row g-3">
          {/* Left: Preview */}
          <div className="col-12 col-lg-7">
            <div className={styles.surfaceCardStrong}>
              {note.previewImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={note.previewImageUrl}
                  alt={note.title}
                  style={{ width: '100%', borderRadius: 'var(--cc-radius-sm)', objectFit: 'contain', maxHeight: 420 }}
                />
              ) : (
                <div className={styles.emptyState} style={{ padding: '3rem 1.5rem' }}>
                  <div className={styles.emptyStateIcon}>📎</div>
                  <div className={styles.emptyStateTitle}>No preview available</div>
                  <p className={styles.emptyStateText}>Download the file to view its contents.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Details */}
          <div className="col-12 col-lg-5">
            <div className={styles.surfaceCardStrong}>
              <h5 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Details</h5>
              <p style={{ fontSize: '0.9rem', color: 'var(--cc-muted)', lineHeight: 1.6 }}>{note.description}</p>

              {/* Uploader */}
              <div className={styles.noteCardUploader} style={{ marginBottom: '0.75rem' }}>
                {note.uploadedBy?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={note.uploadedBy.avatar}
                    alt={note.uploadedBy?.name || 'Uploader'}
                    className={styles.uploaderAvatar}
                    style={{ width: 28, height: 28 }}
                  />
                ) : (
                  <div className={styles.uploaderAvatar} style={{ width: 28, height: 28 }}>
                    {String(note.uploadedBy?.name || 'U').slice(0, 1)}
                  </div>
                )}
                <span>
                  by <Link href={`/profile/${note.uploadedBy?._id || ''}`} style={{ color: 'var(--cc-primary)', fontWeight: 600, textDecoration: 'none' }}>{note.uploadedBy?.name || 'Unknown'}</Link>
                  {' '} • <RelativeTime value={note.createdAt} />
                </span>
              </div>

              {/* Tags */}
              {!!(note.tags || []).length && (
                <div className={`${styles.tagRow} mb-3`}>
                  {(note.tags || []).map((t) => (
                    <span key={t} className={styles.tag}>{t}</span>
                  ))}
                </div>
              )}

              <hr className={styles.divider} />

              {/* Stats */}
              <div className={styles.statGrid} style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '1rem' }}>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Downloads</div>
                  <div className={styles.statValue}>{note.downloadCount || 0}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>File Size</div>
                  <div className={styles.statValue}>{formatFileSize(note.fileSize)}</div>
                </div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <StarRating value={Number(note.averageRating || 0)} disabled />
              </div>

              {(note.fileName || note.fileType) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--cc-muted)' }}>
                  <span>{note.fileName || 'Attachment'}{note.fileType ? ` • ${note.fileType}` : ''}</span>
                  <FileTypeBadge fileType={note.fileType} fileName={note.fileName} />
                </div>
              )}

              <hr className={styles.divider} />

              {/* Actions */}
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                <DownloadButton
                  noteId={note._id}
                  fileUrl={note.fileUrl}
                  downloadUrl={note.downloadUrl}
                  fileName={note.fileName}
                  fileType={note.fileType}
                  fileSize={note.fileSize}
                  onDownloaded={() => setHasDownloaded(true)}
                />
                <BookmarkButton
                  key={note._id}
                  noteId={note._id}
                  initialBookmarked={isBookmarked}
                  onChange={setIsBookmarked}
                />
                <button type="button" className={styles.btnDanger} onClick={() => setReportOpen(true)}>
                  Report Note
                </button>
              </div>

              {!accessToken && (
                <div className={`${styles.alertWarning} mt-2`}>
                  You must <Link href="/login" style={{ color: 'var(--cc-primary-dark)', fontWeight: 600 }}>log in</Link> to download or review this note.
                </div>
              )}
            </div>

            {/* Review form after download */}
            {hasDownloaded && (
              <div className={`${styles.surfaceCardStrong} mt-3`}>
                {isOwnNote ? (
                  <div className={styles.alertWarning}>
                    You cannot review your own notes.
                  </div>
                ) : (
                  <>
                    <h6 style={{ fontWeight: 700, marginBottom: '0.75rem' }}>Leave a Review</h6>
                    <ReviewForm onSubmit={handleReview} />
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Report modal */}
        <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} onSubmit={handleReport} />

        {/* Reviews section */}
        <div className={`${styles.surfaceCardStrong} mt-3`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h5 style={{ fontWeight: 700, marginBottom: '0.15rem' }}>Reviews</h5>
              <p style={{ fontSize: '0.85rem', color: 'var(--cc-muted)', margin: 0 }}>
                {reviews.length} review{reviews.length !== 1 ? 's' : ''} from students
              </p>
            </div>
          </div>
          <ReviewsList items={reviews} emptyText="No reviews for this note yet. Download it and be the first to leave feedback!" />
        </div>
      </div>
    </div>
  );
}
