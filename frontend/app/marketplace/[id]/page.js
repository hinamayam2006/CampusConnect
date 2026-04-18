//marketplace/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { createRequest } from '../../../lib/apiRequests';
import useStore from '../../../store/useStore';

function formatPrice(listing) {
  if (listing.listingType === 'exchange') return 'Exchange';
  if (listing.price == null) return '—';
  const p = `Rs ${listing.price}`;
  return listing.listingType === 'rent' ? `Rent ${p}` : p;
}

export default function ListingDetailPage() {
  const { id } = useParams();
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
      <Link href={listing.category === 'textbook' ? '/marketplace/textbooks' : '/marketplace/general'} className="small">
        ← Back to browse
      </Link>

      <div className="row g-4 mt-2">
        <div className="col-lg-7">
          <div className="ratio ratio-4x3 bg-light rounded-3 overflow-hidden border">
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
          <span className="mc-badge">{listing.category}</span>
          <h1 className="h2 mt-2">{listing.title}</h1>
          <p className="mc-price">{formatPrice(listing)}</p>
          <p className="text-secondary">{listing.description}</p>
          <ul className="list-unstyled small">
            <li>
              <strong>Department:</strong> {listing.department}
            </li>
            {listing.category === 'textbook' && (
              <>
                <li>
                  <strong>Course:</strong> {listing.courseCode || '—'}
                </li>
                <li>
                  <strong>Semester:</strong> {listing.semester ?? '—'}
                </li>
              </>
            )}
            <li>
              <strong>Type:</strong> {listing.listingType}
            </li>
            {listing.condition && (
              <li>
                <strong>Condition:</strong> {listing.condition}
              </li>
            )}
          </ul>

          {seller && (
            <div className="border rounded-3 p-3 mb-3">
              <div className="small text-secondary">Seller</div>
              <Link href={`/profile/${seller._id}`} className="fw-semibold">
                {seller.name}
              </Link>
              <div className="small">
                Trust {seller.trustScore ?? '—'} · {seller.department}
              </div>
            </div>
          )}

          {!isOwner && listing.status === 'active' && (
            <>
              {listing.hasRequested ? (
                <div className="alert alert-info py-2 px-3 mb-0 small">
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
                    className="btn btn-primary mc-btn-interest"
                    onClick={interest}
                    disabled={requesting}
                  >
                    {requesting ? 'Sending request…' : 'Request this listing'}
                  </button>
                </>
              )}
            </>
          )}
          {isOwner && (
            <p className="text-secondary small mb-0">This is your listing. Manage it from “My listings”.</p>
          )}
        </div>
      </div>
    </div>
  );
}
