'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import useStore from '../../store/useStore';
import toast from 'react-hot-toast';
import { 
  ShoppingBag, 
  BookOpen, 
  Repeat, 
  Car, 
  MessageSquare, 
  GraduationCap, 
  User, 
  LogOut,
  Bell // Added Bell here
} from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useStore();
  const unreadCount = useStore((s) => s.unreadCount);
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const isLoginPage = pathname === '/login';
  const isRegisterPage = pathname === '/register';

  return (
    <nav className="navbar navbar-expand-lg navbar-light">
      <div className="container">
        <Link href="/" className="navbar-brand logo-gradient">
          CampusConnect
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="navbarNav">
          {user && (
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <Link href="/marketplace" className={`nav-link d-flex align-items-center gap-2 ${pathname.startsWith('/marketplace') ? 'active' : ''}`}>
                  <ShoppingBag size={18} /> Marketplace
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/notes" className={`nav-link d-flex align-items-center gap-2 ${pathname.startsWith('/notes') ? 'active' : ''}`}>
                  <BookOpen size={18} /> Notes
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/borrow" className={`nav-link d-flex align-items-center gap-2 ${pathname.startsWith('/borrow') ? 'active' : ''}`}>
                  <Repeat size={18} /> Borrow
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/rides" className={`nav-link d-flex align-items-center gap-2 ${pathname.startsWith('/rides') ? 'active' : ''}`}>
                  <Car size={18} /> Rides
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/needs" className={`nav-link d-flex align-items-center gap-2 ${pathname.startsWith('/needs') ? 'active' : ''}`}>
                  <MessageSquare size={18} /> Needs
                </Link>
              </li>
              <li className="nav-item">
                <Link href="/tutoring" className={`nav-link d-flex align-items-center gap-2 ${pathname.startsWith('/tutoring') ? 'active' : ''}`}>
                  <GraduationCap size={18} /> Tutoring
                </Link>
              </li>
            </ul>
          )}

          <div className="nav-auth-buttons ms-auto"> {/* Added ms-auto to push to right */}
            {user ? (
              <div className="d-flex align-items-center gap-3">
                {/* NOTIFICATION BELL */}
                <Link href="/notifications" className="header-notification-bell">
                  <div className="bell-wrapper">
                    <Bell size={22} />
                    {unreadCount > 0 && (
                      <span className="bell-badge">{unreadCount}</span>
                    )}
                  </div>
                </Link>

                <Link href={`/profile/${user._id}`} className="nav-btn profile d-flex align-items-center gap-2">
                  <User size={18} /> {user.name.split(' ')[0]}
                </Link>
                
                <button onClick={handleLogout} className="nav-btn logout d-flex align-items-center gap-2">
                  <LogOut size={18} /> Logout
                </button>
              </div>
            ) : (
              <div className="d-flex gap-2">
                <Link href="/login" className={`nav-btn login ${isLoginPage ? 'active' : ''}`}>
                  Log In
                </Link>
                <Link href="/register" className={`nav-btn register ${isRegisterPage ? 'active' : ''}`}>
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
