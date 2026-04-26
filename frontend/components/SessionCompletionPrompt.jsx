'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { formatDate } from '@/lib/utils';

/**
 * L-6 FIX: Extracted from tutor/page.js to a shared component.
 * Prompts the tutor to mark a session as completed or no-show.
 */
export default function SessionCompletionPrompt({ booking, onDismiss, onMarkCompleted, onMarkNoShow }) {
  const [loading, setLoading] = useState(false);

  const handleCompleted = async () => {
    setLoading(true);
    try {
      await onMarkCompleted(booking._id);
      onDismiss();
    } catch (error) {
      console.error('Error marking as completed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNoShow = async () => {
    setLoading(true);
    try {
      await onMarkNoShow(booking._id);
      onDismiss();
    } catch (error) {
      console.error('Error marking as no-show:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!booking) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <Bell size={20} style={{ color: '#F59E0B', marginRight: '8px' }} />
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1F2937' }}>
            Session Completion Required
          </h3>
        </div>
        
        <p style={{ color: '#6B7280', marginBottom: '16px', lineHeight: '1.5' }}>
          Your tutoring session with <strong>{booking.student?.name || 'Student'}</strong> for <strong>{booking.course}</strong> appears to have ended. Please confirm the session status:
        </p>
        
        <div style={{
          backgroundColor: '#F3F4F6',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <div style={{ marginBottom: '4px' }}><strong>Student:</strong> {booking.student?.name}</div>
          <div style={{ marginBottom: '4px' }}><strong>Course:</strong> {booking.course}</div>
          <div style={{ marginBottom: '4px' }}><strong>Time:</strong> {formatDate(booking.scheduledAt)}</div>
          <div><strong>Duration:</strong> {booking.durationMinutes} minutes</div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={handleNoShow}
            disabled={loading}
            style={{
              padding: '8px 16px',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#6B7280',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {loading ? 'Processing...' : 'No Show'}
          </button>
          <button
            onClick={handleCompleted}
            disabled={loading}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#10B981',
              color: 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            {loading ? 'Processing...' : 'Completed'}
          </button>
        </div>
      </div>
    </div>
  );
}
