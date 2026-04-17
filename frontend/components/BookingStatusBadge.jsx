'use client';

const STATUS_MAP = {
  pending: { bg: '#fdf8ec', color: '#c4880a', label: 'Pending' },
  confirmed: { bg: '#fff0e8', color: '#cf6a3e', label: 'Confirmed' },
  cancelled: { bg: '#fdf0f0', color: '#d44b4b', label: 'Cancelled' },
  completed: { bg: '#e6f9ef', color: '#3a9668', label: 'Completed' },
};

export default function BookingStatusBadge({ status }) {
  const cfg = STATUS_MAP[status] || { bg: '#f0f0f0', color: '#666', label: status };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.2rem 0.65rem',
        borderRadius: 999,
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.02em',
        background: cfg.bg,
        color: cfg.color,
        textTransform: 'capitalize',
        transition: 'transform 0.2s ease',
      }}
    >
      {cfg.label}
    </span>
  );
}
