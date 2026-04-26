/**
 * @deprecated M-2 AUDIT: Not imported anywhere — functional duplicate of
 * <UnifiedReportModal targetType="Note" targetId={noteId} />.
 * Remove this file in next cleanup sprint and migrate any future usages to UnifiedReportModal.
 */
'use client';


import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function NoteReportModal({ isOpen, onClose, noteId, noteTitle }) {
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reportReasons = [
    { value: 'spam', label: 'Spam or misleading content' },
    { value: 'inappropriate', label: 'Inappropriate or offensive content' },
    { value: 'copyright', label: 'Copyright violation' },
    { value: 'low_quality', label: 'Low quality or not useful' },
    { value: 'other', label: 'Other reason' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason) {
      toast.error('Please select a reason for reporting');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post(`/notes/${noteId}/report`, {
        reason,
        comment: comment.trim()
      });

      const data = response.data;
      
      if (data.success) {
        toast.success(data.message);
        
        // Show additional info if content was auto-flagged
        if (data.data?.wasAutoFlagged) {
          toast.success('This content has been automatically flagged for admin review due to multiple reports.');
        }
        
        onClose();
        // Reset form
        setReason('');
        setComment('');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
      setReason('');
      setComment('');
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
      onClick={handleClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem',
          borderBottom: '1px solid #E5E7EB'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={20} style={{ color: '#F59E0B' }} />
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#1F2937' }}>
              Report Content
            </h3>
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.5rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              color: '#6B7280',
              padding: '0.25rem'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: '#6B7280' }}>
              Reporting: <strong>{noteTitle}</strong>
            </p>
            <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', color: '#9CA3AF', lineHeight: '1.4' }}>
              Help us maintain a quality learning environment. Reports are reviewed by our community moderation system.
            </p>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
              Reason for reporting <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '0.875rem',
                backgroundColor: 'white'
              }}
            >
              <option value="">Select a reason</option>
              {reportReasons.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
              Additional details (optional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Provide any additional context that might help us review this content..."
              maxLength={500}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '0.875rem',
                minHeight: '100px',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#9CA3AF', textAlign: 'right' }}>
              {comment.length}/500
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#6B7280',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !reason}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: submitting || !reason ? '#9CA3AF' : '#EF4444',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: submitting || !reason ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
