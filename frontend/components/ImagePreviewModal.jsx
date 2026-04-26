'use client';

import { useState, useEffect } from 'react';
import styles from '../app/tutoring/tutoring.module.css';

/**
 * Reusable Image Preview Modal
 * Used by both Student and Tutor dashboards for payment proof viewing
 */
export default function ImagePreviewModal({ isOpen, imageUrl, onClose, title = 'Image Preview' }) {
  const [isDownloading, setIsDownloading] = useState(false);

  // Handle page visibility to fix white screen when returning from external URLs
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isOpen) {
        // Page became visible again while modal is open
        // This might happen when user returns from external URL
        // Force a refresh of the modal content
        const img = document.querySelector(`.${styles.proofModalImage}`);
        if (img && img.src === imageUrl) {
          // Force image reload
          const currentSrc = img.src;
          img.src = '';
          setTimeout(() => {
            img.src = currentSrc;
          }, 100);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen, imageUrl]);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      // Fetch the image as a blob to bypass CORS issues
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Failed to fetch image');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `payment-proof-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up object URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab with noreferrer to avoid navigation issues
      const newWindow = window.open(imageUrl, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        // If popup is blocked, try direct navigation
        window.location.href = imageUrl;
      }
    } finally {
      setIsDownloading(false);
    }
  };

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
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: '#1A1A1A',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500'
            }}
          >
            × Close
          </button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title}
          className={styles.proofModalImage}
        />
        <div className={styles.proofModalActions}>
          <button
            type="button"
            className={`${styles.btnSecondary} ${styles.btnSmall}`}
            onClick={handleDownload}
            disabled={isDownloading}
            style={{
              background: '#6B7280',
              color: 'white',
              border: 'none',
              cursor: isDownloading ? 'not-allowed' : 'pointer'
            }}
          >
            {isDownloading ? 'Downloading...' : 'Download'}
          </button>
        </div>
      </div>
    </div>
  );
}
