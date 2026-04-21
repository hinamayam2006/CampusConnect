'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import api from '../../../lib/api';
import { uploadImage } from '../../../lib/apiRequests';
import useStore from '../../../store/useStore';
import { DEPARTMENTS } from '../../../lib/campusConstants';

const YEARS = [1, 2, 3, 4];

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, updateUser } = useStore();
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    year: '',
    avatar: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user?._id) {
      router.replace('/login');
      return;
    }

    setFormData({
      name: user.name || '',
      department: user.department || '',
      year: user.year ? String(user.year) : '',
      avatar: user.avatar || '',
    });
  }, [user, router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const res = await uploadImage(file);
      const url = res?.data?.url || '';
      if (!url) throw new Error('No URL returned from upload');
      setFormData((prev) => ({ ...prev, avatar: url }));
      toast.success('Profile picture uploaded. Save profile to apply changes.');
    } catch (err) {
      toast.error(err?.message || 'Avatar upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = {
        name: formData.name.trim(),
        department: formData.department,
        year: Number(formData.year),
        avatar: formData.avatar || '',
      };

      const res = await api.put('/auth/profile', payload);
      const updated = res?.data?.data?.user;
      if (updated) updateUser(updated);

      toast.success('Profile updated successfully');
      router.push(`/profile/${user._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container py-4 py-md-5" style={{ maxWidth: 760 }}>
      <Link href={user?._id ? `/profile/${user._id}` : '/'} className="small">
        ← Back
      </Link>

      <div className="bg-white rounded-3 shadow-sm border p-4 mt-3">
        <h1 className="h3 mb-1">Edit profile</h1>
        <p className="text-secondary mb-4">Update your personal details and profile photo.</p>

        <form onSubmit={handleSubmit}>
          <div className="d-flex align-items-center gap-3 mb-4">
            {formData.avatar ? (
              <Image
                src={formData.avatar}
                alt="Profile avatar"
                width={84}
                height={84}
                unoptimized
                style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e9ecef' }}
              />
            ) : (
              <div
                className="d-flex align-items-center justify-content-center"
                style={{ width: 84, height: 84, borderRadius: '50%', background: '#e9f2ff', fontWeight: 700, color: '#0d6efd' }}
              >
                {String(formData.name || user?.name || 'U').slice(0, 1).toUpperCase()}
              </div>
            )}

            <div>
              <label className="form-label">Profile picture</label>
              <input
                type="file"
                accept="image/*"
                className="form-control"
                onChange={handleAvatarUpload}
                disabled={uploading}
              />
              <div className="form-text">{uploading ? 'Uploading image...' : 'JPG/PNG recommended.'}</div>
            </div>
          </div>

          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>


            <div className="col-md-6">
              <label className="form-label">Department</label>
              <select
                className="form-select"
                name="department"
                value={formData.department}
                onChange={handleChange}
                required
              >
                <option value="">Select department</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="col-md-6">
              <label className="form-label">Year</label>
              <select
                className="form-select"
                name="year"
                value={formData.year}
                onChange={handleChange}
                required
              >
                <option value="">Select year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>Year {y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="d-flex gap-2 mt-4">
            <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link href={user?._id ? `/profile/${user._id}` : '/'} className="btn btn-outline-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
