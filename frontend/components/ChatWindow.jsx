'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Camera, ImagePlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from '../app/chat.module.css';
import {
  closeChat as apiCloseChat,
  getMessages,
  sendMessage as apiSendMessage,
  uploadImage,
} from '../lib/apiRequests';
import {
  initializeSocket,
  joinChatRoom,
  registerUser,
  sendStopTyping,
  sendTyping,
} from '../lib/socket';
import useStore from '../store/useStore';

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
    hour12: false,
  });

  if (isToday) return timeStr;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  return `${date.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${timeStr}`;
}

function Avatar({ src, name, className, size = 32 }) {
  return (
    <div className={className} aria-label={name}>
      <Image src={src || '/default-avatar.png'} alt={name || 'User avatar'} width={size} height={size} />
    </div>
  );
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
  const [attachment, setAttachment] = useState(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isOpen || !request?._id) return undefined;

    const socket = initializeSocket(store.accessToken);

    if (store.user?._id) {
      registerUser(store.user._id, store.accessToken);
    }
    joinChatRoom(request._id);

    const handleReceiveMessage = (message) => {
      if (String(message.request || '') !== String(request._id)) return;
      setMessages((prev) => {
        const isDuplicate = prev.some((item) => item._id === message._id);
        return isDuplicate ? prev : [...prev, message];
      });
    };

    const handleTyping = () => setOtherUserTyping(true);
    const handleStopTyping = () => setOtherUserTyping(false);
    const handleChatClosed = (payload) => {
      setChatClosed(true);
      setClosedBy(payload.closedBy);
      setOtherUserTyping(false);
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);
    socket.on('chat_closed', handleChatClosed);

    const timer = setTimeout(() => {
      void loadMessages();
    }, 0);

    return () => {
      clearTimeout(timer);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
      socket.off('chat_closed', handleChatClosed);
    };
  }, [isOpen, request?._id, store.user?._id, store.accessToken, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      sendTyping(request._id);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendStopTyping(request._id);
    }, 3000);
  };

  const handleAttachmentPick = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files can be uploaded in chat for now.');
      return;
    }

    try {
      setAttachmentUploading(true);
      const response = await uploadImage(file);
      const url = response?.data?.url;
      if (!url) throw new Error('No image URL returned');

      setAttachment({
        url,
        name: file.name,
        size: file.size,
        mimeType: file.type,
      });
    } catch (err) {
      toast.error(err?.message || 'Could not upload image');
    } finally {
      setAttachmentUploading(false);
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (chatClosed) return;
    if (!inputValue.trim() && !attachment) return;

    try {
      setIsSending(true);
      const messageType = attachment ? 'image' : 'text';
      const content = inputValue.trim() || (attachment ? 'Image' : '');
      const response = await apiSendMessage(request._id, content, messageType, attachment);
      const sentMessage = response?.data;

      if (sentMessage) {
        setMessages((prev) => {
          const isDuplicate = prev.some((item) => item._id === sentMessage._id);
          return isDuplicate ? prev : [...prev, sentMessage];
        });
      }

      setInputValue('');
      setAttachment(null);
      setIsTyping(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      sendStopTyping(request._id);
      onChatAccepted?.();
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error(err?.message || 'Could not send message');
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
      toast.error(err?.message || 'Could not close chat');
    } finally {
      setIsClosing(false);
    }
  };

  const getOtherParty = () => {
    const userId = store.user?._id;
    if (String(request.requester?._id || request.requester) === String(userId)) return request.owner;
    return request.requester;
  };

  const otherParty = getOtherParty();
  const currentUserAvatar = store.user?.avatar || '';
  const otherClosed = chatClosed && String(closedBy) !== String(store.user?._id);
  const conversationLabel = getConversationLabel(request);

  if (!isOpen || !request) return null;

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={onClose} type="button">←</button>
          <Avatar
            src={otherParty?.avatar || '/default-avatar.png'}
            name={otherParty?.name || 'User avatar'}
            className={styles.headerAvatar}
            size={40}
          />
          <div className={styles.headerInfo}>
            <h4>{otherParty?.name}</h4>
            <p className={styles.headerContext}>{conversationLabel.title} · {conversationLabel.type}</p>
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
            {isClosing ? 'Closing...' : 'Close chat'}
          </button>
        )}
      </div>

      <div className={styles.messagesArea}>
        {isLoading ? (
          <div className={styles.loadingPlaceholder}><p>Loading messages...</p></div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyState}><p>No messages yet.</p></div>
        ) : (
          messages.map((message, idx) => {
            const messageSenderId = message.sender?._id || message.sender;
            const currentUserId = store.user?._id;
            const isMe = messageSenderId?.toString() === currentUserId?.toString();
            const avatarSrc = isMe ? currentUserAvatar : message.sender?.avatar || '/default-avatar.png';

            return (
              <div
                key={message._id}
                className={`${styles.messageBubble} ${isMe ? styles.sentMessage : styles.receivedMessage}`}
              >
                {!isMe && (
                  <Avatar
                    src={avatarSrc}
                    name={message.sender?.name || 'Sender avatar'}
                    className={styles.bubbleAvatar}
                    size={32}
                  />
                )}
                <div className={styles.bubbleContent}>
                  {message.messageType === 'image' && message.attachment?.url ? (
                    <div className={styles.attachmentPreview} style={{ marginBottom: message.content && message.content !== 'Image' ? '0.5rem' : 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={message.attachment.url} alt={message.content || 'Chat attachment'} />
                    </div>
                  ) : null}

                  {message.messageType === 'file' && message.attachment?.url ? (
                    <a href={message.attachment.url} target="_blank" rel="noreferrer" className={styles.fileBubble}>
                      {message.attachment.name || 'Download file'}
                    </a>
                  ) : null}

                  {(message.messageType === 'text' || !message.messageType || !message.attachment?.url) && (
                    <p>{message.content}</p>
                  )}

                  {message.messageType === 'image' && message.content && message.content !== 'Image' && (
                    <p style={{ marginTop: '0.45rem' }}>{message.content}</p>
                  )}

                  <span className={styles.timestamp}>
                    {formatChatDate(message.createdAt)}
                  </span>
                </div>
                {isMe && (
                  <Avatar
                    src={avatarSrc}
                    name={store.user?.name || 'You'}
                    className={styles.bubbleAvatar}
                    size={32}
                  />
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {attachment && (
        <div className={styles.inputAttachment}>
          <div className={styles.inputAttachmentPreview}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={attachment.url} alt={attachment.name} />
          </div>
          <div className={styles.inputAttachmentMeta}>
            <span>{attachment.name}</span>
            <small>{Math.round((attachment.size || 0) / 1024)} KB</small>
          </div>
          <button type="button" className={styles.attachmentRemoveBtn} onClick={() => setAttachment(null)} aria-label="Remove attachment">
            <X size={14} />
          </button>
        </div>
      )}

      <form className={styles.inputArea} onSubmit={handleSendMessage}>
        <div className={styles.attachmentButtons}>
          <button
            type="button"
            className={styles.attachmentBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={attachmentUploading || chatClosed}
            title="Upload from files"
          >
            <ImagePlus size={16} />
          </button>
          <button
            type="button"
            className={styles.attachmentBtn}
            onClick={() => cameraInputRef.current?.click()}
            disabled={attachmentUploading || chatClosed}
            title="Take a photo"
          >
            <Camera size={16} />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(event) => {
            void handleAttachmentPick(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(event) => {
            void handleAttachmentPick(event.target.files?.[0]);
            event.target.value = '';
          }}
        />

        <input
          type="text"
          className={styles.messageInput}
          placeholder={chatClosed ? 'Chat is closed' : 'Type a message...'}
          value={inputValue}
          onChange={(event) => {
            setInputValue(event.target.value);
            if (!chatClosed) handleTyping();
          }}
          disabled={isSending || chatClosed}
          autoFocus
        />
        <button
          type="submit"
          className={styles.sendBtn}
          disabled={(!inputValue.trim() && !attachment) || isSending || chatClosed}
        >
          {isSending ? '...' : '➜'}
        </button>
      </form>
    </div>
  );
}
