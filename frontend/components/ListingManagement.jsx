'use client';

import { useEffect, useState } from 'react';
import styles from './listing-management.module.css';
import { markListingCompleted } from '../lib/apiRequests';
import api from '../lib/api';
import useStore from '../store/useStore';

/**
 * ListingManagement
 * Component for managing user's marketplace listings
 * Allows edit, delete, and mark as completed
 */
export default function ListingManagement({ showHeader = true }) {
  const store = useStore();
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    loadListings();
  }, []);

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

  const handleEditClick = (listing) => {
    setSelectedListing(listing);
    setEditFormData({
      title: listing.title,
      description: listing.description,
      price: listing.price || '',
      condition: listing.condition || '',
    });
    setShowEditModal(true);
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
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      setActionLoading(true);
      setError(null);
      await api.delete(`/marketplace/listings/${listingId}`);
      setSuccess('Listing deleted successfully');
      await loadListings();
    } catch (err) {
      setError(err.message || 'Failed to delete listing');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkCompleted = async (listingId) => {
    if (!confirm('This will mark the listing as sold. Continue?')) return;

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
          <p>You don't have any listings yet</p>
        </div>
      ) : (
        <div className={styles.listingGrid}>
          {listings.map((listing) => (
            <div key={listing._id} className={styles.listingCard}>
              {listing.images && listing.images[0] && (
                <img
                  src={listing.images[0]}
                  alt={listing.title}
                  className={styles.listingImage}
                />
              )}

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
                  {listing.status === 'active' && (
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
                        Mark Complete
                      </button>
                    </>
                  )}
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDelete(listing._id)}
                    disabled={actionLoading}
                  >
                    Delete
                  </button>
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
    </div>
  );
}
