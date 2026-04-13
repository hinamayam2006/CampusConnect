'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import useStore from '../../store/useStore';
import useRequireAuth from '../../lib/useRequireAuth';
import { getRequestById, approveRequest, declineRequest, acceptChatRequest, hideNotification, withdrawRequest } from '../../lib/apiRequests';
import ChatWindow from '../../components/ChatWindow';

export default function NotificationsPage() {
  const { isReady } = useRequireAuth();
  const { setUnreadCount } = useStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  const isHandledRequestNotification = (notification) =>
    ['request_approved_by_owner', 'request_declined_by_owner', 'request_withdrawn_by_requester'].includes(notification.type);

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

  const groupedNotifications = (items || []).reduce((acc, notification) => {
    const section = getNotificationSection(notification);
    acc[section] = acc[section] || [];
    acc[section].push(notification);
    return acc;
  }, {});

  return (
    <div className="container py-4 py-md-5">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">Notifications</h1>
        <button type="button" className="btn btn-outline-secondary btn-sm" onClick={markAll}>
          Mark all read
        </button>
      </div>
      <p className="text-secondary small mb-4">
        Marketplace requests, ride approvals, and chat invitations appear here. Approve or decline from the notification panel.
      </p>

      {!isReady || loading ? (
        <p>Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-secondary">No notifications yet.</p>
      ) : (
        <>
          {['Marketplace', 'Rides', 'General'].map((section) => {
            const sectionItems = groupedNotifications[section] || [];
            return (
              <div key={section} className="mb-4">
                <h2 className="h5 mb-2">{section}</h2>
                {sectionItems.length === 0 ? (
                  <p className="text-secondary small">No {section.toLowerCase()} notifications.</p>
                ) : (
                  <ul className="list-group">
                    {sectionItems.map((n) => (
                      <li
                        key={n._id}
                        className={`list-group-item position-relative pe-5 d-flex justify-content-between align-items-start ${n.read ? '' : 'fw-semibold'}`}
                      >
                        <button
                          type="button"
                          className="btn-close position-absolute top-0 end-0 mt-2 me-2"
                          aria-label="Hide notification"
                          onClick={() => hideOne(n._id)}
                          style={{ zIndex: 2 }}
                        />
                        <div className="me-3" style={{ minWidth: 0 }}>
                          <div className={n.type === 'request_declined_by_owner' ? 'text-danger' : ''}>{n.message}</div>
                          <div className="small text-secondary">{new Date(n.createdAt).toLocaleString()}</div>
                          {n.link && (
                            <Link href={n.link} className="small d-inline-block mt-1 me-2">
                              Open
                            </Link>
                          )}
                          {n.meta?.requestId && (
                            <span className="badge bg-light text-dark small">Request</span>
                          )}
                        </div>
                        <div className="d-flex gap-1 flex-column flex-sm-row align-items-end" style={{ zIndex: 1 }}>
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
                      </li>
                    ))}
                  </ul>
                )}
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
  );
}
