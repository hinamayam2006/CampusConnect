'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import useRequireAuth from '../../../lib/useRequireAuth';

const DAYS = [
  { v: 0, l: 'Sun' },
  { v: 1, l: 'Mon' },
  { v: 2, l: 'Tue' },
  { v: 3, l: 'Wed' },
  { v: 4, l: 'Thu' },
  { v: 5, l: 'Fri' },
  { v: 6, l: 'Sat' },
];

function RequiredLabel({ children }) {
  return (
    <span>
      <span className="form-required-asterisk" aria-hidden="true">*</span>
      {children}
    </span>
  );
}

export default function CreateRidePage() {
  const { isReady } = useRequireAuth();
  const router = useRouter();
  const [originName, setOriginName] = useState('');
  const [destName, setDestName] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [seatsTotal, setSeatsTotal] = useState(3);
  const [vehicleInfo, setVehicleInfo] = useState('');
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [days, setDays] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleDay = (value) => {
    setDays((currentDays) =>
      currentDays.includes(value)
        ? currentDays.filter((day) => day !== value)
        : [...currentDays, value].sort()
    );
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (!departureTime || Number.isNaN(new Date(departureTime).getTime())) {
        toast.error('Pick a valid departure date and time');
        return;
      }

      const body = {
        originName,
        destName,
        departureTime: new Date(departureTime).toISOString(),
        seatsTotal: Number(seatsTotal),
        vehicleInfo,
        notes,
        recurring: { enabled: recurring, daysOfWeek: recurring ? days : [] },
      };

      const res = await api.post('/rides', body);
      if (res.data?.success && res.data?.data?._id) {
        toast.success('Ride published');
        router.push(`/rides/${res.data.data._id}`);
      } else {
        toast.error(res.data?.message || 'Could not publish ride');
      }
    } catch (err) {
      const msg =
        err.code === 'ECONNABORTED'
          ? 'Request timed out - is the API running (port 5000) and NEXT_PUBLIC_API_URL set?'
          : err.response?.data?.message ||
            err.response?.data?.errors?.[0]?.message ||
            err.message ||
            'Could not publish ride';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isReady) {
    return <div className="container py-5 text-secondary">Loading session...</div>;
  }

  return (
    <div className="container py-4 py-md-5 form-page-shell">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">Offer a ride</h1>
        <Link href="/rides" className="btn btn-outline-secondary btn-sm">
          Cancel
        </Link>
      </div>

      <form onSubmit={onSubmit} className="bg-white p-3 p-md-4 rounded-3 shadow-sm border">
        <div className="mb-3">
          <label className="form-label">
            <RequiredLabel>Pickup label</RequiredLabel>
          </label>
          <input className="form-control" value={originName} onChange={(e) => setOriginName(e.target.value)} required />
        </div>

        <div className="mb-3">
          <label className="form-label">
            <RequiredLabel>Drop-off label</RequiredLabel>
          </label>
          <input className="form-control" value={destName} onChange={(e) => setDestName(e.target.value)} required />
        </div>

        <div className="mb-3">
          <label className="form-label">
            <RequiredLabel>Departure</RequiredLabel>
          </label>
          <input
            type="datetime-local"
            className="form-control"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            required
          />
        </div>

        <div className="row g-2 mb-3">
          <div className="col-md-6">
            <label className="form-label">
              <RequiredLabel>Seats</RequiredLabel>
            </label>
            <input
              type="number"
              min={1}
              max={8}
              className="form-control"
              value={seatsTotal}
              onChange={(e) => setSeatsTotal(e.target.value)}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Vehicle</label>
            <input
              className="form-control"
              value={vehicleInfo}
              onChange={(e) => setVehicleInfo(e.target.value)}
              placeholder="e.g. White Corolla"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Notes</label>
          <textarea className="form-control" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="form-check mb-2">
          <input
            type="checkbox"
            className="form-check-input"
            id="rec"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="rec">
            Recurring weekly pattern (for matching & discovery)
          </label>
        </div>

        {recurring && (
          <div className="d-flex flex-wrap gap-2 mb-3">
            {DAYS.map((day) => (
              <button
                key={day.v}
                type="button"
                className={`btn btn-sm ${days.includes(day.v) ? 'btn-primary' : 'btn-outline-secondary'}`}
                onClick={() => toggleDay(day.v)}
              >
                {day.l}
              </button>
            ))}
          </div>
        )}

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Publishing...' : 'Publish ride'}
        </button>
      </form>
    </div>
  );
}
