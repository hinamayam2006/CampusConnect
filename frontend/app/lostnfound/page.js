'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { createRequest, fetchLostnFoundItems } from '../../lib/apiRequests';

export default function LostnFoundPage() {
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
      toast.error('Log in to contact the poster');
      return;
    }

    try {
      setRequestingForId(itemId);
      await createRequest('LostnFound', itemId, 1, String(messageByItemId[itemId] || '').trim());
      toast.success('Contact request sent. Poster will be notified by app and email.');
      setMessageByItemId((prev) => ({ ...prev, [itemId]: '' }));
      setOpenComposerId('');
    } catch (err) {
      toast.error(err?.message || 'Could not send request');
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
        const res = await fetchLostnFoundItems({ status: 'open' });
        if (!cancelled) setItems(res?.data?.items || []);
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load lost and found posts');
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
      [item.title, item.description, item.location, item.category].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="container py-4 py-md-5">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-3">
        <div>
          <h1 className="mb-1 text-capitalize">Lost &amp; Found Board</h1>
          <p className="text-secondary mb-0">Post and discover lost/found items around campus.</p>
        </div>
        {user && (
          <Link href="/lostnfound/create" className="btn btn-primary d-inline-flex align-items-center gap-2">
            <PlusCircle size={18} /> New post
          </Link>
        )}
      </div>

      <div className="mb-3">
        <input
          className="form-control"
          placeholder="Search by title, location, category, or details"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <div className="text-secondary">Loading posts...</div>}
      {!loading && error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-secondary">No lost and found posts found.</div>
      )}

      <div className="row g-3">
        {filtered.map((item) => (
          <div className="col-12 col-md-6 col-lg-4" key={item._id}>
            <div className="card h-100 shadow-sm border-0">
              <Link href={`/lostnfound/${item._id}`} className="text-decoration-none">
                <div className="ratio ratio-16x9 bg-light border-bottom rounded-top overflow-hidden">
                  {item.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.images[0]} alt={item.title} className="object-fit-cover" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div className="d-flex align-items-center justify-content-center text-secondary small">No image</div>
                  )}
                </div>
              </Link>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h5 className="card-title mb-0">
                    <Link href={`/lostnfound/${item._id}`} className="text-decoration-none text-dark">
                      {item.title}
                    </Link>
                  </h5>
                  <span className={`badge ${item.postType === 'lost' ? 'bg-warning text-dark' : 'bg-success'}`}>
                    {item.postType}
                  </span>
                </div>
                <div className="small text-secondary mb-2">{item.location || 'Location not specified'}</div>
                <p className="card-text text-secondary mb-0">{item.description}</p>

                {item.contactInfo && (
                  <div className="small mt-2 text-secondary">
                    <strong>Preferred contact:</strong> {item.contactInfo}
                  </div>
                )}

                <div className="mt-2">
                  <Link href={`/lostnfound/${item._id}`} className="small text-decoration-none">
                    View details
                  </Link>
                </div>

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
                            {requestingForId === item._id ? 'Sending...' : 'Send Contact Request'}
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
                        Contact Poster
                      </button>
                    )}
                  </div>
                )}

                {!user && (
                  <div className="mt-3">
                    <Link href="/login" className="btn btn-outline-primary btn-sm">
                      Log in to contact
                    </Link>
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
