'use client';

import { useEffect } from 'react';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { disconnectSocket, initializeSocket, registerUser, removeListener } from '../../lib/socket';

function buildNotificationBody(notification) {
  const pieces = [notification?.message];
  const preview = notification?.meta?.preview || notification?.meta?.message;
  if (preview && preview !== notification?.message) {
    pieces.push(preview);
  }
  return pieces.filter(Boolean).join(' • ');
}

export default function RealtimeSocketProvider() {
  const user = useStore((state) => state.user);
  const accessToken = useStore((state) => state.accessToken);
  const setUnreadCount = useStore((state) => state.setUnreadCount);

  useEffect(() => {
    if (!user?._id || !accessToken) {
      disconnectSocket();
      return undefined;
    }

    const socket = initializeSocket(accessToken);
    const register = () => registerUser(user._id);
    const handleNotification = (notification) => {
      const headline = notification?.type === 'chat_message' ? 'New message' : 'New notification';
      const body = buildNotificationBody(notification) || 'You have a new update.';

      toast.custom(
        () => (
          <div
            style={{
              minWidth: '280px',
              maxWidth: '360px',
              background: '#1A1A1A',
              color: '#fff',
              borderRadius: '16px',
              padding: '0.85rem 1rem',
              boxShadow: '0 18px 45px rgba(0,0,0,0.22)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              style={{
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                color: 'rgba(255,255,255,0.6)',
                marginBottom: '0.25rem',
              }}
            >
              {headline}
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, lineHeight: 1.45 }}>
              {body}
            </div>
          </div>
        ),
        { id: `${notification?.type || 'notification'}-${notification?._id || Date.now()}`, duration: 5000 }
      );

      if (notification?.type !== 'chat_message') {
        setUnreadCount((current) => current + 1);
      }
    };

    socket.on('connect', register);
    if (socket.connected) {
      register();
    }
    socket.on('notification_received', handleNotification);

    return () => {
      socket.off('connect', register);
      removeListener('notification_received', handleNotification);
    };
  }, [accessToken, setUnreadCount, user?._id]);

  return null;
}
