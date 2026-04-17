'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useRequireAuth from '../../lib/useRequireAuth';
import BookmarkButton from '../../components/BookmarkButton';
import Pagination from '../../components/Pagination';
import { searchNotes } from '../../lib/apiRequests';
import StarRating from '../../components/StarRating';
import FileTypeBadge from '../../components/FileTypeBadge';
import { formatFileSize } from '../../lib/uiHelpers';
import styles from './notes.module.css';

export default function NotesPage() {
  const { user, isReady } = useRequireAuth();
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [course, setCourse] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  const params = useMemo(() => {
    const query = {
      q: debouncedQ,
      course: course.trim(),
      sort,
      page,
      limit: 12,
    };
    if (tags.length) query.tags = tags.join(',');
    return query;
  }, [debouncedQ, course, sort, page, tags]);

  useEffect(() => {
    if (!isReady) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await searchNotes(params);
        if (!cancelled) {
          setItems(res.data?.items || []);
          setTotalPages(res.data?.totalPages || 1);
          setTotal(res.data?.total || 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || err.message || 'Failed to load notes. Please check your connection and try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params, isReady]);

  if (!isReady) {
    return (
      <div className={styles.page}>
        <div className="container">
          <div className={styles.surfaceCard} style={{ textAlign: 'center', padding: '3rem' }}>
            <div className={styles.emptyStateTitle}>Loading your session…</div>
            <p className={styles.emptyStateText}>Please wait while we verify your credentials.</p>
          </div>
        </div>
      </div>
    );
  }

  const addTag = () => {
    const value = tagInput.trim();
    if (!value) return;
    if (tags.includes(value)) {
      setTagInput('');
      return;
    }
    setTags((prev) => [...prev, value]);
    setTagInput('');
    setPage(1);
  };

  const removeTag = (tag) => {
    setTags((prev) => prev.filter((t) => t !== tag));
    setPage(1);
  };

  const downloadLabel = (count) => {
    if (!count) return 'No downloads yet';
    if (count === 1) return '1 download';
    return `${count} downloads`;
  };

  return (
    <div className={styles.page}>
      <div className={`container ${styles.container}`}>
        {/* Page header */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Notes Marketplace</h1>
            <p className={styles.pageSubtitle}>Browse, search, and share course notes, past papers, and study materials.</p>
          </div>
          <div className={styles.actionRow}>
            <Link href="/notes/saved" className={styles.btnSecondary}>
              Saved Notes
            </Link>
            <Link href="/dashboard/uploader" className={styles.btnSecondary}>
              My Uploads
            </Link>
            <Link
              href="/notes/upload"
              className={user ? styles.btnPrimary : styles.btnSecondary}
            >
              Upload Notes
            </Link>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className={`${styles.statGrid} mb-3`}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total Results</div>
              <div className={styles.statValue}>{total}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Showing</div>
              <div className={styles.statValue}>{items.length}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Active Tags</div>
              <div className={styles.statValue}>{tags.length}</div>
            </div>
          </div>
        )}

        {/* Search and filters */}
        <div className={`${styles.surfaceCard} mb-3`}>
          <div className={styles.filterBar}>
            <input
              className="form-control form-control-sm"
              placeholder="Search by title, course, or subject…"
              value={q}
              style={{ maxWidth: 280 }}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
            <input
              className="form-control form-control-sm"
              placeholder="Filter by course…"
              value={course}
              style={{ maxWidth: 200 }}
              onChange={(e) => {
                setCourse(e.target.value);
                setPage(1);
              }}
            />
            <select
              className="form-select form-select-sm"
              value={sort}
              style={{ maxWidth: 180 }}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="popular">Most downloaded</option>
              <option value="rating">Top rated</option>
            </select>
            <span style={{ fontSize: '0.82rem', color: 'var(--cc-muted)', whiteSpace: 'nowrap' }}>
              {loading ? 'Searching…' : `${total} result${total !== 1 ? 's' : ''} found`}
            </span>
          </div>

          {/* Tag input */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <div className="input-group input-group-sm" style={{ maxWidth: 240 }}>
              <input
                className="form-control"
                placeholder="Add a tag…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <button type="button" className={`${styles.btnPrimary} ${styles.btnSmall}`} onClick={addTag} style={{ borderRadius: '0 6px 6px 0' }}>
                Add
              </button>
            </div>
            {tags.map((tag) => (
              <span key={tag} className={styles.tagActive} style={{ cursor: 'pointer' }} onClick={() => removeTag(tag)}>
                {tag} ✕
              </span>
            ))}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className={`${styles.alertDanger} mb-3`}>
            <strong>Something went wrong.</strong> {error}
          </div>
        )}

        {/* Card grid */}
        <div className="row g-3">
          {/* Loading skeletons */}
          {loading &&
            Array.from({ length: 6 }).map((_, idx) => (
              <div className="col-12 col-md-6 col-lg-4" key={`sk-${idx}`}>
                <div className={styles.skeletonCard}>
                  <div className={styles.skeleton} style={{ height: 140, marginBottom: '0.75rem' }} />
                  <div className={styles.skeleton} style={{ height: 16, width: '70%', marginBottom: '0.5rem' }} />
                  <div className={styles.skeleton} style={{ height: 14, width: '50%', marginBottom: '0.75rem' }} />
                  <div className={styles.skeleton} style={{ height: 40, marginBottom: '0.5rem' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className={styles.skeleton} style={{ height: 14, width: '35%' }} />
                    <div className={styles.skeleton} style={{ height: 14, width: '30%' }} />
                  </div>
                </div>
              </div>
            ))}

          {/* Note cards */}
          {!loading &&
            items.map((note) => (
              <div className="col-12 col-md-6 col-lg-4" key={note._id}>
                <div className={styles.noteCard}>
                  {note.previewImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={note.previewImageUrl}
                      className={styles.noteCardImage}
                      alt={note.title}
                    />
                  ) : (
                    <div
                      style={{
                        height: 100,
                        background: 'var(--cc-bg-dark)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--cc-muted)',
                        fontSize: '0.82rem',
                        borderBottom: '1px solid var(--cc-border-light)',
                      }}
                    >
                      No preview available
                    </div>
                  )}
                  <div className={styles.noteCardBody}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <h5 className={styles.noteCardTitle}>{note.title}</h5>
                      <span className={styles.badgeOlive}>{note.subject}</span>
                    </div>
                    <div className={styles.noteCardMeta}>{note.course}</div>

                    <div className={styles.noteCardUploader}>
                      {note.uploadedBy?.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={note.uploadedBy.avatar}
                          alt={note.uploadedBy?.name || 'Uploader'}
                          className={styles.uploaderAvatar}
                        />
                      ) : (
                        <div className={styles.uploaderAvatar}>
                          {String(note.uploadedBy?.name || 'U').slice(0, 1)}
                        </div>
                      )}
                      <span>by {note.uploadedBy?.name || 'Unknown user'}</span>
                    </div>

                    <p className={styles.noteCardDesc}>
                      {String(note.description || '').slice(0, 100)}
                      {String(note.description || '').length > 100 ? '…' : ''}
                    </p>

                    <div className={styles.noteStats}>
                      <FileTypeBadge fileType={note.fileType} fileName={note.fileName} />
                      <span>{formatFileSize(note.fileSize)}</span>
                      <span>{downloadLabel(note.downloadCount)}</span>
                    </div>

                    <StarRating value={Number(note.averageRating || 0)} disabled />

                    <div className={styles.noteCardFooter}>
                      <Link href={`/notes/${note._id}`} className={`${styles.btnPrimary} ${styles.btnSmall}`}>
                        View Details
                      </Link>
                      <BookmarkButton
                        noteId={note._id}
                        initialBookmarked={Boolean(note.isBookmarked)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

          {/* Empty state */}
          {!loading && !items.length && !error && (
            <div className="col-12">
              <div className={styles.emptyState}>
                <div className={styles.emptyStateIcon}>📝</div>
                <div className={styles.emptyStateTitle}>No notes found</div>
                <p className={styles.emptyStateText}>
                  {q || course || tags.length
                    ? 'Try adjusting your search or filters to find what you need.'
                    : 'Be the first to share your study materials with the community.'}
                </p>
                <Link href="/notes/upload" className={styles.btnPrimary}>
                  Upload Notes
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="d-flex justify-content-center mt-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
