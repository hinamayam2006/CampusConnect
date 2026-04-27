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

export default function AdminTicketCenterPage() {
  const router = useRouter();
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState('open');
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
    const response = await fetchAdminTickets({ status: statusFilter, limit: 100 });
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

  const handleResolveWithNote = async (ticket) => {
    const note = window.prompt('Please enter resolution note (will be visible to user):', ticket.adminNotes || '');
    if (note === null) return; // User cancelled
    
    setTicketBusy(ticket._id, true);
    try {
      await updateAdminTicket(ticket._id, { 
        status: 'resolved', 
        adminNotes: note.trim() || 'Resolved by admin' 
      });
      toast.success('Ticket resolved with note');
      await refreshTickets();
    } catch (err) {
      toast.error(err?.message || 'Could not resolve ticket');
    } finally {
      setTicketBusy(ticket._id, false);
    }
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
      toast.success(`${mappedType} deleted successfully`);
      await refreshTickets();
    } catch (err) {
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
        const response = await fetchAdminTickets({ status: statusFilter, limit: 100 });
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
  }, [user?._id, isAdmin, router, statusFilter]);

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

  if (!user) return <div className="container py-5 text-secondary">Loading session...</div>;
  if (!isAdmin) return null;

  return (
    <div className="container py-4 py-md-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h1 className="h3 mb-1">Reports Inbox</h1>
          <p className="text-secondary mb-0">Reports and feedback submitted from the Report Issue page.</p>
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
          <select
            className="form-select form-select-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
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
            const canDeleteTarget = Boolean(DELETE_TARGET_TYPE_MAP[String(ticket.targetType || '').toLowerCase()]) && Boolean(ticket.targetId);
            const canAdvanceStatus = ticket.status === 'open' || ticket.status === 'in_progress';
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
                </div>
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
                  <div className="small fw-semibold mb-2">Quick Actions</div>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => handleAdvanceStatus(ticket)}
                      disabled={!canAdvanceStatus || isBusy}
                    >
                      {canAdvanceStatus ? `Move to ${getNextStatus(ticket.status).replace('_', ' ')}` : 'Already Finalized'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-success"
                      onClick={() => handleResolveWithNote(ticket)}
                      disabled={ticket.status === 'resolved' || ticket.status === 'closed' || isBusy}
                    >
                      Resolve with Note
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      onClick={() => handleDeleteTarget(ticket)}
                      disabled={!canDeleteTarget || isBusy}
                    >
                      One-Click Delete Target
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-warning"
                      onClick={() => handleSuspendUser(ticket)}
                      disabled={isBusy}
                    >
                      Suspend User
                    </button>
                  </div>
                  {ticket.adminNotes && (
                    <div className="mt-2 small">
                      <strong>Admin Note:</strong> {ticket.adminNotes}
                    </div>
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
