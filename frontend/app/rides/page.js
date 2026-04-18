// rides/page.js
'use client';

import Link from 'next/link';
import { Car, Search, PlusCircle, Sparkles, List, ClipboardList } from 'lucide-react';
import useStore from '../../store/useStore';

export default function RidesHubPage() {
  const { user } = useStore();

  return (
    <div className="container py-4 py-md-5">
      <div className="mc-hero">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
          <div>
            <h1 className="mb-2">Carpooling</h1>
            <p className="mb-0 text-secondary">
              Offer or discover rides, log the routes you care about, and get suggestions that follow your history.
              Recurring routes can be flagged when you post.
            </p>
          </div>
          {user && (
            <Link href="/rides/create" className="btn btn-primary d-inline-flex align-items-center gap-2">
              <PlusCircle size={20} /> Offer a ride
            </Link>
          )}
        </div>
      </div>

      <div className="mc-grid-2 mb-4">
        <Link href="/rides/browse" className="mc-tile">
          <span className="mc-badge mb-2">Discover</span>
          <h3 className="d-flex align-items-center gap-2">
            <Search size={22} /> Find a ride
          </h3>
          <p className="text-secondary small mb-0">Filter by pickup, drop-off, and departure window.</p>
        </Link>
        <Link href="/rides/matches" className="mc-tile">
          <span className="mc-badge mb-2">Smart</span>
          <h3 className="d-flex align-items-center gap-2">
            <Sparkles size={22} /> Suggested matches
          </h3>
          <p className="text-secondary small mb-0">Uses your past searches, views, and joins (signed-in).</p>
        </Link>
      </div>

      <div className="row g-3">
        <div className="col-md-4">
          <Link href="/rides/my-rides" className="mc-tile h-100">
            <h3 className="d-flex align-items-center gap-2">
              <List size={22} /> My rides
            </h3>
            <p className="text-secondary small mb-0">Driving schedule and rides you have joined.</p>
          </Link>
        </div>
        <div className="col-md-4">
          <Link href="/rides/my-requests" className="mc-tile h-100">
            <h3 className="d-flex align-items-center gap-2">
              <ClipboardList size={22} /> My requests
            </h3>
            <p className="text-secondary small mb-0">Track every ride request you have sent.</p>
          </Link>
        </div>
        <div className="col-md-4">
          <Link href="/rides/how-it-works" className="mc-tile h-100">
            <h3 className="d-flex align-items-center gap-2">
              <Car size={22} /> How it works
            </h3>
            <p className="text-secondary small mb-0">Safety, trust scores, and what happens after you join.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
