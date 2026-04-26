// rides/browse/page.js
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search, PlusCircle, Car, MapPin, Clock,
  Users, ArrowRight, CalendarDays, RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import useStore from '../../../store/useStore';
import styles from '../../community.module.css';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}
function formatDeparture(dateStr) {
  if (!dateStr) return 'TBD';
  return new Date(dateStr).toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' });
}
function formatTime(dateStr) {
  if (!dateStr) return 'TBD';
  return new Date(dateStr).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function seatsBadgeClass(seats, s) {
  if (seats >= 3) return s.seatsBadgeGreen;
  if (seats >= 1) return s.seatsBadgeAmber;
  return s.seatsBadgeRed;
}

function SkeletonRides() {
  return (
    <div className={styles.gridWide}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={styles.rideSkeleton}>
          <div className={styles.skeletonRouteWrap}>
            <div className={styles.skeletonLine} style={{ width: '20%' }} />
            <div className={styles.skeletonLine} style={{ width: '70%', height: '22px' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div className={styles.skeletonLine} style={{ width: '45%' }} />
            <div className={styles.skeletonLine} style={{ width: '45%' }} />
          </div>
          <div className={styles.skeletonLine} style={{ width: '55%' }} />
          <div className={styles.skeletonLine} style={{ width: '100%', height: '40px' }} />
        </div>
      ))}
    </div>
  );
}

export default function RidesBrowsePage() {
  const { user, accessToken } = useStore();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [originName, setOriginName] = useState('');
  const [destName, setDestName] = useState('');

  const fetchRides = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (originName.trim()) params.set('originName', originName.trim());
      if (destName.trim()) params.set('destName', destName.trim());
      const res = await api.get('/rides?' + params);
      if (res.data.success) setRides(res.data.data || []);
    } catch (err) {
      setRides([]);
      toast.error(err.response?.status === 429 ? 'Too many requests. Wait a moment.' : 'Could not load rides.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRides(); }, []); // eslint-disable-line

  const onSubmit = async (e) => {
    e.preventDefault();
    await fetchRides();
    if (accessToken) {
      try { await api.post('/rides/search-log', { originName, destName }); } catch { /* ok */ }
    }
  };

  const onReset = () => { setOriginName(''); setDestName(''); fetchRides(); };

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>Carpool Rides</h1>
            <p className={styles.pageSubtitle}>Find a ride or offer one — community-powered carpooling.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <Link href="/rides" className={styles.btnOutline}>Rides Hub</Link>
            <Link href="/rides/my-rides" className={styles.btnOutline}>My Rides</Link>
            {user && (
              <Link href="/rides/create" className={styles.btnPrimary}>
                <PlusCircle size={16} /> Offer a Ride
              </Link>
            )}
          </div>
        </div>

        <div className={styles.filterBar}>
          <form onSubmit={onSubmit}>
            <div className={styles.filterRow}>
              <div className={styles.searchWrap}>
                <MapPin size={16} className={styles.searchIcon} />
                <input type="text" className={styles.searchInput} placeholder="Pickup area (e.g. H-12...)"
                  value={originName} onChange={(e) => setOriginName(e.target.value)} />
              </div>
              <div className={styles.searchWrap}>
                <MapPin size={16} className={styles.searchIcon} />
                <input type="text" className={styles.searchInput} placeholder="Drop-off (e.g. NUST, SEECS...)"
                  value={destName} onChange={(e) => setDestName(e.target.value)} />
              </div>
              <button type="submit" className={styles.btnPrimary} style={{ padding: '0.6rem 1.1rem' }}>
                <Search size={15} /> Search
              </button>
              {(originName || destName) && (
                <button type="button" className={styles.btnOutline} onClick={onReset} style={{ padding: '0.6rem 0.9rem' }}>
                  <RotateCcw size={15} />
                </button>
              )}
            </div>
          </form>
        </div>

        {!loading && (
          <p className={styles.resultsCount}>
            {rides.length} ride{rides.length !== 1 ? 's' : ''} available
            {(originName || destName) ? ' · filtered by route' : ''}
          </p>
        )}

        {loading && <SkeletonRides />}

        {!loading && (
          <div className={styles.gridWide}>
            {rides.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}><Car size={48} /></div>
                <p className={styles.emptyTitle}>No rides found</p>
                <p className={styles.emptyText}>
                  {originName || destName
                    ? 'Try a different route or clear filters.'
                    : 'No rides posted yet. Be the first to offer one.'}
                </p>
                {user && (
                  <Link href="/rides/create" className={styles.btnPrimary}>
                    <PlusCircle size={16} /> Offer a Ride
                  </Link>
                )}
              </div>
            ) : rides.map((ride) => {
              const driverName = ride.driver?.name || 'Driver';
              const seats = ride.seatsAvailable ?? 0;
              return (
                <Link key={ride._id} href={'/rides/' + ride._id} className={styles.rideCard}>
                  <div className={styles.rideCardHeader}>
                    <div className={styles.rideRoute}>
                      <span className={styles.rideRouteLabel}>Route</span>
                      <span className={styles.rideRoutePath}>
                        {ride.originName}
                        <span className={styles.rideArrow}>→</span>
                        {ride.destName}
                      </span>
                    </div>
                    <span className={styles.seatsBadge + ' ' + seatsBadgeClass(seats, styles)}>
                      <Users size={12} /> {seats} seat{seats !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {ride.recurring?.enabled && (
                    <span className={styles.rideBadge}><RotateCcw size={11} /> Recurring</span>
                  )}

                  <div className={styles.rideInfoGrid}>
                    <div className={styles.rideInfoItem}><Clock size={14} /><span>{formatTime(ride.departureTime)}</span></div>
                    <div className={styles.rideInfoItem}><CalendarDays size={14} /><span>{formatDeparture(ride.departureTime)}</span></div>
                    <div className={styles.rideInfoItem}><MapPin size={14} /><span>{ride.originName}</span></div>
                    <div className={styles.rideInfoItem}><MapPin size={14} /><span>{ride.destName}</span></div>
                    <div className={styles.rideInfoItem}><Car size={14} /><span>{ride.licensePlateNumber || 'Plate unavailable'}</span></div>
                  </div>

                  <div className={styles.rideDriver}>
                    <div className={styles.driverAvatar}>{getInitials(driverName)}</div>
                    <div className={styles.driverInfo}>
                      <span className={styles.driverName}>{driverName}</span>
                      <span className={styles.driverLabel}>Driver</span>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.84rem', fontWeight: 600 }}>
                      Join Ride <ArrowRight size={14} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
