'use client';

import Sidebar from './Sidebar';
import useStore from '../../store/useStore';
import styles from './AppShell.module.css';
import { usePathname } from 'next/navigation';

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/verify-email', '/reset-password'];

/**
 * AppShell — conditional layout wrapper.
 *
 * Authenticated:  <div.app-shell> <Sidebar /> <main.app-main> … </main> </div>
 * Unauthenticated: <main.main-content> … </main>
 *
 * This keeps the top-level layout.js as a Server Component while giving
 * the two-column sidebar layout to all authenticated pages automatically.
 */
export default function AppShell({ children }) {
  const user = useStore((s) => s.user);
  const pathname = usePathname();

  const isAuthPage = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (!user || isAuthPage) {
    return <main className={styles.mainContent}>{children}</main>;
  }

  return (
    <div className={styles.appShell}>
      <Sidebar />
      <main className={styles.appMain}>{children}</main>
    </div>
  );
}
