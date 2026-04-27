'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { MessageSquare, Search, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import useRequireAuth from '../../lib/useRequireAuth';
import { getActiveChats } from '../../lib/apiRequests';
import ChatWindow from '../../components/ChatWindow';
import { initializeSocket, registerUser } from '../../lib/socket';
import useStore from '../../store/useStore';
import styles from './messages.module.css';

function getOtherParty(request, userId) {
  if (!request) return null;
  const requesterId = String(request.requester?._id || request.requester);
  return requesterId === String(userId) ? request.owner : request.requester;
}

function getConversationLabel(request) {
  if (!request) return { title: 'Conversation', type: 'conversation' };

  if (request.refModel === 'Ride') {
    return {
      title: `${request.refId?.originName || 'Ride'} → ${request.refId?.destName || 'Trip'}`,
      type: 'ride',
    };
  }

  if (request.refModel === 'Listing') {
    return {
      title: request.refId?.title || 'Listing',
      type: 'listing',
    };
  }

  if (request.refModel === 'LostnFound') {
    return {
      title: request.refId?.title || 'Lost & Found',
      type: 'lost & found',
    };
  }

  if (request.refModel === 'Borrow') {
    return {
      title: request.refId?.title || 'Borrow request',
      type: 'borrow',
    };
  }

  if (request.refModel === 'Booking') {
    return {
      title: request.refId?.course || 'Tutoring Session',
      type: 'tutoring',
    };
  }

  return { title: 'Conversation', type: 'conversation' };
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isReady } = useRequireAuth();
  const user = useStore((state) => state.user);
  const accessToken = useStore((state) => state.accessToken);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);

  const loadChats = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await getActiveChats();
      setChats(response.data || []);
    } catch (error) {
      console.error('Could not load chats:', error);
      setChats([]);
      toast.error('Could not load inbox');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const timer = setTimeout(() => {
      void loadChats();
    }, 0);
    return () => clearTimeout(timer);
  }, [isReady, loadChats]);

  useEffect(() => {
    if (!isReady || !user?._id || !accessToken) return undefined;

    const socket = initializeSocket(accessToken);
    registerUser(user._id, accessToken);

    const refreshChats = () => {
      void loadChats(true);
    };

    const onNotification = (data) => {
      if (data?.type === 'chat_message') {
        void loadChats(true);
      }
    };

    socket.on('receive_message', refreshChats);
    socket.on('chat_closed', refreshChats);
    socket.on('notification_received', onNotification);

    return () => {
      socket.off('receive_message', refreshChats);
      socket.off('chat_closed', refreshChats);
      socket.off('notification_received', onNotification);
    };
  }, [accessToken, isReady, loadChats, user?._id]);

  const filteredChats = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return chats;

    return chats.filter(({ request, latestMessage }) => {
      const otherParty = getOtherParty(request, user?._id);
      return [
        request?.refId?.title,
        request?.refId?.originName,
        request?.refId?.destName,
        otherParty?.name,
        latestMessage?.content,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [chats, search, user?._id]);

  const autoSelectedRequest = useMemo(() => {
    if (!filteredChats.length) return null;

    const targetRequestId = searchParams.get('requestId');
    const targetUserId = searchParams.get('with');

    if (targetRequestId) {
      return filteredChats.find(({ request }) => String(request._id) === String(targetRequestId))?.request || null;
    }

    if (targetUserId) {
      return (
        filteredChats.find(({ request }) => {
          const otherParty = getOtherParty(request, user?._id);
          return String(otherParty?._id || otherParty) === String(targetUserId);
        })?.request || null
      );
    }

    if (!selectedRequest) {
      return filteredChats[0].request;
    }

    return null;
  }, [filteredChats, searchParams, user?._id, selectedRequest]);

  useEffect(() => {
    if (!autoSelectedRequest) return;
    if (String(selectedRequest?._id) === String(autoSelectedRequest._id)) return;

    const timer = setTimeout(() => {
      setSelectedRequest(autoSelectedRequest);
    }, 0);

    return () => clearTimeout(timer);
  }, [autoSelectedRequest, selectedRequest]);

  const selectedChat = chats.find(({ request }) => String(request._id) === String(selectedRequest?._id));

  if (!isReady) return null;

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.hero}>
          <div>
            <h1 className={styles.title}>Inbox</h1>
            <p className={styles.subtitle}>
              Keep all your request chats in one place, with live updates and a clean message view.
            </p>
          </div>
          <button type="button" className={styles.btnGhost} onClick={() => router.push('/notifications')}>
            View notifications
          </button>
        </div>

        <div className={styles.shell}>
          <aside className={styles.sidebar}>
            <div className={styles.searchWrap}>
              <Search size={15} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search chats..."
              />
            </div>

            <div className={styles.chatList}>
              {loading ? (
                <div className={styles.emptyState}>Loading chats...</div>
              ) : filteredChats.length === 0 ? (
                <div className={styles.emptyState}>
                  <MessageSquare size={28} />
                  <p>No active chats yet.</p>
                </div>
              ) : (
                filteredChats.map(({ request }) => {
                  const otherParty = getOtherParty(request, user?._id);
                  const isSelected = String(selectedRequest?._id) === String(request._id);
                  const conversationLabel = getConversationLabel(request);

                  return (
                    <button
                      key={request._id}
                      type="button"
                      className={`${styles.chatRow}${isSelected ? ` ${styles.chatRowActive}` : ''}`}
                      onClick={() => setSelectedRequest(request)}
                    >
                      <div className={styles.chatAvatar}>
                        <Image
                          src={otherParty?.avatar || '/default-avatar.png'}
                          alt={otherParty?.name || 'User'}
                          width={42}
                          height={42}
                        />
                      </div>
                      <div className={styles.chatMeta}>
                        <div className={styles.chatTopLine}>
                          <strong>{otherParty?.name || 'Chat'}</strong>
                          <span className={styles.chatStatus}>{request.status}</span>
                        </div>
                        <p className={styles.chatTitle}>{conversationLabel.title}</p>
                        <p className={styles.chatPreview}>{conversationLabel.type}</p>
                      </div>
                      <ArrowRight size={14} className={styles.chatChevron} />
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          <main className={styles.thread}>
            {selectedChat ? (
              <ChatWindow
                request={selectedChat.request}
                isOpen
                onClose={() => setSelectedRequest(null)}
              />
            ) : (
              <div className={styles.emptyThread}>
                <MessageSquare size={40} />
                <h2>Select a chat</h2>
                <p>Choose a conversation from the inbox to continue talking.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
