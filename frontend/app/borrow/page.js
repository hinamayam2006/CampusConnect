'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  PlusCircle,
  Repeat,
  ArrowRight,
  Package,
  BookOpen,
  Monitor,
  Sofa,
  Shirt,
  UtensilsCrossed,
  LayoutGrid,
  MessageCircle,
  X,
  Send,
  Trash2,
  Calculator,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { createRequest, fetchBorrowItems, deleteBorrowItem } from '../../lib/apiRequests';
import styles from '../community.module.css';

const CATEGORIES = [
  { label: 'All',           value: '',            icon: LayoutGrid },
  { label: 'Academic',      value: 'academic',    icon: BookOpen },
  { label: 'Electronics',   value: 'electronics', icon: Monitor },
  { label: 'Home & Living', value: 'home',        icon: Sofa },
  { label: 'Other',         value: 'other',       icon: Package },
];

const STATUS_LABELS = {
  available: 'Seeking Help',
  requested: 'Offer Received',
  borrowed: 'Borrowed',
  returned: 'Returned',
};

function getInitials(name) {
  if (!name) return '';
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
}

function SkeletonFeed() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={styles.feedSkeleton}>
          <div className={styles.skeletonAvatar} />
          <div className={styles.feedSkeletonBody}>
            <div className={styles.skeletonLine} style={{ width: '35%', height: '14px' }} />
            <div className={styles.skeletonLine} style={{ width: '75%', height: '18px', animationDelay: '0.1s' }} />
            <div className={styles.skeletonLine} style={{ width: '90%', animationDelay: '0.15s' }} />
            <div className={styles.skeletonLine} style={{ width: '60%', animationDelay: '0.2s' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function BorrowPage() {
  const { user } = useStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [messageByItemId, setMessageByItemId] = useState({});
  const [openComposerId, setOpenComposerId] = useState('');
  const [requestingForId, setRequestingForId] = useState('');

  const onSendRequest = async (itemId) => {
    if (!user?._id) {
      toast.error('Log in to contact the owner');
      return;
    }
    try {
      setRequestingForId(itemId);
      await createRequest('Borrowing', itemId, 1, String(messageByItemId[itemId] || '').trim());
      toast.success('Borrow request sent. Owner will be notified.');
      setMessageByItemId((prev) => ({ ...prev, [itemId]: '' }));
      setOpenComposerId('');
    } catch (err) {
      toast.error(err?.message || 'Could not send borrow request');
    } finally {
      setRequestingForId('');
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deleteBorrowItem(itemId);
      toast.success('Post deleted');
      setItems((prev) => prev.filter((i) => i._id !== itemId));
    } catch (err) {
      toast.error(err?.message || 'Could not delete post');
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetchBorrowItems({ status: 'available' });
        if (!cancelled) setItems(res?.data?.items || []);
      } catch (err) {
        if (!cancelled) {
          toast.error(err?.message || 'Failed to load borrow items');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const catMatch = (item) => !category || (item.category || '').toLowerCase() === category.toLowerCase();
    const textMatch = (item) => !q || [item.title, item.description, item.category]
      .filter(Boolean).join(' ').toLowerCase().includes(q);
    return items.filter((item) => catMatch(item) && textMatch(item));
  }, [items, search, category]);

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>Borrow</h1>
            <p className={styles.pageSubtitle}>Post what you need, or offer something you can lend.</p>
          </div>
          {user && (
            <Link href="/borrow/create" className={styles.btnPrimary}>
              <PlusCircle size={16} /> Post Request
            </Link>
          )}
        </div>

        <div className={styles.filterBar}>
          <div className={styles.filterRow}>
            <div className={styles.searchWrap}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by item, category, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.pillGroup} style={{ marginTop: '0.75rem' }}>
            {CATEGORIES.map(({ label, value, icon: Icon }) => (
              <button
                key={value}
                type="button"
                className={styles.pill + (category === value ? ' ' + styles.pillActive : '')}
                onClick={() => setCategory(value)}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {!loading && (
          <p className={styles.resultsCount}>
            {filtered.length} request{filtered.length !== 1 ? 's' : ''} open
          </p>
        )}

        {loading && <SkeletonFeed />}

        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}><Repeat size={48} /></div>
                <p className={styles.emptyTitle}>No borrow requests yet</p>
                <p className={styles.emptyText}>
                  {category ? 'No requests in this category. Try another.' : 'Be the first to post something you need to borrow.'}
                </p>
                {user && (
                  <Link href="/borrow/create" className={styles.btnPrimary}>
                    <PlusCircle size={16} /> Post a request
                  </Link>
                )}
              </div>
            ) : (
              filtered.map((item) => {
                const ownerName = item.owner?.name || item.borrower?.name || 'Campus member';
                const initials = getInitials(ownerName);
                const isOwn = user && String(user._id) === String(item.owner?._id || item.borrower?._id);
                const composerOpen = openComposerId === item._id;
                return (
                  <div key={item._id} className={styles.feedCard}>
                    <div className={styles.feedCardTop}>
                      <div className={styles.avatar}>{initials || '?'}</div>
                      <div className={styles.feedMeta}>
                        <span className={styles.feedAuthor}>{ownerName}</span>
                        <span className={styles.feedTime}>{relativeTime(item.createdAt)}</span>
                      </div>
                      <span className={styles.feedTypeBadge + ' ' + styles.badgeRequest}>
                        {item.category || 'Borrow'}
                      </span>
                    </div>

                    <div className={styles.feedBody}>
                      <h3 className={styles.feedTitle}>{item.title}</h3>
                      {item.description && <p className={styles.feedDescription}>{item.description}</p>}
                    </div>

                    {composerOpen && (
                      <div className={styles.messageComposer}>
                        <textarea
                          className={styles.messageTextarea}
                          rows={2}
                          placeholder="Write a short message to the owner (optional)..."
                          value={messageByItemId[item._id] || ''}
                          onChange={(e) => setMessageByItemId((prev) => ({ ...prev, [item._id]: e.target.value }))}
                        />
                        <div className={styles.messageActions}>
                          <button
                            type="button"
                            className={styles.cardBtn}
                            style={{ flex: 'none', padding: '0.5rem 1rem' }}
                            disabled={requestingForId === item._id}
                            onClick={() => onSendRequest(item._id)}
                          >
                            <Send size={14} />
                            {requestingForId === item._id ? 'Sending...' : 'I Can Help'}
                          </button>
                          <button
                            type="button"
                            className={styles.cardBtnOutline}
                            style={{ flex: 'none', padding: '0.5rem 0.8rem' }}
                            onClick={() => setOpenComposerId('')}
                            disabled={requestingForId === item._id}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className={styles.feedFooter}>
                      <span className={styles.feedLocation}>
                        <Package size={13} />
                        {STATUS_LABELS[item.status] || item.status || 'Seeking Help'}
                      </span>
                      <div className={styles.feedActions}>
                        {user && !isOwn && !composerOpen && (
                          <button
                            type="button"
                            className={styles.cardBtn}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.84rem' }}
                            onClick={() => setOpenComposerId(item._id)}
                          >
                            <MessageCircle size={14} /> Help Out
                          </button>
                        )}
                        {!user && (
                          <Link href="/login" className={styles.cardBtn} style={{ padding: '0.5rem 1rem', fontSize: '0.84rem' }}>
                            Log in to respond
                          </Link>
                        )}
                        {isOwn && (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Your post</span>
                            <button
                              type="button"
                              className={styles.cardBtnOutline}
                              style={{ padding: '0.5rem', color: '#dc3545', borderColor: 'transparent' }}
                              onClick={() => handleDelete(item._id)}
                              title="Delete post"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                        <Link href={'/borrow/' + item._id} className={styles.cardBtnOutline} style={{ padding: '0.5rem 0.9rem', fontSize: '0.84rem' }}>
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
