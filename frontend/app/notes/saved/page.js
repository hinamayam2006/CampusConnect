'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Upload, Star, Download, Eye } from 'lucide-react';
import styles from '../notes.module.css';
import { fetchBookmarkedNotes } from '../../../lib/apiRequests';
import useRequireAuth from '../../../lib/useRequireAuth';
import BookmarkButton from '../../../components/BookmarkButton';
import FileTypeBadge from '../../../components/FileTypeBadge';
import { formatFileSize } from '../../../lib/uiHelpers';

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function SavedNotesPage() {
  useRequireAuth();
  const [notes, setNotes]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetchBookmarkedNotes();
        const raw = res?.data?.items ?? res?.data?.data ?? res?.data?.notes ?? res?.data ?? [];
        setNotes(Array.isArray(raw) ? raw : []);
      } catch {
        setError('Could not load saved notes.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleRemove = (id) => setNotes((p) => p.filter((n) => n._id !== id));

  const skeletons = Array.from({ length: 4 }, (_, i) => (
    <div key={i} className={styles.skeleton} style={{ height: 220 }} />
  ));

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Saved Notes</h1>
            <p className={styles.pageSubtitle}>Notes you have bookmarked for later reference.</p>
          </div>
          <div className={styles.actionRow}>
            <Link href="/notes" className={styles.btnSecondary}><BookOpen size={15} /> Browse All</Link>
            <Link href="/notes/upload" className={styles.btnPrimary}><Upload size={15} /> Upload Notes</Link>
          </div>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        {loading ? (
          <div className={styles.grid}>{skeletons}</div>
        ) : notes.length === 0 ? (
          <div className={styles.emptyState}>
            <BookOpen size={40} className={styles.emptyIcon} />
            <h3 className={styles.emptyStateTitle}>No saved notes yet</h3>
            <p className={styles.emptyStateText}>Bookmark notes while browsing to find them here later.</p>
            <Link href="/notes" className={styles.btnPrimary}><BookOpen size={15} /> Browse Notes</Link>
          </div>
        ) : (
          <div className={styles.grid}>
            {notes.map((note) => (
              <div key={note._id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.cardIcon}><BookOpen size={20} /></div>
                  <div className={styles.cardBadgeWrap}>
                    {note.fileType && <FileTypeBadge type={note.fileType} />}
                    {note.price === 0 || note.isFree
                      ? <span className={`${styles.cardBadge} ${styles.cardBadgeFree}`}>Free</span>
                      : note.price > 0
                        ? <span className={`${styles.cardBadge} ${styles.cardBadgePaid}`}>PKR {note.price}</span>
                        : null
                    }
                  </div>
                </div>
                <div className={styles.cardBody}>
                  {note.course && <p className={styles.cardCourse}>{note.course}</p>}
                  <h3 className={styles.cardTitle}>{note.title}</h3>
                  {note.description && <p className={styles.cardDesc}>{note.description}</p>}
                  <div className={styles.cardMeta}>
                    {note.averageRating > 0 && (
                      <span className={styles.cardMetaItem}>
                        <Star size={12} style={{ color: '#F59E0B', fill: '#F59E0B' }} />
                        {note.averageRating.toFixed(1)}
                      </span>
                    )}
                    {note.downloadCount > 0 && (
                      <span className={styles.cardMetaItem}><Download size={12} /> {note.downloadCount}</span>
                    )}
                    {note.fileSize && (
                      <span className={styles.cardMetaItem}><Eye size={12} /> {formatFileSize(note.fileSize)}</span>
                    )}
                  </div>
                </div>
                <div className={styles.ownerRow}>
                  <div className={styles.ownerAvatar}>{initials(note.uploader?.name || note.uploadedBy?.name)}</div>
                  <span className={styles.ownerName}>{note.uploader?.name || note.uploadedBy?.name || 'Unknown'}</span>
                  <BookmarkButton
                    itemId={note._id}
                    itemType="note"
                    initialState={true}
                    onToggle={(s) => { if (!s) handleRemove(note._id); }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
