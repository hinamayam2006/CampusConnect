'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { Clock, Users, Car, X } from 'lucide-react';
import styles from './ride-management.module.css';
import { hidePassengerRide, markRideCompleted } from '../lib/apiRequests';
import api from '../lib/api';

function toLocalDateTimeInput(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (part) => String(part).padStart(2, '0');

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + `T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatRideTime(value) {
  return new Date(value).toLocaleString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function RideManagement({ showHeader = true }) {
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

  const loadRides = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/rides/mine');
      setRidesAsDriver(response.data.data?.asDriver || []);
      setRidesAsPassenger(response.data.data?.asPassenger || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load rides');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadRides();
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const openEditModal = (ride) => {
    setSelectedRide(ride);
    setEditFormData({
      originName: ride.originName || '',
      destName: ride.destName || '',
      departureTime: toLocalDateTimeInput(ride.departureTime),
      vehicleInfo: ride.vehicleInfo || '',
      notes: ride.notes || '',
      seatsTotal: ride.seatsTotal || 1,
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedRide(null);
    setEditFormData({});
  };

  const handleSaveEdit = async () => {
    if (!selectedRide) return;
    if (!editFormData.departureTime) {
      setError('Departure time is required');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      await api.patch(`/rides/${selectedRide._id}`, {
        ...editFormData,
        departureTime: new Date(editFormData.departureTime).toISOString(),
        seatsTotal: Number(editFormData.seatsTotal),
      });

      setSuccess('Ride updated successfully');
      closeEditModal();
      await loadRides();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update ride');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (rideId) => {
    if (!window.confirm('Delete this ride? This will remove it from carpooling.')) return;

    try {
      setActionLoading(true);
      setError(null);
      await api.delete(`/rides/${rideId}`);
      setSuccess('Ride deleted successfully');
      await loadRides();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete ride');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkCompleted = async (rideId) => {
    if (!window.confirm('Mark this ride as completed?')) return;

    try {
      setActionLoading(true);
      setError(null);
      await markRideCompleted(rideId);
      setSuccess('Ride marked as completed');
      await loadRides();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to mark ride as completed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleHidePassengerRide = async (rideId) => {
    if (!window.confirm('Hide this ride from your joined rides list?')) return;

    try {
      setActionLoading(true);
      setError(null);
      await hidePassengerRide(rideId);
      setSuccess('Ride hidden from your list');
      await loadRides();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to hide ride');
    } finally {
      setActionLoading(false);
    }
  };

  const renderDriverRideCard = (ride) => {
    const seatsTaken = Math.max(0, (ride.seatsTotal || 0) - (ride.seatsAvailable || 0));

    return (
      <div key={ride._id} className={styles.rideCard}>
        <div className={styles.cardTop}>
          <div>
            <div className={styles.routeTitle}>{ride.originName} to {ride.destName}</div>
            <div className={styles.routeMeta}>{formatRideTime(ride.departureTime)}</div>
          </div>
          <span className={`${styles.statusPill} ${styles[`status${ride.status}`] || styles.statusDefault}`}>
            {ride.status}
          </span>
        </div>

        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            <Users size={13} />
            <span className={styles.metaLabel}>Filled</span>
            {seatsTaken}/{ride.seatsTotal}
          </span>
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Available</span>
            {ride.seatsAvailable} seat{ride.seatsAvailable !== 1 ? 's' : ''}
          </span>
        </div>

        {(ride.vehicleInfo || ride.notes) && (
          <div className={styles.infoBlock}>
            {ride.vehicleInfo && <p className={styles.infoText}><strong>Vehicle:</strong> {ride.vehicleInfo}</p>}
            {ride.notes && <p className={styles.infoText}><strong>Notes:</strong> {ride.notes}</p>}
          </div>
        )}

        {ride.passengers?.length > 0 && (
          <div className={styles.passengerBlock}>
            <div className={styles.sectionLabel}>Passengers</div>
            <div className={styles.passengerList}>
              {ride.passengers.map((passenger, index) => (
                <div key={`${ride._id}-${index}`} className={styles.passengerItem}>
                  <span>{passenger.user?.name || 'Passenger'}</span>
                  <span className={styles.passengerMeta}>
                    {passenger.seatsRequested || 1} seat{passenger.seatsRequested > 1 ? 's' : ''} • {passenger.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.cardActions}>
          <Link href={`/rides/${ride._id}`} className={styles.btnView}>
            View ride
          </Link>
          {ride.status !== 'completed' && ride.status !== 'cancelled' && (
            <>
              <button type="button" className={styles.btnOutline} onClick={() => openEditModal(ride)} disabled={actionLoading}>
                Edit
              </button>
              <button type="button" className={styles.btnOutline} onClick={() => handleMarkCompleted(ride._id)} disabled={actionLoading}>
                Mark complete
              </button>
            </>
          )}
          <button type="button" className={styles.btnDanger} onClick={() => handleDelete(ride._id)} disabled={actionLoading}>
            Delete
          </button>
        </div>
      </div>
    );
  };

  const renderPassengerRideCard = (ride) => (
    <div key={ride._id} className={styles.rideCard}>
      <div className={styles.cardTop}>
        <div>
          <div className={styles.routeTitle}>{ride.originName} to {ride.destName}</div>
          <div className={styles.routeMeta}>{formatRideTime(ride.departureTime)}</div>
        </div>
        <span className={`${styles.statusPill} ${styles[`status${ride.status}`] || styles.statusDefault}`}>
          {ride.status}
        </span>
      </div>

      <div className={styles.infoBlock}>
        <p className={styles.infoText}><strong>Driver:</strong> {ride.driver?.name || 'Driver'}</p>
        <p className={styles.infoText}><strong>Department:</strong> {ride.driver?.department || 'N/A'}</p>
        {ride.vehicleInfo && <p className={styles.infoText}><strong>Vehicle:</strong> {ride.vehicleInfo}</p>}
        {ride.notes && <p className={styles.infoText}><strong>Notes:</strong> {ride.notes}</p>}
      </div>

      <div className={styles.cardActions}>
        <Link href={`/rides/${ride._id}`} className={styles.btnView}>
          View ride
        </Link>
        <button type="button" className={styles.btnOutline} onClick={() => handleHidePassengerRide(ride._id)} disabled={actionLoading}>
          Hide
        </button>
      </div>
    </div>
  );

  const activeList = activeTab === 'driver' ? ridesAsDriver : ridesAsPassenger;

  return (
    <div className={styles.container}>
      {showHeader && (
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>My rides</h1>
            <p className={styles.subtitle}>Manage the rides you host and the trips you have joined.</p>
          </div>
          <Link href="/rides/create" className={styles.btnView}>
            Offer a ride
          </Link>
        </div>
      )}

      {error && (
        <div className={styles.alertError}>
          <span>{error}</span>
          <button type="button" className={styles.alertClose} onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {success && (
        <div className={styles.alertSuccess}>
          <span>{success}</span>
          <button type="button" className={styles.alertClose} onClick={() => setSuccess(null)}><X size={14} /></button>
        </div>
      )}

      <div className={styles.segmentedTabs}>
        <button
          type="button"
          className={`${styles.segmentButton} ${activeTab === 'driver' ? styles.segmentButtonActive : ''}`}
          onClick={() => setActiveTab('driver')}
        >
          Hosting
        </button>
        <button
          type="button"
          className={`${styles.segmentButton} ${activeTab === 'passenger' ? styles.segmentButtonActive : ''}`}
          onClick={() => setActiveTab('passenger')}
        >
          Joined rides
        </button>
      </div>

      {isLoading ? (
        <div className={styles.emptyState}>Loading rides...</div>
      ) : activeList.length === 0 ? (
        <div className={styles.emptyState}>
          {activeTab === 'driver' ? "You haven't posted any rides yet." : "You haven't joined any rides yet."}
        </div>
      ) : (
        <div className={styles.cardList}>
          {activeTab === 'driver'
            ? ridesAsDriver.map(renderDriverRideCard)
            : ridesAsPassenger.map(renderPassengerRideCard)}
        </div>
      )}

      <Modal show={showEditModal} onHide={closeEditModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit ride</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Pickup label</Form.Label>
              <Form.Control
                type="text"
                value={editFormData.originName || ''}
                onChange={(e) => setEditFormData((current) => ({ ...current, originName: e.target.value }))}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Drop-off label</Form.Label>
              <Form.Control
                type="text"
                value={editFormData.destName || ''}
                onChange={(e) => setEditFormData((current) => ({ ...current, destName: e.target.value }))}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Departure</Form.Label>
              <Form.Control
                type="datetime-local"
                value={editFormData.departureTime || ''}
                onChange={(e) => setEditFormData((current) => ({ ...current, departureTime: e.target.value }))}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Seats</Form.Label>
              <Form.Control
                type="number"
                min="1"
                max="8"
                value={editFormData.seatsTotal || 1}
                onChange={(e) => setEditFormData((current) => ({ ...current, seatsTotal: e.target.value }))}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Vehicle</Form.Label>
              <Form.Control
                type="text"
                value={editFormData.vehicleInfo || ''}
                onChange={(e) => setEditFormData((current) => ({ ...current, vehicleInfo: e.target.value }))}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={editFormData.notes || ''}
                onChange={(e) => setEditFormData((current) => ({ ...current, notes: e.target.value }))}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeEditModal} disabled={actionLoading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveEdit} disabled={actionLoading}>
            {actionLoading ? 'Saving...' : 'Save changes'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
