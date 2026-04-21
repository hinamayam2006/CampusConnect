'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import styles from '../requests-management.module.css';
import {
  getMyRequests,
  approveRequest,
  declineRequest,
  withdrawRequest,
  acceptChatRequest,
} from '../lib/apiRequests';
import RequestApprovalModal from './RequestApprovalModal';
import ChatWindow from './ChatWindow';
import useStore from '../store/useStore';

/**
 * RequestsManagement
 * Dashboard for managing requests as owner or requester
 * Shows pending requests, allows approve/decline/withdraw/chat
 */
export default function RequestsManagement() {
  const store = useStore();
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('pending'); // pending, approved, all
  const [role, setRole] = useState('owner'); // owner, requester, all
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showChatWindow, setShowChatWindow] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const loadRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await getMyRequests(
        role === 'all' ? null : role,
        filter === 'all' ? null : filter
      );
      setRequests(response.data || []);
    } catch (err) {
      console.error('Error loading requests:', err);
      setError(err.message || 'Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  }, [role, filter]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async (requestId) => {
    try {
      setActionLoading(true);
      await approveRequest(requestId);
      setShowApprovalModal(false);
      await loadRequests();
    } catch (err) {
      console.error('Error approving request:', err);
      setError(err.message || 'Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (requestId, reason) => {
    try {
      setActionLoading(true);
      await declineRequest(requestId, reason);
      setShowApprovalModal(false);
      await loadRequests();
    } catch (err) {
      console.error('Error declining request:', err);
      setError(err.message || 'Failed to decline request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdraw = async (requestId) => {
    if (!confirm('Are you sure you want to withdraw this request?')) return;

    try {
      setActionLoading(true);
      await withdrawRequest(requestId);
      await loadRequests();
    } catch (err) {
      console.error('Error withdrawing request:', err);
      setError(err.message || 'Failed to withdraw request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInitiateChat = async (request) => {
    try {
      setActionLoading(true);
      if (!request.chatAcceptedBy) {
        await acceptChatRequest(request._id);
      }
      setSelectedRequest(request);
      setShowChatWindow(true);
    } catch (err) {
      console.error('Error initiating chat:', err);
      setError(err.message || 'Failed to initiate chat');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    const baseClass = 'badge';
    switch (status) {
      case 'pending':
        return `${baseClass} bg-warning`;
      case 'approved':
        return `${baseClass} bg-success`;
      case 'declined':
        return `${baseClass} bg-danger`;
      case 'withdrawn':
        return `${baseClass} bg-secondary`;
      default:
        return `${baseClass} bg-secondary`;
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My Requests</h1>

      {/* Filter Controls */}
      <div className={styles.filterControls}>
        <div className={styles.filterGroup}>
          <label>Role:</label>
          <div className={styles.buttonGroup}>
            {['owner', 'requester', 'all'].map((r) => (
              <button
                key={r}
                className={`btn btn-sm ${role === r ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setRole(r)}
              >
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label>Status:</label>
          <div className={styles.buttonGroup}>
            {['pending', 'approved', 'all'].map((f) => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button
            type="button"
            className="btn-close"
            onClick={() => setError(null)}
          ></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {success}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccess(null)}
          ></button>
        </div>
      )}

      {/* Requests List */}
      {isLoading ? (
        <div className={styles.loading}>
          <p>Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No requests found</p>
        </div>
      ) : (
        <div className={styles.requestsList}>
          {requests.map((request) => (
            <div key={request._id} className={styles.requestCard}>
              {/* Card Header */}
              <div className={styles.cardHeader}>
                <div className={styles.userInfo}>
                  <Image
                    src={
                      role === 'owner'
                        ? request.requester?.avatar
                        : request.owner?.avatar || '/default-avatar.png'
                    }
                    alt="User"
                    width={44}
                    height={44}
                    unoptimized
                    className={styles.userAvatar}
                  />
                  <div className={styles.userDetails}>
                    <h4>
                      {role === 'owner'
                        ? request.requester?.name
                        : request.owner?.name}
                    </h4>
                    <p>
                      {role === 'owner'
                        ? request.requester?.department
                        : request.owner?.department}
                    </p>
                  </div>
                </div>
                <span className={getStatusBadgeClass(request.status)}>
                  {request.status}
                </span>
              </div>

              {/* Request Details */}
              {request.message && (
                <div className={styles.message}>
                  <strong>Message:</strong> {request.message}
                </div>
              )}

              {request.context === 'ride' && request.seatsRequested > 1 && (
                <div className={styles.details}>
                  <p>Seats Requested: {request.seatsRequested}</p>
                </div>
              )}

              {request.declineReason && (
                <div className={styles.declineReason}>
                  <strong>Decline Reason:</strong> {request.declineReason}
                </div>
              )}

              {/* Action Buttons */}
              <div className={styles.cardActions}>
                {role === 'owner' && request.status === 'pending' && (
                  <>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowApprovalModal(true);
                      }}
                      disabled={actionLoading}
                    >
                      Manage
                    </button>
                  </>
                )}

                {request.status === 'pending' && role === 'requester' && (
                  <button
                    className="btn btn-sm btn-warning"
                    onClick={() => handleWithdraw(request._id)}
                    disabled={actionLoading}
                  >
                    Withdraw
                  </button>
                )}

                {request.status === 'approved' && !request.chatClosed && (
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleInitiateChat(request)}
                    disabled={actionLoading}
                  >
                    Chat
                  </button>
                )}
                {request.status === 'approved' && (
                  <button
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => handleRate(request)}
                    disabled={actionLoading}
                  >
                    Rate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request Approval Modal */}
      {selectedRequest && (
        <RequestApprovalModal
          request={selectedRequest}
          isOpen={showApprovalModal}
          onClose={() => setShowApprovalModal(false)}
          onApprove={handleApprove}
          onDecline={handleDecline}
          isLoading={actionLoading}
        />
      )}

      {/* Chat Window */}
      {showChatWindow && (
        <ChatWindow
          request={selectedRequest}
          isOpen={showChatWindow}
          onClose={() => setShowChatWindow(false)}
        />
      )}
    </div>
  );
}
