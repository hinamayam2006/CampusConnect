// rides/page.js
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Car, PlusCircle, ArrowRight, Users, Clock } from 'lucide-react';
import useStore from '../../store/useStore';
import api from '../../lib/api';
import styles from './rides-pages.module.css';

export default function RidesHubPage() {
  const { user } = useStore();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/rides?limit=8&status=scheduled')
      .then((r) => {
        const items = r.data?.data?.items || r.data?.items || r.data?.data || [];
        setRides(Array.isArray(items) ? items : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.hubPage}>
      <div className="container">
        {/* Hero */}
        <div className={styles.hubHero}>
        <div>
          <h1 className={styles.hubTitle}>Carpooling</h1>
          <p className={styles.hubSubtitle}>
            Share rides, save on fuel, and connect with campus commuters.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href="/rides/browse" className={styles.btnOutline}>Find a Ride</Link>
          <Link href="/rides/matches" className={styles.btnOutline}>Matches</Link>
          <Link href="/rides/my-rides" className={styles.btnOutline}>My Rides</Link>
          <Link href="/rides/my-requests" className={styles.btnOutline}>Requests</Link>
          <Link href="/rides/how-it-works" className={styles.btnOutline}>How It Works</Link>
          {user && (
            <Link href="/rides/create" className={styles.hubBtnDark}>
              <PlusCircle size={16} /> Offer a Ride
            </Link>
          )}
        </div>
      </div>

      {/* Active Rides */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Available Rides</span>
          <Link href="/rides/browse" className={styles.sectionLink}>
            Browse all <ArrowRight size={13} />
          </Link>
        </div>

        {loading ? (
          <div className={styles.rideGrid}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonLine} style={{ width: '65%', height: 20 }} />
                <div className={styles.skeletonLine} style={{ width: '45%', height: 13, marginTop: 10 }} />
              </div>
            ))}
          </div>
        ) : rides.length === 0 ? (
          <div className={styles.hubEmptyPanel}>
            <Car size={30} style={{ opacity: 0.25, marginBottom: '0.5rem', display: 'block', margin: '0 auto 0.5rem' }} />
            <p style={{ margin: 0 }}>No rides scheduled right now. Be the first to offer one!</p>
          </div>
        ) : (
          <div className={styles.rideGrid}>
            {rides.map((ride) => (
              <Link key={ride._id} href={`/rides/${ride._id}`} className={styles.rideCard}>
                <div className={styles.rideRoute}>
                  {ride.originName || ride.origin?.name || '?'}
                  <ArrowRight size={13} style={{ flexShrink: 0 }} />
                  {ride.destName || ride.destination?.name || '?'}
                </div>
                <div className={styles.rideMeta}>
                  <span className={styles.rideMetaItem}>
                    <Clock size={12} />
                    {new Date(ride.departureTime).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                  <span className={styles.rideMetaItem}>
                    <Users size={12} />
                    <span className={styles.seatsBadge}>
                      {ride.seatsAvailable ?? ride.availableSeats ?? '?'} seats
                    </span>
                  </span>
                </div>
                {ride.driver?.name && (
                  <div className={styles.rideDriver}>by {ride.driver.name}</div>
                )}
                <div className={styles.rideDriver} style={{ fontSize: '0.72rem' }}>
                  Plate: {ride.licensePlateNumber || 'N/A'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>


      </div>
    </div>
  );
}
