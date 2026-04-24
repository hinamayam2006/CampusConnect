'use client';

import Link from 'next/link';
import RideManagement from '../../../components/RideManagement';
import useRequireAuth from '../../../lib/useRequireAuth';

export default function MyRidesPage() {
  const { isReady } = useRequireAuth();

  if (!isReady) {
    return (
      <div style={{ background: '#F2EDE4', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9E9E9E', fontSize: '0.88rem' }}>
        Loading your rides…
      </div>
    );
  }

  return (
    <div style={{ background: '#F2EDE4', minHeight: '100vh', padding: '2rem 2rem 4rem', maxWidth: 860, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', fontWeight: 700, color: '#1A1A1A', margin: '0 0 0.25rem' }}>
            My Rides
          </h1>
          <p style={{ margin: 0, color: '#888', fontSize: '0.83rem' }}>
            Trips you host and rides you have joined.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link
            href="/rides"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', color: '#1A1A1A', border: '1px solid #D4CCBF', borderRadius: 7, padding: '0.35rem 0.85rem', fontSize: '0.78rem', fontWeight: 500, textDecoration: 'none' }}
          >
            ← Carpooling
          </Link>
          <Link
            href="/rides/create"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#1A1A1A', color: '#F2EDE4', border: 'none', borderRadius: 7, padding: '0.35rem 0.85rem', fontSize: '0.78rem', fontWeight: 600, textDecoration: 'none' }}
          >
            + Offer a ride
          </Link>
        </div>
      </div>

      <RideManagement showHeader={false} />
    </div>
  );
}
