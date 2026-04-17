'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import useStore from '../../store/useStore';
import useRequireAuth from '../../lib/useRequireAuth';
import { getRequestById, approveRequest, declineRequest, acceptChatRequest, hideNotification, withdrawRequest } from '../../lib/apiRequests';
import ChatWindow from '../../components/ChatWindow';
import styles from '../tutoring/tutoring.module.css';

export default function NotificationsPage() {
  const { isReady } = useRequireAuth();
  const { setUnreadCount } = useStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [sectionFilter, setSectionFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setItems(res.data.data || []);
        const unread = (res.data.data || []).filter((n) => !n.read).length;
        setUnreadCount(unread);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady]);

  const getRequestId = (notification) => notification.requestId || notification.meta?.requestId;

  const markOne = async (nid) => {
    try {
      await api.patch(`/notifications/${nid}/read`);
      await load();
    } catch {
      toast.error('Could not update notification');
    }
  };

  const hideOne = async (nid) => {
    try {
      await hideNotification(nid);
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
      if (!request) {
        throw new Error('Request not found');
      }
      if (request.status !== 'approved') {
        throw new Error('Request is not approved yet');
      }
      if (!request.chatAcceptedBy) {
        await acceptChatRequest(requestId);
      }
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
    if (!requestId) return toast.error('No request link available');

    if (!window.confirm('Are you sure you want to withdraw this request?')) return;

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

  const isPendingRequestNotification = (notification) =>
    ['marketplace_request_received', 'ride_request_received'].includes(notification.type);

  const isChatReadyNotification = (notification) =>
    ['request_approved', 'chat_initialized'].includes(notification.type);

  const isPendingRequestSentNotification = (notification) =>
    ['marketplace_request_sent', 'ride_request_sent'].includes(notification.type);


  const getNotificationSection = (notification) => {
    const context = notification.meta?.context || '';
    if (context === 'marketplace' || notification.type.startsWith('marketplace')) {
      return 'Marketplace';
    }
    if (context === 'ride' || notification.type.startsWith('ride')) {
      return 'Rides';
    }
    if (['chat_initialized', 'chat_closed', 'request_withdrawn', 'request_declined', 'request_approved', 'request_approved_by_owner', 'request_declined_by_owner', 'request_withdrawn_by_requester'].includes(notification.type)) {
      return notification.meta?.context === 'ride' ? 'Rides' : 'Marketplace';
    }
    return 'General';
  };

  const filteredItems = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    return items.filter((notification) => {
      const section = getNotificationSection(notification).toLowerCase();
      if (sectionFilter !== 'all' && section !== sectionFilter) return false;
      if (!trimmed) return true;
      return String(notification.message || '').toLowerCase().includes(trimmed);
    });
  }, [items, search, sectionFilter]);

  const filteredGroups = useMemo(() => {
    return (filteredItems || []).reduce((acc, notification) => {
      const section = getNotificationSection(notification);
      acc[section] = acc[section] || [];
      acc[section].push(notification);
      return acc;
    }, {});
  }, [filteredItems]);

  const unreadCount = useMemo(
    () => (items || []).filter((n) => !n.read).length,
    [items]
  );

  const actionCount = useMemo(
    () => (items || []).filter((n) =>
      isPendingRequestNotification(n) ||
      isChatReadyNotification(n) ||
      isPendingRequestSentNotification(n)
    ).length,
    [items]
  );

  const sections = ['Marketplace', 'Rides', 'General'];

  return (
    <div className={styles.page}>
      <div className={`container ${styles.container}`}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Notifications</h1>
            <p className={styles.pageSubtitle}>Marketplace requests, ride approvals, and chat invites live here.</p>
          </div>
          <div className={styles.actionRow}>
            <button type="button" className="btn btn-outline-secondary btn-sm" onClick={markAll}>
              Mark all read
            </button>
          </div>
        </div>

        {!loading && (
          <div className={`${styles.statGrid} mb-3`}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Total</div>
              <div className={styles.statValue}>{items.length}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Unread</div>
              <div className={styles.statValue}>{unreadCount}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Needs action</div>
              <div className={styles.statValue}>{actionCount}</div>
            </div>
          </div>
        )}

        <div className={`${styles.surfaceCard} mb-3`}>
          <div className={styles.filterBar}>
            <input
              className="form-control form-control-sm"
              placeholder="Search notifications…"
              value={search}
              style={{ maxWidth: 260 }}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className={styles.filterGroup}>
              {[{ label: 'All', value: 'all' }, { label: 'Marketplace', value: 'marketplace' }, { label: 'Rides', value: 'rides' }, { label: 'General', value: 'general' }].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={`btn btn-sm ${sectionFilter === item.value ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setSectionFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <span className="text-secondary small" style={{ whiteSpace: 'nowrap' }}>
              {loading ? 'Loading…' : `${filteredItems.length} shown`}
            </span>
          </div>
        </div>

        {!isReady || loading ? (
          <p className="text-secondary">Loading…</p>
        ) : filteredItems.length === 0 ? (
          <div className={`${styles.surfaceCard} text-center p-4`}>
            <p className="text-secondary mb-0">No notifications yet.</p>
          </div>
        ) : (
          <>
            {sections.map((section) => {
              const sectionItems = filteredGroups[section] || [];
              if (!sectionItems.length && sectionFilter !== 'all') return null;
              if (!sectionItems.length && sectionFilter === 'all') return null;
              return (
                <div key={section} className="mb-4">
                  <h2 className="h5 mb-2">{section}</h2>
                  <div className="d-grid gap-2">
                    {sectionItems.map((n) => (
                      <div key={n._id} className={styles.listCard}>
                        <div className={styles.listCardHeader}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="d-flex gap-2 align-items-center mb-1 flex-wrap">
                              {!n.read && <span className={styles.tag}>Unread</span>}
                              {n.meta?.requestId && <span className={`${styles.tag} ${styles.tagSoft}`}>Request</span>}
                            </div>
                            <div className={n.type === 'request_declined_by_owner' ? 'text-danger' : ''}>{n.message}</div>
                            <div className="small text-secondary">{new Date(n.createdAt).toLocaleString()}</div>
                            {n.link && (
                              <Link href={n.link} className="small d-inline-block mt-1 me-2">
                                Open
                              </Link>
                            )}
                          </div>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => hideOne(n._id)}
                            disabled={actionLoading}
                          >
                            Hide
                          </button>
                        </div>

                        <div className={styles.cardActions}>
                          {isPendingRequestNotification(n) && (
                            <>
                              <button
                                type="button"
                                className="btn btn-sm btn-success"
                                onClick={() => handleApprove(n)}
                                disabled={actionLoading}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDecline(n)}
                                disabled={actionLoading}
                              >
                                Decline
                              </button>
                            </>
                          )}
                          {isPendingRequestSentNotification(n) && (
                            <button
                              type="button"
                              className="btn btn-sm btn-warning"
                              onClick={() => handleWithdraw(n)}
                              disabled={actionLoading}
                            >
                              Withdraw
                            </button>
                          )}
                          {(isChatReadyNotification(n) || (n.type === 'request_approved_by_owner' && n.meta?.chatInitialized)) && (
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => handleChat(n)}
                              disabled={actionLoading}
                            >
                              Chat
                            </button>
                          )}
                          {!n.read && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => markOne(n._id)}
                              disabled={actionLoading}
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {showChatWindow && selectedRequest && (
          <ChatWindow
            request={selectedRequest}
            isOpen={showChatWindow}
            onClose={() => setShowChatWindow(false)}
          />
        )}
      </div>
    </div>
  );
}
