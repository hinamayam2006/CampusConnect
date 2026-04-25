//marketplace/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { createRequest } from '../../../lib/apiRequests';
import useStore from '../../../store/useStore';
import styles from '../../shared/marketplace-rides.module.css';

function formatPrice(listing) {
  if (listing.listingType === 'exchange') return 'Exchange';
  if (listing.price == null) return '—';
  const p = `Rs ${listing.price}`;
  return listing.listingType === 'rent' ? `Rent ${p}` : p;
}

export default function ListingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useStore();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/marketplace/listings/${id}`);
        if (!cancelled && res.data.success) setListing(res.data.data);
      } catch {
        if (!cancelled) setListing(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const interest = async () => {
    if (!user) {
      toast.error('Log in to show interest');
      return;
    }
    if (!listing) {
      toast.error('Listing not loaded');
      return;
    }

    try {
      setRequesting(true);
      await createRequest('Listing', id, 1, message.trim());
      toast.success('Your request has been sent to the seller');
      setMessage('');
    } catch (err) {
      toast.error(err.response?.message || err.message || 'Could not send request');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return <div className="container py-5">Loading…</div>;
  if (!listing) return <div className="container py-5">Listing not found.</div>;

  const seller = listing.seller;
  const isOwner = user && String(user._id) === String(seller?._id || seller);

  return (
    <div className="container py-4 py-md-5">
      <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
        <button
          type="button"
          className="btn btn-link p-0 text-decoration-none small"
          onClick={() => {
            if (window.history.length > 1) {
              router.back();
              return;
            }
            router.push(listing.category === 'textbook' ? '/marketplace/textbooks' : '/marketplace/general');
          }}
        >
          ← Back
        </button>
        <Link href="/marketplace" className="btn btn-outline-secondary btn-sm">
          Marketplace hub
        </Link>
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="ratio ratio-4x3 bg-light rounded-4 overflow-hidden border shadow-sm">
            {listing.images?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={listing.images[0]} alt="" className="object-fit-cover" style={{ objectFit: 'cover' }} />
            ) : (
              <div className="d-flex align-items-center justify-content-center text-secondary">No photo</div>
            )}
          </div>
          {listing.images?.length > 1 && (
            <div className="d-flex gap-2 mt-2 flex-wrap">
              {listing.images.slice(1).map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
              ))}
            </div>
          )}
        </div>
        <div className="col-lg-5">
          <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
            <span className={styles['mc-badge']}>{listing.category}</span>
            <span className="badge text-bg-light border text-secondary text-uppercase">{listing.listingType}</span>
          </div>
          <h1 className="display-6 fw-semibold mb-2">{listing.title}</h1>
          <p className={`${styles['mc-price']} mb-3`}>{formatPrice(listing)}</p>
          <div className="card border-0 shadow-sm rounded-4 mb-3">
            <div className="card-body p-3 p-lg-4">
              <p className="text-secondary mb-2">{listing.description}</p>
              <div className="d-grid gap-2 small">
                <div><strong>Department:</strong> {listing.department}</div>
                {listing.category === 'textbook' && (
                  <>
                    <div><strong>Course:</strong> {listing.courseCode || '—'}</div>
                    <div><strong>Semester:</strong> {listing.semester ?? '—'}</div>
                  </>
                )}
                <div><strong>Condition:</strong> {listing.condition || '—'}</div>
              </div>
            </div>
          </div>

          {seller && (
            <div className="card border-0 shadow-sm rounded-4 mb-3">
              <div className="card-body p-3 p-lg-4">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className="rounded-circle bg-light border d-flex align-items-center justify-content-center fw-semibold" style={{ width: 48, height: 48 }}>
                    {(seller.name || 'S').slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="small text-secondary">Seller</div>
                    <Link href={`/profile/${seller._id}`} className="fw-semibold text-decoration-none">
                      {seller.name}
                    </Link>
                    <div className="small text-secondary">{seller.department}</div>
                  </div>
                </div>
                {!isOwner && (
                  <Link 
                    href={`/report-issue?targetId=${id}&targetType=Listing`}
                    className="btn btn-outline-danger btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
                    style={{ borderRadius: '8px' }}
                  >
                    <AlertTriangle size={14} /> Report Listing
                  </Link>
                )}
              </div>
            </div>
          )}

          {!isOwner && listing.status === 'active' && (
            <div className="card border-0 shadow-sm rounded-4 mb-3">
              <div className="card-body p-3 p-lg-4">
              {listing.hasRequested ? (
                <div className="alert alert-info py-2 px-3 mb-0 small rounded-3">
                  Your request was processed.
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <label htmlFor="listingMessage" className="form-label small text-secondary">
                      Add a quick note for the seller (optional)
                    </label>
                    <textarea
                      id="listingMessage"
                      className="form-control"
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Hi, I am interested in buying this item."
                    />
                  </div>
                  <button
                  type="button"
                  className="btn btn-primary w-100 py-2"
                  onClick={interest}
                  disabled={requesting}
                  style={{ borderRadius: '10px', fontWeight: '600' }}
                >
                  {requesting ? 'Sending...' : 'I want to buy this'}
                </button>
                <Link 
                  href={`/report-issue?targetId=${id}&targetType=Listing`}
                  className="mt-3 d-flex align-items-center justify-content-center gap-1 text-danger text-decoration-none small"
                  style={{ fontSize: '0.75rem', opacity: 0.8 }}
                >
                  <AlertTriangle size={12} /> Report this listing
                </Link>
              </>
              )}
              </div>
            </div>
          )}
          {isOwner && (
            <div className="alert alert-secondary small rounded-3 mb-0">
              This is your listing. Manage it from <Link href="/marketplace/my-listings">My listings</Link>.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
