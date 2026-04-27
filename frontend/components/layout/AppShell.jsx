'use client';

import { useState, useCallback, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import useStore from '../../store/useStore';
import styles from './AppShell.module.css';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/verify-email', '/reset-password'];

export default function AppShell({ children }) {
  const user = useStore((s) => s.user);
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAuthPage = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  if (!user || isAuthPage) {
    return (
      <>
        {!isAuthPage && <Navbar />}
        <main className={styles.mainContent} style={!isAuthPage ? { paddingTop: 64 } : {}}>{children}</main>
      </>
    );
  }

  return (
    <div className={styles.appShell}>
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className={styles.sidebarOverlay} onClick={closeSidebar} aria-hidden="true" />
      )}

      <main className={styles.appMain}>
        {/* Mobile hamburger button */}
        <button
          className={styles.hamburger}
          onClick={() => setSidebarOpen((o) => !o)}
          aria-label="Toggle navigation menu"
          type="button"
        >
          <Menu size={22} />
        </button>
        {children}
      </main>
    </div>
  );
}
