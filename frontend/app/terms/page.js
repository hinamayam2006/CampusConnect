'use client';
import { ArrowLeft } from 'lucide-react';
import styles from '../community.module.css';
import { useRouter } from 'next/navigation';

export default function TermsPage() {
  const router = useRouter();
  return (
    <div className={styles.page}>
      <div className="container" style={{ maxWidth: 800 }}>
        <div className={styles.pageHeader}>
          <div className={styles.headerLeft}>
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  router.back();
                } else {
                  router.push('/register');
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: '#6B7280',
                fontSize: '0.85rem',
                marginBottom: '1rem',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={14} /> Back
            </button>
            <h1 className={styles.pageTitle}>Terms of Service</h1>
            <p className={styles.pageSubtitle}>
              Last updated: April 25, 2026
            </p>
          </div>
        </div>

        <div className={styles.surfaceCardStrong} style={{ padding: '2.5rem', fontSize: '0.95rem', lineHeight: '1.7', color: '#374151' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginTop: 0, marginBottom: '1rem' }}>1. Acceptance of Terms</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            By accessing and using CampusConnect, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.
          </p>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>2. User Conduct</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            You agree to use CampusConnect only for lawful purposes. You must not use the platform to harass, abuse, or harm other students. Any violation of these rules may result in immediate suspension or termination of your account.
          </p>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>3. Marketplace and Transactions</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            CampusConnect facilitates connections between students but is not a party to any transactions. We are not responsible for the quality, safety, or legality of items listed in the marketplace, or the resolution of disputes between users.
          </p>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>4. Content Ownership</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            You retain ownership of the content you upload (such as study notes). By uploading content, you grant CampusConnect a non-exclusive license to display and distribute this content across the platform. You must not upload copyrighted material that you do not have permission to share.
          </p>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>5. Modifications</h2>
          <p style={{ marginBottom: 0 }}>
            We reserve the right to modify these terms at any time. Continued use of the platform after changes constitutes your acceptance of the new terms.
          </p>
        </div>
      </div>
    </div>
  );
}
