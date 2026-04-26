'use client';

import { useState } from 'react';
import styles from '../app/request-approval.module.css'; // H-7 FIX: was '../request-approval.module.css' (wrong dir)

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

  const handleDeclineClick = () => setShowDeclineConfirm(true);

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
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {!showDeclineConfirm ? (
          <>
            <div className={styles.modalHeader}>
              <div>
                <h2>Incoming Request</h2>
                <p className={styles.modalSubtitle}>Review and respond to this request</p>
              </div>
              <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
            </div>

            <div className={styles.modalBody}>
              {/* Requester Info */}
              <div className={styles.requesterCard}>
                <div className={styles.requesterAvatar}>
                  {(request.requester?.name || '?')[0].toUpperCase()}
                </div>
                <div className={styles.requesterDetails}>
                  <h4 className={styles.requesterName}>{request.requester?.name}</h4>
                  <p className={styles.requesterDept}>{request.requester?.department}</p>
                </div>
              </div>

              {/* Request Message */}
              {request.message && (
                <div className={styles.messageSection}>
                  <p className={styles.messageSectionLabel}>Message from requester</p>
                  <div className={styles.messageBox}>
                    <span className={styles.messageQuote}>{'"'}</span>
                    {request.message}
                  </div>
                </div>
              )}

              {/* Ride-specific */}
              {request.context === 'ride' && request.seatsRequested > 1 && (
                <div className={styles.detailPill}>
                  💺 Requesting <strong>{request.seatsRequested}</strong> seats
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.btnGhost} onClick={onClose} disabled={isLoading}>
                Later
              </button>
              <button className={styles.btnDecline} onClick={handleDeclineClick} disabled={isLoading}>
                {isLoading ? <><span className={styles.btnSpinner}></span> Processing…</> : '✕ Decline'}
              </button>
              <button className={styles.btnApprove} onClick={() => onApprove(request._id)} disabled={isLoading}>
                {isLoading ? <><span className={styles.btnSpinner}></span> Processing…</> : '✓ Approve'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.modalHeader}>
              <div>
                <h2>Confirm Decline</h2>
                <p className={styles.modalSubtitle}>This action will notify the requester</p>
              </div>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.declineWarning}>
                ⚠️ Are you sure you want to decline this request?
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="declineReason">
                  Optional reason <span style={{ color: '#9ca3af', fontWeight: 400 }}>(shown to requester)</span>
                </label>
                <textarea
                  id="declineReason"
                  className={styles.formControl}
                  rows="3"
                  placeholder="E.g., Item already sold, No longer available…"
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnGhost} onClick={handleCancelDecline} disabled={isLoading}>
                Go back
              </button>
              <button className={styles.btnDecline} onClick={handleConfirmDecline} disabled={isLoading}>
                {isLoading ? <><span className={styles.btnSpinner}></span> Processing…</> : 'Confirm Decline'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}