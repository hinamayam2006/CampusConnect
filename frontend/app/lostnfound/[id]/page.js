'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../../../store/useStore';
import ChatWindow from '../../../components/ChatWindow';
import {
  acceptChatRequest,
  approveRequest,
  createRequest,
  declineRequest,
  fetchLostnFoundItemById,
  getMyRequests,
  getRequestsForResource,
  updateLostnFoundItem,
  deleteLostnFoundItem,
} from '../../../lib/apiRequests';
import { useRouter } from 'next/navigation';
import { CheckCircle, Trash2, ChevronLeft } from 'lucide-react';

export default function LostnFoundDetailPage() {
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

  const handleResolve = async () => {
    if (!window.confirm('Mark this item as resolved? It will be hidden from the public hub.')) return;
    setActionLoading(true);
    try {
      await updateLostnFoundItem(id, { status: 'resolved' });
      toast.success('Item marked as resolved. Redirecting to hub...');
      router.push('/lostnfound');
      router.refresh();
    } catch (err) {
      toast.error(err?.message || 'Could not update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post? This cannot be undone.')) return;
    setActionLoading(true);
    try {
      await deleteLostnFoundItem(id);
      toast.success('Post deleted');
      router.push('/lostnfound');
    } catch (err) {
      toast.error(err?.message || 'Could not delete post');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const res = await fetchLostnFoundItemById(id);
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
    if (!user?._id) {
      toast.error('Log in to contact the poster');
      return;
    }

    try {
      setSending(true);
      await createRequest('LostnFound', id, 1, message.trim());
      toast.success('Contact request sent. Poster will get in-app and email notification.');
      setMessage('');
      await loadMyRequest(id);
    } catch (err) {
      toast.error(err?.message || 'Could not send contact request');
    } finally {
      setSending(false);
    }
  };

  const loadMyRequest = async (itemId) => {
    if (!itemId || !user?._id) {
      setMyRequest(null);
      return;
    }

    setLoadingMyRequest(true);
    try {
      const res = await getMyRequests('requester', null, 'lostnfound');
      const all = res?.data || [];
      const existing = all.find(
        (request) =>
          request.refModel === 'LostnFound' &&
          String(request.refId?._id || request.refId) === String(itemId) &&
          ['pending', 'approved'].includes(request.status)
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
      const res = await getRequestsForResource('LostnFound', itemId);
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
  const isAdmin = user?.role === 'admin';
  const canManagePost = isOwner || isAdmin;

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

  if (loading) return <div className="container py-5 text-secondary">Loading post...</div>;
  if (!item) return <div className="container py-5 text-secondary">Post not found.</div>;

  return (
    <div className="container py-4 py-md-5">
      <Link href="/lostnfound" className="small">
        ← Back to Lost &amp; Found
      </Link>

      <div className="row g-4 mt-2">
        <div className="col-lg-7">
          <div className="ratio ratio-4x3 bg-light rounded-3 overflow-hidden border">
            {item.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.images[0]} alt={item.title} className="object-fit-cover" style={{ objectFit: 'cover' }} />
            ) : (
              <div className="d-flex align-items-center justify-content-center text-secondary">No image uploaded</div>
            )}
          </div>
          {item.images?.length > 1 && (
            <div className="d-flex flex-wrap gap-2 mt-2">
              {item.images.slice(1).map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="Lost and found" style={{ width: 86, height: 86, objectFit: 'cover', borderRadius: 8 }} />
              ))}
            </div>
          )}
        </div>

        <div className="col-lg-5">
          <span className={`badge ${item.postType === 'lost' ? 'bg-warning text-dark' : 'bg-success'} text-capitalize`}>
            {item.postType}
          </span>
          <h1 className="h3 mt-2">{item.title}</h1>
          <p className="text-secondary mb-2">{item.description}</p>

          <ul className="list-unstyled small mb-3">
            <li>
              <strong>Category:</strong> {item.category || 'other'}
            </li>
            <li>
              <strong>Location:</strong> {item.location || 'Not specified'}
            </li>
            {item.owner && (
              <li>
                <strong>Posted by:</strong> {item.owner.name}
              </li>
            )}
            {item.contactInfo && (
              <li>
                <strong>Preferred contact:</strong> {item.contactInfo}
              </li>
            )}
            {!isOwner && (
              <li style={{ marginTop: '0.75rem' }}>
                <Link 
                  href={`/report-issue?targetId=${id}&targetType=LostnFound`}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '0.4rem', 
                    fontSize: '0.72rem', 
                    color: '#DC2626', 
                    textDecoration: 'none', 
                    padding: '0.4rem', 
                    border: '1px solid #FECACA', 
                    borderRadius: '6px',
                    background: '#FEF2F2'
                  }}
                >
                  <AlertTriangle size={11} /> Report this post
                </Link>
              </li>
            )}
          </ul>

          {!user && (
            <Link href="/login" className="btn btn-outline-primary">
              Log in to contact poster
            </Link>
          )}

          {user && !isOwner && (
            <>
              {loadingMyRequest && <div className="small text-secondary mb-2">Checking your request status...</div>}

              {!loadingMyRequest && myRequest?.status === 'pending' && (
                <div className="alert alert-info py-2 px-3 small mb-2">
                  You already sent a request for this post. Waiting for poster response.
                </div>
              )}

              {!loadingMyRequest && myRequest?.status === 'approved' && !myRequest?.chatClosed && (
                <div className="mb-2">
                  <div className="alert alert-success py-2 px-3 small mb-2">
                    Your request is approved. You can continue in chat from this page.
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
                    <label htmlFor="lf-message" className="form-label small text-secondary">
                      Message to poster (optional)
                    </label>
                    <textarea
                      id="lf-message"
                      className="form-control"
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Hi, I think this might be my item..."
                    />
                  </div>
                  <button type="button" className="btn btn-primary" onClick={onContact} disabled={sending}>
                    {sending ? 'Sending...' : 'Contact Poster'}
                  </button>
                </>
              )}
            </>
          )}

          {canManagePost && (
            <div className="d-grid gap-2 mt-3">
              <button 
                className="btn btn-success d-flex align-items-center justify-content-center gap-2" 
                onClick={handleResolve}
                disabled={actionLoading}
                style={{ borderRadius: '10px' }}
              >
                <CheckCircle size={18} /> Mark as Resolved
              </button>
              {isOwner && (
                <button
                  className="btn btn-outline-danger d-flex align-items-center justify-content-center gap-2"
                  onClick={handleDelete}
                  disabled={actionLoading}
                  style={{ borderRadius: '10px' }}
                >
                  <Trash2 size={16} /> Delete Post
                </button>
              )}
              <div className="text-center text-secondary small mt-1">
                This post can be managed by {isOwner ? 'you' : 'an admin'}. Resolved items are hidden from the hub.
              </div>
            </div>
          )}

          {isOwner && (
            <div className="mt-4">
              <h2 className="h6 mb-2">Contact Requests</h2>

              {loadingRequests && <div className="small text-secondary">Loading requests...</div>}

              {!loadingRequests && requests.length === 0 && (
                <div className="small text-secondary">No contact requests yet.</div>
              )}

              {!loadingRequests && requests.length > 0 && (
                <div className="d-grid gap-2">
                  {requests.map((request) => (
                    <div key={request._id} className="border rounded-3 p-2">
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div className="small">
                          <div>
                            <strong>{request.requester?.name || 'Student'}</strong>
                            {request.requester?.department ? ` (${request.requester.department})` : ''}
                          </div>
                          <div className="text-secondary text-capitalize">Status: {request.status}</div>
                          {request.message && <div className="mt-1">Message: {request.message}</div>}
                        </div>
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
        <ChatWindow request={chatRequest} isOpen={showChat} onClose={() => setShowChat(false)} />
      )}
    </div>
  );
}
