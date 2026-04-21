// rides/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { createRequest } from '../../../lib/apiRequests';
import useStore from '../../../store/useStore';

export default function RideDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useStore();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [seatsRequested, setSeatsRequested] = useState(1);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/rides/${id}`);
        if (!cancelled && res.data.success) setRide(res.data.data);
      } catch {
        if (!cancelled) setRide(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const join = async () => {
    if (!user) {
      toast.error('Log in to request this ride');
      router.push('/login');
      return;
    }
    if (!ride) {
      toast.error('Ride not loaded yet');
      return;
    }
    try {
      setRequesting(true);
      await createRequest('Ride', id, seatsRequested, message.trim());
      toast.success('Ride request sent to the driver');
      setMessage('');
    } catch (err) {
      toast.error(err.response?.message || err.message || 'Could not request this ride');
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return <div className="container py-5">Loading…</div>;
  if (!ride) return <div className="container py-5">Ride not found.</div>;

  const driver = ride.driver;
  const isDriver = user && String(user._id) === String(driver?._id || driver);
  const already = user && ride.passengers?.some((p) => String(p.user?._id || p.user) === String(user._id));
  const mapSrc = `https://maps.google.com/maps?saddr=${encodeURIComponent(ride.originName)}&daddr=${encodeURIComponent(
    ride.destName
  )}&output=embed`;

  return (
    <div className="container py-4 py-md-5">
      <Link href="/rides/browse" className="small">
        ← Back to browse
      </Link>

      <div className="row g-4 mt-2">
        <div className="col-lg-6">
          <span className="mc-badge">{ride.recurring?.enabled ? 'Recurring route' : 'One-time'}</span>
          <h1 className="h2 mt-2">
            {ride.originName} → {ride.destName}
          </h1>
          <p className="text-secondary mb-2">{new Date(ride.departureTime).toLocaleString()}</p>
          <ul className="list-unstyled small">
            <li>
              <strong>Seats left:</strong> {ride.seatsAvailable}
            </li>
            <li>
              <strong>Vehicle:</strong> {ride.vehicleInfo || '—'}
            </li>
            {ride.notes && (
              <li>
                <strong>Notes:</strong> {ride.notes}
              </li>
            )}
            {ride.recurring?.enabled && ride.recurring.daysOfWeek?.length > 0 && (
              <li>
                <strong>Weekly:</strong> {ride.recurring.daysOfWeek.join(', ')}
              </li>
            )}
          </ul>

          {driver && (
            <div className="border rounded-3 p-3 mb-3">
              <div className="small text-secondary">Driver</div>
              <Link href={`/profile/${driver._id}`} className="fw-semibold">
                {driver.name}
              </Link>
              <div className="small">
                {driver.department}
              </div>
            </div>
          )}

          {!isDriver && ride.status === 'scheduled' && !already && ride.seatsAvailable > 0 && (
            <>
              {ride.hasRequested ? (
                <div className="alert alert-info py-2 px-3 mb-0 small">
                  Your request was forwarded.
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <label htmlFor="seatCount" className="form-label small text-secondary">
                      Seats requested
                    </label>
                    <input
                      id="seatCount"
                      type="number"
                      min={1}
                      max={ride.seatsAvailable}
                      value={seatsRequested}
                      onChange={(e) => setSeatsRequested(Math.max(1, Math.min(ride.seatsAvailable, Number(e.target.value || 1))))}
                      className="form-control form-control-sm"
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="rideMessage" className="form-label small text-secondary">
                      Message for the driver (optional)
                    </label>
                    <textarea
                      id="rideMessage"
                      rows={3}
                      className="form-control"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Hi, I would love to join your trip."
                    />
                  </div>
                  <button type="button" className="btn btn-primary" onClick={join} disabled={requesting}>
                    {requesting ? 'Requesting…' : 'Request ride approval'}
                  </button>
                </>
              )}
            </>
          )}
          {already && <p className="text-success small mb-0">You are confirmed on this ride.</p>}
          {isDriver && <p className="text-secondary small mb-0">You are hosting this trip.</p>}
        </div>
        <div className="col-lg-6">
          <h2 className="h5">Route preview</h2>
          <p className="small text-secondary">Powered by Google Maps embed (no API key required for basic directions).</p>
          <div className="mc-map-wrap">
            <iframe title="Route map" src={mapSrc} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </div>
      </div>
    </div>
  );
}
