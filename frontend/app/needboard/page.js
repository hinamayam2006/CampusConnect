// needboard/page.js
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  PlusCircle,
  ClipboardList,
  MessageCircle,
  X,
  Send,
  MapPin,
  Clock,
  Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { createRequest, fetchLostnFoundItems } from '../../lib/apiRequests';
import styles from '../community.module.css';

const FILTERS = [
  { label: 'All Posts',   value: '' },
  { label: 'Lost Items',  value: 'lost' },
  { label: 'Found Items', value: 'found' },
];

function getInitials(name) {
  if (!name) return '?';
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
  const days = Math.floor(hrs / 24);
  if (days < 7) return days + 'd ago';
  return new Date(dateStr).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
}

function SkeletonFeed() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={styles.feedSkeleton}>
          <div className={styles.skeletonAvatar} />
          <div className={styles.feedSkeletonBody}>
            <div className={styles.skeletonLine} style={{ width: '30%', height: '14px' }} />
            <div className={styles.skeletonLine} style={{ width: '65%', height: '18px', animationDelay: '0.08s' }} />
            <div className={styles.skeletonLine} style={{ width: '90%', animationDelay: '0.14s' }} />
            <div className={styles.skeletonLine} style={{ width: '55%', animationDelay: '0.2s' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NeedBoardPage() {
  const { user } = useStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [postTypeFilter, setPostTypeFilter] = useState('');
  const [messageByItemId, setMessageByItemId] = useState({});
  const [openComposerId, setOpenComposerId] = useState('');
  const [requestingForId, setRequestingForId] = useState('');

  const onSendRequest = async (itemId) => {
    if (!user?._id) {
      toast.error('Log in to contact the poster');
      return;
    }
    try {
      setRequestingForId(itemId);
      await createRequest('LostnFound', itemId, 1, String(messageByItemId[itemId] || '').trim());
      toast.success('Message sent. The poster will be notified.');
      setMessageByItemId((prev) => ({ ...prev, [itemId]: '' }));
      setOpenComposerId('');
    } catch (err) {
      toast.error(err?.message || 'Could not send message');
    } finally {
      setRequestingForId('');
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetchLostnFoundItems({ status: 'open' });
        if (!cancelled) setItems(res?.data?.items || []);
      } catch (err) {
        if (!cancelled) {
          toast.error(err?.message || 'Failed to load posts');
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
    return items.filter((item) => {
      const typeMatch = !postTypeFilter || item.postType === postTypeFilter;
      const textMatch = !q || [item.title, item.description, item.location, item.category]
        .filter(Boolean).join(' ').toLowerCase().includes(q);
      return typeMatch && textMatch;
    });
  }, [items, search, postTypeFilter]);

  const lostCount  = items.filter((i) => i.postType === 'lost').length;
  const foundCount = items.filter((i) => i.postType === 'found').length;

  return (
    <div className={styles.page}>
      <div className="container">
        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>Need Board</h1>
            <p className={styles.pageSubtitle}>
              Lost something? Found something? Help each other out.
            </p>
          </div>
          {user && (
            <Link href="/lostnfound/create" className={styles.btnPrimary}>
              <PlusCircle size={16} /> New Post
            </Link>
          )}
        </div>

        {/* Stats */}
        {!loading && (
          <div className={styles.statsRow}>
            <span className={styles.statPill}>
              <ClipboardList size={13} />
              <strong>{items.length}</strong> total posts
            </span>
            <span className={styles.statPill}>
              <Tag size={13} />
              <strong>{lostCount}</strong> lost
            </span>
            <span className={styles.statPill}>
              <Tag size={13} />
              <strong>{foundCount}</strong> found
            </span>
          </div>
        )}

        {/* Filter Bar */}
        <div className={styles.filterBar}>
          <div className={styles.filterRow}>
            <div className={styles.searchWrap}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search by title, location, or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.pillGroup} style={{ marginTop: '0.75rem' }}>
            {FILTERS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                className={styles.pill + (postTypeFilter === value ? ' ' + styles.pillActive : '')}
                onClick={() => setPostTypeFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        {!loading && (
          <p className={styles.resultsCount}>
            {filtered.length} post{filtered.length !== 1 ? 's' : ''}
            {postTypeFilter ? ` · ${postTypeFilter}` : ''}
          </p>
        )}

        {/* Loading */}
        {loading && <SkeletonFeed />}

        {/* Feed */}
        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}><ClipboardList size={48} /></div>
                <p className={styles.emptyTitle}>Nothing here yet</p>
                <p className={styles.emptyText}>
                  {postTypeFilter
                    ? 'No posts in this category. Try a different filter.'
                    : 'Be the first to post a lost or found item.'}
                </p>
                {user && (
                  <Link href="/lostnfound/create" className={styles.btnPrimary}>
                    <PlusCircle size={16} /> New Post
                  </Link>
                )}
              </div>
            ) : (
              filtered.map((item) => {
                const posterName = item.owner?.name || item.poster?.name || 'Campus member';
                const initials = getInitials(posterName);
                const isOwn = user && String(user._id) === String(item.owner?._id || item.poster?._id);
                const composerOpen = openComposerId === item._id;
                const isLost = item.postType === 'lost';

                return (
                  <div key={item._id} className={styles.feedCard}>
                    <div className={styles.feedCardTop}>
                      <div className={styles.avatar}>{initials}</div>
                      <div className={styles.feedMeta}>
                        <span className={styles.feedAuthor}>{posterName}</span>
                        <span className={styles.feedTime}>
                          <Clock size={11} /> {relativeTime(item.createdAt)}
                        </span>
                      </div>
                      <span className={
                        styles.feedTypeBadge + ' ' +
                        (isLost ? styles.badgeLost : styles.badgeFound)
                      }>
                        {isLost ? 'Lost' : 'Found'}
                      </span>
                    </div>

                    <div className={styles.feedBody}>
                      <h3 className={styles.feedTitle}>{item.title}</h3>
                      {item.description && (
                        <p className={styles.feedDescription}>{item.description}</p>
                      )}
                    </div>

                    {/* Message composer */}
                    {composerOpen && (
                      <div className={styles.messageComposer}>
                        <textarea
                          className={styles.messageTextarea}
                          rows={2}
                          placeholder={isLost
                            ? 'Let them know you may have found it...'
                            : 'Describe the lost item you are looking for...'}
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
                            {requestingForId === item._id ? 'Sending...' : 'Send Message'}
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
                      {item.location && (
                        <span className={styles.feedLocation}>
                          <MapPin size={13} /> {item.location}
                        </span>
                      )}
                      <div className={styles.feedActions}>
                        {user && !isOwn && !composerOpen && (
                          <button
                            type="button"
                            className={styles.cardBtn}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.84rem' }}
                            onClick={() => setOpenComposerId(item._id)}
                          >
                            <MessageCircle size={14} />
                            {isLost ? 'I Found It' : 'Is This Mine?'}
                          </button>
                        )}
                        {!user && (
                          <Link href="/login" className={styles.cardBtn} style={{ padding: '0.5rem 1rem', fontSize: '0.84rem' }}>
                            Log in to respond
                          </Link>
                        )}
                        {isOwn && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Your post</span>
                        )}
                        <Link
                          href={'/lostnfound/' + item._id}
                          className={styles.cardBtnOutline}
                          style={{ padding: '0.5rem 0.9rem', fontSize: '0.84rem' }}
                        >
                          View
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
