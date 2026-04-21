'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useRequireAuth from '../../../../lib/useRequireAuth';
import { fetchMyTutorProfile, fetchTutorEarnings } from '../../../../lib/apiRequests';
import styles from '../../../tutoring/tutoring.module.css';

export default function TutorEarningsPage() {
  const { isReady } = useRequireAuth();
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isReady) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const profileRes = await fetchMyTutorProfile();
        const profile = profileRes.data;
        if (!profile?._id) throw new Error('Tutor profile not found');

        const earningsRes = await fetchTutorEarnings(profile._id);
        if (!cancelled) {
          setSummary(earningsRes.data?.summary || null);
          setMonthly(earningsRes.data?.monthly || []);
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load earnings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady]);

  const aggregates = useMemo(() => {
    const totalSessions = monthly.reduce((sum, m) => sum + (m.totalSessions || 0), 0);
    const totalMinutes = monthly.reduce((sum, m) => sum + (m.totalMinutes || 0), 0);
    const totalEarnings = monthly.reduce((sum, m) => sum + (m.earnings || 0), 0);
    const avgEarning = totalSessions ? totalEarnings / totalSessions : 0;
    return { totalSessions, totalMinutes, totalEarnings, avgEarning };
  }, [monthly]);

  const maxEarnings = Math.max(1, ...monthly.map((m) => m.earnings || 0));

  if (!isReady) {
    return <div className="container py-5 text-secondary">Loading session…</div>;
  }

  return (
    <div className={styles.page}>
      <div className={`container ${styles.container}`} style={{ maxWidth: 960 }}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Earnings</h1>
            <p className={styles.pageSubtitle}>Track your monthly tutoring revenue and momentum.</p>
          </div>
          <div className={styles.actionRow}>
            <Link href="/dashboard/tutor" className="btn btn-outline-secondary btn-sm">Back to dashboard</Link>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <div className="text-secondary">Loading earnings data…</div>
        ) : (
          <>
            {summary && (
              <div className={styles.summaryGrid} style={{ marginBottom: '2rem' }}>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Hourly rate</div>
                  <div className={styles.statValue}>{summary.isFree ? 'Free' : `Rs ${summary.hourlyRate}/hr`}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Sessions completed</div>
                  <div className={styles.statValue}>{summary.totalSessions}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Total hours</div>
                  <div className={styles.statValue}>{(summary.totalMinutes / 60).toFixed(1)}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Total earnings</div>
                  <div className={styles.statValue}>Rs {summary.totalEarnings.toFixed(0)}</div>
                </div>
              </div>
            )}

            <div className={styles.surfaceCardStrong}>
              <h5 className="mb-3">Monthly breakdown</h5>
              {!monthly.length ? (
                <div className="text-secondary">No completed sessions yet. Start tutoring to see your earnings here.</div>
              ) : (
                <div className={styles.chart}>
                  {monthly.map((row, idx) => (
                    <div key={row.month} className={styles.chartRow} style={{ animationDelay: `${idx * 60}ms` }}>
                      <div className={styles.chartLabel}>{row.month}</div>
                      <div className={styles.chartBar}>
                        <div
                          className={styles.chartFill}
                          style={{ width: `${(row.earnings / maxEarnings) * 100}%` }}
                        />
                      </div>
                      <div className={styles.chartValue}>Rs {row.earnings.toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              )}

              {monthly.length > 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(15, 23, 42, 0.08)' }}>
                  <div className="row g-2">
                    <div className="col-6 col-md-4">
                      <div className={styles.statCard}>
                        <div className={styles.statLabel}>Total sessions</div>
                        <div className={styles.statValue}>{aggregates.totalSessions}</div>
                      </div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className={styles.statCard}>
                        <div className={styles.statLabel}>Total hours</div>
                        <div className={styles.statValue}>{(aggregates.totalMinutes / 60).toFixed(1)}</div>
                      </div>
                    </div>
                    <div className="col-6 col-md-4">
                      <div className={styles.statCard}>
                        <div className={styles.statLabel}>Avg per session</div>
                        <div className={styles.statValue}>Rs {aggregates.avgEarning.toFixed(0)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
