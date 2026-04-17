'use client';

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const current = Math.max(1, page);
  const maxPages = Math.max(1, totalPages);

  const start = Math.max(1, current - 2);
  const end = Math.min(maxPages, start + 4);
  const pages = [];
  for (let i = start; i <= end; i += 1) pages.push(i);

  return (
    <nav aria-label="Pagination">
      <ul className="pagination mb-0">
        <li className={`page-item ${current === 1 ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(current - 1)} type="button">
            Previous
          </button>
        </li>
        {pages.map((p) => (
          <li key={p} className={`page-item ${p === current ? 'active' : ''}`}>
            <button className="page-link" onClick={() => onPageChange(p)} type="button">
              {p}
            </button>
          </li>
        ))}
        <li className={`page-item ${current === maxPages ? 'disabled' : ''}`}>
          <button className="page-link" onClick={() => onPageChange(current + 1)} type="button">
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}
