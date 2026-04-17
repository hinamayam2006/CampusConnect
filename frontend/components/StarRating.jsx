'use client';

export default function StarRating({ value = 0, onChange, disabled = false }) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="d-flex gap-1">
      {stars.map((star) => {
        const isActive = star <= value;
        return (
          <button
            key={star}
            type="button"
            className={`btn btn-sm ${isActive ? 'btn-warning' : 'btn-outline-secondary'}`}
            onClick={() => !disabled && onChange?.(star)}
            disabled={disabled}
            aria-label={`Rate ${star}`}
          >
            {isActive ? '★' : '☆'}
          </button>
        );
      })}
    </div>
  );
}
