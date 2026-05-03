'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import useStore from '../../../store/useStore';
import ConfirmModal from '../../../components/admin/ConfirmModal';
import {
  deleteAdminContent,
  fetchAdminTickets,
  suspendAdminUser,
  updateAdminTicket,
} from '../../../lib/apiAdmin';

const DELETE_TARGET_TYPE_MAP = {
  listing: 'Listing',
  ride: 'Ride',
  note: 'Note',
  borrowing: 'Borrowing',
  lostnfound: 'LostnFound',
};

function resolveTargetLink(targetType, targetId) {
  if (!targetType || !targetId) return '';
  const normalized = String(targetType).toLowerCase();
  if (normalized === 'listing') return `/marketplace/${targetId}`;
  if (normalized === 'ride') return `/rides/${targetId}`;
  if (normalized === 'note') return `/notes/${targetId}`;
  if (normalized === 'borrowing') return `/borrow/${targetId}`;
  if (normalized === 'lostnfound') return `/lostnfound/${targetId}`;
  if (normalized === 'request') return `/requests/${targetId}`;
  if (normalized === 'user') return `/profile/${targetId}`;
  return '';
}

function renderStars(rating = 0) {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  return Array.from({ length: 5 }, (_, index) => (
    <span
      key={index}
      aria-hidden="true"
      style={{ color: index < value ? '#f59e0b' : '#d1d5db', fontSize: '1rem' }}
    >
      ★
    </span>
  ));
}

