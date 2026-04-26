'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Bell, ShoppingBag, Car, Package, Compass, Info,
  Check, CheckCheck, MessageCircle, ExternalLink,
  ChevronRight, X, Search, GraduationCap,
} from 'lucide-react';
import api from '../../lib/api';
import useStore from '../../store/useStore';
import useRequireAuth from '../../lib/useRequireAuth';
import {
  acceptChatRequest,
  approveRequest,
  declineRequest,
  getRequestById,
  hideNotification,
  resolveNotificationTarget,
  withdrawRequest,
} from '../../lib/apiRequests';
import ChatWindow from '../../components/ChatWindow';
import styles from './notifications.module.css';

const SECTION_META = {
  Marketplace:   { Icon: ShoppingBag,   colorClass: 'iconMarket'   },
  Rides:         { Icon: Car,           colorClass: 'iconRide'     },
  Borrow:        { Icon: Package,       colorClass: 'iconBorrow'   },
  'Lost & Found':{ Icon: Compass,       colorClass: 'iconLost'     },
  Tutoring:      { Icon: GraduationCap, colorClass: 'iconTutoring' },
  General:       { Icon: Info,          colorClass: 'iconGeneral'  },
};

const FILTER_OPTIONS = ['all', 'marketplace', 'rides', 'borrow', 'lost & found', 'tutoring', 'general'];

function formatRelativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const deltaSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const deltaAbs = Math.abs(deltaSeconds);
  const units = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
  ];

  for (const [unit, seconds] of units) {
    if (deltaAbs >= seconds || unit === 'minute') {
      const valueInUnits = Math.round(deltaSeconds / seconds);
      const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
      return rtf.format(valueInUnits, unit);
    }
  }

  return 'just now';
}

