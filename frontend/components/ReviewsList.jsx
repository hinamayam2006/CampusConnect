'use client';

import StarRating from './StarRating';
import RelativeTime from './RelativeTime';

export default function ReviewsList({ items = [], emptyText = 'No reviews yet.' }) {
  if (!items.length) {
    return <div className="text-secondary">{emptyText}</div>;
  }

  return (
    <div className="d-grid gap-2">
      {items.map((review) => (
        <div key={review._id} className="border rounded-3 p-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="fw-semibold">{review.reviewer?.name || 'User'}</div>
            <div className="text-secondary small"><RelativeTime value={review.createdAt} /></div>
          </div>
          <StarRating value={Number(review.rating || 0)} disabled />
          {review.comment ? <div className="mt-2 text-secondary">{review.comment}</div> : null}
        </div>
      ))}
    </div>
  );
}