export default function AdminTicketCenterPage() {
  const router = useRouter();
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState('open');
  const [typeFilter, setTypeFilter] = useState('reports');
  const [actionLoadingById, setActionLoadingById] = useState({});
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: '',
    ticketId: null,
    ticketTitle: '',
    targetType: '',
    targetId: '',
    userId: null,
    userName: '',
    reason: '',
  });
  const setTicketBusy = (ticketId, busy) => {
    setActionLoadingById((prev) => ({ ...prev, [ticketId]: busy }));
  };

  const refreshTickets = async () => {
    const params = { status: statusFilter, limit: 100 };
    params.type = typeFilter === 'reports' ? 'issue_report' : 'feedback';
    const response = await fetchAdminTickets(params);
    setTickets(response?.data?.items || []);
  };

  const getNextStatus = (status) => {
    if (status === 'open') return 'in_progress';
    if (status === 'in_progress') return 'resolved';
    return 'resolved';
  };

  const handleAdvanceStatus = async (ticket) => {
    const nextStatus = getNextStatus(ticket.status);
    setTicketBusy(ticket._id, true);
    try {
      await updateAdminTicket(ticket._id, { status: nextStatus });
      toast.success(`Ticket moved to ${nextStatus.replace('_', ' ')}`);
      await refreshTickets();
    } catch (err) {
      toast.error(err?.message || 'Could not update ticket status');
    } finally {
      setTicketBusy(ticket._id, false);
    }
  };

  const handleResolveTicket = async (ticket, note = '') => {
    setTicketBusy(ticket._id, true);
    try {
      const payload = { status: 'resolved' };
      if (note.trim()) {
        payload.adminNotes = note.trim();
      }

      await updateAdminTicket(ticket._id, payload);
      toast.success(note.trim() ? 'Ticket resolved with note' : 'Ticket resolved');
      await refreshTickets();
    } catch (err) {
      toast.error(err?.message || 'Could not resolve ticket');
    } finally {
      setTicketBusy(ticket._id, false);
    }
  };

  const handleResolveWithNote = async (ticket) => {
    const note = window.prompt('Optional resolution note (press OK to save it, or Cancel to dismiss):', ticket.adminNotes || '');
    if (note === null) return;

    await handleResolveTicket(ticket, note);
  };

  const handleDeleteTarget = (ticket) => {
    const targetType = String(ticket.targetType || '').toLowerCase();
    const targetId = ticket.targetId;
    const isSupported = Boolean(DELETE_TARGET_TYPE_MAP[targetType]);
    if (!isSupported || !targetId) {
      toast.error('One-click delete supports Listing, Ride, Note, Borrowing, and Lost & Found targets only.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      type: 'delete',
      ticketId: ticket._id,
      ticketTitle: ticket.title || ticket.category,
      targetType,
      targetId,
      userId: null,
      userName: '',
      reason: '',
    });
  };

  const handleSuspendUser = (ticket) => {
    const targetType = String(ticket.targetType || '').toLowerCase();
    const targetId = ticket.targetId;
    const fallbackUserId = ticket.submittedBy?._id;
    const userIdToSuspend = targetType === 'user' && targetId ? targetId : fallbackUserId;

    if (!userIdToSuspend) {
      toast.error('No user ID available to suspend.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      type: 'suspend',
      ticketId: ticket._id,
      ticketTitle: ticket.title || ticket.category,
      targetType: '',
      targetId: '',
      userId: userIdToSuspend,
      userName: ticket.submittedBy?.name || 'Unknown User',
      reason: `Suspended via ticket ${ticket._id}`,
    });
  };

  const handleConfirmDelete = async () => {
    const { ticketId, targetType, targetId } = confirmModal;
    setTicketBusy(ticketId, true);
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    try {
      const mappedType = DELETE_TARGET_TYPE_MAP[targetType];
      if (!mappedType) {
        throw new Error('Unsupported target type for one-click delete');
      }

      await deleteAdminContent(mappedType, targetId);
      // after successful deletion, mark the ticket resolved so it moves to resolved list
      try {
        await updateAdminTicket(ticketId, { status: 'resolved' });
      } catch (e) {
        // ignore update failure
      }

      toast.success(`${mappedType} deleted successfully`);
      await refreshTickets();
    } catch (err) {
      const msg = err?.message || err?.response?.data?.message || '';
      // If content not found, mark ticket resolved instead of showing an error
      if (/not found/i.test(msg) || /Content not found/i.test(msg)) {
        try {
          await updateAdminTicket(ticketId, { status: 'resolved' });
          toast.success('Target already missing — ticket marked resolved');
          await refreshTickets();
          return;
        } catch (e) {
          // continue to generic error handler
        }
      }

      toast.error(err?.message || 'Could not delete target content');
    } finally {
      setTicketBusy(ticketId, false);
    }
  };

  const handleConfirmSuspend = async () => {
    const { ticketId, userId, userName, reason } = confirmModal;
    setTicketBusy(ticketId, true);
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    
    try {
      await suspendAdminUser(userId, reason);
      toast.success('User suspended successfully');
      await refreshTickets();
    } catch (err) {
      toast.error(err?.message || 'Could not suspend user');
    } finally {
      setTicketBusy(ticketId, false);
    }
  };

  const handleCloseModal = () => {
    setConfirmModal({
      isOpen: false,
      type: '',
      ticketId: null,
      ticketTitle: '',
      targetType: '',
      targetId: '',
      userId: null,
      userName: '',
      reason: '',
    });
  };

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!user?._id) return;
    if (!isAdmin) {
      toast.error('Admin access required');
      router.replace('/');
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const params = { status: statusFilter, limit: 100 };
        params.type = typeFilter === 'reports' ? 'issue_report' : 'feedback';

        const response = await fetchAdminTickets(params);
        if (!cancelled) {
          setTickets(response?.data?.items || []);
        }
      } catch (err) {
        if (!cancelled) toast.error(err?.message || 'Failed to load tickets');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?._id, isAdmin, router, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    return tickets.reduce(
      (acc, ticket) => {
        acc.total += 1;
        if (ticket.type === 'issue_report') acc.reports += 1;
        if (ticket.type === 'feedback') acc.feedback += 1;
        return acc;
      },
      { total: 0, reports: 0, feedback: 0 }
    );
  }, [tickets]);

  const filterButtonStyle = (active) => ({
    borderColor: active ? '#111827' : '#d1d5db',
    backgroundColor: active ? '#111827' : 'white',
    color: active ? 'white' : '#111827',
  });

  if (!user) return <div className="container py-5 text-secondary">Loading session...</div>;
  if (!isAdmin) return null;

  return (
    <div className="container py-4 py-md-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h1 className="h3 mb-1">Tickets Inbox</h1>
          <p className="text-secondary mb-0">Switch between reports and feedback using the tabs below.</p>
        </div>
        <Link href="/admin" className="btn btn-outline-secondary">
          Back to Command Center
        </Link>
      </div>

      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <span className="badge text-bg-dark">Total: {stats.total}</span>
        <span className="badge text-bg-danger">Reports: {stats.reports}</span>
        <span className="badge text-bg-info">Feedback: {stats.feedback}</span>
        <div className="ms-auto">
          <div className="d-flex flex-wrap gap-2">
            <div className="btn-group btn-group-sm" role="group" aria-label="Ticket status filter">
              {['open', 'in_progress', 'resolved'].map((status) => (
                <button
                  key={status}
                  type="button"
                  className="btn btn-dark"
                  style={filterButtonStyle(statusFilter === status)}
                  onClick={() => setStatusFilter(status)}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="btn-group btn-group-sm" role="group" aria-label="Ticket type filter">
              {[
                { value: 'reports', label: 'Reports' },
                { value: 'feedback', label: 'Feedback' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className="btn btn-dark"
                  style={filterButtonStyle(typeFilter === item.value)}
                  onClick={() => setTypeFilter(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-secondary">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="text-secondary">No tickets found for selected filter.</div>
      ) : (
        <div className="d-grid gap-3">
          {tickets.map((ticket) => {
            const targetLink = resolveTargetLink(ticket.targetType, ticket.targetId);
            const isBusy = Boolean(actionLoadingById[ticket._id]);
            const isFeedback = ticket.type === 'feedback';
            const isIssueReport = ticket.type === 'issue_report';
            const canDeleteTarget = Boolean(DELETE_TARGET_TYPE_MAP[String(ticket.targetType || '').toLowerCase()]) && Boolean(ticket.targetId);
            const canAdvanceStatus = ticket.status === 'open' || ticket.status === 'in_progress';
            const isFinalized = ticket.status === 'resolved';
            return (
              <div key={ticket._id} className="border rounded-3 p-3 bg-white">
                <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
                  <div className="fw-semibold">{ticket.title || ticket.category}</div>
                  <div className="d-flex gap-2">
                    <span className="badge text-bg-secondary text-capitalize">{ticket.type}</span>
                    <span className="badge text-bg-warning text-dark text-capitalize">{ticket.status}</span>
                  </div>
                </div>
                <div className="small text-secondary mb-2">
                  By {ticket.submittedBy?.name || 'Unknown'} ({ticket.submittedBy?.email || 'no email'})
                  {ticket.createdAt && (
                    <span style={{ marginLeft: 8 }}>· Submitted {new Date(ticket.createdAt).toLocaleString()}</span>
                  )}
                </div>
                {isFeedback && (
                  <div className="d-flex flex-wrap align-items-center gap-2 mb-2 small">
                    <span className="fw-semibold">Feedback rating:</span>
                    <span className="d-inline-flex align-items-center gap-1">
                      {renderStars(ticket.rating)}
                    </span>
                    <span className="text-secondary">{ticket.rating || 0}/5</span>
                  </div>
                )}
                <p className="mb-2 small">{ticket.description}</p>
                <div className="d-flex flex-wrap gap-2">
                  {targetLink ? (
                    <Link href={targetLink} className="btn btn-sm btn-primary">
                      View Target
                    </Link>
                  ) : (
                    <span className="btn btn-sm btn-outline-secondary disabled">No Target Linked</span>
                  )}
                  <span className="btn btn-sm btn-outline-dark disabled">
                    Type: {ticket.targetType || 'N/A'}
                  </span>
                </div>
                <div className="mt-3 border-top pt-3">
                  {isFinalized ? (
                    <>
                      <div className="small fw-semibold mb-2">Already Finalized</div>
                      {ticket.adminNotes && (
                        <div className="mt-2 small">
                          <strong>Admin Note:</strong> {ticket.adminNotes}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="small fw-semibold mb-2">
                        {isFeedback ? 'Feedback Actions' : 'Report Actions'}
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleAdvanceStatus(ticket)}
                          disabled={!canAdvanceStatus || isBusy}
                        >
                          {canAdvanceStatus ? `Move to ${getNextStatus(ticket.status).replace('_', ' ')}` : 'Already Finalized'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-success"
                          onClick={() => handleResolveWithNote(ticket)}
                          disabled={ticket.status === 'resolved' || isBusy}
                        >
                          Resolve with Note
                        </button>
                        {isIssueReport && (
                          <>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteTarget(ticket)}
                              disabled={!canDeleteTarget || isBusy}
                            >
                              One-Click Delete Target
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger"
                              onClick={() => handleSuspendUser(ticket)}
                              disabled={isBusy}
                            >
                              Suspend User
                            </button>
                          </>
                        )}
                      </div>
                      {ticket.adminNotes && (
                        <div className="mt-2 small">
                          <strong>Admin Note:</strong> {ticket.adminNotes}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={handleCloseModal}
        onConfirm={confirmModal.type === 'delete' ? handleConfirmDelete : handleConfirmSuspend}
        title={confirmModal.type === 'delete' ? 'Delete Content' : 'Suspend User'}
        message={
          confirmModal.type === 'delete'
            ? `Are you sure you want to delete this ${confirmModal.targetType}? This action cannot be undone.`
            : `Are you sure you want to suspend ${confirmModal.userName}? This will prevent them from accessing the platform.`
        }
        confirmText={confirmModal.type === 'delete' ? 'Delete Content' : 'Suspend User'}
        cancelText="Cancel"
        variant="danger"
        loading={actionLoadingById[confirmModal.ticketId]}
      />
    </div>
  );
}
