'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import useStore from '../../../store/useStore';
import ChatWindow from '../../../components/ChatWindow';
import {
  acceptChatRequest,
  approveRequest,
  createRequest,
  declineRequest,
  fetchBorrowItemById,
  getMyRequests,
  getRequestsForResource,
} from '../../../lib/apiRequests';

const CONDITION_LABELS = {
  new: 'New',
  like_new: 'Like New',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
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
    run();
    return () => { cancelled = true; };
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
    if (!id || !isOwner) { setRequests([]); return; }
    loadOwnerRequests(id);
  }, [id, isOwner]);

  useEffect(() => {
    if (!id || !user?._id || isOwner) { setMyRequest(null); return; }
    loadMyRequest(id);
  }, [id, user?._id, isOwner]);

  if (loading) return <div className="container py-5 text-secondary">Loading item...</div>;
  if (!item) return <div className="container py-5 text-secondary">Item not found.</div>;

  const ownerName = item.owner?.name || 'Campus member';

  return (
    <div className="container py-4 py-md-5">
      <Link href="/borrow" className="small">
        ← Back to Borrow
      </Link>

      <div className="row g-4 mt-2">
        {/* Images */}
        <div className="col-lg-7">
          <div className="ratio ratio-4x3 bg-light rounded-3 overflow-hidden border">
            {item.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.images[0]} alt={item.title} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
            ) : (
              <div className="d-flex align-items-center justify-content-center text-secondary">No image uploaded</div>
            )}
          </div>
          {item.images?.length > 1 && (
            <div className="d-flex flex-wrap gap-2 mt-2">
              {item.images.slice(1).map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="Borrow item" style={{ width: 86, height: 86, objectFit: 'cover', borderRadius: 8, border: '1px solid #E8E2D9' }} />
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="col-lg-5">
          <span className="badge bg-primary text-capitalize" style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
            {item.status || 'available'}
          </span>
          <h1 className="h3 mt-1 mb-2">{item.title}</h1>
          <p className="text-secondary mb-3">{item.description}</p>

          <ul className="list-unstyled small mb-3">
            {item.category && (
              <li><strong>Category:</strong> {item.category}</li>
            )}
            {item.condition && (
              <li><strong>Condition:</strong> {CONDITION_LABELS[item.condition] || item.condition}</li>
            )}
            {item.requestedFrom && (
              <li><strong>Needed from:</strong> {new Date(item.requestedFrom).toLocaleDateString()}</li>
            )}
            {item.requestedUntil && (
              <li><strong>Needed until:</strong> {new Date(item.requestedUntil).toLocaleDateString()}</li>
            )}
            {item.owner && (
              <li><strong>Posted by:</strong> {ownerName}{item.owner.department ? ` (${item.owner.department})` : ''}</li>
            )}
            <li><strong>Posted:</strong> {relativeTime(item.createdAt)}</li>
          </ul>

          {!user && (
            <Link href="/login" className="btn btn-outline-primary">
              Log in to respond
            </Link>
          )}

          {user && !isOwner && item.status === 'available' && (
            <>
              {loadingMyRequest && <div className="small text-secondary mb-2">Checking your request status...</div>}

              {!loadingMyRequest && myRequest?.status === 'pending' && (
                <div className="alert alert-info py-2 px-3 small mb-2">
                  You already sent a borrow request. Waiting for owner&apos;s response.
                </div>
              )}

              {!loadingMyRequest && myRequest?.status === 'approved' && !myRequest?.chatClosed && (
                <div className="mb-2">
                  <div className="alert alert-success py-2 px-3 small mb-2">
                    Your request is approved. You can chat with the owner.
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleOpenChat(myRequest)}
                    disabled={actingRequestId === myRequest._id}
                  >
                    {actingRequestId === myRequest._id ? 'Opening...' : 'Open Chat'}
                  </button>
                </div>
              )}

              {!loadingMyRequest && !myRequest && (
                <>
                  <div className="mb-2">
                    <label htmlFor="borrow-message" className="form-label small text-secondary">
                      Message to owner (optional)
                    </label>
                    <textarea
                      id="borrow-message"
                      className="form-control"
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Hi, I'd like to borrow this item..."
                    />
                  </div>
                  <button type="button" className="btn btn-primary" onClick={onContact} disabled={sending}>
                    {sending ? 'Sending...' : 'Request to Borrow'}
                  </button>
                </>
              )}
            </>
          )}

          {user && !isOwner && item.status !== 'available' && (
            <div className="alert alert-warning py-2 px-3 small">
              This item is currently {item.status} and not available to borrow.
            </div>
          )}

          {isOwner && <div className="text-secondary small mb-3">This is your post.</div>}

          {isOwner && (
            <div className="mt-2">
              <h2 className="h6 mb-2">Borrow Requests</h2>

              {loadingRequests && <div className="small text-secondary">Loading requests...</div>}

              {!loadingRequests && requests.length === 0 && (
                <div className="small text-secondary">No borrow requests yet.</div>
              )}

              {!loadingRequests && requests.length > 0 && (
                <div className="d-grid gap-2">
                  {requests.map((request) => (
                    <div key={request._id} className="border rounded-3 p-2">
                      <div className="small">
                        <div>
                          <strong>{request.requester?.name || 'Student'}</strong>
                          {request.requester?.department ? ` (${request.requester.department})` : ''}
                        </div>
                        <div className="text-secondary text-capitalize">Status: {request.status}</div>
                        {request.message && <div className="mt-1">Message: {request.message}</div>}
                      </div>

                      <div className="d-flex gap-2 mt-2">
                        {request.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-success"
                              onClick={() => handleApprove(request._id)}
                              disabled={actingRequestId === request._id}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDecline(request._id)}
                              disabled={actingRequestId === request._id}
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {request.status === 'approved' && !request.chatClosed && (
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={() => handleOpenChat(request)}
                            disabled={actingRequestId === request._id}
                          >
                            Open Chat
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
