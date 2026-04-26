'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './listing-management.module.css';
import { markListingCompleted, uploadImage } from '../lib/apiRequests';
import api from '../lib/api';
import ImageCarousel from './ImageCarousel';
import ConfirmDialog from './ConfirmDialog';

/**
 * ListingManagement
 * Component for managing user's marketplace listings
 * Allows edit, delete, and mark as completed
 */
export default function ListingManagement({ showHeader = true, statusFilter = 'all' }) {
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, listingId: null, force: false, message: '' });

  const loadListings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/marketplace/listings/mine');
      setListings(response.data.data || []);
    } catch (err) {
      console.error('Error loading listings:', err);
      setError(err.message || 'Failed to load listings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchListings = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await api.get('/marketplace/listings/mine');

        if (!cancelled) {
          setListings(response.data.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load listings');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchListings();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleListings = useMemo(() => {
    if (statusFilter === 'active') return listings.filter((listing) => listing.status === 'active');
    if (statusFilter === 'reserved') return listings.filter((listing) => listing.status === 'reserved');
    if (statusFilter === 'past') return listings.filter((listing) => listing.status === 'sold');
    return listings;
  }, [listings, statusFilter]);

  const handleEditClick = (listing) => {
    setSelectedListing(listing);
    setEditFormData({
      title: listing.title,
      description: listing.description,
      price: listing.price || '',
      condition: listing.condition || '',
      images: listing.images ? [...listing.images] : [],
    });
    setShowEditModal(true);
  };

  const handleEditImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const currentImages = editFormData.images || [];
    const remaining = Math.max(0, 6 - currentImages.length);
    if (remaining === 0) {
      setError('You can upload up to 6 images per listing');
      e.target.value = '';
      return;
    }

    setImageUploading(true);
    setImageUploadProgress(0);

    try {
      const nextUrls = [];
      const batch = files.slice(0, remaining);
      for (let index = 0; index < batch.length; index += 1) {
        const response = await uploadImage(batch[index], (pct) => {
          const base = Math.round((index / batch.length) * 100);
          setImageUploadProgress(base + Math.round(pct / batch.length));
        });
        const url = response?.data?.url || '';
        if (url) nextUrls.push(url);
      }

      if (nextUrls.length) {
        setEditFormData((current) => ({
          ...current,
          images: [...(current.images || []), ...nextUrls].slice(0, 6),
        }));
        setError(null);
      }
    } catch (err) {
      setError(err?.message || 'Image upload failed');
    } finally {
      setImageUploading(false);
      setImageUploadProgress(0);
      e.target.value = '';
    }
  };

  const removeEditImage = (urlToRemove) => {
    setEditFormData((current) => ({
      ...current,
      images: (current.images || []).filter((url) => url !== urlToRemove),
    }));
  };

  const handleSaveEdit = async () => {
    if (!selectedListing) return;

    try {
      setActionLoading(true);
      setError(null);
      await api.patch(`/marketplace/listings/${selectedListing._id}`, editFormData);
      setSuccess('Listing updated successfully');
      setShowEditModal(false);
      await loadListings();
    } catch (err) {
      setError(err.message || 'Failed to update listing');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (listingId) => {
    setDeleteDialog({
      open: true,
      listingId,
      force: false,
      message: 'Delete this listing? If there are pending requests, we will ask you to confirm again and notify requesters.',
    });
  };

  const executeDelete = async () => {
    if (!deleteDialog.listingId) return;

    try {
      setActionLoading(true);
      setError(null);
      const config = deleteDialog.force ? { params: { force: 'true' } } : undefined;
      await api.delete(`/marketplace/listings/${deleteDialog.listingId}`, config);
      setDeleteDialog({ open: false, listingId: null, force: false, message: '' });
      setSuccess('Listing deleted successfully');
      await loadListings();
    } catch (err) {
      if (err.response?.status === 409 && !deleteDialog.force) {
        setDeleteDialog({
          open: true,
          listingId: deleteDialog.listingId,
          force: true,
          message: `${err.response?.data?.message || 'This listing has pending requests.'} Requesters will be notified that you cancelled the listing.`,
        });
        return;
      }
      setDeleteDialog({ open: false, listingId: null, force: false, message: '' });
      setError(err.message || 'Failed to delete listing');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkCompleted = async (listingId) => {
    if (!confirm('This will mark the listing as sold and move it to past listings. Continue?')) return;

    try {
      setActionLoading(true);
      setError(null);
      await markListingCompleted(listingId);
      setSuccess('Listing marked as completed');
      await loadListings();
    } catch (err) {
      setError(err.message || 'Failed to mark listing as completed');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const classes = {
      active: 'badge bg-success',
      reserved: 'badge bg-warning',
      sold: 'badge bg-danger',
    };
    return classes[status] || 'badge bg-secondary';
  };

  return (
    <div className={styles.container}>
      {showHeader && <h1 className={styles.title}>My Listings</h1>}

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError(null)}
          ></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {success}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccess(null)}
          ></button>
        </div>
      )}

      {isLoading ? (
        <div className={styles.loading}>
          <p>Loading listings...</p>
        </div>
      ) : listings.length === 0 ? (
        <div className={styles.emptyState}>
          <p>{"You don't have any listings yet"}</p>
        </div>
      ) : visibleListings.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No listings in this section yet.</p>
        </div>
      ) : (
        <div className={styles.listingGrid}>
          {visibleListings.map((listing) => (
            <div key={listing._id} className={styles.listingCard}>
              {listing.images?.length ? (
                <ImageCarousel
                  images={listing.images}
                  alt={listing.title}
                  className={styles.listingImageWrap}
                  aspectRatio="16 / 9"
                  showDots={listing.images.length > 1}
                />
              ) : null}
              {!listing.images?.length && <div className={styles.listingImageEmpty}>No photo</div>}

              <div className={styles.cardContent}>
                <div className={styles.cardHeader}>
                  <h4>{listing.title}</h4>
                  <span className={getStatusBadge(listing.status)}>
                    {listing.status}
                  </span>
                </div>

                <p className={styles.category}>
                  {listing.category} • {listing.listingType}
                </p>

                {listing.price && (
                  <p className={styles.price}>Rs. {listing.price}</p>
                )}

                <p className={styles.description}>{listing.description.substring(0, 100)}...</p>

                {listing.courseCode && (
                  <p className={styles.meta}>📚 {listing.courseCode}</p>
                )}

                <div className={styles.cardActions}>
                  {listing.status !== 'sold' && (
                    <>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => handleEditClick(listing)}
                        disabled={actionLoading}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-outline-warning"
                        onClick={() => handleMarkCompleted(listing._id)}
                        disabled={actionLoading}
                      >
                        Mark Sold
                      </button>
                    </>
                  )}
                  {listing.status === 'active' && (
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDelete(listing._id)}
                      disabled={actionLoading}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>Edit Listing</h2>
              <button
                className={styles.closeBtn}
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Title</label>
                <input
                  type="text"
                  className="form-control"
                  value={editFormData.title || ''}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, title: e.target.value })
                  }
                />
              </div>

              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea
                  className="form-control"
                  rows="4"
                  value={editFormData.description || ''}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      description: e.target.value,
                    })
                  }
                />
              </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Price</label>
                    <input
                      type="number"
                    className="form-control"
                    value={editFormData.price || ''}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        price: e.target.value,
                      })
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Condition</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., Like New, Good, Fair"
                    value={editFormData.condition || ''}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        condition: e.target.value,
                      })
                    }
                      />
                  </div>
                </div>

              <div className={styles.formGroup}>
                <label>Photos</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="form-control"
                  onChange={handleEditImages}
                  disabled={imageUploading}
                />
                <small className="text-muted">
                  {imageUploading ? `Uploading... ${imageUploadProgress}%` : 'Add or replace listing photos. Up to 6 images total.'}
                </small>
                {imageUploading && (
                  <div style={{ marginTop: '0.4rem', height: 4, background: '#E5E7EB', borderRadius: 9999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#111827', borderRadius: 9999, width: `${imageUploadProgress}%`, transition: 'width 0.2s ease' }} />
                  </div>
                )}
                {(editFormData.images || []).length > 0 && (
                  <div className={styles.imagePreviewGrid}>
                    {(editFormData.images || []).map((url) => (
                      <div key={url} className={styles.imagePreviewWrap}>
                        <img src={url} alt="" className={styles.imagePreview} />
                        <button
                          type="button"
                          className={styles.imageRemoveBtn}
                          onClick={() => removeEditImage(url)}
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowEditModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveEdit}
                disabled={actionLoading}
              >
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteDialog.open}
        title={deleteDialog.force ? 'Confirm deletion with requests' : 'Delete listing?'}
        message={deleteDialog.message}
        confirmLabel={deleteDialog.force ? 'Delete anyway' : 'Delete'}
        cancelLabel="Cancel"
        confirmVariant="danger"
        placement="top-right"
        onConfirm={executeDelete}
        onCancel={() => setDeleteDialog({ open: false, listingId: null, force: false, message: '' })}
      />
    </div>
  );
}
