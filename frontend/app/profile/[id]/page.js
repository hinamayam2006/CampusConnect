'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  User, BookOpen, Car, ShoppingBag, Package,
  MapPin, Shield, Eye, EyeOff, Edit3,
  FileText, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { uploadImage } from '../../../lib/apiRequests';
import useStore from '../../../store/useStore';
import styles from '../profile.module.css';

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function relativeTime(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
}

function getActivityHref(item) {
  switch (item._activityType) {
    case 'note': return '/notes/' + item._id;
    case 'ride': return '/rides/' + item._id;
    case 'listing': return '/marketplace/' + item._id;
    case 'borrowing': return '/borrow/' + item._id;
    default: return '#';
  }
}

const DEPARTMENTS = ['SEECS','ASAB','SADA','NBS','SCME','SNS','SMME','USPCASE','NICE','IESE','IGIS','S3H','NLS'];

function PersonalInfoTab({ profile }) {
  const { updateUser } = useStore();
  const [form, setForm] = useState({
    name: profile.name || '',
    bio: profile.bio || '',
    department: profile.department || '',
    year: profile.year ? String(profile.year) : '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(profile.avatar || '');

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const res = await uploadImage(file);
      const url = res?.data?.url || '';
      if (!url) throw new Error('No URL returned');
      setAvatarPreview(url);
      toast.success('Photo ready — save to apply.');
    } catch (err) {
      toast.error(err?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        bio: form.bio.trim(),
        department: form.department,
        year: Number(form.year) || undefined,
        avatar: avatarPreview || undefined,
      };
      const res = await api.put('/auth/profile', payload);
      const updated = res?.data?.data?.user;
      if (updated) updateUser(updated);
      toast.success('Profile saved.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.formSection}>
      <h2 className={styles.sectionTitle}>Personal Information</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        {avatarPreview
          ? <img src={avatarPreview} alt="preview" className={styles.avatar} style={{ width: 64, height: 64 }} />
          : <div className={styles.avatarInitials} style={{ width: 64, height: 64, fontSize: '1.4rem' }}>{getInitials(form.name)}</div>
        }
        <label className={styles.btnOutline} style={{ cursor: 'pointer' }}>
          {uploading ? 'Uploading...' : 'Change Photo'}
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} disabled={uploading} />
        </label>
      </div>
      <div className={styles.fieldGroup}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Full Name</label>
          <input className={styles.fieldInput} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Department</label>
          <select className={`${styles.fieldInput} ${styles.fieldSelect}`} value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}>
            <option value="">Select department</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Year of Study</label>
          <select className={`${styles.fieldInput} ${styles.fieldSelect}`} value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}>
            <option value="">Select year</option>
            {[1,2,3,4].map((y) => <option key={y} value={y}>{y}{ordinal(y)} Year</option>)}
          </select>
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Bio</label>
        <textarea className={`${styles.fieldInput} ${styles.fieldTextarea}`} value={form.bio} placeholder="Tell other students a bit about yourself..." onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} rows={3} />
      </div>
      <div className={styles.formActions}>
        <button type="button" className={styles.btnSave} disabled={saving} onClick={handleSave}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

const ACTIVITY_META = {
  note:      { label: 'Note',      Icon: FileText,    cls: 'typeNote'   },
  ride:      { label: 'Ride',      Icon: Car,         cls: 'typeRide'   },
  listing:   { label: 'Listing',   Icon: ShoppingBag, cls: 'typeMarket' },
  borrowing: { label: 'Borrowing', Icon: Package,     cls: 'typeBorrow' },
};

