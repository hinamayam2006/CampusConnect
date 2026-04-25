'use client';
import { ArrowLeft } from 'lucide-react';
import styles from '../community.module.css';
import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
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
            <h1 className={styles.pageTitle}>Privacy Policy</h1>
            <p className={styles.pageSubtitle}>
              Last updated: April 25, 2026
            </p>
          </div>
        </div>

        <div className={styles.surfaceCardStrong} style={{ padding: '2.5rem', fontSize: '0.95rem', lineHeight: '1.7', color: '#374151' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginTop: 0, marginBottom: '1rem' }}>1. Information We Collect</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            We collect information you provide directly to us when you create an account, such as your name, email address, department, and graduation year. We also collect content you submit, such as marketplace listings, study notes, and chat messages.
          </p>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>2. How We Use Your Information</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            We use the information we collect to operate, maintain, and improve CampusConnect. This includes facilitating communication between students, matching rides, and personalizing your dashboard experience based on your department.
          </p>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>3. Information Sharing</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            CampusConnect is a community platform. Certain information, such as your name, department, and profile picture, will be visible to other registered students. We do not sell your personal information to third parties.
          </p>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>4. Data Security</h2>
          <p style={{ marginBottom: '1.5rem' }}>
            We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access. However, no security system is impenetrable, and we cannot guarantee the security of our database.
          </p>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}>5. Contact Us</h2>
          <p style={{ marginBottom: 0 }}>
            If you have any questions about this Privacy Policy, please contact the site administrators or submit a request through the Help & Support page.
          </p>
        </div>
      </div>
    </div>
  );
}
