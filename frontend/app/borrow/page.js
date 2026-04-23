'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { createRequest, fetchBorrowItems } from '../../lib/apiRequests';

export default function BorrowPage() {
  const { user } = useStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
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
      toast.success('Borrow request sent. Owner will be notified by app and email.');
      setMessageByItemId((prev) => ({ ...prev, [itemId]: '' }));
      setOpenComposerId('');
    } catch (err) {
      toast.error(err?.message || 'Could not send borrow request');
    } finally {
      setRequestingForId('');
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetchBorrowItems({ status: 'available' });
        if (!cancelled) setItems(res?.data?.items || []);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load borrow items');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      [item.title, item.description, item.category].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="container py-4 py-md-5">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-3">
        <div>
          <h1 className="mb-1">Borrow Requests</h1>
          <p className="text-secondary mb-0">Post what you need to borrow, or respond if you can help.</p>
        </div>
        {user && (
          <Link href="/borrow/create" className="btn btn-primary d-inline-flex align-items-center gap-2">
            <PlusCircle size={18} /> Post request
          </Link>
        )}
      </div>

      <div className="mb-3">
        <input
          className="form-control"
          placeholder="Search requests by item, category, or details"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <div className="text-secondary">Loading borrow requests...</div>}
      {!loading && error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-secondary">No borrow requests found.</div>
      )}

      <div className="row g-3">
        {filtered.map((item) => (
          <div className="col-12 col-md-6 col-lg-4" key={item._id}>
            <div className="card h-100 shadow-sm border-0">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h5 className="card-title mb-0">{item.title}</h5>
                  <span className="badge bg-light text-dark text-capitalize">
                    {item.status === 'available' ? 'open request' : item.status}
                  </span>
                </div>
                <div className="small text-secondary mb-2 text-capitalize">{item.category || 'general'}</div>
                <p className="card-text text-secondary mb-0">{item.description}</p>

                {item.owner && (
                  <div className="small mt-2 text-secondary">
                    <strong>Owner:</strong> {item.owner.name}
                  </div>
                )}

                {user && String(user._id) !== String(item.owner?._id) && (
                  <div className="mt-3">
                    {openComposerId === item._id ? (
                      <>
                        <textarea
                          className="form-control form-control-sm mb-2"
                          rows={2}
                          placeholder="Write a short message (optional)"
                          value={messageByItemId[item._id] || ''}
                          onChange={(e) =>
                            setMessageByItemId((prev) => ({
                              ...prev,
                              [item._id]: e.target.value,
                            }))
                          }
                        />
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={requestingForId === item._id}
                            onClick={() => onSendRequest(item._id)}
                          >
                            {requestingForId === item._id ? 'Sending...' : 'I can help'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => setOpenComposerId('')}
                            disabled={requestingForId === item._id}
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => setOpenComposerId(item._id)}
                      >
                        Respond to Request
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
