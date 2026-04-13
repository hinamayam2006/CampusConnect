'use client';

import Link from 'next/link';
import { ShoppingBag, BookMarked, PlusCircle, List } from 'lucide-react';
import useStore from '../../store/useStore';

export default function MarketplaceHubPage() {
  const { user } = useStore();

  return (
    <div className="container py-4 py-md-5">
      <div className="mc-hero">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3">
          <div>
            <h1 className="mb-2">Marketplace</h1>
            <p className="mb-0 text-secondary">
              Two lanes: everyday items and course-linked textbooks & study materials — filtered by department,
              semester, and course code.
            </p>
          </div>
          {user && (
            <Link href="/marketplace/create" className="btn btn-primary d-inline-flex align-items-center gap-2">
              <PlusCircle size={20} /> New listing
            </Link>
          )}
        </div>
      </div>

      <div className="mc-grid-2 mb-4">
        <Link href="/marketplace/general" className="mc-tile">
          <span className="mc-badge mb-2">General</span>
          <h3 className="d-flex align-items-center gap-2">
            <ShoppingBag size={22} /> Items &amp; gear
          </h3>
          <p className="text-secondary small mb-0">
            Electronics, furniture, sports, dorm essentials — everything that is not tied to a single course.
          </p>
        </Link>
        <Link href="/marketplace/textbooks" className="mc-tile">
          <span className="mc-badge mb-2">Academic</span>
          <h3 className="d-flex align-items-center gap-2">
            <BookMarked size={22} /> Textbooks &amp; study material
          </h3>
          <p className="text-secondary small mb-0">
            Filter by course code, semester, and department. Perfect for buy, rent, or exchange.
          </p>
        </Link>
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <Link href="/marketplace/my-listings" className="mc-tile h-100">
            <h3 className="d-flex align-items-center gap-2">
              <List size={22} /> My listings
            </h3>
            <p className="text-secondary small mb-0">Track what you have posted and keep buyers informed.</p>
          </Link>
        </div>
        <div className="col-md-6">
          <Link href="/marketplace/recommendations" className="mc-tile h-100">
            <h3>For you</h3>
            <p className="text-secondary small mb-0">
              Recommendations based on what you browse and search (requires sign-in).
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
