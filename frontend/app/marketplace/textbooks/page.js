'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '../../../lib/api';
import { DEPARTMENTS } from '../../../lib/campusConstants';
import useStore from '../../../store/useStore';

function formatPrice(listing) {
  if (listing.listingType === 'exchange') return 'Exchange';
  if (listing.price == null || listing.price === '') return '—';
  const p = `Rs ${listing.price}`;
  return listing.listingType === 'rent' ? `Rent ${p}` : p;
}

export default function TextbooksMarketplacePage() {
  const { accessToken } = useStore();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [listingType, setListingType] = useState('');

  const fetchList = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ category: 'textbook' });
      if (search) params.set('search', search);
      if (department) params.set('department', department);
      if (semester) params.set('semester', semester);
      if (courseCode) params.set('courseCode', courseCode);
      if (listingType) params.set('listingType', listingType);
      const res = await api.get(`/marketplace/listings?${params}`);
      if (res.data.success) setItems(res.data.data.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    await fetchList();
    if (accessToken) {
      try {
        await api.post('/marketplace/search-log', {
          search,
          category: 'textbook',
          department: department || undefined,
          semester: semester ? Number(semester) : undefined,
        });
      } catch {
        /* optional */
      }
    }
  };

  return (
    <div className="container py-4 py-md-5">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h1 className="mb-1">Textbooks &amp; study material</h1>
          <p className="text-secondary mb-0">Narrow down by course code, semester, and department.</p>
        </div>
        <Link href="/marketplace" className="btn btn-outline-secondary btn-sm">
          Hub
        </Link>
      </div>

      <form className="mc-filters" onSubmit={onSubmit}>
        <div className="row g-2 align-items-end">
          <div className="col-md-3">
            <label className="form-label small">Search</label>
            <input
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title, notes, author…"
            />
          </div>
          <div className="col-md-2">
            <label className="form-label small">Course code</label>
            <input
              className="form-control text-uppercase"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              placeholder="CS343"
            />
          </div>
          <div className="col-md-2">
            <label className="form-label small">Semester</label>
            <select className="form-select" value={semester} onChange={(e) => setSemester(e.target.value)}>
              <option value="">Any</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label small">Department</label>
            <select className="form-select" value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">Any</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label small">Type</label>
            <select className="form-select" value={listingType} onChange={(e) => setListingType(e.target.value)}>
              <option value="">Any</option>
              <option value="sale">Sale</option>
              <option value="rent">Rent</option>
              <option value="exchange">Exchange</option>
            </select>
          </div>
          <div className="col-md-1">
            <button type="submit" className="btn btn-primary w-100">
              Go
            </button>
          </div>
        </div>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="row g-3">
          {items.map((item) => {
            const img = item.images?.[0];
            return (
              <div key={item._id} className="col-6 col-lg-3">
                <Link href={`/marketplace/${item._id}`} className="text-decoration-none text-reset">
                  <div className="mc-listing-card">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" />
                    ) : (
                      <div className="mc-img-ph" />
                    )}
                    <div className="mc-card-body">
                      <span className="mc-badge">{item.courseCode || 'Course'}</span>
                      <h3 className="h6 mt-1 mb-1">{item.title}</h3>
                      <p className="small text-secondary mb-1">
                        {item.department}
                        {item.semester ? ` · Sem ${item.semester}` : ''}
                      </p>
                      <p className="mc-price mb-0">{formatPrice(item)}</p>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
      {!loading && items.length === 0 && <p className="text-secondary">No textbooks match these filters.</p>}
    </div>
  );
}
