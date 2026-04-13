'use client';

import Link from 'next/link';

export default function RidesHowItWorksPage() {
  return (
    <div className="container py-4 py-md-5" style={{ maxWidth: 720 }}>
      <Link href="/rides" className="small">
        ← Rides hub
      </Link>
      <h1 className="mt-3 mb-3">How carpooling works</h1>
      <ol className="text-secondary">
        <li className="mb-2">Post a ride with honest pickup and drop-off labels — these power map previews and matching.</li>
        <li className="mb-2">Turn on recurring days if it is a weekly campus commute; peers in your department may get a heads-up.</li>
        <li className="mb-2">When someone joins, both sides get notifications and the activity appears on the dashboard.</li>
        <li className="mb-2">Trust scores update when users rate each other after a deal or ride — same system as marketplace.</li>
      </ol>
    </div>
  );
}
