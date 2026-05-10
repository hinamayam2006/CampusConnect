'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Upload, ArrowRight, Calendar, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from '../../../tutoring/tutoring.module.css';
import { fetchTutorById, createBooking, uploadPaymentProof, uploadImage } from '../../../../lib/apiRequests';
import useRequireAuth from '../../../../lib/useRequireAuth';

const DURATIONS = [30, 45, 60, 90, 120];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function timeToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return NaN;
  const [h, m] = hhmm.split(':').map((n) => Number(n));
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

function normalizeDayLabel(day) {
  return String(day || '').trim().toLowerCase();
}

function isIsoDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
}

function getScheduledParts(datetimeLocalValue) {
  const value = String(datetimeLocalValue || '');
  const [datePart = '', timePartRaw = ''] = value.split('T');
  const timePart = timePartRaw.slice(0, 5);
  const dateObj = new Date(value);
  const dayName = Number.isNaN(dateObj.getTime()) ? '' : DAY_NAMES[dateObj.getDay()];
  return { datePart, timePart, dayName };
}

function slotMatchesSchedule(slot, { datePart, dayName, startMinutes, endMinutes }) {
  if (!slot) return false;

  const slotDay = normalizeDayLabel(slot.day);
  const schedDay = normalizeDayLabel(dayName);

  const dayOk = isIsoDateString(slot.day)
    ? normalizeDayLabel(datePart) === slotDay
    : schedDay && (slotDay === schedDay || slotDay.startsWith(schedDay.slice(0, 3)));

  if (!dayOk) return false;

  const slotStart = timeToMinutes(slot.startTime);
  const slotEnd = timeToMinutes(slot.endTime);
  if (Number.isNaN(slotStart) || Number.isNaN(slotEnd)) return false;

  return startMinutes >= slotStart && endMinutes <= slotEnd;
}

