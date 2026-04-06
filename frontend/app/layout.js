import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import './navbar.css';
import './auth.css';
import './landing.css';
import './dashboard.css';
import Navbar from '../components/layout/Navbar';
import { Toaster } from 'react-hot-toast';
import BootstrapClient from '../components/BootstrapClient';

export const metadata = {
  title: 'CampusConnect',
  description: 'All-in-one student campus platform',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="main-content">
          {children}
        </main>
        <Toaster position="top-right" />
        <BootstrapClient />
      </body>
    </html>
  );
}