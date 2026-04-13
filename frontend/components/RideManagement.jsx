'use client';

import { useEffect, useState } from 'react';
import styles from './ride-management.module.css';
import { hidePassengerRide, markRideCompleted } from '../lib/apiRequests';
import api from '../lib/api';
import useStore from '../store/useStore';

/**
 * RideManagement
 * Component for managing user's rides
 * Allows edit, delete, and mark as completed
 */
export default function RideManagement({ showHeader = true }) {
  const store = useStore();
  const [ridesAsDriver, setRidesAsDriver] = useState([]);
  const [ridesAsPassenger, setRidesAsPassenger] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRide, setSelectedRide] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('driver');

  useEffect(() => {
    loadRides();
  }, []);

  const loadRides = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/rides/mine');
      setRidesAsDriver(response.data.data?.asDriver || []);
      setRidesAsPassenger(response.data.data?.asPassenger || []);
    } catch (err) {
      console.error('Error loading rides:', err);
      setError(err.message || 'Failed to load rides');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (ride) => {
    setSelectedRide(ride);
    setEditFormData({
      originName: ride.originName,
      destName: ride.destName,
      vehicleInfo: ride.vehicleInfo || '',
      notes: ride.notes || '',
      seatsTotal: ride.seatsTotal,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRide) return;

    try {
      setActionLoading(true);
      setError(null);
      await api.patch(`/rides/${selectedRide._id}`, editFormData);
      setSuccess('Ride updated successfully');
      setShowEditModal(false);
      await loadRides();
    } catch (err) {
      setError(err.message || 'Failed to update ride');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (rideId) => {
    if (!confirm('Are you sure you want to delete this ride?')) return;

    try {
      setActionLoading(true);
      setError(null);
      await api.delete(`/rides/${rideId}`);
      setSuccess('Ride deleted successfully');
      await loadRides();
    } catch (err) {
      setError(err.message || 'Failed to delete ride');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkCompleted = async (rideId) => {
    if (!confirm('Mark this ride as completed? This will close it from the listing.')) return;

    try {
      setActionLoading(true);
      setError(null);
      await markRideCompleted(rideId);
      setSuccess('Ride marked as completed');
      await loadRides();
    } catch (err) {
      setError(err.message || 'Failed to mark ride as completed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleHidePassengerRide = async (rideId) => {
    if (!confirm('Hide this ride from your passenger list?')) return;

    try {
      setActionLoading(true);
      setError(null);
      await hidePassengerRide(rideId);
      setSuccess('Ride hidden from your passenger list');
      await loadRides();
    } catch (err) {
      setError(err.message || 'Failed to hide ride');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status, departureTime) => {
    const now = new Date();
    const departure = new Date(departureTime);

    const classes = {
      scheduled: 'badge bg-info',
      full: 'badge bg-warning',
      completed: 'badge bg-danger',
      cancelled: 'badge bg-secondary',
    };

    const badge = classes[status] || 'badge bg-secondary';

    if (departure < now && status === 'scheduled') {
      return `${badge} (Past)`;
    }

    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderRideCard = (ride, isDriver) => (
    <div key={ride._id} className={styles.rideCard}>
      <div className={styles.cardHeader}>
        <div className={styles.routeInfo}>
          <h4>
            {ride.originName} → {ride.destName}
          </h4>
          <p className={styles.time}>{formatTime(ride.departureTime)}</p>
        </div>
        <span className={`badge ${ride.status === 'completed' ? 'bg-danger' : 'bg-info'}`}>
          {ride.status}
        </span>
      </div>

      {isDriver && (
        <div className={styles.driverInfo}>
          <p>Seats: {ride.seatsTotal - ride.seatsAvailable}/{ride.seatsTotal}</p>
          {ride.passengers && ride.passengers.length > 0 && (
            <div className={styles.passengers}>
              <strong>Passengers:</strong>
              <ul>
                {ride.passengers.map((p) => (
                  <li key={p._id || p.user._id}>
                    {p.user?.name || p.user} - {p.status}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!isDriver && (
        <div className={styles.driverInfo}>
          <div className="d-flex justify-content-between align-items-start gap-2">
            <div>
              <p>
                <strong>Driver:</strong> {ride.driver?.name}
              </p>
              <p className={styles.trust}>
                ⭐ Trust: {ride.driver?.trustScore || 'N/A'}
              </p>
            </div>
            <button
              className="btn btn-sm text-white"
              style={{ backgroundColor: '#6c1a1a', borderColor: '#6c1a1a' }}
              disabled={actionLoading}
              onClick={() => handleHidePassengerRide(ride._id)}
              title="Hide this ride"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {ride.vehicleInfo && (
        <p className={styles.vehicle}>🚗 {ride.vehicleInfo}</p>
      )}

      {ride.notes && (
        <p className={styles.notes}>{ride.notes}</p>
      )}

      <div className={styles.cardActions}>
        {isDriver && ride.status === 'scheduled' && (
          <>
            <button
              className="btn btn-sm btn-outline-primary"
              onClick={() => handleEditClick(ride)}
              disabled={actionLoading}
            >
              Edit
            </button>
            <button
              className="btn btn-sm btn-outline-warning"
              onClick={() => handleMarkCompleted(ride._id)}
              disabled={actionLoading}
            >
              Mark Complete
            </button>
          </>
        )}
        {isDriver && (
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={() => handleDelete(ride._id)}
            disabled={actionLoading}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      {showHeader && <h1 className={styles.title}>My Rides</h1>}

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

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`nav-link ${activeTab === 'driver' ? 'active' : ''}`}
          onClick={() => setActiveTab('driver')}
        >
          My Rides (Driver)
        </button>
        <button
          className={`nav-link ${activeTab === 'passenger' ? 'active' : ''}`}
          onClick={() => setActiveTab('passenger')}
        >
          Rides Joined (Passenger)
        </button>
      </div>

      {isLoading ? (
        <div className={styles.loading}>
          <p>Loading rides...</p>
        </div>
      ) : activeTab === 'driver' ? (
        ridesAsDriver.length === 0 ? (
          <div className={styles.emptyState}>
            <p>You haven't created any rides yet</p>
          </div>
        ) : (
          <div className={styles.ridesList}>
            {ridesAsDriver.map((ride) => renderRideCard(ride, true))}
          </div>
        )
      ) : ridesAsPassenger.length === 0 ? (
        <div className={styles.emptyState}>
          <p>You haven't joined any rides yet</p>
        </div>
      ) : (
        <div className={styles.ridesList}>
          {ridesAsPassenger.map((ride) => renderRideCard(ride, false))}
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
              <h2>Edit Ride</h2>
              <button
                className={styles.closeBtn}
                onClick={() => setShowEditModal(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Origin</label>
                <input
                  type="text"
                  className="form-control"
                  value={editFormData.originName || ''}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, originName: e.target.value })
                  }
                />
              </div>

              <div className={styles.formGroup}>
                <label>Destination</label>
                <input
                  type="text"
                  className="form-control"
                  value={editFormData.destName || ''}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, destName: e.target.value })
                  }
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Vehicle Info</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., White Honda Civic"
                    value={editFormData.vehicleInfo || ''}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        vehicleInfo: e.target.value,
                      })
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Total Seats</label>
                  <input
                    type="number"
                    className="form-control"
                    min="1"
                    max="8"
                    value={editFormData.seatsTotal || 1}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        seatsTotal: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Notes</label>
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder="Additional information"
                  value={editFormData.notes || ''}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      notes: e.target.value,
                    })
                  }
                />
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
