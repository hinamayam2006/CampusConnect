'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Upload, BookOpen, X, Star, Download, Eye, Tag, Trash2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './notes.module.css';
import api from '../../lib/api';
import { searchNotes, fetchMyNotes, deleteNote, downloadNote } from '../../lib/apiRequests';
import useRequireAuth from '../../lib/useRequireAuth';
import BookmarkButton from '../../components/BookmarkButton';
import Pagination from '../../components/Pagination';
import StarRating from '../../components/StarRating';
import FileTypeBadge from '../../components/FileTypeBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import { formatFileSize } from '../../lib/uiHelpers';

const SORT_OPTIONS = [
  { value: 'recent',    label: 'Most Recent' },
  { value: 'popular',   label: 'Most Popular' },
  { value: 'rating',    label: 'Top Rated' },
  { value: 'downloads', label: 'Most Downloaded' },
];

const TYPE_OPTIONS = [
  { value: '',                label: 'All Types' },
  { value: 'lecture_notes',   label: 'Lecture Notes' },
  { value: 'past_paper',      label: 'Past Papers' },
  { value: 'assignment',      label: 'Assignments' },
  { value: 'textbook',        label: 'Textbook' },
  { value: 'other',           label: 'Other' },
];

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

function NoteCard({ note, onBookmark, showDelete, onDelete, showDownload }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (downloading || !note._id) return;
    setDownloading(true);
    try {
      const res = await downloadNote(note._id);
      const proxyPath = res?.data?.downloadProxyPath || `/notes/${note._id}/file`;
      const downloadName = res?.data?.downloadFileName || note.fileName || 'note-file';
      const fileRes = await api.get(proxyPath, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(fileRes.data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      toast.success(`Downloading: ${downloadName}`);
    } catch (err) {
      toast.error(err?.message || 'Download failed.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={styles.card}>
      <Link href={`/notes/${note._id}`} className={styles.cardInnerLink}>
      <div className={styles.cardMedia}>
        {note.previewImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={note.previewImageUrl} alt={note.title} className={styles.cardMediaImg} />
        ) : (
          <div className={styles.cardMediaPlaceholder}>
            <BookOpen size={20} />
            <span>No cover</span>
          </div>
        )}
      </div>
      <div className={styles.cardTop}>
        <div className={styles.cardIcon}>
          <BookOpen size={20} />
        </div>
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
            <span className={styles.cardMetaItem}>
              <Download size={12} /> {note.downloadCount}
            </span>
          )}
          {note.fileSize && (
            <span className={styles.cardMetaItem}>
              <Eye size={12} /> {formatFileSize(note.fileSize)}
            </span>
          )}
          {note.price === 0 || note.isFree
            ? <span className={`${styles.cardPrice} ${styles.cardPriceFree}`}>Free</span>
            : note.price > 0
              ? <span className={styles.cardPrice}>PKR {note.price}</span>
              : null
          }
        </div>
      </div>
      </Link>
      <div className={styles.ownerRow}>
        <div className={styles.ownerAvatar}>{initials(note.uploader?.name || note.uploadedBy?.name)}</div>
        <span className={styles.ownerName}>{note.uploader?.name || note.uploadedBy?.name || 'Unknown'}</span>
        {showDelete && (
          <button
            type="button"
            className={styles.cardDeleteBtn}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(note);
            }}
          >
            <Trash2 size={13} />
            Delete
          </button>
        )}
        {onBookmark && (
          <div onClick={(e) => e.preventDefault()}>
            <BookmarkButton noteId={note._id} initialBookmarked={note.isBookmarked} onChange={(s) => onBookmark(note._id, s)} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotesPage() {
  useRequireAuth();
  const searchParams = useSearchParams();
  const mineView = searchParams.get('mine') === 'true';
  const [notes, setNotes]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [q, setQ]                   = useState('');
  const [course, setCourse]         = useState('');
  const [type, setType]             = useState('');
  const [sort, setSort]             = useState('recent');
  const [tags, setTags]             = useState([]);
  const [tagInput, setTagInput]     = useState('');
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const debounceRef = useRef(null);

  const load = useCallback(async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      if (mineView) {
        const res = await fetchMyNotes({ page, limit: 12, ...params });
        const d = res?.data || res;
        setNotes(d.items || []);
        setTotalPages(d.totalPages || 1);
        setTotal(d.total || 0);
      } else {
        const res = await searchNotes({ q, course, type, sort, tags, page, limit: 12, ...params });
        const d = res?.data || res;
        setNotes(d.items || []);
        setTotalPages(d.totalPages || 1);
        setTotal(d.total || 0);
      }
    } catch {
      setError(mineView ? 'Could not load your uploads.' : 'Could not load notes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [q, course, type, sort, tags, page, mineView]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(), 400);
    return () => clearTimeout(debounceRef.current);
  }, [load]);

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const val = tagInput.trim().toLowerCase();
      if (!tags.includes(val)) setTags((p) => [...p, val]);
      setTagInput('');
      setPage(1);
    }
  };
  const removeTag = (t) => { setTags((p) => p.filter((x) => x !== t)); setPage(1); };

  const handleBookmark = (id, state) => {
    if (!state) setNotes((p) => p.filter((n) => n._id !== id));
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await deleteNote(deleteTarget._id);
      setNotes((prev) => prev.filter((note) => note._id !== deleteTarget._id));
      setTotal((prev) => Math.max(0, prev - 1));
      toast.success('Note deleted.');
    } catch (err) {
      toast.error(err.message || 'Failed to delete note.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const skeletons = Array.from({ length: 6 }, (_, i) => (
    <div key={i} className={styles.skeleton} style={{ height: 220 }} />
  ));

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>{mineView ? 'My Uploaded Notes' : 'Notes Library'}</h1>
            <p className={styles.pageSubtitle}>
              {mineView ? 'Manage notes you have shared with the community.' : 'Browse and download study notes shared by fellow students.'}
            </p>
          </div>
          <div className={styles.actionRow}>
            {mineView ? (
              <Link href="/notes" className={styles.btnOutline}><BookOpen size={15} /> Browse Notes</Link>
            ) : (
              <Link href="/notes/saved" className={styles.btnOutline}><BookOpen size={15} /> Saved Notes</Link>
            )}
            <Link href="/notes/upload" className={styles.btnPrimary}><Upload size={15} /> Upload Notes</Link>
          </div>
        </div>

        {/* My Uploads Banner */}
        {mineView && (
          <>
            <div className={styles.mineViewBanner}>
              <div className={styles.mineViewBannerLeft}>
                <p className={styles.mineViewBannerTitle}>Your Notes</p>
                <p className={styles.mineViewBannerSub}>All files you have shared with the community</p>
              </div>
              <div className={styles.mineViewStats}>
                <div className={styles.mineStat}>
                  <span className={styles.mineStatNum}>{loading ? '—' : total}</span>
                  <span className={styles.mineStatLabel}>Uploads</span>
                </div>
              </div>
            </div>
            <div className={styles.mineViewTip}>
              <AlertCircle size={13} />
              Click <strong style={{ margin: '0 0.2rem' }}>Delete</strong> on any card below to permanently remove a note.
            </div>
          </>
        )}

        {/* Filter Bar */}
        {!mineView && (
          <div className={styles.filterBar}>
            <div className={styles.searchWrap}>
              <Search size={14} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Search notes, courses, topics…"
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
              />
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Type:</span>
              <select className={styles.filterSelect} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
                {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Sort:</span>
              <select className={styles.filterSelect} value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <Tag size={13} style={{ color: '#9E9E9E' }} />
              <input
                className={styles.tagInput}
                placeholder="Add tag, Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={addTag}
              />
            </div>
          </div>
        )}

        {/* Active Tags */}
        {!mineView && tags.length > 0 && (
          <div className={styles.tagList} style={{ marginBottom: '0.75rem' }}>
            {tags.map((t) => (
              <span key={t} className={styles.tag}>
                #{t}
                <button type="button" className={styles.tagRemove} onClick={() => removeTag(t)}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}

        {error && <div className={styles.errorBanner}>{error}</div>}
        {!loading && !error && (
          <p className={styles.resultsCount}>
            {mineView ? `You have ${total} upload${total !== 1 ? 's' : ''}` : `${total} note${total !== 1 ? 's' : ''} found`}
          </p>
        )}

        {/* Grid */}
        {loading
          ? <div className={styles.grid}>{skeletons}</div>
          : notes.length === 0
            ? (
              <div className={styles.emptyState}>
                <BookOpen size={40} className={styles.emptyIcon} />
                <h3 className={styles.emptyStateTitle}>{mineView ? 'No uploads yet' : 'No notes found'}</h3>
                <p className={styles.emptyStateText}>
                  {mineView ? 'Upload notes to see them listed here.' : 'Try adjusting your filters or be the first to upload notes.'}
                </p>
                <Link href="/notes/upload" className={styles.btnPrimary}><Upload size={15} /> Upload Notes</Link>
              </div>
            )
            : (
              <>
                <div className={styles.grid}>
                  {notes.map((n) => (
                    <NoteCard
                      key={n._id}
                      note={n}
                      onBookmark={mineView ? null : handleBookmark}
                      showDelete={mineView}
                      onDelete={(note) => setDeleteTarget(note)}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                    <Pagination page={page} totalPages={totalPages} onPageChange={(p) => { setPage(p); window.scrollTo(0, 0); }} />
                  </div>
                )}
              </>
            )
        }
      </div>
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this note?"
        message="This permanently removes your note and its file. This action cannot be undone."
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  );
}
