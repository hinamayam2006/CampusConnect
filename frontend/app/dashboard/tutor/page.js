'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Clock,
  Star,
  Award,
  Check,
  X,
  BookMarked,
  Plus,
  ChevronRight,
  Settings,
  Calendar,
  Bell,
} from 'lucide-react';
import {
  fetchTutorBookings,
  fetchMyTutorProfile,
  fetchTutorReviews,
  acceptBooking,
  rejectBooking,
  completeBooking,
  updateTutorProfile,
} from '@/lib/apiRequests';
import api from '@/lib/api'; // H-3 FIX: use axios instance (attaches JWT) instead of raw fetch()
import useRequireAuth from '@/lib/useRequireAuth';
import BookingStatusBadge from '@/components/BookingStatusBadge'; // L-5 FIX: reuse shared component
import StarRating from '@/components/StarRating'; // L-4 FIX: reuse shared component
import SessionCompletionPrompt from '@/components/SessionCompletionPrompt'; // L-6 FIX: extracted shared component
import { formatDate } from '@/lib/utils'; // L-3 FIX: use shared util
import styles from './tutor-dashboard.module.css';

/* --- Helpers ----------------------------------- */
function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map((s) => s[0]).join('').toUpperCase() || '?';
}

/* --- Star display — L-4 FIX: wraps StarRating for read-only display.
   StarRating doesn't accept 'size', so we keep a thin wrapper that renders
   sized SVG stars for the dashboard context. StarRating is still used
   for interactive rating inputs elsewhere. */
