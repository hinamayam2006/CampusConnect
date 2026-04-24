'use client';

const overlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  backdropFilter: 'blur(8px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1050,
  padding: '1rem',
};

const card = {
  background: '#ffffff',
  border: '1px solid #E8E2D9',
  borderRadius: '20px',
  padding: '2rem',
  maxWidth: '420px',
  width: '100%',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
};

const titleStyle = {
  fontFamily: 'var(--font-playfair)',
  fontSize: '1.1rem',
  fontWeight: 700,
  color: '#1A1A1A',
  margin: '0 0 0.65rem',
};

const messageStyle = {
  fontSize: '0.88rem',
  color: '#6B6B6B',
  margin: '0 0 1.5rem',
  lineHeight: 1.55,
};

const footer = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '0.6rem',
};

const btnCancel = {
  padding: '0.5rem 1.25rem',
  borderRadius: '10px',
  border: '1px solid #D4CCBF',
  background: 'transparent',
  color: '#6B6B6B',
  fontSize: '0.85rem',
  fontFamily: 'var(--font-inter)',
  fontWeight: 500,
  cursor: 'pointer',
};

const btnConfirmBase = {
  padding: '0.5rem 1.25rem',
  borderRadius: '10px',
  border: 'none',
  fontSize: '0.85rem',
  fontFamily: 'var(--font-inter)',
  fontWeight: 600,
  cursor: 'pointer',
};

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message = 'Please confirm this action.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  const isDanger = confirmVariant === 'danger';
  const btnConfirm = {
    ...btnConfirmBase,
    background: isDanger ? '#EF4444' : '#1A1A1A',
    color: '#ffffff',
  };

  return (
    <div style={overlay} role="dialog" aria-modal="true">
      <div style={card}>
        <p style={titleStyle}>{title}</p>
        <p style={messageStyle}>{message}</p>
        <div style={footer}>
          <button type="button" style={btnCancel} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" style={btnConfirm} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