function ActivityTab({ items, loading }) {
  if (loading) return (
    <div className={styles.activityList}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ height: 64, borderRadius: 14, background: '#e8e2d9' }} />
      ))}
    </div>
  );
  if (!items.length) return (
    <div className={styles.emptyActivity}>
      <div className={styles.emptyActivityIcon}><Clock size={40} /></div>
      <p className={styles.emptyActivityText}>No activity yet. Share a note, post a ride, or list an item.</p>
    </div>
  );
  return (
    <div className={styles.activityList}>
      {items.map((item) => {
        const meta = ACTIVITY_META[item._activityType] || ACTIVITY_META.note;
        const { Icon } = meta;
        return (
          <Link key={item._id + item._activityType} href={getActivityHref(item)} className={styles.activityCard}>
            <div className={styles.activityIcon}><Icon size={18} /></div>
            <div className={styles.activityBody}>
              <p className={styles.activityTitle}>{item.title || item.originName || item.name || 'Untitled'}</p>
              <div className={styles.activityMeta}>
                <span className={`${styles.activityType} ${styles[meta.cls]}`}>{meta.label}</span>
                <span>{relativeTime(item.createdAt)}</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState({ profilePublic: true, showEmail: false, allowMessages: true, showActivity: true });
  const toggle = (key) => setSettings((p) => ({ ...p, [key]: !p[key] }));
  const SETTINGS_LIST = [
    { key: 'profilePublic', name: 'Public Profile',  desc: 'Other students can find and view your profile.' },
    { key: 'showEmail',     name: 'Show Email',       desc: 'Display your email on your public profile.' },
    { key: 'allowMessages', name: 'Allow Messages',   desc: 'Let other students contact you about listings.' },
    { key: 'showActivity',  name: 'Show Activity',    desc: 'Display your notes and listings on your profile.' },
  ];
  return (
    <div className={styles.formSection}>
      <h2 className={styles.sectionTitle}>Privacy &amp; Preferences</h2>
      <div className={styles.settingsList}>
        {SETTINGS_LIST.map(({ key, name, desc }) => (
          <div key={key} className={styles.settingRow}>
            <div className={styles.settingLeft}>
              <span className={styles.settingName}>{name}</span>
              <span className={styles.settingDesc}>{desc}</span>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" checked={settings[key]} onChange={() => toggle(key)} />
              <span className={styles.toggleSlider} />
            </label>
          </div>
        ))}
      </div>
      <div className={styles.dangerZone}>
        <p className={styles.dangerTitle}>Danger Zone</p>
        <button type="button" className={styles.btnDanger} onClick={() => toast.error('Please contact support to delete your account.')}>
          <Shield size={14} /> Delete Account
        </button>
      </div>
    </div>
  );
}

/* ── Onboarding View (shown when own profile is empty / 404) ── */
function OnboardingView({ me, onComplete }) {
  const { updateUser } = useStore();
  const [form, setForm] = useState({
    name: me?.name || '',
    department: me?.department || '',
    year: me?.year ? String(me.year) : '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', {
        name: form.name.trim(),
        department: form.department,
        year: Number(form.year) || undefined,
        bio: form.bio.trim(),
      });
      const updated = res?.data?.data?.user;
      if (updated) updateUser(updated);
      toast.success('Profile created!');
      onComplete();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className="container" style={{ maxWidth: 560 }}>
        <div className={styles.identityCard} style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
          <div className={styles.avatarInitials} style={{ width: 72, height: 72, fontSize: '1.8rem', margin: '0 auto 1.25rem' }}>
            {getInitials(form.name || me?.name || '?')}
          </div>
          <h1 className={styles.identityName} style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>Complete your profile</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 2rem' }}>
            Set up your student identity so others can find and connect with you.
          </p>
          <div className={styles.fieldGroup} style={{ textAlign: 'left' }}>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Full Name</label>
              <input className={styles.fieldInput} value={form.name} placeholder="Your full name" onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Department</label>
              <select className={`${styles.fieldInput} ${styles.fieldSelect}`} value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))}>
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Year of Study</label>
              <select className={`${styles.fieldInput} ${styles.fieldSelect}`} value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))}>
                <option value="">Select year</option>
                {[1,2,3,4].map((y) => <option key={y} value={y}>{y}{ordinal(y)} Year</option>)}
              </select>
            </div>
          </div>
          <div className={styles.field} style={{ textAlign: 'left', marginTop: '0.5rem' }}>
            <label className={styles.fieldLabel}>Bio (optional)</label>
            <textarea className={`${styles.fieldInput} ${styles.fieldTextarea}`} value={form.bio} placeholder="Tell other students about yourself..." rows={3} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} />
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <button type="button" className={styles.btnSave} disabled={saving} onClick={handleSave} style={{ width: '100%', justifyContent: 'center', gap: '0.4rem' }}>
              {saving ? 'Saving...' : 'Create My Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { id } = useParams();
  const { user: me } = useStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');
  const [publicView, setPublicView] = useState(false);
  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const isSelf = me && String(me._id) === String(id);

  const loadProfile = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get(`/users/${id}`);
      if (res.data.success) setProfile(res.data.data);
    } catch { setProfile(null); }
    finally { setLoading(false); }
  }, [id]);

  const loadActivity = useCallback(async () => {
    if (!isSelf) return;
    setActivityLoading(true);
    try {
      const [notes, rides, listings, borrowings] = await Promise.allSettled([
        api.get('/notes?mine=true&limit=10'),
        api.get('/rides?mine=true&limit=10'),
        api.get('/marketplace/listings?mine=true&limit=10'),
        api.get('/borrowings?mine=true&limit=10'),
      ]);
      const merged = [
        ...(notes.status === 'fulfilled'      ? (notes.value.data?.data      || []).map((i) => ({ ...i, _activityType: 'note' }))      : []),
        ...(rides.status === 'fulfilled'      ? (rides.value.data?.data      || []).map((i) => ({ ...i, _activityType: 'ride' }))      : []),
        ...(listings.status === 'fulfilled'   ? (listings.value.data?.data   || []).map((i) => ({ ...i, _activityType: 'listing' }))   : []),
        ...(borrowings.status === 'fulfilled' ? (borrowings.value.data?.data || []).map((i) => ({ ...i, _activityType: 'borrowing' })) : []),
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setActivity(merged);
    } catch { setActivity([]); }
    finally { setActivityLoading(false); }
  }, [isSelf]);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  useEffect(() => { if (tab === 'activity') loadActivity(); }, [tab, loadActivity]);

  if (loading) return (
    <div className={styles.page}>
      <div className="container" style={{ maxWidth: 760 }}>
        {[1,2,3].map((i) => <div key={i} style={{ height: i===1?200:60, borderRadius:16, background:'#e8e2d9', marginBottom:'1rem' }} />)}
      </div>
    </div>
  );

  if (!profile && isSelf) return <OnboardingView me={me} onComplete={loadProfile} />;

  if (!profile) return (
    <div className={styles.page}>
      <div className="container" style={{ maxWidth: 760, textAlign: 'center', paddingTop: '4rem' }}>
        <User size={48} style={{ color: '#d4ccbf', marginBottom: '1rem' }} />
        <p style={{ color: 'var(--text-secondary)' }}>This profile is not available.</p>
        <Link href="/" style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>Go home</Link>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      <div className="container" style={{ maxWidth: 760 }}>
        <div className={styles.identityCard}>
          <div className={styles.identityTop}>
            <div className={styles.avatarWrap}>
              {profile.avatar
                ? <img src={profile.avatar} alt={profile.name} className={styles.avatar} />
                : <div className={styles.avatarInitials}>{getInitials(profile.name)}</div>
              }
            </div>
            <div className={styles.identityInfo}>
              <h1 className={styles.identityName}>{profile.name}</h1>
              <div className={styles.identityBadges}>
                {profile.department && <span className={styles.deptBadge}><MapPin size={11} /> {profile.department}</span>}
                {profile.year && <span className={styles.deptBadge}><BookOpen size={11} /> {profile.year}{ordinal(profile.year)} Year</span>}
                {profile.role === 'admin' && <span className={styles.deptBadge}><Shield size={11} /> Admin</span>}
              </div>
              {profile.bio && <p className={styles.identityBio}>{profile.bio}</p>}
            </div>
            <div className={styles.identityActions}>
              {isSelf && !publicView && <Link href="/profile/edit" className={styles.btnEdit}><Edit3 size={14} /> Edit Profile</Link>}
              {isSelf && (
                <button type="button" className={styles.btnOutline} onClick={() => setPublicView((v) => !v)}>
                  {publicView ? <EyeOff size={14} /> : <Eye size={14} />}
                  {publicView ? 'My View' : 'Public'}
                </button>
              )}
            </div>
          </div>
          {publicView && <div className={styles.publicBanner}><Eye size={14} /> You are previewing your profile as other students see it.</div>}
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{profile.notesCount ?? profile.stats?.notes ?? 0}</span>
              <span className={styles.statLabel}>Notes Shared</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{profile.studentsTutored ?? profile.stats?.tutored ?? 0}</span>
              <span className={styles.statLabel}>Students Tutored</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{profile.reliabilityRating ? profile.reliabilityRating.toFixed(1) : '—'}</span>
              <span className={styles.statLabel}>Reliability</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{profile.listingsCount ?? 0}</span>
              <span className={styles.statLabel}>Listings</span>
            </div>
          </div>
        </div>
        {!publicView && isSelf && (
          <>
            <div className={styles.tabBar}>
              {[
                { key: 'info',     Icon: User,   label: 'Personal Info' },
                { key: 'activity', Icon: Clock,  label: 'My Activity'   },
                { key: 'settings', Icon: Shield, label: 'Settings'      },
              ].map(({ key, Icon, label }) => (
                <button key={key} type="button" className={`${styles.tab}${tab === key ? ' ' + styles.tabActive : ''}`} onClick={() => setTab(key)}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
            <div className={styles.tabContent}>
              {tab === 'info'     && <PersonalInfoTab profile={profile} />}
              {tab === 'activity' && <ActivityTab items={activity} loading={activityLoading} />}
              {tab === 'settings' && <SettingsTab />}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
