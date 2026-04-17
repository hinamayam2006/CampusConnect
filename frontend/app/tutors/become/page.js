'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { createTutorProfile, fetchMyTutorProfile, updateTutorProfile } from '../../../lib/apiRequests';
import useRequireAuth from '../../../lib/useRequireAuth';
import { dayLabel } from '../../../lib/uiHelpers';
import styles from '../../tutoring/tutoring.module.css';

function parseCourses(text) {
  return String(text)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const MAX_BIO = 800;
const MAX_COURSES = 12;
const MAX_HOURLY_RATE = 10000;
const MAX_SLOTS = 20;

export default function BecomeTutorPage() {
  const { isReady } = useRequireAuth();
  const router = useRouter();

  const [bio, setBio] = useState('');
  const [coursesText, setCoursesText] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [hourlyRate, setHourlyRate] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [profileId, setProfileId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [slots, setSlots] = useState([]);
  const [slotDay, setSlotDay] = useState('1');
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd] = useState('10:00');

  const [paymentMethodField, setPaymentMethodField] = useState('');
  const [paymentAccountNumber, setPaymentAccountNumber] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!isReady) return undefined;
    let cancelled = false;

    (async () => {
      setLoadingProfile(true);
      setProfileError('');
      try {
        const res = await fetchMyTutorProfile();
        const profile = res?.data;
        if (!cancelled && profile?._id) {
          setProfileId(profile._id);
          setIsEditing(true);
          setBio(profile.bio || '');
          setCoursesText((profile.courses || []).join(', '));
          setIsFree(Boolean(profile.isFree));
          setHourlyRate(profile.isFree ? '' : String(profile.hourlyRate || ''));
          setSlots(profile.availabilitySlots || []);
          setIsActive(profile.isActive ?? true);
          setPaymentMethodField(profile.paymentMethod || '');
          setPaymentAccountNumber(profile.paymentAccountNumber || '');
          setPaymentInstructions(profile.paymentInstructions || '');
          setConfirming(false);
        }
      } catch (err) {
        const msg = err?.message || err?.errors?.[0]?.message || 'Failed to load tutor profile';
        const isNotFound = String(msg).toLowerCase().includes('not found');
        if (!cancelled && !isNotFound) setProfileError(msg);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isReady]);

  const addSlot = () => {
    if (slots.length >= MAX_SLOTS) {
      toast.error(`Maximum ${MAX_SLOTS} availability slots allowed.`);
      return;
    }
    if (slotStart >= slotEnd) {
      toast.error('End time must be after start time.');
      return;
    }
    const duplicate = slots.some(
      (s) => s.day === Number(slotDay) && s.startTime === slotStart && s.endTime === slotEnd
    );
    if (duplicate) {
      toast.error('This slot already exists.');
      return;
    }
    setSlots((prev) => [
      ...prev,
      { day: Number(slotDay), startTime: slotStart, endTime: slotEnd },
    ]);
    toast.success('Slot added.');
  };

  const removeSlot = (idx) => {
    setSlots((prev) => prev.filter((_, i) => i !== idx));
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    const courses = parseCourses(coursesText);
    if (!bio.trim() || bio.length < 10) {
      toast.error('Bio must be at least 10 characters.');
      return;
    }
    if (bio.length > MAX_BIO) {
      toast.error(`Bio must be ${MAX_BIO} characters or less.`);
      return;
    }
    if (courses.length === 0) {
      toast.error('Please add at least one course.');
      return;
    }
    if (courses.length > MAX_COURSES) {
      toast.error(`Maximum ${MAX_COURSES} courses allowed.`);
      return;
    }
    if (!isFree) {
      const rate = Number(hourlyRate || 0);
      if (rate <= 0) {
        toast.error('Please set an hourly rate greater than 0, or mark sessions as free.');
        return;
      }
      if (rate > MAX_HOURLY_RATE) {
        toast.error(`Maximum hourly rate is Rs ${MAX_HOURLY_RATE.toLocaleString()}.`);
        return;
      }
    }

    if (!confirming) {
      setConfirming(true);
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        bio,
        courses,
        isFree,
        hourlyRate: isFree ? 0 : Number(hourlyRate || 0),
        availabilitySlots: slots,
        isActive,
        paymentMethod: isFree ? '' : paymentMethodField,
        paymentAccountNumber: isFree ? '' : paymentAccountNumber,
        paymentInstructions: isFree ? '' : paymentInstructions,
      };

      let res;
      if (isEditing && profileId) {
        res = await updateTutorProfile(profileId, body);
        const updated = res?.data || res;
        toast.success('Profile updated successfully! Students can see your changes now.');
        router.push(`/tutors/${updated._id}`);
      } else {
        res = await createTutorProfile(body);
        const created = res?.data || res;
        toast.success('Tutor profile created! You are now visible to students.');
        router.push(`/tutors/${created._id}`);
      }
    } catch (err) {
      const status = err.response?.status;
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.[0]?.message ||
        err.message ||
        `Could not ${isEditing ? 'update' : 'create'} tutor profile`;

      if (status === 409) {
        toast.error('You already have a tutor profile. Loading it now…');
        setConfirming(false);
        // Reload profile
        try {
          const res = await fetchMyTutorProfile();
          if (res?.data?._id) router.push(`/tutors/${res.data._id}`);
        } catch { /* ignore */ }
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- SKELETON ---------- */
  if (!isReady || loadingProfile) {
    return (
      <div className={styles.page}>
        <div className="container" style={{ maxWidth: 840 }}>
          <div style={{ marginBottom: 24 }}>
            <div className={styles.skeleton} style={{ width: '50%', height: 24, marginBottom: 10 }} />
            <div className={styles.skeleton} style={{ width: '35%', height: 14 }} />
          </div>
          <div className={styles.skeletonCard} style={{ minHeight: 300 }}>
            <div className={styles.skeleton} style={{ width: '100%', height: 80, marginBottom: 14 }} />
            <div className={styles.skeleton} style={{ width: '100%', height: 38, marginBottom: 14 }} />
            <div className={styles.skeleton} style={{ width: '60%', height: 38, marginBottom: 14 }} />
            <div className={styles.skeleton} style={{ width: '40%', height: 38 }} />
          </div>
        </div>
      </div>
    );
  }

  const courseCount = parseCourses(coursesText).length;

  return (
    <div className={styles.page}>
      <div className={`container ${styles.container}`} style={{ maxWidth: 840 }}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>{isEditing ? 'Update your tutor profile' : 'Become a tutor'}</h1>
            <p className={styles.pageSubtitle}>
              {isEditing ? 'Refine your expertise and availability.' : 'Share what you know and help classmates succeed.'}
            </p>
          </div>
          <div className={styles.actionRow}>
            <Link href="/tutors" className={`${styles.btnSecondary} ${styles.btnSmall}`}>Cancel</Link>
            <Link href="/tutoring" className={`${styles.btnSecondary} ${styles.btnSmall}`}>Tutoring hub</Link>
          </div>
        </div>

        {profileError && <div className={styles.alertWarning}>{profileError}</div>}

        <form onSubmit={onSubmit} className={styles.surfaceCardStrong}>
          {/* Summary stats */}
          <div className={styles.statGrid} style={{ marginBottom: '1.5rem' }}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Courses</div>
              <div className={styles.statValue}>{courseCount}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Slots</div>
              <div className={styles.statValue}>{slots.length}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Rate</div>
              <div className={styles.statValue}>{isFree ? 'Free' : hourlyRate ? `Rs ${hourlyRate}/hr` : '—'}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Status</div>
              <div className={styles.statValue}>{isActive ? 'Active' : 'Hidden'}</div>
            </div>
          </div>

          {/* Bio */}
          <div style={{ marginBottom: '1rem' }}>
            <label className={styles.formLabel}>
              Bio <span className={styles.formRequired}>*</span>
            </label>
            <textarea
              className="form-control"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
              placeholder="Tell students about your experience, teaching style, and what you can help with…"
              style={{ borderRadius: 8, border: '1.5px solid #e5dfd7' }}
              required
            />
            <div className={styles.formHint} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Min 10 characters</span>
              <span>{bio.length}/{MAX_BIO}</span>
            </div>
          </div>

          {/* Courses */}
          <div style={{ marginBottom: '1rem' }}>
            <label className={styles.formLabel}>
              Courses <span className={styles.formRequired}>*</span>
            </label>
            <input
              className="form-control"
              value={coursesText}
              onChange={(e) => setCoursesText(e.target.value)}
              placeholder="DSA, Calculus, DBMS"
              style={{ borderRadius: 8, border: '1.5px solid #e5dfd7' }}
              required
            />
            <div className={styles.formHint}>Comma separated · {courseCount}/{MAX_COURSES} courses</div>
          </div>

          {/* Free / Active toggles */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                className="form-check-input"
                checked={isFree}
                onChange={(e) => setIsFree(e.target.checked)}
              />
              Free sessions
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                className="form-check-input"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Visible to students
            </label>
          </div>

          {/* Hourly rate */}
          {!isFree && (
            <div style={{ marginBottom: '1rem' }}>
              <label className={styles.formLabel}>
                Hourly rate (Rs) <span className={styles.formRequired}>*</span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  max={MAX_HOURLY_RATE}
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="200"
                  style={{ borderRadius: 8, border: '1.5px solid #e5dfd7', maxWidth: 160 }}
                  required
                />
                <span style={{ fontSize: '0.88rem', color: '#8a7e78' }}>per hour</span>
              </div>
              <div className={styles.formHint}>Max Rs {MAX_HOURLY_RATE.toLocaleString()}/hr</div>
            </div>
          )}

          {/* Payment information for paid tutors */}
          {!isFree && (
            <>
              <hr className={styles.divider} />
              <h6 style={{ fontWeight: 700, marginBottom: '0.65rem' }}>Payment information</h6>
              <p style={{ fontSize: '0.85rem', color: '#8a7e78', marginBottom: '0.75rem' }}>
                Students will see this information when booking. They will send payment to this account and upload a screenshot as proof.
              </p>

              <div style={{ marginBottom: '1rem' }}>
                <label className={styles.formLabel}>Payment method</label>
                <select
                  className="form-select"
                  value={paymentMethodField}
                  onChange={(e) => setPaymentMethodField(e.target.value)}
                  style={{ borderRadius: 8, border: '1.5px solid #e5dfd7', maxWidth: 220 }}
                >
                  <option value="">Select…</option>
                  <option value="JazzCash">JazzCash</option>
                  <option value="EasyPaisa">EasyPaisa</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className={styles.formLabel}>Account / Phone number</label>
                <input
                  className="form-control"
                  value={paymentAccountNumber}
                  onChange={(e) => setPaymentAccountNumber(e.target.value.slice(0, 50))}
                  placeholder="e.g. 03001234567"
                  style={{ borderRadius: 8, border: '1.5px solid #e5dfd7', maxWidth: 260 }}
                />
                <div className={styles.formHint}>Students will send payment to this number/account</div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label className={styles.formLabel}>Payment instructions (optional)</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value.slice(0, 300))}
                  placeholder="e.g. Send payment to this easypaisa/jazzcash number and upload screenshot"
                  style={{ borderRadius: 8, border: '1.5px solid #e5dfd7' }}
                />
                <div className={styles.formHint} style={{ textAlign: 'right' }}>
                  {paymentInstructions.length}/300
                </div>
              </div>
            </>
          )}

          <hr className={styles.divider} />

          {/* Availability slots */}
          <div style={{ marginBottom: '1rem' }}>
            <h6 style={{ fontWeight: 700, marginBottom: '0.65rem' }}>Availability slots</h6>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
              <div>
                <label className={styles.formLabel} style={{ marginBottom: '0.25rem' }}>Day</label>
                <select
                  className="form-select form-select-sm"
                  value={slotDay}
                  onChange={(e) => setSlotDay(e.target.value)}
                  style={{ borderRadius: 8, border: '1.5px solid #e5dfd7', width: 110 }}
                >
                  <option value="0">Sun</option>
                  <option value="1">Mon</option>
                  <option value="2">Tue</option>
                  <option value="3">Wed</option>
                  <option value="4">Thu</option>
                  <option value="5">Fri</option>
                  <option value="6">Sat</option>
                </select>
              </div>
              <div>
                <label className={styles.formLabel} style={{ marginBottom: '0.25rem' }}>Start</label>
                <input
                  type="time"
                  className="form-control form-control-sm"
                  value={slotStart}
                  onChange={(e) => setSlotStart(e.target.value)}
                  style={{ borderRadius: 8, border: '1.5px solid #e5dfd7', width: 120 }}
                />
              </div>
              <div>
                <label className={styles.formLabel} style={{ marginBottom: '0.25rem' }}>End</label>
                <input
                  type="time"
                  className="form-control form-control-sm"
                  value={slotEnd}
                  onChange={(e) => setSlotEnd(e.target.value)}
                  style={{ borderRadius: 8, border: '1.5px solid #e5dfd7', width: 120 }}
                />
              </div>
              <button type="button" className={`${styles.btnPrimary} ${styles.btnSmall}`} onClick={addSlot}>
                Add slot
              </button>
            </div>

            <div className={styles.formHint} style={{ marginBottom: '0.5rem' }}>
              {slots.length}/{MAX_SLOTS} slots · End must be after start
            </div>

            {slots.length > 0 ? (
              <div style={{ display: 'grid', gap: '0.4rem' }}>
                {slots.map((s, idx) => (
                  <div
                    key={`${s.day}-${s.startTime}-${idx}`}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #e5dfd7', background: '#fdfbf8' }}
                  >
                    <span className={styles.tag} style={{ background: 'transparent', padding: 0, fontSize: '0.88rem' }}>
                      {dayLabel(s.day)} · {s.startTime} – {s.endTime}
                    </span>
                    <button type="button" className={`${styles.btnDanger} ${styles.btnSmall}`} style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={() => removeSlot(idx)}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#8a7e78', fontSize: '0.88rem' }}>No slots added yet. Students will still be able to request sessions.</p>
            )}
          </div>

          <hr className={styles.divider} />

          {/* Confirmation */}
          {confirming && (
            <div className={styles.alertWarning} style={{ marginBottom: '1rem' }}>
              Please review all details above before confirming. Your profile will be {isActive ? 'visible' : 'hidden'} to students{!isFree ? ` at Rs ${hourlyRate || 0}/hr` : ''}.
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className={styles.btnPrimary} disabled={submitting} type="submit">
              {submitting ? 'Saving…' : confirming ? `Confirm & ${isEditing ? 'update' : 'create'}` : 'Review details'}
            </button>
            {confirming && (
              <button type="button" className={styles.btnSecondary} onClick={() => setConfirming(false)}>
                Go back
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
