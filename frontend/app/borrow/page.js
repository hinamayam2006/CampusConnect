'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import useStore from '../../store/useStore';
import { fetchBorrowItems } from '../../lib/apiRequests';

export default function BorrowPage() {
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
          <h1 className="mb-1">Borrow &amp; Return</h1>
          <p className="text-secondary mb-0">Find items available to borrow from students.</p>
        </div>
        {user && (
          <Link href="/borrow/create" className="btn btn-primary d-inline-flex align-items-center gap-2">
            <PlusCircle size={18} /> List an item
          </Link>
        )}
      </div>

      <div className="mb-3">
        <input
          className="form-control"
          placeholder="Search by title, category, or description"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <div className="text-secondary">Loading borrow items...</div>}
      {!loading && error && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-secondary">No borrow items found.</div>
      )}

      <div className="row g-3">
        {filtered.map((item) => (
          <div className="col-12 col-md-6 col-lg-4" key={item._id}>
            <div className="card h-100 shadow-sm border-0">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h5 className="card-title mb-0">{item.title}</h5>
                  <span className="badge bg-light text-dark text-capitalize">{item.status}</span>
                </div>
                <div className="small text-secondary mb-2 text-capitalize">{item.category || 'general'}</div>
                <p className="card-text text-secondary mb-0">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
