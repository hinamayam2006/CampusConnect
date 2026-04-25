'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  AlertTriangle, 
  Trash2, 
  XCircle, 
  ChevronLeft, 
  Package, 
  MessageCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import useStore from '../../../store/useStore';
import ChatWindow from '../../../components/ChatWindow';
import styles from '../../rides/rides-pages.module.css';
import {
  acceptChatRequest,
  approveRequest,
  createRequest,
  declineRequest,
  fetchBorrowItemById,
  getMyRequests,
  getRequestsForResource,
  deleteBorrowItem,
  withdrawRequest,
  markBorrowItemAsBorrowed,
  markBorrowItemAsReturned,
} from '../../../lib/apiRequests';
import { CheckCircle } from 'lucide-react';

const CONDITION_LABELS = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

const STATUS_LABELS = {
  available: 'Seeking Help',
  requested: 'Offer Received',
  borrowed: 'Borrowed',
  returned: 'Returned',
};

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

export default function BorrowDetailPage() {
  const { id } = useParams();
  const { user } = useStore();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [actingRequestId, setActingRequestId] = useState('');
  const [chatRequest, setChatRequest] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [myRequest, setMyRequest] = useState(null);
  const [loadingMyRequest, setLoadingMyRequest] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();

  const handleStatusUpdate = async (newStatus) => {
    const msg = newStatus === 'returned' 
      ? 'Mark this as returned and close the request?' 
      : `Change status to ${newStatus}?`;
    if (!window.confirm(msg)) return;
    
    setActionLoading(true);
    try {
      if (newStatus === 'borrowed') {
        const approvedRequest = requests.find((request) => request.status === 'approved');
        await markBorrowItemAsBorrowed(id, approvedRequest?.requester?._id ? { borrower: approvedRequest.requester._id } : {});
        toast.success('Item marked as borrowed');
      } else {
        await markBorrowItemAsReturned(id);
        toast.success('Item marked as returned');
      }
      if (newStatus === 'returned' || newStatus === 'unavailable') {
        router.push('/borrow');
      } else {
        const res = await fetchBorrowItemById(id);
        setItem(res?.data || null);
      }
    } catch (err) {
      toast.error(err?.message || 'Could not update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;
    try {
      await deleteBorrowItem(id);
      toast.success('Post deleted');
      router.push('/borrow');
    } catch (err) {
      toast.error(err?.message || 'Could not delete post');
    }
  };

  const handleWithdraw = async (requestId) => {
    if (!window.confirm('Withdraw this request?')) return;
    setActingRequestId(requestId);
    try {
      await withdrawRequest(requestId);
      toast.success('Request withdrawn');
      setMyRequest(null);
    } catch (err) {
      toast.error(err?.message || 'Could not withdraw request');
    } finally {
      setActingRequestId('');
    }
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetchBorrowItemById(id);
        if (!cancelled) setItem(res?.data || null);
      } catch {
        if (!cancelled) setItem(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const timer = setTimeout(() => {
      void run();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  const onContact = async () => {
    if (!user?._id) { toast.error('Log in to contact the owner'); return; }
    try {
      setSending(true);
      await createRequest('Borrowing', id, 1, message.trim());
      toast.success('Borrow request sent! The owner will be notified.');
      setMessage('');
      await loadMyRequest(id);
    } catch (err) {
      toast.error(err?.message || 'Could not send borrow request');
    } finally {
      setSending(false);
    }
  };

  const loadMyRequest = async (itemId) => {
    if (!itemId || !user?._id) { setMyRequest(null); return; }
    setLoadingMyRequest(true);
    try {
      const res = await getMyRequests('requester', null, 'borrowing');
      const all = res?.data || [];
      const existing = all.find(
        (r) =>
          r.refModel === 'Borrowing' &&
          String(r.refId?._id || r.refId) === String(itemId) &&
          ['pending', 'approved'].includes(r.status)
      );
      setMyRequest(existing || null);
    } catch {
      setMyRequest(null);
    } finally {
      setLoadingMyRequest(false);
    }
  };

  const loadOwnerRequests = async (itemId) => {
    if (!itemId) return;
    setLoadingRequests(true);
    try {
      const res = await getRequestsForResource('Borrowing', itemId);
      setRequests(res?.data || []);
    } catch {
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApprove = async (requestId) => {
    setActingRequestId(requestId);
    try {
      await approveRequest(requestId);
      toast.success('Request approved');
      await loadOwnerRequests(id);
    } catch (err) {
      toast.error(err?.message || 'Could not approve request');
    } finally {
      setActingRequestId('');
    }
  };

  const handleDecline = async (requestId) => {
    const reason = window.prompt('Reason for declining (optional):', '');
    setActingRequestId(requestId);
    try {
      await declineRequest(requestId, reason || '');
      toast.success('Request declined');
      await loadOwnerRequests(id);
    } catch (err) {
      toast.error(err?.message || 'Could not decline request');
    } finally {
      setActingRequestId('');
    }
  };

  const handleOpenChat = async (request) => {
    setActingRequestId(request._id);
    try {
      if (!request.chatAcceptedBy) {
        await acceptChatRequest(request._id);
      }
      setChatRequest(request);
      setShowChat(true);
    } catch (err) {
      toast.error(err?.message || 'Could not open chat');
    } finally {
      setActingRequestId('');
    }
  };

  const isOwner = Boolean(user?._id && item?.owner?._id && String(user._id) === String(item.owner._id));

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!id || !isOwner) {
        setRequests([]);
        return;
      }
      void loadOwnerRequests(id);
    }, 0);

    return () => clearTimeout(timer);
  }, [id, isOwner]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!id || !user?._id || isOwner) {
        setMyRequest(null);
        return;
      }
      void loadMyRequest(id);
    }, 0);

    return () => clearTimeout(timer);
  }, [id, user?._id, isOwner]);

  if (loading) return <div className="container py-5 text-secondary">Loading item...</div>;
  if (!item) return <div className="container py-5 text-secondary">Item not found.</div>;

  const ownerName = item.owner?.name || 'Campus member';

  return (
    <div className={styles.detailPage}>
      <Link href="/borrow" className={styles.detailBackLink}>
        <ChevronLeft size={15} /> Back to Borrow
      </Link>

      <div className={styles.detailGrid}>
        {/* Left Column: Media & Info */}
        <div className={styles.detailLeft}>
          <div className={styles.detailCard} style={{ padding: 0, overflow: 'hidden' }}>
            <div className="ratio ratio-4x3 bg-light">
              {item.images?.[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.images[0]} alt={item.title} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
              ) : (
                <div className="d-flex align-items-center justify-content-center text-secondary h-100">
                  <Package size={48} style={{ opacity: 0.1 }} />
                </div>
              )}
            </div>
          </div>

          <div className={styles.detailCard}>
            <h2 className={styles.detailCardLabel}>Description</h2>
            <p className={styles.detailNotes}>{item.description}</p>
          </div>

          <div className={styles.detailCard}>
            <h2 className={styles.detailCardLabel}>About the Poster</h2>
            <div className={styles.driverCard}>
              <div className={styles.driverAvatar}>
                {item.owner?.avatar ? (
                  <img src={item.owner.avatar} alt={ownerName} />
                ) : (
                  <span>{ownerName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className={styles.driverInfo}>
                <Link href={`/profile/${item.owner?._id}`} className={styles.driverName}>{ownerName}</Link>
                <div className={styles.driverDept}>{item.owner?.department || 'Campus Member'} • {item.owner?.year || 'Student'}</div>
              </div>
            </div>
          </div>

          {!isOwner && (
            <div className="mt-3">
              <Link 
                href={`/report-issue?targetId=${id}&targetType=Borrowing`}
                className="btn btn-outline-danger btn-sm d-inline-flex align-items-center gap-2"
                style={{ borderRadius: '10px', fontSize: '0.75rem', padding: '0.4rem 0.8rem' }}
              >
                <AlertTriangle size={13} /> Report this post
              </Link>
            </div>
          )}
        </div>

        {/* Right Column: Actions & Meta */}
        <div className={styles.detailRight}>
          <div className={styles.detailCard}>
            <span className={styles.detailTypeBadge}>{item.category || 'General'}</span>
            <h1 className={styles.detailTitle}>{item.title}</h1>
            <div className={styles.detailDeparture}>
              Posted {relativeTime(item.createdAt)}
            </div>

            <div className="border-top pt-3 mt-3">
              <h3 className={styles.detailCardLabel}>Details</h3>
              <ul className={styles.detailMetaList}>
                <li><strong>Condition:</strong> {CONDITION_LABELS[item.condition] || item.condition || 'Not specified'}</li>
                {item.requestedFrom && (
                  <li><strong>Needed From:</strong> {new Date(item.requestedFrom).toLocaleDateString()}</li>
                )}
                {item.requestedUntil && (
                  <li><strong>Needed Until:</strong> {new Date(item.requestedUntil).toLocaleDateString()}</li>
                )}
                <li><strong>Status:</strong> <span className="text-capitalize">{STATUS_LABELS[item.status] || item.status || 'Seeking Help'}</span></li>
              </ul>
            </div>
          </div>

          {/* Action Card */}
          <div className={styles.actionCard}>
            {isOwner && (
              <div className="d-grid gap-2">
                <div className="small text-muted mb-2">You posted this request</div>
                
                {item.status === 'available' || item.status === 'requested' ? (
                  <button 
                    className="btn btn-success d-flex align-items-center justify-content-center gap-2" 
                    onClick={() => handleStatusUpdate('borrowed')}
                    disabled={actionLoading}
                    style={{ borderRadius: '10px' }}
                  >
                    <CheckCircle size={18} /> Mark as Borrowed
                  </button>
                ) : item.status === 'borrowed' ? (
                  <button 
                    className="btn btn-primary d-flex align-items-center justify-content-center gap-2" 
                    onClick={() => handleStatusUpdate('returned')}
                    disabled={actionLoading}
                    style={{ borderRadius: '10px' }}
                  >
                    <CheckCircle size={18} /> Mark as Returned
                  </button>
                ) : null}

                <button 
                  className="btn btn-outline-danger d-flex align-items-center justify-content-center gap-2" 
                  onClick={handleDelete}
                  disabled={actionLoading}
                  style={{ borderRadius: '10px' }}
                >
                  <Trash2 size={16} /> Delete Post
                </button>
              </div>
            )}

            {!isOwner && user && item.status === 'available' && (
              <>
                {loadingMyRequest && <div className="small text-secondary mb-2">Checking status...</div>}

                {!loadingMyRequest && myRequest?.status === 'pending' && (
                  <div className="p-3 bg-light rounded-3 mb-3 border">
                    <div className="small fw-600 mb-2">Request Pending</div>
                    <p className="small text-muted mb-3">You offered to help. Waiting for response.</p>
                    <button 
                      className="btn btn-sm btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2" 
                      onClick={() => handleWithdraw(myRequest._id)}
                      disabled={actingRequestId === myRequest._id}
                      style={{ borderRadius: '8px' }}
                    >
                      <XCircle size={14} /> Withdraw Offer
                    </button>
                  </div>
                )}

                {!loadingMyRequest && myRequest?.status === 'approved' && !myRequest?.chatClosed && (
                  <div className="p-3 bg-success bg-opacity-10 rounded-3 mb-3 border border-success border-opacity-20">
                    <div className="small fw-600 text-success mb-2">Offer Accepted!</div>
                    <p className="small text-muted mb-3">You can now chat to coordinate the lending.</p>
                    <button
                      type="button"
                      className="btn btn-success w-100 d-flex align-items-center justify-content-center gap-2"
                      onClick={() => handleOpenChat(myRequest)}
                      disabled={actingRequestId === myRequest._id}
                      style={{ borderRadius: '8px' }}
                    >
                      <MessageCircle size={16} /> Open Chat
                    </button>
                  </div>
                )}

                {!loadingMyRequest && !myRequest && (
                  <>
                    <div className="mb-3">
                      <label htmlFor="borrow-message" className={styles.detailCardLabel}>Message to owner</label>
                      <textarea
                        id="borrow-message"
                        className="form-control"
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Hi, I can help you with this..."
                        style={{ borderRadius: '10px', fontSize: '0.85rem' }}
                      />
                    </div>
                    <button 
                      type="button" 
                      className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2" 
                      onClick={onContact} 
                      disabled={sending}
                      style={{ borderRadius: '10px', padding: '0.75rem' }}
                    >
                      {sending ? 'Sending...' : <><MessageCircle size={18} /> I Can Help</>}
                    </button>
                    <Link 
                      href={`/report-issue?targetId=${id}&targetType=Borrowing`}
                      className="mt-3 d-flex align-items-center justify-content-center gap-1 text-danger text-decoration-none small"
                      style={{ fontSize: '0.75rem', opacity: 0.8 }}
                    >
                      <AlertTriangle size={12} /> Report this request
                    </Link>
                  </>
                )}
              </>
            )}

            {!user && (
              <Link href="/login" className="btn btn-primary w-100" style={{ borderRadius: '10px' }}>
                Log in to respond
              </Link>
            )}

            {item.status !== 'available' && !isOwner && (
              <div className="p-3 bg-light rounded-3 text-center small text-muted border">
                This request is currently <strong className="text-capitalize">{item.status}</strong>.
              </div>
            )}
          </div>

          {/* Owners View: Help Offers */}
          {isOwner && requests.length > 0 && (
            <div className="mt-4">
              <h3 className={styles.detailCardLabel}>People who can help</h3>
              <div className="d-grid gap-3">
                {requests.map((request) => (
                  <div key={request._id} className={styles.detailCard}>
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <div className={styles.ownerAvatar} style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                        {request.requester?.avatar ? (
                          <img src={request.requester.avatar} alt="" />
                        ) : (
                          <span>{request.requester?.name?.charAt(0) || '?'}</span>
                        )}
                      </div>
                      <div>
                        <div className="fw-600 small">{request.requester?.name}</div>
                        <div className="text-muted" style={{ fontSize: '0.7rem' }}>{request.requester?.department}</div>
                      </div>
                    </div>
                    
                    {request.message && (
                      <div className="p-2 bg-light rounded-3 small mb-3 border-start border-3 border-primary border-opacity-50">
                        &ldquo;{request.message}&rdquo;
                      </div>
                    )}

                    <div className="d-flex gap-2 mt-2">
                      {request.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-primary flex-grow-1"
                            onClick={() => handleApprove(request._id)}
                            disabled={actingRequestId === request._id}
                            style={{ borderRadius: '8px' }}
                          >
                            Accept Help
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => handleDecline(request._id)}
                            disabled={actingRequestId === request._id}
                            style={{ borderRadius: '8px' }}
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {request.status === 'approved' && !request.chatClosed && (
                        <button
                          type="button"
                          className="btn btn-sm btn-success w-100 d-flex align-items-center justify-content-center gap-2"
                          onClick={() => handleOpenChat(request)}
                          disabled={actingRequestId === request._id}
                          style={{ borderRadius: '8px' }}
                        >
                          <MessageCircle size={14} /> Chat
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showChat && chatRequest && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
          <ChatWindow
            requestId={chatRequest._id}
            onClose={() => { setShowChat(false); setChatRequest(null); }}
          />
        </div>
      )}
    </div>
  );
}
