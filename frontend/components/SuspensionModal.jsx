'use client';

import { X, Mail, AlertTriangle } from 'lucide-react';

export default function SuspensionModal({ isOpen, onClose, suspensionReason, userEmail }) {
  if (!isOpen) return null;

  const handleAppealClick = () => {
    window.location.href = '/appeal';
  };

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
        zIndex: 9999,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          padding: '2rem',
          textAlign: 'center',
          color: 'white',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            <X size={16} />
          </button>
          
          <AlertTriangle size={48} style={{ marginBottom: '1rem' }} />
          <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem', fontWeight: 700 }}>
            Account Suspended
          </h2>
          <p style={{ margin: 0, fontSize: '1rem', opacity: 0.9 }}>
            Your account has been temporarily suspended
          </p>
        </div>

        {/* Content */}
        <div style={{ padding: '2rem' }}>
          {/* Suspension Details */}
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ margin: '0 0 1rem', color: '#991b1b', fontSize: '1.1rem', fontWeight: 600 }}>
              Suspension Details
            </h3>
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ margin: '0 0 0.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
                <strong>Reason:</strong>
              </p>
              <p style={{ margin: '0', color: '#111827', fontSize: '1rem', lineHeight: 1.5 }}>
                {suspensionReason || 'Violation of community guidelines'}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 0.5rem', color: '#6b7280', fontSize: '0.9rem' }}>
                <strong>Email on file:</strong>
              </p>
              <p style={{ margin: '0', color: '#111827', fontSize: '1rem' }}>
                {userEmail || 'Not available'}
              </p>
            </div>
          </div>

          {/* What This Means */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#374151', fontSize: '1.1rem', fontWeight: 600 }}>
              What This Means
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#4b5563', lineHeight: 1.6 }}>
              <li style={{ marginBottom: '0.5rem' }}>You cannot log in to your account</li>
              <li style={{ marginBottom: '0.5rem' }}>Your existing content remains visible to others</li>
              <li style={{ marginBottom: '0.5rem' }}>You cannot create new content or interact</li>
              <li style={{ marginBottom: '0' }}>This suspension is permanent until reviewed</li>
            </ul>
          </div>

          {/* Appeal Options */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#374151', fontSize: '1.1rem', fontWeight: 600 }}>
              Appeal Your Suspension
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {/* Email Appeal */}
              <div style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #dbeafe',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <Mail size={24} style={{ color: '#1e40af', flexShrink: 0 }} />
                <div>
                  <p style={{ margin: '0 0 0.5rem', color: '#1e40af', fontWeight: 600 }}>
                    Check Your Email
                  </p>
                  <p style={{ margin: 0, color: '#1e40af', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    We sent a suspension email to your registered email address. 
                    You can reply directly to that email with your appeal.
                  </p>
                </div>
              </div>

              {/* Web Appeal */}
              <div style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <p style={{ margin: '0 0 0.5rem', color: '#166534', fontWeight: 600 }}>
                  Submit Web Appeal
                </p>
                <p style={{ margin: '0 0 1rem', color: '#15803d', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  If you didn&apos;t receive the email or prefer to submit online, use our appeal form.
                </p>
                <button
                  onClick={handleAppealClick}
                  style={{
                    backgroundColor: '#166534',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.75rem 1.5rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  Go to Appeal Form
                </button>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '1rem'
          }}>
            <p style={{ margin: 0, color: '#92400e', fontSize: '0.9rem', lineHeight: 1.5 }}>
              <strong>Response Time:</strong> We typically review appeals within 24-48 hours. 
              You will receive a response via email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
