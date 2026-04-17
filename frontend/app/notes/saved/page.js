'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useRequireAuth from '../../../lib/useRequireAuth';
import { fetchBookmarkedNotes } from '../../../lib/apiRequests';
import BookmarkButton from '../../../components/BookmarkButton';
import styles from '../notes.module.css';

export default function SavedNotesPage() {
  const { isReady } = useRequireAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isReady) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchBookmarkedNotes();
        if (!cancelled) setItems(res.data?.items || []);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load your saved notes. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady]);

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

  return (
    <div className={styles.page}>
      <div className={`container ${styles.container}`}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Saved Notes</h1>
            <p className={styles.pageSubtitle}>Your bookmarked notes from the marketplace.</p>
          </div>
          <div className={styles.actionRow}>
            <Link href="/notes" className={styles.btnSecondary}>Back to Notes</Link>
          </div>
        </div>

        {/* Stats */}
        {!loading && (
          <div className={`${styles.statGrid} mb-3`} style={{ gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: 320 }}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Saved</div>
              <div className={styles.statValue}>{items.length}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Status</div>
              <div className={styles.statValue} style={{ fontSize: '0.95rem' }}>{items.length > 0 ? 'Active' : 'Empty'}</div>
            </div>
          </div>
        )}

        {error && <div className={`${styles.alertDanger} mb-3`}>{error}</div>}

        {loading ? (
          <div className="row g-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div className="col-12 col-md-6 col-lg-4" key={`sk-${idx}`}>
                <div className={styles.skeletonCard}>
                  <div className={styles.skeleton} style={{ height: 140, marginBottom: '0.75rem' }} />
                  <div className={styles.skeleton} style={{ height: 16, width: '70%', marginBottom: '0.5rem' }} />
                  <div className={styles.skeleton} style={{ height: 14, width: '50%', marginBottom: '0.5rem' }} />
                  <div className={styles.skeleton} style={{ height: 40 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="row g-3">
            {items.map((note) => (
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
                    <h5 className={styles.noteCardTitle}>{note.title}</h5>
                    <div className={styles.noteCardMeta}>{note.course}</div>
                    <p className={styles.noteCardDesc}>
                      {String(note.description || '').slice(0, 100)}
                      {String(note.description || '').length > 100 ? '…' : ''}
                    </p>
                    <div className={styles.noteCardFooter}>
                      <Link href={`/notes/${note._id}`} className={`${styles.btnPrimary} ${styles.btnSmall}`}>
                        View Details
                      </Link>
                      <BookmarkButton
                        noteId={note._id}
                        initialBookmarked
                        onChange={(value) => {
                          if (!value) {
                            setItems((prev) => prev.filter((it) => it._id !== note._id));
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {!items.length && (
              <div className="col-12">
                <div className={styles.emptyState}>
                  <div className={styles.emptyStateIcon}>📑</div>
                  <div className={styles.emptyStateTitle}>No saved notes yet</div>
                  <p className={styles.emptyStateText}>
                    Bookmark notes from the marketplace to access them quickly later.
                  </p>
                  <Link href="/notes" className={styles.btnPrimary}>
                    Browse Notes
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
