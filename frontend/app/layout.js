import { Inter, Playfair_Display } from 'next/font/google';
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import AppShell from '../components/layout/AppShell';
import SessionActivityGuard from '../components/layout/SessionActivityGuard';
import RealtimeSocketProvider from '../components/layout/RealtimeSocketProvider';
import { UserRoleProvider } from '../context/UserRoleContext';
import { Toaster } from 'react-hot-toast';
import BootstrapClient from '../components/BootstrapClient';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata = {
  title: 'CampusConnect',
  description: 'All-in-one student campus platform',
  icons: {
    icon: '/icon.jpg',
    shortcut: '/icon.jpg',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        <UserRoleProvider>
          <SessionActivityGuard>
            <RealtimeSocketProvider />
            <AppShell>{children}</AppShell>
          </SessionActivityGuard>
          <Toaster
            position="top-left"
            toastOptions={{
              style: {
                background: '#1A1A1A',
                color: '#FFFFFF',
                fontFamily: 'var(--font-playfair)',
                borderRadius: '12px',
                fontSize: '0.88rem',
                fontWeight: '500',
                padding: '0.85rem 1.25rem',
              },
            }}
          />
          <BootstrapClient />
        </UserRoleProvider>
      </body>
    </html>
  );
}
