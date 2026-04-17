'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useRequireAuth from '../../../lib/useRequireAuth';
import { fetchMyNotes, deleteNote } from '../../../lib/apiRequests';
import Pagination from '../../../components/Pagination';
import FileTypeBadge from '../../../components/FileTypeBadge';
import ConfirmDialog from '../../../components/ConfirmDialog';
import styles from '../../notes/notes.module.css';

export default function UploaderDashboardPage() {
  const { isReady } = useRequireAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pendingDeleteId, setPendingDeleteId] = useState('');

  useEffect(() => {
    if (!isReady) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchMyNotes({ page, limit: 10 });
        if (!cancelled) {
          setItems(res.data?.items || []);
          setTotalPages(res.data?.totalPages || 1);
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load notes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, page]);

  if (!isReady) {
    return (
      <div className={styles.page}>
        <div className="container">
          <div className={styles.surfaceCard} style={{ textAlign: 'center', padding: '3rem' }}>
            <div className={styles.emptyStateTitle}>Loading session…</div>
          </div>
        </div>
      </div>
    );
  }

  const handleDelete = async (noteId) => {
    try {
      await deleteNote(noteId);
      setItems((prev) => prev.filter((item) => item._id !== noteId));
    } catch (err) {
      setError(err?.message || 'Could not delete note');
    }
  };

  const totalDownloads = items.reduce((sum, n) => sum + (n.downloadCount || 0), 0);
  const avgRating = items.length
    ? (items.reduce((sum, n) => sum + (n.averageRating || 0), 0) / items.length).toFixed(1)
    : '0.0';

  return (
    <div className={styles.page}>
      <div className={`container ${styles.container}`}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>My Uploads</h1>
            <p className={styles.pageSubtitle}>Manage your notes, track downloads &amp; ratings.</p>
          </div>
          <div className={styles.actionRow}>
            <Link href="/notes/upload" className={styles.btnPrimary}>Upload New</Link>
            <Link href="/notes" className={styles.btnSecondary}>Browse Notes</Link>
          </div>
        </div>

        {/* Stats */}
        {!loading && items.length > 0 && (
          <div className={styles.statGrid} style={{ marginBottom: '0.75rem' }}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{items.length}</div>
              <div className={styles.statLabel}>Notes</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{totalDownloads}</div>
              <div className={styles.statLabel}>Downloads</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{avgRating}</div>
              <div className={styles.statLabel}>Avg Rating</div>
            </div>
          </div>
        )}

        {error && <div className={styles.alertDanger}>{error}</div>}

        {loading ? (
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={`sk-${idx}`} className={styles.skeletonCard}>
                <div className={styles.skeleton} style={{ width: '55%', height: 16, marginBottom: 8 }} />
                <div className={styles.skeleton} style={{ width: '35%', height: 12 }} />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📝</div>
            <div className={styles.emptyStateTitle}>No uploads yet</div>
            <div className={styles.emptyStateText}>Share your first note to help others.</div>
            <Link href="/notes/upload" className={`${styles.btnPrimary} ${styles.btnSmall}`}>Upload Notes</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {items.map((note) => (
              <div key={note._id} className={styles.noteCard}>
                <div className={styles.noteCardBody}>
                  <div className={styles.noteCardRow}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={styles.noteCardTitle}>{note.title}</div>
                      <div className={styles.noteCardMeta}>
                        {note.course} · {note.subject}
                      </div>
                      <FileTypeBadge fileType={note.fileType} fileName={note.fileName} />
                    </div>
                    <div className={styles.noteCardMetaStack}>
                      <div>{note.downloadCount || 0} downloads</div>
                      <div>⭐ {Number(note.averageRating || 0).toFixed(1)}</div>
                      <span
                        className={styles.tag}
                        style={note.status === 'active'
                          ? { background: 'var(--cc-success-bg)', color: 'var(--cc-success)' }
                          : { background: 'var(--cc-warning-bg)', color: 'var(--cc-warning)' }
                        }
                      >
                        {note.status || 'active'}
                      </span>
                    </div>
                  </div>
                  <div className={`${styles.noteCardFooter} ${styles.noteCardActions}`}>
                    <Link href={`/notes/${note._id}`} className={`${styles.btnSecondary} ${styles.btnSmall}`}>View</Link>
                    <button
                      type="button"
                      className={`${styles.btnDanger} ${styles.btnSmall}`}
                      onClick={() => setPendingDeleteId(note._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(pendingDeleteId)}
        title="Delete note?"
        message="This action removes the note permanently."
        confirmLabel="Delete"
        onCancel={() => setPendingDeleteId('')}
        onConfirm={() => {
          handleDelete(pendingDeleteId);
          setPendingDeleteId('');
        }}
      />
    </div>
  );
}
