'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
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
import styles from '../tutoring/tutoring.module.css';

const SECTION_META = {
  Marketplace: { icon: '🛍️' },
  Rides: { icon: '🚗' },
  General: { icon: '🔔' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const { isReady } = useRequireAuth();
  const { setUnreadCount } = useStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  
  // From Upstream: Filtering & Search
  const [sectionFilter, setSectionFilter] = useState('all');
  const [search, setSearch] = useState('');

  // From Stashed: Missing target handling
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
    load();
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
      const path = response?.data?.path;
      if (!path) return showMissingTarget();
      router.push(path);
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

  const isPendingRequestNotification = (n) => ['marketplace_request_received', 'ride_request_received'].includes(n.type);
  const isChatReadyNotification = (n) => ['request_approved', 'chat_initialized'].includes(n.type);
  const isPendingRequestSentNotification = (n) => ['marketplace_request_sent', 'ride_request_sent'].includes(n.type);

  const getNotificationSection = (n) => {
    const context = n.meta?.context || '';
    if (context === 'marketplace' || n.type.startsWith('marketplace')) return 'Marketplace';
    if (context === 'ride' || n.type.startsWith('ride')) return 'Rides';
    return 'General';
  };

  // Memoized Logic for Filtering and Grouping
  const filteredItems = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    return items.filter((n) => {
      const section = getNotificationSection(n).toLowerCase();
      if (sectionFilter !== 'all' && section !== sectionFilter) return false;
      if (!trimmed) return true;
      return String(n.message || '').toLowerCase().includes(trimmed);
    });
  }, [items, search, sectionFilter]);

  const filteredGroups = useMemo(() => {
    return filteredItems.reduce((acc, n) => {
      const section = getNotificationSection(n);
      acc[section] = acc[section] || [];
      acc[section].push(n);
      return acc;
    }, {});
  }, [filteredItems]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  return (
    <div className={styles.page}>
      <div className={`container ${styles.container}`}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>🔔 Notifications</h1>
            <p className={styles.pageSubtitle}>Manage your requests, approvals, and chats.</p>
          </div>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={markAll}>
            ✓ Mark all read
          </button>
        </div>

        {/* Stats Grid */}
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
          </div>
        )}

        {/* Filter Bar */}
        <div className={`${styles.surfaceCard} mb-3`}>
          <div className={styles.filterBar}>
            <input
              className="form-control form-control-sm"
              placeholder="Search notifications..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: 260 }}
            />
            <div className={styles.filterGroup}>
              {['all', 'marketplace', 'rides', 'general'].map((val) => (
                <button
                  key={val}
                  className={`btn btn-sm ${sectionFilter === val ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setSectionFilter(val)}
                >
                  {val.charAt(0).toUpperCase() + val.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center p-5"><div className="spinner-border text-primary"></div></div>
        ) : filteredItems.length === 0 ? (
          <div className={`${styles.surfaceCard} text-center p-4`}>No notifications found.</div>
        ) : (
          ['Marketplace', 'Rides', 'General'].map((section) => {
            const sectionItems = filteredGroups[section] || [];
            if (!sectionItems.length) return null;
            return (
              <div key={section} className="mb-4">
                <h2 className="h5 mb-3">{SECTION_META[section].icon} {section}</h2>
                <div className="d-grid gap-2">
                  {sectionItems.map((n) => (
                    <div key={n._id} className={`${styles.listCard} ${!n.read ? styles.unread : ''}`}>
                      <div className={styles.listCardHeader}>
                        <div style={{ flex: 1 }}>
                          <p className="mb-1">{n.message}</p>
                          {n.meta?.message && (
                           <div
  className="alert alert-light py-1 px-2 mb-1 small border-start"
  style={{ borderLeft: "2px solid navy" }}
>
                              <span>Message:</span> {n.meta.message}
                            </div>
                          )}
                          <small className="text-secondary">{new Date(n.createdAt).toLocaleString()}</small>
                        </div>
                        <button className="btn btn-sm text-secondary" onClick={() => hideOne(n._id)}>✕</button>
                      </div>

                      <div className={styles.cardActions}>
                        {isPendingRequestNotification(n) && (
                          <>
                            <Button size="sm" variant="success" onClick={() => handleApprove(n)} disabled={actionLoading}>Approve</Button>
                            <Button size="sm" variant="danger" onClick={() => handleDecline(n)} disabled={actionLoading}>Decline</Button>
                          </>
                        )}
                        {isPendingRequestSentNotification(n) && (
                          <Button size="sm" variant="outline-danger" onClick={() => handleWithdraw(n)} disabled={actionLoading}>Withdraw</Button>
                        )}
                        {(isChatReadyNotification(n) || (n.type === 'request_approved_by_owner' && n.meta?.chatInitialized)) && (
                          <Button size="sm" variant="primary" onClick={() => handleChat(n)} disabled={actionLoading}>💬 Chat</Button>
                        )}
                        {n.link && (
                          <Button size="sm" variant="link" onClick={() => handleOpenNotification(n)} disabled={openingNotificationId === n._id}>
                             {openingNotificationId === n._id ? 'Opening...' : 'View ↗'}
                          </Button>
                        )}
                        {!n.read && <Button size="sm" variant="light" onClick={() => markOne(n._id)}>Mark read</Button>}
                      </div>
                    </div>
                  ))}
                </div>
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

      <Modal show={showMissingTargetModal} onHide={() => setShowMissingTargetModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Item unavailable</Modal.Title></Modal.Header>
        <Modal.Body>{missingTargetMessage}</Modal.Body>
        <Modal.Footer><Button variant="primary" onClick={() => setShowMissingTargetModal(false)}>OK</Button></Modal.Footer>
      </Modal>
    </div>
  );
}