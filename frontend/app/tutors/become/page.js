'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Plus, X, GraduationCap, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from '../../tutoring/tutoring.module.css';
import { createTutorProfile, updateTutorProfile, fetchMyTutorProfile } from '../../../lib/apiRequests';
import useRequireAuth from '../../../lib/useRequireAuth';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i < 10 ? '0' + i : '' + i;
  return h + ':00';
});

const PAYMENT_METHODS = ['EasyPaisa', 'JazzCash', 'Bank Transfer', 'Cash', 'Other'];

function parseCourses(text) {
  return text.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
}

export default function BecomeTutorPage() {
  useRequireAuth();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [profileId, setProfileId] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  const [bio, setBio]                       = useState('');
  const [contactEmail, setContactEmail]     = useState('');
  const [coursesText, setCoursesText]       = useState('');
  const [isFree, setIsFree]                 = useState(false);
  const [hourlyRate, setHourlyRate]         = useState('');
  const [paymentMethod, setPaymentMethod]   = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [slots, setSlots]                   = useState([]);

  // new slot form
  const [slotDay, setSlotDay]     = useState(() => new Date().toISOString().split('T')[0]);
  const [slotStart, setSlotStart] = useState('09:00');
  const [slotEnd, setSlotEnd]     = useState('11:00');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchMyTutorProfile();
        const profile = res?.data?.data || res?.data;
        if (profile && profile._id) {
          setIsEditing(true);
          setProfileId(profile._id);
          setBio(profile.bio || '');
          setCoursesText((profile.courses || []).join(', '));
          setIsFree(profile.isFree || false);
          setHourlyRate(profile.hourlyRate ? String(profile.hourlyRate) : '');
          setContactEmail(profile.contactEmail || '');
          setPaymentMethod(profile.paymentMethod || '');
          setPaymentInstructions(profile.paymentInstructions || '');
          setSlots(profile.availabilitySlots || []);
        }
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const addSlot = () => {
    if (slotEnd <= slotStart) return toast.error('End time must be after start time.');
    const dup = slots.find((s) => s.day === slotDay && s.startTime === slotStart);
    if (dup) return toast.error('This slot already exists.');
    setSlots((p) => [...p, { day: slotDay, startTime: slotStart, endTime: slotEnd }]);
  };

  const removeSlot = (i) => setSlots((p) => p.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!bio.trim()) return toast.error('Please write a short bio.');
    if (!coursesText.trim()) return toast.error('Please list at least one subject.');
    if (!contactEmail.trim()) return toast.error('Please provide a contact email.');
    if (!isFree && !hourlyRate) return toast.error('Enter your hourly rate or mark as free.');
    setSaving(true);
    try {
      const payload = {
        bio: bio.trim(),
        contactEmail: contactEmail.trim(),
        courses: parseCourses(coursesText),
        isFree,
        hourlyRate: isFree ? 0 : Number(hourlyRate),
        paymentMethod,
        paymentInstructions,
        availabilitySlots: slots,
      };
      let res;
      if (isEditing && profileId) {
        res = await updateTutorProfile(profileId, payload);
      } else {
        res = await createTutorProfile(payload);
      }
      if (isEditing) {
        toast.success('Profile updated!');
        router.push('/tutors/' + profileId);
      } else {
        const created = res?.data?.data || res?.data;
        toast.success('Tutor profile created! You can now be booked by students.');
        router.push(created?._id ? '/tutors/' + created._id : '/tutors');
      }
    } catch (err) {
      toast.error(err?.message || err?.response?.data?.message || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.container} style={{ maxWidth: 700 }}>
        <div className={styles.skeleton} style={{ height: 260 }} />
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className={styles.container} style={{ maxWidth: 700 }}>
        <Link href="/tutors" className={styles.btnSecondary} style={{ marginBottom: '1.25rem', display: 'inline-flex' }}>
          <ArrowLeft size={14} /> Back to Tutors
        </Link>

        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>{isEditing ? 'Edit Tutor Profile' : 'Become a Tutor'}</h1>
            <p className={styles.pageSubtitle}>Share your knowledge and help fellow students succeed.</p>
          </div>
        </div>

        {/* Bio */}
        <div className={styles.formSection}>
          <p className={styles.formTitle}><GraduationCap size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />About You</p>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Bio *</label>
            <textarea
              className={`${styles.fieldInput} ${styles.fieldTextarea}`}
              placeholder="Tell students about your experience, teaching style, and strengths…"
              value={bio}
              rows={4}
              onChange={(e) => setBio(e.target.value)}
            />
            <p className={styles.charCount}>{bio.length} / 500 characters</p>
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Contact Email *</label>
            <input
              type="email"
              className={styles.fieldInput}
              placeholder="e.g. yourname@university.edu"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
            <p className={styles.charCount}>Shown to students who book sessions with you.</p>
          </div>
          <div className={styles.field} style={{ marginTop: '0.75rem' }}>
            <label className={styles.fieldLabel}>Subjects / Courses *</label>
            <textarea
              className={`${styles.fieldInput} ${styles.fieldTextarea}`}
              placeholder="e.g. CS101, Calculus, Organic Chemistry — separate with commas or new lines"
              value={coursesText}
              rows={2}
              onChange={(e) => setCoursesText(e.target.value)}
            />
          </div>
        </div>

        {/* Pricing */}
        <div className={styles.formSection}>
          <p className={styles.formTitle}>Pricing</p>
          <label className={styles.toggle} style={{ marginBottom: '1rem' }}>
            <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
            <span className={styles.toggleSlider} />
            <span className={styles.toggleLabel}>Offer free tutoring</span>
          </label>
          {!isFree && (
            <div className={styles.fieldGroup}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Hourly Rate (PKR) *</label>
                <input
                  type="number"
                  min="0"
                  className={styles.fieldInput}
                  placeholder="e.g. 500"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Payment Method</label>
                <select className={`${styles.fieldInput} ${styles.fieldSelect}`} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="">Select method</option>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                <label className={styles.fieldLabel}>Payment Details (e.g. account number)</label>
                <input
                  className={styles.fieldInput}
                  placeholder="e.g. 0300-1234567"
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Availability */}
        <div className={styles.formSection}>
          <p className={styles.formTitle}>Availability</p>
          {slots.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              {slots.map((s, i) => (
                <div key={i} className={styles.slotRow}>
                  <span className={styles.slotDayBadge}>{s.day.length > 6 ? new Date(s.day + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : s.day.slice(0, 3)}</span>
                  <span className={styles.slotTime}>{s.startTime} – {s.endTime}</span>
                  <button type="button" className={styles.slotRemove} onClick={() => removeSlot(i)}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className={styles.field} style={{ flex: '1 1 140px' }}>
              <label className={styles.fieldLabel}>Date</label>
              <input
                type="date"
                className={styles.fieldInput}
                value={slotDay}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSlotDay(e.target.value)}
              />
            </div>
            <div className={styles.field} style={{ flex: '1 1 110px' }}>
              <label className={styles.fieldLabel}>From</label>
              <select className={`${styles.fieldInput} ${styles.fieldSelect}`} value={slotStart} onChange={(e) => setSlotStart(e.target.value)}>
                {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div className={styles.field} style={{ flex: '1 1 110px' }}>
              <label className={styles.fieldLabel}>To</label>
              <select className={`${styles.fieldInput} ${styles.fieldSelect}`} value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)}>
                {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <button type="button" className={styles.btnSecondary} style={{ flexShrink: 0, marginBottom: '0.35rem' }} onClick={addSlot}>
              <Plus size={14} /> Add Slot
            </button>
          </div>
        </div>

        <div className={styles.formActions}>
          <Link href="/tutors" className={styles.btnSecondary}>Cancel</Link>
          <button type="button" className={styles.btnPrimary} disabled={saving} onClick={handleSubmit}>
            {saving ? 'Saving…' : <>{isEditing ? 'Save Changes' : 'Apply to Tutor'} <ArrowRight size={14} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