export default function NotificationsPage() {
  const router = useRouter();
  const { isReady } = useRequireAuth();
  const { setUnreadCount } = useStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [sectionFilter, setSectionFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [openingNotificationId, setOpeningNotificationId] = useState(null);
  const [missingTargetMessage, setMissingTargetMessage] = useState('');
  const [showMissingTargetModal, setShowMissingTargetModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        const nextItems = res.data.data || [];
        setItems(nextItems);
        setUnreadCount(nextItems.filter((n) => !n.read).length);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [setUnreadCount]);

  useEffect(() => {
    if (!isReady) return;
    const timer = setTimeout(() => {
      void load();
    }, 0);

    return () => clearTimeout(timer);
  }, [isReady, load]);

  const getRequestId = (n) => n.requestId || n.meta?.requestId;

  const markOne = async (notificationId) => {
    try {
      await api.patch(`/notifications/${notificationId}/read`);
      await load();
    } catch {
      toast.error('Could not update notification');
    }
  };

  const hideOne = async (notificationId) => {
    try {
      await hideNotification(notificationId);
      await load();
    } catch {
      toast.error('Could not hide notification');
    }
  };

  const markAll = async () => {
    try {
      await api.patch('/notifications/read-all');
      toast.success('All marked read');
      await load();
    } catch {
      toast.error('Could not update notifications');
    }
  };

  const showMissingTarget = (message) => {
    setMissingTargetMessage(message || 'This item is no longer available.');
    setShowMissingTargetModal(true);
  };

  const handleOpenNotification = async (notification) => {
    setOpeningNotificationId(notification._id);
    try {
      const response = await resolveNotificationTarget(notification._id);
      const navPath = response?.data?.path;
      if (!navPath) return showMissingTarget();
      router.push(navPath);
    } catch (err) {
      showMissingTarget(err?.message);
    } finally {
      setOpeningNotificationId(null);
    }
  };

  const handleApprove = async (notification) => {
    const requestId = getRequestId(notification);
    if (!requestId) return toast.error('No request link available');
    setActionLoading(true);
    try {
      await approveRequest(requestId);
      toast.success('Request approved');
      await markOne(notification._id);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (notification) => {
    const requestId = getRequestId(notification);
    if (!requestId) return toast.error('No request link available');
    const reason = window.prompt('Reason for declining (optional):');
    setActionLoading(true);
    try {
      await declineRequest(requestId, reason || '');
      toast.success('Request declined');
      await markOne(notification._id);
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not decline request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChat = async (notification) => {
    const requestId = getRequestId(notification);
    if (!requestId) return toast.error('No request link available');
    setActionLoading(true);
    try {
      const response = await getRequestById(requestId);
      const request = response.data;
      if (!request) throw new Error('Request not found');
      if (request.status !== 'approved') throw new Error('Request not approved yet');
      if (!request.chatAcceptedBy) await acceptChatRequest(requestId);
      setSelectedRequest(request);
      setShowChatWindow(true);
      await markOne(notification._id);
    } catch (err) {
      toast.error(err.message || 'Could not start chat');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async (notification) => {
    const requestId = getRequestId(notification);
    if (!requestId || !window.confirm('Withdraw this request?')) return;
    setActionLoading(true);
    try {
      await withdrawRequest(requestId);
      toast.success('Request withdrawn');
      await load();
    } catch (err) {
      toast.error(err.message || 'Could not withdraw request');
    } finally {
      setActionLoading(false);
    }
  };

  const isPendingRequestNotification = (n) =>
    ['marketplace_request_received', 'ride_request_received', 'borrow_request_received', 'lostnfound_request_received'].includes(n.type);
  const isChatReadyNotification = (n) =>
    ['request_approved', 'chat_initialized'].includes(n.type);
  const isPendingRequestSentNotification = (n) =>
    ['marketplace_request_sent', 'ride_request_sent', 'borrow_request_sent', 'lostnfound_request_sent'].includes(n.type);

  const getNotificationSection = (n) => {
    const context = n.meta?.context || '';
    if (context === 'marketplace' || n.type.startsWith('marketplace')) return 'Marketplace';
    if (context === 'ride' || n.type.startsWith('ride')) return 'Rides';
    if (context === 'borrow' || n.type.startsWith('borrow')) return 'Borrow';
    if (context === 'lostnfound' || n.type.startsWith('lostnfound')) return 'Lost & Found';
    const tutoringTypes = ['booking_created', 'booking_confirmed', 'booking_rejected', 'booking_cancelled', 'booking_completed', 'booking_deleted', 'payment_uploaded', 'payment_approved', 'payment_rejected'];
    if (tutoringTypes.includes(n.type) || n.link === '/tutoring') return 'Tutoring';
    return 'General';
  };

  const filteredItems = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    return [...items]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .filter((n) => {
      const section = getNotificationSection(n).toLowerCase();
      if (sectionFilter !== 'all' && section !== sectionFilter) return false;
      if (!trimmed) return true;
      return String(n.message || '').toLowerCase().includes(trimmed);
      });
  }, [items, search, sectionFilter]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  return (
    <div className={styles.page}>
      <div className="container" style={{ maxWidth: '800px' }}>

        {/* Header */}
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>Notifications</h1>
            <p className={styles.pageSubtitle}>Manage your requests, approvals, and chats.</p>
          </div>
          <button type="button" className={styles.btnMarkAll} onClick={markAll}>
            <CheckCheck size={14} /> Mark all read
          </button>
        </div>

        {/* Stats */}
        {!loading && (
          <div className={styles.statsRow}>
            <div className={styles.statPill}>
              <Bell size={13} /><strong>{items.length}</strong> Total
            </div>
            <div className={styles.statPill}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4F6EF7', display: 'inline-block' }} />
              <strong>{unreadCount}</strong> Unread
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className={styles.filterBar}>
          <div className={styles.searchWrap}>
            <Search size={14} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className={styles.pillGroup}>
            {FILTER_OPTIONS.map((val) => (
              <button
                key={val}
                type="button"
                className={`${styles.pill}${sectionFilter === val ? ' ' + styles.pillActive : ''}`}
                onClick={() => setSectionFilter(val)}
              >
                {val.charAt(0).toUpperCase() + val.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div>
            {[1,2,3,4].map((i) => (
              <div key={i} className={styles.skeleton} style={{ height: 90, marginBottom: '0.6rem' }} />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><Bell size={40} /></div>
            <p className={styles.emptyTitle}>No notifications</p>
            <p className={styles.emptyText}>You are all caught up. New alerts will appear here.</p>
          </div>
        ) : (
          filteredItems.map((n) => {
            const section = getNotificationSection(n);
            const sectionMeta = SECTION_META[section];
            const { Icon, colorClass } = sectionMeta;

            return (
              <div key={n._id} className={`${styles.notifCard}${!n.read ? ' ' + styles.notifUnread : ''}`}>
                <div className={styles.notifTop}>
                  {!n.read
                    ? <span className={styles.unreadDot} />
                    : <span className={styles.readDot} />
                  }
                  <div className={styles.notifBody}>
                    <div className={styles.notifSectionRow}>
                      <div className={`${styles.sectionIconWrap} ${styles[colorClass]}`}>
                        <Icon size={12} />
                      </div>
                      <span className={styles.notifSection}>{section}</span>
                    </div>
                    <p className={styles.notifMessage}>{n.message}</p>
                    {n.meta?.message && (
                      <div className={styles.notifQuoteWrap}>
                        <p className={styles.notifQuote}>{n.meta.message}</p>
                      </div>
                    )}
                    {n.type === 'request_deleted_by_owner' && (
                      <div className={styles.deletedNotice}>
                        Request was deleted by you.
                      </div>
                    )}
                    <div className={styles.notifMeta}>
                      <span className={styles.notifTime}>{formatRelativeTime(n.createdAt)}</span>
                    </div>
                  </div>
                  <button type="button" className={styles.dismissBtn} onClick={() => hideOne(n._id)} aria-label="Dismiss">
                    <X size={14} />
                  </button>
                </div>

                {(isPendingRequestNotification(n) || isPendingRequestSentNotification(n) || isChatReadyNotification(n) || (n.type === 'request_approved_by_owner' && n.meta?.chatInitialized) || n.link || !n.read) && (
                  <div className={styles.cardActions}>
                    {isPendingRequestNotification(n) && (
                      <>
                        <button type="button" className={`${styles.btnAction} ${styles.btnApprove}`} onClick={() => handleApprove(n)} disabled={actionLoading}>
                          <Check size={12} /> Approve
                        </button>
                        <button type="button" className={`${styles.btnAction} ${styles.btnDecline}`} onClick={() => handleDecline(n)} disabled={actionLoading}>
                          <X size={12} /> Decline
                        </button>
                      </>
                    )}
                    {isPendingRequestSentNotification(n) && (
                      <button type="button" className={`${styles.btnAction} ${styles.btnWithdraw}`} onClick={() => handleWithdraw(n)} disabled={actionLoading}>
                        <X size={12} /> Withdraw
                      </button>
                    )}
                    {(isChatReadyNotification(n) || (n.type === 'request_approved_by_owner' && n.meta?.chatInitialized)) && (
                      <button type="button" className={`${styles.btnAction} ${styles.btnChat}`} onClick={() => handleChat(n)} disabled={actionLoading}>
                        <MessageCircle size={12} /> Chat
                      </button>
                    )}
                    {n.link && (
                      <button type="button" className={`${styles.btnAction} ${styles.btnView}`} onClick={() => handleOpenNotification(n)} disabled={openingNotificationId === n._id}>
                        <ExternalLink size={12} /> {openingNotificationId === n._id ? 'Opening...' : 'View'}
                      </button>
                    )}
                    {!n.read && (
                      <button type="button" className={`${styles.btnAction} ${styles.btnMarkRead}`} onClick={() => markOne(n._id)}>
                        <Check size={12} /> Mark read
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {showChatWindow && selectedRequest && (
        <ChatWindow
          request={selectedRequest}
          isOpen={showChatWindow}
          onClose={() => setShowChatWindow(false)}
        />
      )}

      {showMissingTargetModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <p className={styles.modalTitle}>Item unavailable</p>
            <p className={styles.modalMessage}>{missingTargetMessage}</p>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.btnModalOk} onClick={() => setShowMissingTargetModal(false)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
