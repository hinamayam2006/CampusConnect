'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { io } from 'socket.io-client';
import styles from '../app/chat.module.css';
import { closeChat as apiCloseChat, getMessages, sendMessage as apiSendMessage } from '../lib/apiRequests';
import useStore from '../store/useStore';

/**
 * ChatWindow
 * Real-time chat component using Socket.io
 */
function formatChatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const timeStr = date.toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });

  if (isToday) return timeStr;
  if (isYesterday) return `Yesterday, ${timeStr}`;
  
  return `${date.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${timeStr}`;
}

export default function ChatWindow({
  request,
  isOpen,
  onClose,
  onChatAccepted,
}) {
  const store = useStore();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [chatClosed, setChatClosed] = useState(request?.chatClosed || false);
  const [closedBy, setClosedBy] = useState(request?.chatClosedBy || null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const loadMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getMessages(request._id);
      setMessages(response.data || []);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setIsLoading(false);
    }
  }, [request._id]);

  useEffect(() => {
    if (!isOpen || !request?._id) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000', {
      auth: {
        token: store.accessToken,
      },
    });

    socketRef.current = socket;

    socket.emit('register_user', store.user?._id);
    socket.emit('join_request_chat', request._id);

    socket.on('receive_message', (message) => {
      setMessages((prev) => {
        const isDuplicate = prev.some((m) => m._id === message._id);
        if (isDuplicate) return prev;
        return [...prev, message];
      });
    });

    socket.on('user_typing', () => setOtherUserTyping(true));
    socket.on('user_stop_typing', () => setOtherUserTyping(false));
    socket.on('chat_closed', (payload) => {
      setChatClosed(true);
      setClosedBy(payload.closedBy);
      setOtherUserTyping(false);
    });

    loadMessages();

    return () => {
      socket.off('receive_message');
      socket.off('user_typing');
      socket.off('user_stop_typing');
      socket.off('chat_closed');
      socket.disconnect();
    };
  }, [isOpen, request?._id, store.user?._id, store.accessToken, loadMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setChatClosed(request?.chatClosed || false);
    setClosedBy(request?.chatClosedBy || null);
  }, [request?.chatClosed, request?.chatClosedBy]);

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socketRef.current?.emit('typing', { requestId: request._id });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current?.emit('stop_typing', { requestId: request._id });
    }, 3000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    if (chatClosed) return;

    try {
      setIsSending(true);
      const response = await apiSendMessage(request._id, inputValue.trim());
      if (response && response.data) {
        setMessages((prev) => {
          const isDuplicate = prev.some((m) => m._id === response.data._id);
          if (isDuplicate) return prev;
          return [...prev, response.data];
        });
      }

      setInputValue('');
      setIsTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseChat = async () => {
    if (!confirm('Close this chat permanently? This will end messaging for both participants.')) return;
    try {
      setIsClosing(true);
      await apiCloseChat(request._id);
      setChatClosed(true);
      setClosedBy(store.user?._id);
    } catch (err) {
      console.error('Error closing chat:', err);
    } finally {
      setIsClosing(false);
    }
  };

  const getOtherParty = () => {
    const userId = store.user?._id;
    if (request.requester._id === userId) return request.owner;
    return request.requester;
  };

  const otherParty = getOtherParty();

  if (!isOpen || !request) return null;

  const otherClosed = chatClosed && String(closedBy) !== String(store.user?._id);
  const selfClosed = chatClosed && String(closedBy) === String(store.user?._id);

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={onClose}>←</button>
          <Image
            src={otherParty?.avatar || '/default-avatar.png'}
            alt={otherParty?.name || 'User avatar'}
            className={styles.headerAvatar}
            width={40}
            height={40}
          />
          <div className={styles.headerInfo}>
            <h4>{otherParty?.name}</h4>
            {otherUserTyping && !chatClosed && <p className={styles.typingIndicator}>typing...</p>}
            {chatClosed && (
              <p className={styles.typingIndicator} style={{ color: '#d63333' }}>
                {otherClosed ? 'Chat closed by the other user' : 'You closed this chat'}
              </p>
            )}
          </div>
        </div>
        {!chatClosed && (
          <button
            type="button"
            className={`btn btn-sm btn-outline-danger ${styles.closeChatBtn}`}
            onClick={handleCloseChat}
            disabled={isClosing}
          >
            {isClosing ? 'Closing…' : 'Close chat'}
          </button>
        )}
      </div>

      <div className={styles.messagesArea}>
        {isLoading ? (
          <div className={styles.loadingPlaceholder}><p>Loading messages...</p></div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyState}><p>No messages yet.</p></div>
        ) : (
          messages.map((message) => {
            // ROBUST SENDER CHECK:
            // Checks both object structure and string ID to ensure match
            const messageSenderId = message.sender?._id || message.sender;
            const currentUserId = store.user?._id;
            const isMe = messageSenderId?.toString() === currentUserId?.toString();

            return (
              <div
                key={message._id || Math.random()}
                className={`${styles.messageBubble} ${isMe ? styles.sentMessage : styles.receivedMessage}`}
              >
                {!isMe && (
                  <Image
                    src={message.sender?.avatar || '/default-avatar.png'}
                    alt={message.sender?.name || 'Sender avatar'}
                    className={styles.bubbleAvatar}
                    width={32}
                    height={32}
                  />
                )}
                <div className={styles.bubbleContent}>
                  <p>{message.content}</p>
                  <span className={styles.timestamp}>
                    {formatChatDate(message.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className={styles.inputArea} onSubmit={handleSendMessage}>
        <input
          type="text"
          className={styles.messageInput}
          placeholder={chatClosed ? 'Chat is closed' : 'Type a message...'}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (!chatClosed) handleTyping();
          }}
          disabled={isSending || chatClosed}
          autoFocus
        />
        <button
          type="submit"
          className={styles.sendBtn}
          disabled={!inputValue.trim() || isSending || chatClosed}
        >
          {isSending ? '...' : '➜'}
        </button>
      </form>
    </div>
  );
}