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
import {
  submitNoteReview,
  fetchNoteReviews,
} from '../../../lib/apiRequests';
import StarRating from '../../../components/StarRating';
import FileTypeBadge from '../../../components/FileTypeBadge';
import RelativeTime from '../../../components/RelativeTime';
import ReviewsList from '../../../components/ReviewsList';
import { formatFileSize } from '../../../lib/uiHelpers';
import { AlertTriangle } from 'lucide-react';
import UnifiedReportModal from '../../../components/UnifiedReportModal';
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
  const [reportModalOpen, setReportModalOpen] = useState(false);
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
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>{note.title}</h1>
            <p className={styles.pageSubtitle}>{note.course} • {note.subject}</p>
          </div>
          <div className={styles.actionRow}>
            <Link href="/notes" className={styles.btnSecondary}>← Back to Notes</Link>
          </div>
        </div>

        <div className={styles.detailLayout}>
          {/* ── Left: Preview + Description ── */}
          <div>
            {/* Preview */}
            <div className={styles.surfaceCardStrong}>
              {note.previewImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={note.previewImageUrl}
                  alt={note.title}
                  style={{ width: '100%', borderRadius: 10, objectFit: 'contain', maxHeight: 460 }}
                />
              ) : (
                <div className={styles.emptyState} style={{ padding: '3.5rem 1.5rem' }}>
                  <div className={styles.emptyStateIcon}>📎</div>
                  <div className={styles.emptyStateTitle}>No preview available</div>
                  <p className={styles.emptyStateText}>Download the file to view its contents.</p>
                </div>
              )}
            </div>

            {/* Description + Tags + Rating */}
            {(note.description || !!(note.tags || []).length) && (
              <div className={styles.surfaceCardStrong} style={{ marginTop: '1rem' }}>
                {note.description && (
                  <>
                    <div className={styles.detailSectionLabel}>About this note</div>
                    <p className={styles.detailDesc}>{note.description}</p>
                  </>
                )}
                {!!(note.tags || []).length && (
                  <div className={styles.tagRow} style={{ marginTop: note.description ? '1rem' : 0 }}>
                    {(note.tags || []).map((t) => (
                      <span key={t} className={styles.tag}>{t}</span>
                    ))}
                  </div>
                )}
                {Number(note.averageRating) > 0 && (
                  <div style={{ marginTop: '0.85rem' }}>
                    <StarRating value={Number(note.averageRating)} disabled />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div>
            {/* Action card */}
            <div className={styles.surfaceCardStrong}>
              <div className={styles.detailSectionLabel}>Get this note</div>
              <div className={styles.detailActionsCard}>
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
              </div>
              {!accessToken && (
                <div className={`${styles.alertWarning}`} style={{ marginTop: '0.75rem' }}>
                  <Link href="/login" style={{ fontWeight: 600 }}>Log in</Link> to download or review.
                </div>
              )}
              <button
                onClick={() => setReportModalOpen(true)}
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.4rem', 
                  color: '#9E9E9E', 
                  fontSize: '0.75rem', 
                  cursor: 'pointer', 
                  marginTop: '0.75rem', 
                  textDecoration: 'none',
                  background: 'transparent',
                  border: 'none',
                  padding: 0
                }}
              >
                <AlertTriangle size={12} /> Report this note
              </button>
            </div>

            {/* Uploader Info */}
            <div className={styles.surfaceCardStrong} style={{ marginTop: '0.75rem' }}>
              <div className={styles.detailSectionLabel}>Uploaded by</div>
              <div className={styles.detailUploaderCard}>
                {note.uploadedBy?.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={note.uploadedBy.avatar}
                    alt={note.uploadedBy?.name || 'Uploader'}
                    className={styles.uploaderAvatar}
                    style={{ width: 38, height: 38 }}
                  />
                ) : (
                  <div className={styles.uploaderAvatar} style={{ width: 38, height: 38 }}>
                    {String(note.uploadedBy?.name || 'U').slice(0, 1)}
                  </div>
                )}
                <div>
                  <Link
                    href={`/profile/${note.uploadedBy?._id || ''}`}
                    style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1A1A1A', textDecoration: 'none' }}
                  >
                    {note.uploadedBy?.name || 'Unknown'}
                  </Link>
                  <div style={{ fontSize: '0.75rem', color: '#9E9E9E', marginTop: 2 }}>
                    <RelativeTime value={note.createdAt} />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className={styles.surfaceCardStrong} style={{ marginTop: '0.75rem' }}>
              <div className={styles.detailSectionLabel}>File Info</div>
              <div className={styles.statGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Downloads</div>
                  <div className={styles.statValue}>{note.downloadCount || 0}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Size</div>
                  <div className={styles.statValue}>{formatFileSize(note.fileSize)}</div>
                </div>
              </div>
              {(note.fileName || note.fileType) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.8rem', color: '#9E9E9E' }}>
                  <span>{note.fileName || 'Attachment'}</span>
                  <FileTypeBadge fileType={note.fileType} fileName={note.fileName} />
                </div>
              )}
            </div>

            {/* Review form after download */}
            {hasDownloaded && (
              <div className={styles.surfaceCardStrong} style={{ marginTop: '0.75rem' }}>
                {isOwnNote ? (
                  <div className={styles.alertWarning}>You cannot review your own notes.</div>
                ) : (
                  <>
                    <div className={styles.detailSectionLabel}>Leave a Review</div>
                    <ReviewForm onSubmit={handleReview} />
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Report modal */}
        <UnifiedReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          targetModel="Note"
          targetId={note._id}
          targetTitle={note.title}
          targetDescription={note.description}
        />

        {/* Reviews section */}
        <div className={styles.surfaceCardStrong} style={{ marginTop: '1.25rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h5 style={{ fontWeight: 700, margin: '0 0 0.15rem' }}>Reviews</h5>
            <p style={{ fontSize: '0.82rem', color: '#9E9E9E', margin: 0 }}>
              {reviews.length} review{reviews.length !== 1 ? 's' : ''} from students
            </p>
          </div>
          <ReviewsList items={reviews} emptyText="No reviews yet. Download it and be the first to leave feedback!" />
        </div>
      </div>
    </div>
  );
}