function StarRow({ rating, size = 14 }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i <= Math.round(rating) ? '#F59E0B' : 'none'}
          stroke={i <= Math.round(rating) ? '#F59E0B' : '#4B5563'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

/* --- Badge — L-5 FIX: StatusBadge removed; BookingStatusBadge imported above ---
   Left as a thin alias so no JSX changes are needed below (component is used as <StatusBadge>) */
function StatusBadge({ status }) {
  return <BookingStatusBadge status={status} />;
}


/* --- Session item (for tabs) -------------------- */
function SessionItem({ booking, onComplete }) {
  const [loading, setLoading] = useState(false);
  const studentName = booking.student?.name || booking.studentName || 'Student';
  const initials = getInitials(studentName);

  const handleComplete = async () => {
    if (loading) return;
    setLoading(true);
    try { await onComplete(booking._id); }
    finally { setLoading(false); }
  };

  return (
    <div className={styles.sessionItem}>
      <div className={styles.sessionAvatar}>{initials}</div>
      <div className={styles.sessionBody}>
        <p className={styles.sessionName}>{studentName}</p>
        <div className={styles.sessionMeta}>
          <Calendar size={11} />
          {formatDate(booking.scheduledAt)}
          {booking.course && (
            <> · <span>{booking.course}</span></>
          )}
        </div>
      </div>
      <div className={styles.sessionRight}>
        <StatusBadge status={booking.status} />
        {booking.status === 'confirmed' && (
          <button className={styles.btnComplete} onClick={handleComplete} disabled={loading}>
            {loading ? <span className={styles.btnSpinner} /> : <Check size={11} />}
            {loading ? '' : 'Done'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ==================================================
   MAIN PAGE
   ================================================== */

export default function TutorDashboardPage() {
  const { isReady } = useRequireAuth();

  /* --- Data --- */
  const [bookings, setBookings] = useState([]);
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  /* --- Completion Prompt --- */
  const [showPrompt, setShowPrompt] = useState(false);
  const [pendingCompletion, setPendingCompletion] = useState(null);

  /* --- Action loading maps --- */
  const [acceptingId, setAcceptingId] = useState(null);
  const [decliningId, setDecliningId] = useState(null);

  /* --- Tabs --- */
  const [activeTab, setActiveTab] = useState('upcoming');

  /* --- Courses side panel --- */
  const [courses, setCourses] = useState([]);
  const [courseInput, setCourseInput] = useState('');
  const [savingCourses, setSavingCourses] = useState(false);
  const [courseSaved, setCourseSaved] = useState(false);

  /* --- Fetch on mount --- */
  useEffect(() => {
    if (!isReady) return;

    const timer = setTimeout(() => {
      Promise.allSettled([fetchTutorBookings(), fetchMyTutorProfile()])
        .then(([bookingsResult, profileResult]) => {
          if (bookingsResult.status === 'fulfilled') {
            const items = bookingsResult.value?.data?.items || bookingsResult.value?.data || [];
            setBookings(Array.isArray(items) ? items : []);
          }
          if (profileResult.status === 'fulfilled') {
            // profileResult.value = { success, data: tutorProfileDoc }
            const p = profileResult.value?.data || null;
            setProfile(p);
            if (p?.courses) setCourses(p.courses);
          }
        })
        .catch(() => setError('Failed to load dashboard data.'))
        .finally(() => setLoading(false));
    }, 0);

    return () => clearTimeout(timer);
  }, [isReady]);

  /* --- Fetch reviews when profile is ready --- */
  useEffect(() => {
    if (!profile?._id) return;

    const timer = setTimeout(() => {
      fetchTutorReviews(profile._id)
        // M-4 FIX: backend returns { success, data: { items: [...] } }
        .then((res) => setReviews(res.data?.items || res.data || []))
        .catch(() => {});
    }, 0);

    return () => clearTimeout(timer);
  }, [profile?._id]);

  /* --- Check for sessions needing completion prompts --- */
  useEffect(() => {
    if (!bookings.length) return;

    const checkSessionsNeedingCompletion = () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);

      // Find sessions that ended 5-30 minutes ago and haven't been prompted
      const sessionsNeedingPrompt = bookings.filter(booking => {
        const sessionTime = new Date(booking.scheduledAt);
        const sessionEndTime = new Date(sessionTime.getTime() + booking.durationMinutes * 60 * 1000);
        
        return (
          booking.status === 'confirmed' &&
          booking.attendanceStatus === 'pending' &&
          sessionEndTime >= thirtyMinutesAgo &&
          sessionEndTime <= fiveMinutesAgo &&
          !booking.completionPromptSent
        );
      });

      // Show prompt for the first session that needs attention
      if (sessionsNeedingPrompt.length > 0 && !pendingCompletion) {
        setPendingCompletion(sessionsNeedingPrompt[0]);
        setShowPrompt(true);
      }
    };

    // Check immediately and then every 2 minutes
    checkSessionsNeedingCompletion();
    const interval = setInterval(checkSessionsNeedingCompletion, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [bookings, pendingCompletion]);

  /* --- Stats --- */
  const pending = bookings.filter((b) => b.status === 'pending');
  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const completed = bookings.filter((b) => b.status === 'completed');
  const cancelled = bookings.filter((b) => b.status === 'cancelled');

  const avgRating = profile?.averageRating
    ? Number(profile.averageRating).toFixed(1)
    : reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '--';

  const studentsHelped = (() => {
    const ids = new Set(
      completed.map((b) => b.student?._id || b.studentId).filter(Boolean)
    );
    return ids.size || completed.length;
  })();

  /* --- Tab content --- */
  const tabItems = {
    upcoming: confirmed,
    completed,
    cancelled,
  };

  /* --- Actions --- */
  const handleAccept = async (id) => {
    if (acceptingId) return;
    setAcceptingId(id);
    try {
      await acceptBooking(id);
      setBookings((prev) =>
        prev.map((b) => (b._id === id ? { ...b, status: 'confirmed' } : b))
      );
    } catch (err) {
      alert(err.message || 'Failed to accept booking.');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleDecline = async (id) => {
    if (decliningId) return;
    setDecliningId(id);
    try {
      await rejectBooking(id);
      setBookings((prev) =>
        prev.map((b) => (b._id === id ? { ...b, status: 'cancelled' } : b))
      );
    } catch (err) {
      alert(err.message || 'Failed to decline booking.');
    } finally {
      setDecliningId(null);
    }
  };

  const handleComplete = async (id) => {
    await completeBooking(id);
    setBookings((prev) =>
      prev.map((b) => (b._id === id ? { ...b, status: 'completed' } : b))
    );
  };

  /* --- Course tag helpers --- */
  const addCourse = () => {
    const val = courseInput.trim().toUpperCase();
    if (!val || courses.includes(val)) return;
    setCourses((prev) => [...prev, val]);
    setCourseInput('');
  };

  const removeCourse = (c) => setCourses((prev) => prev.filter((x) => x !== c));

  const saveCourses = async () => {
    if (!profile?._id || savingCourses) return;
    setSavingCourses(true);
    try {
      await updateTutorProfile(profile._id, { courses });
      setCourseSaved(true);
      setTimeout(() => setCourseSaved(false), 2000);
    } catch (err) {
      alert(err.message || 'Failed to save courses.');
    } finally {
      setSavingCourses(false);
    }
  };

  /* --- Completion prompt handlers --- */
  const handleMarkCompleted = async (bookingId) => {
    try {
      // H-3 FIX: was raw fetch() without Authorization header — always returned 401
      const res = await api.post(`/bookings/${bookingId}/confirm-attendance`, {
        attendanceStatus: 'attended',
      });
      if (res.data?.success) {
        setBookings((prev) =>
          prev.map((b) =>
            b._id === bookingId
              ? { ...b, status: 'completed', attendanceStatus: 'attended', tutorConfirmedAttendance: true }
              : b
          )
        );
      } else {
        throw new Error('Failed to mark as completed');
      }
    } catch (error) {
      console.error('Error marking session as completed:', error);
      throw error;
    }
  };

  const handleMarkNoShow = async (bookingId) => {
    try {
      // H-3 FIX: was raw fetch() without Authorization header — always returned 401
      const res = await api.post(`/bookings/${bookingId}/confirm-attendance`, {
        attendanceStatus: 'no_show',
      });
      if (res.data?.success) {
        setBookings((prev) =>
          prev.map((b) =>
            b._id === bookingId
              ? { ...b, attendanceStatus: 'no_show', tutorConfirmedAttendance: true }
              : b
          )
        );
      } else {
        throw new Error('Failed to mark as no-show');
      }
    } catch (error) {
      console.error('Error marking session as no-show:', error);
      throw error;
    }
  };

  /* --- Rating distribution --- */
  const distribData = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));
  const maxCount = Math.max(...distribData.map((d) => d.count), 1);

  if (!isReady || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div style={{ padding: '4rem 0', display: 'flex', justifyContent: 'center' }}>
            <span className={styles.spinner} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* -- Header -- */}
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.pageTitle}>Tutor Dashboard</h1>
            <p className={styles.pageSub}>
              {/* M-5 FIX: TutorProfile has no 'name' field; show generic label */}
              {profile ? 'Your tutoring overview' : 'Manage your sessions and profile'}
            </p>
          </div>
          <div className={styles.headerActions}>
            <Link href="/tutors/become" className={styles.headerBtn}>
              <Settings size={13} />
              Edit Profile
            </Link>
            {/* M-7 FIX: Both buttons previously linked to /tutors/become — now distinct */}
            <Link href="/tutors/become#availability" className={[styles.headerBtn, styles.headerBtnDark].join(' ')}>
              <Calendar size={13} />
              Set Availability
            </Link>
          </div>
        </div>

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#B91C1C', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        {/* -- Stats Row -- */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statIconWrap}><Users size={18} /></div>
            <div className={styles.statValue}>{bookings.length}</div>
            <div className={styles.statLabel}>Total Sessions</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIconWrap}><Clock size={18} /></div>
            <div className={styles.statValue}>{pending.length}</div>
            <div className={styles.statLabel}>Pending Requests</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIconWrap}><Star size={18} /></div>
            <div className={styles.statValue}>{avgRating}</div>
            <div className={styles.statLabel}>Average Rating</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statIconWrap}><Award size={18} /></div>
            <div className={styles.statValue}>{studentsHelped}</div>
            <div className={styles.statLabel}>Students Helped</div>
          </div>
        </div>

        {/* -- Body -- */}
        <div className={styles.body}>

          {/* == LEFT COLUMN == */}
          <div className={styles.mainCol}>

            {/* PENDING REQUESTS */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>
                  <Clock size={15} />
                  Tutoring Requests
                </h2>
                {pending.length > 0 && (
                  <span className={styles.sectionBadge}>{pending.length} pending</span>
                )}
              </div>

              {pending.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}><Users size={22} /></div>
                  <p className={styles.emptyTitle}>No pending requests</p>
                  <p className={styles.emptyText}>New session requests will appear here. Keep your profile up to date to attract students.</p>
                  <Link href="/tutors" className={styles.emptyLink}>
                    View Profile
                    <ChevronRight size={13} />
                  </Link>
                </div>
              ) : (
                <div className={styles.requestList}>
                  {pending.map((booking) => {
                    const studentName = booking.student?.name || booking.studentName || 'Student';
                    const initials = getInitials(studentName);
                    const isAccepting = acceptingId === booking._id;
                    const isDeclining = decliningId === booking._id;

                    return (
                      <div key={booking._id} className={styles.requestCard}>
                        <div className={styles.reqAvatar}>{initials}</div>
                        <div className={styles.reqBody}>
                          <div className={styles.reqNameRow}>
                            <span className={styles.reqName}>{studentName}</span>
                            {booking.course && (
                              <span className={styles.reqCourse}>{booking.course}</span>
                            )}
                          </div>
                          <div className={styles.reqMeta}>
                            <Calendar size={11} />
                            {formatDate(booking.scheduledAt)}
                          </div>
                          {booking.studentMessage && (
                            <span className={styles.reqMessage}>&quot;{booking.studentMessage}&quot;</span>
                          )}
                          <div className={styles.reqActions}>
                            <button
                              className={styles.btnAccept}
                              onClick={() => handleAccept(booking._id)}
                              disabled={isAccepting || isDeclining}
                            >
                              {isAccepting ? (
                                <span className={styles.btnSpinner} />
                              ) : (
                                <Check size={13} />
                              )}
                              {isAccepting ? 'Accepting…' : 'Accept'}
                            </button>
                            <button
                              className={styles.btnDecline}
                              onClick={() => handleDecline(booking._id)}
                              disabled={isAccepting || isDeclining}
                            >
                              {isDeclining ? (
                                <span className={styles.btnSpinner} />
                              ) : (
                                <X size={13} />
                              )}
                              {isDeclining ? 'Declining…' : 'Decline'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SESSIONS (TABBED) */}
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>
                  <Calendar size={15} />
                  Sessions
                </h2>
              </div>

              {/* Tabs */}
              <div className={styles.tabs}>
                {[
                  { key: 'upcoming', label: 'Upcoming', count: confirmed.length },
                  { key: 'completed', label: 'Completed', count: completed.length },
                  { key: 'cancelled', label: 'Cancelled', count: cancelled.length },
                ].map(({ key, label, count }) => (
                  <button
                    key={key}
                    className={[styles.tabBtn, activeTab === key ? styles.tabBtnActive : ''].filter(Boolean).join(' ')}
                    onClick={() => setActiveTab(key)}
                  >
                    {label}
                    <span className={styles.tabPill}>{count}</span>
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {tabItems[activeTab].length === 0 ? (
                <div className={styles.emptyState} style={{ padding: '2rem 1rem' }}>
                  <p className={styles.emptyTitle} style={{ fontSize: '0.84rem' }}>
                    No {activeTab} sessions
                  </p>
                </div>
              ) : (
                <div className={styles.sessionList}>
                  {tabItems[activeTab].map((booking) => (
                    <SessionItem
                      key={booking._id}
                      booking={booking}
                      onComplete={handleComplete}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* == RIGHT SIDEBAR == */}
          <aside className={styles.sideCol}>

            {/* COURSES I TEACH */}
            <div className={styles.sideCard}>
              <div className={styles.sideCardHead}>
                <BookMarked size={13} />
                Courses I Teach
              </div>
              <div className={styles.sideCardBody}>
                {/* Tags */}
                <div className={styles.tagsWrap}>
                  {courses.length === 0 ? (
                    <span style={{ fontSize: '0.75rem', color: '#9E9E9E' }}>No courses added yet.</span>
                  ) : (
                    courses.map((c) => (
                      <span key={c} className={styles.courseTag}>
                        {c}
                        <button
                          type="button"
                          className={styles.tagRemoveBtn}
                          onClick={() => removeCourse(c)}
                          aria-label={`Remove ${c}`}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Add input */}
                <div className={styles.tagInputRow}>
                  <input
                    type="text"
                    className={styles.tagInput}
                    placeholder="Course code (e.g. CS301)"
                    value={courseInput}
                    onChange={(e) => setCourseInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCourse())}
                    maxLength={20}
                  />
                  <button type="button" className={styles.tagAddBtn} onClick={addCourse} aria-label="Add course">
                    <Plus size={14} />
                  </button>
                </div>

                {/* Save */}
                {profile?._id && (
                  <button
                    type="button"
                    className={[styles.saveTagsBtn, courseSaved ? styles.saveTagsSuccess : ''].filter(Boolean).join(' ')}
                    onClick={saveCourses}
                    disabled={savingCourses}
                  >
                    {savingCourses ? (
                      <><span className={styles.btnSpinner} /> Saving…</>
                    ) : courseSaved ? (
                      <><Check size={13} /> Saved!</>
                    ) : (
                      'Save Courses'
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* MY RATING */}
            <div className={styles.ratingCard}>
              <div className={styles.ratingCardHead}>
                <Star size={13} />
                My Rating
              </div>
              <div className={styles.ratingCardBody}>
                {reviews.length === 0 && avgRating === '--' ? (
                  <p style={{ fontSize: '0.78rem', color: '#6B7280', textAlign: 'center', padding: '0.5rem 0' }}>
                    No reviews yet. Complete sessions to receive ratings.
                  </p>
                ) : (
                  <>
                    {/* Score + stars */}
                    <div className={styles.ratingTop}>
                      <div className={styles.ratingScore}>{avgRating}</div>
                      <div className={styles.ratingRight}>
                        <StarRow rating={parseFloat(avgRating) || 0} size={15} />
                        <p className={styles.ratingCount}>{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    {/* Distribution bars */}
                    {reviews.length > 0 && (
                      <div className={styles.distribWrap}>
                        {distribData.map(({ star, count }) => {
                          const pct = Math.round((count / maxCount) * 100);
                          const isTop = star >= 4;
                          return (
                            <div key={star} className={styles.distribRow}>
                              <span className={styles.distribLabel}>{star}</span>
                              <div className={styles.distribBarTrack}>
                                <div
                                  className={[styles.distribBarFill, isTop ? styles.distribBarFillHigh : ''].filter(Boolean).join(' ')}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={styles.distribCount}>{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* SESSIONS THIS MONTH */}
            <div className={styles.sideCard}>
              <div className={styles.sideCardHead}>
                <Calendar size={13} />
                Sessions This Month
              </div>
              <div className={styles.sideCardBody}>
                <div className={styles.monthStats}>
                  {(() => {
                    const now = new Date();
                    const thisMonth = bookings.filter((b) => {
                      const d = new Date(b.scheduledAt || b.createdAt);
                      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                    });
                    const doneThisMonth = thisMonth.filter((b) => b.status === 'completed');
                    return (
                      <>
                        <div className={styles.monthStat}>
                          <span className={styles.monthStatValue}>{thisMonth.length}</span>
                          <span className={styles.monthStatLabel}>Total</span>
                        </div>
                        <div className={styles.monthStatDivider} />
                        <div className={styles.monthStat}>
                          <span className={styles.monthStatValue}>{doneThisMonth.length}</span>
                          <span className={styles.monthStatLabel}>Completed</span>
                        </div>
                        <div className={styles.monthStatDivider} />
                        <div className={styles.monthStat}>
                          <span className={styles.monthStatValue}>{pending.length}</span>
                          <span className={styles.monthStatLabel}>Pending</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

          </aside>
        </div>
      </div>
      
      {/* Completion Prompt Popup */}
      {showPrompt && pendingCompletion && (
        <SessionCompletionPrompt
          booking={pendingCompletion}
          onDismiss={() => setShowPrompt(false)}
          onMarkCompleted={handleMarkCompleted}
          onMarkNoShow={handleMarkNoShow}
        />
      )}
    </div>
  );
}