function findMatchingSlotIndex(slots, scheduledAt, durationMinutes) {
  if (!Array.isArray(slots) || !slots.length) return null;
  if (!scheduledAt) return null;

  const { datePart, timePart, dayName } = getScheduledParts(scheduledAt);
  const startMinutes = timeToMinutes(timePart);
  if (!datePart || Number.isNaN(startMinutes)) return null;
  const endMinutes = startMinutes + Number(durationMinutes || 0);

  for (let i = 0; i < slots.length; i++) {
    if (slotMatchesSchedule(slots[i], { datePart, dayName, startMinutes, endMinutes })) {
      return i;
    }
  }
  return null;
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function BookTutorPage() {
  const { isReady } = useRequireAuth();
  const { id }  = useParams();
  const router  = useRouter();

  const [tutor, setTutor]           = useState(null);
  const [loading, setLoading]       = useState(true);

  // form state
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [scheduledAt, setScheduledAt]   = useState('');
  const [duration, setDuration]         = useState(60);
  const [course, setCourse]             = useState('');
  const [message, setMessage]           = useState('');
  const [paymentFile, setPaymentFile]   = useState(null);
  const [paymentPreview, setPaymentPreview] = useState('');
  const [submitting, setSubmitting]     = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetchTutorById(id);
        setTutor(res?.data?.data || res?.data || null);
      } catch {
        toast.error('Could not load tutor.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handlePaymentFile = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.target.files[0];
    if (!file) return;
    setPaymentFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPaymentPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const clearPaymentFile = () => {
    setPaymentFile(null);
    setPaymentPreview('');
    // Clear the file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!isReady) return toast.error('Please wait a moment… signing you in.');
    if (!scheduledAt) return toast.error('Please select a date and time.');
    if (!course.trim()) return toast.error('Please enter the course / subject.');

    // If tutor has availability slots, ensure selected time fits within one.
    const slots = tutor?.availabilitySlots || [];
    if (slots.length > 0) {
      const resolvedIndex =
        typeof selectedSlot === 'number'
          ? selectedSlot
          : findMatchingSlotIndex(slots, scheduledAt, duration);

      if (typeof resolvedIndex !== 'number') {
        return toast.error('Please select an available slot and choose a time within it.');
      }

      const { datePart, timePart, dayName } = getScheduledParts(scheduledAt);
      const startMinutes = timeToMinutes(timePart);
      const endMinutes = startMinutes + Number(duration || 0);
      const ok = slotMatchesSchedule(slots[resolvedIndex], { datePart, dayName, startMinutes, endMinutes });

      if (!ok) {
        const s = slots[resolvedIndex];
        return toast.error(`Please choose a time within this slot: ${s.day} ${s.startTime}–${s.endTime}.`);
      }

      if (selectedSlot !== resolvedIndex) setSelectedSlot(resolvedIndex);
    }

    const isFreeCheck = tutor?.isFree || tutor?.hourlyRate === 0;
    if (!isFreeCheck && !paymentFile) return toast.error('Please upload your payment screenshot before submitting.');
    setSubmitting(true);
    try {
      // Step 1: create the booking
      const bookingRes = await createBooking({
        tutorProfileId: id,
        scheduledAt,
        durationMinutes: duration,
        course: course.trim(),
        studentMessage: message.trim(),
      });

      // H-2 FIX: Explicit guard — never silently skip payment proof upload
      const booking = bookingRes?.data || bookingRes;
      const bookingId = booking?._id;
      if (!bookingId) {
        throw new Error('Booking created but ID was missing in the response. Please check your dashboard.');
      }

      // Step 2: upload payment proof if paid and file selected
      if (!isFreeCheck && paymentFile) {
        try {
          const upRes = await uploadImage(paymentFile, null, 'payment-proofs');
          // uploadImage returns: { success: true, data: { url } }
          const proofUrl = upRes?.data?.url || upRes?.url || '';
          if (!proofUrl) throw new Error('Payment screenshot upload failed.');

          await uploadPaymentProof(bookingId, { paymentProofUrl: proofUrl });

          toast.success('Booking request sent! The tutor will review your payment and confirm.');
          router.push('/tutoring');
        } catch (paymentErr) {
          toast.success('Booking request sent.');
          toast.error(paymentErr?.message || 'Payment proof upload failed. Please upload it from your student dashboard.');
          router.push('/dashboard/student');
        }
        return;
      }

      toast.success('Booking request sent!');
      router.push('/tutoring');
    } catch (err) {
      toast.error(err?.message || err?.response?.data?.message || 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.skeleton} style={{ height: 260, marginBottom: '1rem' }} />
        <div className={styles.skeleton} style={{ height: 200 }} />
      </div>
    </div>
  );

  if (!tutor) return (
    <div className={styles.page}>
      <div className={styles.container} style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <p style={{ color: '#6B6B6B', marginBottom: '1rem' }}>Tutor not found.</p>
        <Link href="/tutors" className={styles.btnSecondary}><ArrowLeft size={14} /> Back to Tutors</Link>
      </div>
    </div>
  );

  const slots    = tutor.availabilitySlots || [];
  const subjects = tutor.subjects || tutor.courses || [];
  const isFree   = tutor.isFree || tutor.hourlyRate === 0;
  const totalCost = isFree ? 0 : Math.round((tutor.hourlyRate || 0) * duration / 60);

  return (
    <div className={styles.page}>
      <div className={styles.container} style={{ maxWidth: 900 }}>
        <Link href={'/tutors/' + id} className={styles.btnSecondary} style={{ marginBottom: '1.25rem', display: 'inline-flex' }}>
          <ArrowLeft size={14} /> Back to Profile
        </Link>

        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Book a Session</h1>
            <p className={styles.pageSubtitle}>
              with {tutor.user?.name || 'your tutor'} &mdash; {isFree ? 'Free' : 'PKR ' + tutor.hourlyRate + '/hr'}
            </p>
          </div>
        </div>

        <div className={styles.bookingLayout}>
          {/* ── Left: Form ── */}
          <div>
            {/* Availability Slots */}
            {slots.length > 0 && (
              <div className={styles.formSection}>
                <p className={styles.formTitle}><Calendar size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />Select a Time Slot</p>
                <div className={styles.slotGrid}>
                  {slots.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      className={selectedSlot === i ? `${styles.slotPill} ${styles.pillActive}` : styles.slotPill}
                      style={{ cursor: 'pointer', border: '1px solid', borderColor: selectedSlot === i ? '#1A1A1A' : '#E8E2D9', fontFamily: 'var(--font-inter)', fontSize: '0.78rem', background: selectedSlot === i ? '#1A1A1A' : '#F2EDE4', color: selectedSlot === i ? '#fff' : '#1A1A1A', padding: '0.35rem 0.75rem', borderRadius: 8 }}
                      onClick={() => setSelectedSlot(i)}
                    >
                      {s.day} {s.startTime}–{s.endTime}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '0.78rem', color: '#9E9E9E', marginTop: '0.5rem' }}>
                  Select a slot, then choose a time within that slot below.
                </p>
              </div>
            )}

            {/* Date / Time */}
            <div className={styles.formSection}>
              <p className={styles.formTitle}><Clock size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />Session Details</p>
              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Date &amp; Time *</label>
                  <input
                    type="datetime-local"
                    className={styles.fieldInput}
                    value={scheduledAt}
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                  {slots.length > 0 && (
                    <p className={styles.charCount} style={{ marginTop: '0.35rem' }}>
                      Must be within an available slot.
                    </p>
                  )}
                </div>
                <div className={styles.field}>
                  <label className={styles.fieldLabel}>Duration *</label>
                  <select className={`${styles.fieldInput} ${styles.fieldSelect}`} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                    {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.field} style={{ marginTop: '0.75rem' }}>
                <label className={styles.fieldLabel}>Course / Subject *</label>
                <input
                  className={styles.fieldInput}
                  placeholder="e.g. CS101, Calculus, Organic Chemistry"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                />
                {subjects.length > 0 && (
                  <div className={styles.subjectList} style={{ marginTop: '0.4rem' }}>
                    {subjects.map((s, i) => (
                      <button key={i} type="button" className={styles.subjectPill} style={{ cursor: 'pointer' }} onClick={() => setCourse(s)}>{s}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.field} style={{ marginTop: '0.75rem' }}>
                <label className={styles.fieldLabel}>Message (optional)</label>
                <textarea
                  className={`${styles.fieldInput} ${styles.fieldTextarea}`}
                  placeholder="Describe what you need help with, specific topics, etc."
                  value={message}
                  rows={3}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            </div>

            {/* Payment Proof */}
            {!isFree && (
              <div className={styles.formSection}>
                <p className={styles.formTitle}>Payment Instructions</p>
                {/* Payment account info */}
                <div style={{ background: '#FFF7ED', border: '1.5px solid #FDE68A', borderRadius: 10, padding: '0.9rem 1rem', marginBottom: '0.85rem' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.88rem', color: '#92400E', marginBottom: '0.3rem' }}>Send payment before booking</p>
                  {tutor.paymentMethod && (
                    <p style={{ fontSize: '0.84rem', color: '#1A1A1A', margin: '0.15rem 0' }}>
                      <strong>Method:</strong> {tutor.paymentMethod}
                    </p>
                  )}
                  {tutor.paymentAccountNumber && (
                    <p style={{ fontSize: '0.84rem', color: '#1A1A1A', margin: '0.15rem 0' }}>
                      <strong>Account / Number:</strong> {tutor.paymentAccountNumber}
                    </p>
                  )}
                  {tutor.paymentInstructions && (
                    <p style={{ fontSize: '0.84rem', color: '#1A1A1A', margin: '0.15rem 0' }}>
                      <strong>Instructions:</strong> {tutor.paymentInstructions}
                    </p>
                  )}
                  <p style={{ fontSize: '0.78rem', color: '#92400E', marginTop: '0.4rem' }}>
                    After sending payment, upload your screenshot below. The tutor will verify and confirm your booking.
                  </p>
                </div>
                <p className={styles.formTitle} style={{ fontSize: '0.9rem' }}>Upload Payment Screenshot *</p>
                <label className={styles.proofWrap} style={{ cursor: 'pointer' }}>
                  {paymentPreview ? (
                    <div style={{ marginTop: '0.5rem', position: 'relative' }}>
                      <img 
                        src={paymentPreview} 
                        alt="Payment proof" 
                        style={{ 
                          width: '100%', 
                          maxWidth: '200px', 
                          height: 'auto', 
                          borderRadius: '8px',
                          border: '2px solid #E5E7EB',
                          objectFit: 'contain',
                          backgroundColor: '#f9f9f9',
                          cursor: 'default',
                          pointerEvents: 'none'
                        }} 
                        onClick={(e) => e.preventDefault()}
                        onDragStart={(e) => e.preventDefault()}
                      />
                      <button
                        type="button"
                        onClick={clearPaymentFile}
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-6px',
                          background: '#DC2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 1
                        }}
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '1.5rem', color: '#9E9E9E', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <Upload size={28} />
                      <span style={{ fontSize: '0.82rem' }}>Click to upload payment screenshot</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePaymentFile} />
                </label>
              </div>
            )}
          </div>

          {/* ── Right: Summary ── */}
          <div>
            <div className={styles.bookingCard}>
              <p className={styles.bookingTitle}>Booking Summary</p>
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#F2EDE4', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className={styles.tutorAvatar} style={{ width: 44, height: 44, fontSize: '0.9rem' }}>
                  {tutor.user?.avatar
                    ? <img src={tutor.user.avatar} alt={tutor.user?.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                    : initials(tutor.user?.name)
                  }
                </div>
                <div>
                  <p style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1A1A1A', margin: 0, fontFamily: 'var(--font-playfair), Georgia, serif' }}>{tutor.user?.name}</p>
                  {tutor.averageRating > 0 && <p style={{ fontSize: '0.74rem', color: '#9E9E9E', margin: 0 }}>★ {tutor.averageRating.toFixed(1)}</p>}
                </div>
              </div>

              <div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Duration</span>
                  <span className={styles.summaryVal}>{duration} min</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Rate</span>
                  <span className={styles.summaryVal}>{isFree ? 'Free' : 'PKR ' + tutor.hourlyRate + '/hr'}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Total</span>
                  <span className={styles.summaryVal} style={{ fontSize: '1rem', color: isFree ? '#16A34A' : '#1A1A1A' }}>
                    {isFree ? 'Free' : 'PKR ' + totalCost}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className={styles.btnPrimary}
                style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
                disabled={submitting || !isReady}
                onClick={handleSubmit}
              >
                {submitting ? 'Sending…' : <>Confirm Booking <ArrowRight size={14} /></>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
