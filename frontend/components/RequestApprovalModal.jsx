'use client';

import { useState } from 'react';
import styles from '../request-approval.module.css';

/**
 * RequestApprovalModal
 * Modal for owner to approve or decline a request
 * Displays confirmation for decline action
 */
export default function RequestApprovalModal({
  request,
  isOpen,
  onClose,
  onApprove,
  onDecline,
  isLoading,
}) {
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  if (!isOpen || !request) return null;

  const handleDeclineClick = () => {
    setShowDeclineConfirm(true);
  };

  const handleConfirmDecline = async () => {
    await onDecline(request._id, declineReason);
    setShowDeclineConfirm(false);
    setDeclineReason('');
  };

  const handleCancelDecline = () => {
    setShowDeclineConfirm(false);
    setDeclineReason('');
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
      >
        {!showDeclineConfirm ? (
          <>
            <div className={styles.modalHeader}>
              <h2>New Request</h2>
              <button
                className={styles.closeBtn}
                onClick={onClose}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Requester Info */}
              <div className={styles.requesterInfo}>
                <img
                  src={request.requester?.avatar || '/default-avatar.png'}
                  alt={request.requester?.name}
                  className={styles.requesterAvatar}
                />
                <div className={styles.requesterDetails}>
                  <h4>{request.requester?.name}</h4>
                  <p className={styles.department}>
                    {request.requester?.department}
                  </p>
                  <p className={styles.trustScore}>
                    ⭐ Trust Score: {request.requester?.trustScore || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Request Message */}
              {request.message && (
                <div className={styles.messageSection}>
                  <h5>Message</h5>
                  <p>{request.message}</p>
                </div>
              )}

              {/* Request Details */}
              {request.context === 'ride' && request.seatsRequested > 1 && (
                <div className={styles.requestDetails}>
                  <p>
                    <strong>Seats Requested:</strong> {request.seatsRequested}
                  </p>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                className="btn btn-outline-secondary"
                onClick={onClose}
                disabled={isLoading}
              >
                Later
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeclineClick}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Decline'}
              </button>
              <button
                className="btn btn-success"
                onClick={() => onApprove(request._id)}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Approve'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.modalHeader}>
              <h2>Confirm Decline</h2>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.confirmText}>
                Are you sure you want to decline this request?
              </p>

              <div className={styles.formGroup}>
                <label htmlFor="declineReason">
                  Optional Reason (will be shown to requester)
                </label>
                <textarea
                  id="declineReason"
                  className="form-control"
                  rows="3"
                  placeholder="E.g., Item already sold, No longer available..."
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className="btn btn-outline-secondary"
                onClick={handleCancelDecline}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmDecline}
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : 'Confirm Decline'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
