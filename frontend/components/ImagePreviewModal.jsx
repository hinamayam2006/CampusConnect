'use client';

import styles from '../app/tutoring/tutoring.module.css';

/**
 * Reusable Image Preview Modal
 * Used by both Student and Tutor dashboards for payment proof viewing
 */
export default function ImagePreviewModal({ isOpen, imageUrl, onClose, title = 'Image Preview' }) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className={styles.proofModalOverlay}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={styles.proofModal}>
        <div className={styles.proofModalHeader}>
          <span>{title}</span>
          <button
            type="button"
            className={`${styles.btnSecondary} ${styles.btnSmall}`}
            onClick={onClose}
          >
            Close
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title}
          className={styles.proofModalImage}
        />
        <div className={styles.proofModalActions}>
          <a
            href={imageUrl}
            className={`${styles.btnSecondary} ${styles.btnSmall}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open full
          </a>
          <a
            href={imageUrl}
            className={`${styles.btnPrimary} ${styles.btnSmall}`}
            download
          >
            Download
          </a>
        </div>
      </div>
    </div>
  );
}
