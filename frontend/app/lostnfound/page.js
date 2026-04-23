'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import useStore from '../../store/useStore';
import { fetchLostnFoundItems } from '../../lib/apiRequests';

export default function LostnFoundPage() {
  const { user } = useStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

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
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h5 className="card-title mb-0">{item.title}</h5>
                  <span className={`badge ${item.postType === 'lost' ? 'bg-warning text-dark' : 'bg-success'}`}>
                    {item.postType}
                  </span>
                </div>
                <div className="small text-secondary mb-2">{item.location || 'Location not specified'}</div>
                <p className="card-text text-secondary mb-0">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
