'use client';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, X, Shield, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function UnifiedReportModal({ 
  isOpen, 
  onClose, 
  targetModel, 
  targetId, 
  targetTitle,
  targetDescription 
}) {
  const [reason, setReason] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reasons, setReasons] = useState([]);
  const [sensitivity, setSensitivity] = useState('medium');
  const [threshold, setThreshold] = useState(3);
  const [loading, setLoading] = useState(true);

  const fetchReportReasons = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/moderation/reasons?targetModel=${targetModel}`);
      if (response.data.success) {
        setReasons(response.data.data.reasons);
        setSensitivity(response.data.data.sensitivity);
        setThreshold(response.data.data.threshold);
      }
    } catch (error) {
      console.error('Failed to fetch report reasons:', error);
      toast.error('Failed to load report options');
    } finally {
      setLoading(false);
    }
  }, [targetModel]);

  useEffect(() => {
    if (!isOpen || !targetModel) return undefined;

    const timer = setTimeout(() => {
      void fetchReportReasons();
    }, 0);

    return () => clearTimeout(timer);
  }, [isOpen, targetModel, fetchReportReasons]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason) {
      toast.error('Please select a reason for reporting');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/moderation/report', {
        targetModel,
        targetId,
        reason,
        comment: comment.trim()
      });

      const data = response.data;
      
      if (data.success) {
        toast.success(data.message);
        
        // Show additional info based on action taken
        if (data.data?.wasAutoActioned) {
          const actionMessages = {
            'shadow_banned': 'This content has been immediately removed due to safety concerns.',
            'flagged': 'This content has been flagged for admin review.',
            'warning_badge': 'A warning badge has been added to this content.',
            'hidden': 'This content has been hidden pending admin review.'
          };
          
          const actionMsg = actionMessages[data.data.autoAction];
          if (actionMsg) {
            setTimeout(() => toast.success(actionMsg), 1000);
          }
        }
        
        // Show threshold info
        if (data.data?.reportCount && data.data?.threshold) {
          const remaining = data.data.threshold - data.data.reportCount;
          if (remaining > 0) {
            setTimeout(() => {
              toast(`${remaining} more report${remaining > 1 ? 's' : ''} needed for action`, {
                icon: 'ℹ️',
                duration: 4000
              });
            }, 2000);
          }
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

  const getSensitivityIcon = () => {
    switch (sensitivity) {
      case 'high': return <Shield size={16} style={{ color: '#DC2626' }} />;
      case 'medium': return <AlertCircle size={16} style={{ color: '#F59E0B' }} />;
      case 'low': return <AlertTriangle size={16} style={{ color: '#6B7280' }} />;
      default: return <AlertTriangle size={16} />;
    }
  };

  const getSensitivityColor = () => {
    switch (sensitivity) {
      case 'high': return '#DC2626';
      case 'medium': return '#F59E0B';
      case 'low': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getSensitivityText = () => {
    switch (sensitivity) {
      case 'high': return 'High Priority - Immediate Action';
      case 'medium': return 'Medium Priority - Admin Review';
      case 'low': return 'Low Priority - Community Moderation';
      default: return 'Standard Review';
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
          {/* Content Info */}
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: '#6B7280' }}>
              Reporting: <strong>{targetTitle}</strong>
            </p>
            {targetDescription && (
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.75rem', color: '#9CA3AF' }}>
                {targetDescription}
              </p>
            )}
          </div>

          {/* Sensitivity Indicator */}
          {!loading && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              borderRadius: '6px',
              backgroundColor: `${getSensitivityColor()}10`,
              border: `1px solid ${getSensitivityColor()}30`,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {getSensitivityIcon()}
              <span style={{ fontSize: '0.875rem', color: getSensitivityColor(), fontWeight: 500 }}>
                {getSensitivityText()}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#6B7280', marginLeft: 'auto' }}>
                Threshold: {threshold} report{threshold > 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Report Reason */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>
              Reason for reporting <span style={{ color: '#EF4444' }}>*</span>
            </label>
            {loading ? (
              <div style={{ padding: '0.75rem', textAlign: 'center', color: '#6B7280' }}>
                Loading report options...
              </div>
            ) : (
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
                {reasons.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Additional Details */}
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

          {/* Action Buttons */}
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
              disabled={submitting || !reason || loading}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: (submitting || !reason || loading) ? '#9CA3AF' : '#EF4444',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: (submitting || !reason || loading) ? 'not-allowed' : 'pointer'
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
