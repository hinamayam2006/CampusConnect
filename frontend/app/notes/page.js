'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Search, Upload, BookOpen, X, Star, Download, Eye, Clock, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './notes.module.css';
import { searchNotes } from '../../lib/apiRequests';
import useRequireAuth from '../../lib/useRequireAuth';
import BookmarkButton from '../../components/BookmarkButton';
import Pagination from '../../components/Pagination';
import StarRating from '../../components/StarRating';
import FileTypeBadge from '../../components/FileTypeBadge';
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

function NoteCard({ note, onBookmark }) {
  return (
    <div className={styles.card}>
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
      <div className={styles.ownerRow}>
        <div className={styles.ownerAvatar}>{initials(note.uploader?.name || note.uploadedBy?.name)}</div>
        <span className={styles.ownerName}>{note.uploader?.name || note.uploadedBy?.name || 'Unknown'}</span>
        <div onClick={(e) => e.preventDefault()}>
          <BookmarkButton noteId={note._id} initialBookmarked={note.isBookmarked} onChange={(s) => onBookmark && onBookmark(note._id, s)} />
        </div>
      </div>
    </div>
  );
}

export default function NotesPage() {
  useRequireAuth();
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
  const debounceRef = useRef(null);

  const load = useCallback(async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      const res = await searchNotes({ q, course, type, sort, tags, page, limit: 12, ...params });
      const d = res?.data || res;
      setNotes(d.items || []);
      setTotalPages(d.totalPages || 1);
      setTotal(d.total || 0);
    } catch {
      setError('Could not load notes. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [q, course, type, sort, tags, page]);

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

  const skeletons = Array.from({ length: 6 }, (_, i) => (
    <div key={i} className={styles.skeleton} style={{ height: 220 }} />
  ));

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Notes Library</h1>
            <p className={styles.pageSubtitle}>Browse and download study notes shared by fellow students.</p>
          </div>
          <div className={styles.actionRow}>
            <Link href="/notes/saved" className={styles.btnSecondary}><BookOpen size={15} /> Saved Notes</Link>
            <Link href="/notes/upload" className={styles.btnPrimary}><Upload size={15} /> Upload Notes</Link>
          </div>
        </div>

        {/* Filter Bar */}
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

        {/* Active Tags */}
        {tags.length > 0 && (
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
        {!loading && !error && <p className={styles.resultsCount}>{total} note{total !== 1 ? 's' : ''} found</p>}

        {/* Grid */}
        {loading
          ? <div className={styles.grid}>{skeletons}</div>
          : notes.length === 0
            ? (
              <div className={styles.emptyState}>
                <BookOpen size={40} className={styles.emptyIcon} />
                <h3 className={styles.emptyStateTitle}>No notes found</h3>
                <p className={styles.emptyStateText}>Try adjusting your filters or be the first to upload notes.</p>
                <Link href="/notes/upload" className={styles.btnPrimary}><Upload size={15} /> Upload Notes</Link>
              </div>
            )
            : (
              <>
                <div className={styles.grid}>
                  {notes.map((n) => (
                    <Link key={n._id} href={`/notes/${n._id}`} className={styles.cardLink}>
                      <NoteCard note={n} onBookmark={handleBookmark} />
                    </Link>
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
    </div>
  );
}
