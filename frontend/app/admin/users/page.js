'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import useStore from '../../../store/useStore';
import ConfirmModal from '../../../components/admin/ConfirmModal';
import {
  fetchAdminUsers,
  updateAdminUserRole,
  suspendAdminUser,
  unsuspendAdminUser,
} from '../../../lib/apiAdmin';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [suspendedFilter, setSuspendedFilter] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: '',
    userId: null,
    userName: '',
    reason: '',
  });

  const isAdmin = user?.role === 'admin';
  const limit = 20;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: page.toString(),
        limit: limit.toString(),
      };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (suspendedFilter) params.suspended = suspendedFilter;

      const response = await fetchAdminUsers(params);
      setUsers(response?.data?.users || []);
      setTotal(response?.data?.total || 0);
    } catch (err) {
      toast.error(err?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, suspendedFilter]);

  useEffect(() => {
    if (!user?._id) return;
    if (!isAdmin) {
      toast.error('Admin access required');
      router.replace('/');
      return;
    }

    // Defer the data loading to avoid synchronous setState calls
    const timer = setTimeout(() => {
      loadUsers();
    }, 0);

    return () => clearTimeout(timer);
  }, [user?._id, isAdmin, router, loadUsers]);

  const handleRoleChange = async (userId, newRole) => {
    const actionKey = `role-${userId}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    
    try {
      await updateAdminUserRole(userId, newRole);
      toast.success('Role updated successfully');
      loadUsers();
    } catch (err) {
      toast.error(err?.message || 'Failed to update role');
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleSuspend = (userId, userName) => {
    setConfirmModal({
      isOpen: true,
      type: 'suspend',
      userId,
      userName,
      reason: '',
    });
  };

  const handleUnsuspend = (userId, userName) => {
    setConfirmModal({
      isOpen: true,
      type: 'unsuspend',
      userId,
      userName,
      reason: '',
    });
  };

  const handleConfirmSuspend = async () => {
    const { userId, userName, reason } = confirmModal;
    if (!reason?.trim()) {
      toast.error('Suspension reason is required');
      return;
    }

    const actionKey = `suspend-${userId}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    
    try {
      await suspendAdminUser(userId, reason);
      toast.success(`User ${userName} suspended`);
      loadUsers();
    } catch (err) {
      toast.error(err?.message || 'Failed to suspend user');
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleConfirmUnsuspend = async () => {
    const { userId, userName } = confirmModal;
    const actionKey = `unsuspend-${userId}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    
    try {
      await unsuspendAdminUser(userId);
      toast.success(`User ${userName} unsuspended`);
      loadUsers();
    } catch (err) {
      toast.error(err?.message || 'Failed to unsuspend user');
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleCloseModal = () => {
    setConfirmModal({
      isOpen: false,
      type: '',
      userId: null,
      userName: '',
      reason: '',
    });
  };

  const totalPages = Math.ceil(total / limit);

  if (!user) return <div className="container py-5 text-secondary">Loading session...</div>;
  if (!isAdmin) return null;

  return (
    <div className="container py-4 py-md-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h1 className="h3 mb-1">User Management</h1>
          <p className="text-secondary mb-0">Manage user roles, suspensions, and access.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="border rounded-3 p-3 mb-4 bg-white">
        <div className="row g-3">
          <div className="col-12 col-md-4">
            <label className="form-label small">Search Users</label>
            <input
              type="text"
              className="form-control"
              placeholder="Name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label small">Role</label>
            <select
              className="form-select"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Roles</option>
              <option value="student">Student</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="col-12 col-md-3">
            <label className="form-label small">Status</label>
            <select
              className="form-select"
              value={suspendedFilter}
              onChange={(e) => {
                setSuspendedFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Status</option>
              <option value="false">Active</option>
              <option value="true">Suspended</option>
            </select>
          </div>
          <div className="col-12 col-md-2 d-flex align-items-end">
            <button
              className="btn btn-outline-secondary w-100"
              onClick={() => {
                setSearch('');
                setRoleFilter('');
                setSuspendedFilter('');
                setPage(1);
              }}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="text-secondary small">
          Showing {users.length} of {total} users
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border spinner-border-sm me-2" />
          Loading users...
        </div>
      ) : users.length > 0 ? (
        <>
          <div className="table-responsive border rounded-3 bg-white">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((userItem) => (
                  <tr key={userItem._id}>
                    <td>
                      <div>
                        <div className="fw-semibold">{userItem.name}</div>
                        <div className="small text-secondary">{userItem.email}</div>
                      </div>
                    </td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={userItem.role}
                        onChange={(e) => handleRoleChange(userItem._id, e.target.value)}
                        disabled={
                          actionLoading[`role-${userItem._id}`] ||
                          userItem._id === user._id ||
                          userItem.role === 'admin'
                        }
                        style={{ minWidth: '120px' }}
                      >
                        <option value="student">Student</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td>
                      {userItem.isSuspended ? (
                        <span className="badge bg-danger">Suspended</span>
                      ) : (
                        <span className="badge bg-success">Active</span>
                      )}
                    </td>
                    <td className="small text-secondary">
                      {formatDate(userItem.createdAt)}
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        {userItem.isSuspended ? (
                          <button
                            className="btn btn-sm btn-outline-success"
                            onClick={() => handleUnsuspend(userItem._id, userItem.name)}
                            disabled={actionLoading[`unsuspend-${userItem._id}`]}
                          >
                            {actionLoading[`unsuspend-${userItem._id}`] ? (
                              <span className="spinner-border spinner-border-sm" />
                            ) : (
                              'Unsuspend'
                            )}
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleSuspend(userItem._id, userItem.name)}
                            disabled={
                              actionLoading[`suspend-${userItem._id}`] ||
                              userItem.role === 'admin' ||
                              userItem._id === user._id
                            }
                          >
                            {actionLoading[`suspend-${userItem._id}`] ? (
                              <span className="spinner-border spinner-border-sm" />
                            ) : (
                              'Suspend'
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <nav>
                <ul className="pagination mb-0">
                  <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </button>
                  </li>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <li
                        key={pageNum}
                        className={`page-item ${page === pageNum ? 'active' : ''}`}
                      >
                        <button
                          className="page-link"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      </li>
                    );
                  })}
                  {totalPages > 5 && (
                    <li className="page-item disabled">
                      <span className="page-link">...</span>
                    </li>
                  )}
                  <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                    <button
                      className="page-link"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-5 border rounded-3 bg-white">
          <div className="text-secondary">No users found matching your criteria.</div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.type === 'unsuspend' && confirmModal.isOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmUnsuspend}
        title="Unsuspend User"
        message={`Are you sure you want to unsuspend ${confirmModal.userName}? This will restore their access to the platform.`}
        confirmText="Unsuspend User"
        cancelText="Cancel"
        variant="success"
        loading={actionLoading[`unsuspend-${confirmModal.userId}`]}
      />

      {/* Suspension Reason Input Modal */}
      {confirmModal.type === 'suspend' && confirmModal.isOpen && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Suspend User</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={handleCloseModal}
                  disabled={actionLoading[`suspend-${confirmModal.userId}`]}
                />
              </div>
              <div className="modal-body">
                <p className="text-secondary mb-3">
                  Are you sure you want to suspend <strong>{confirmModal.userName}</strong>? This will prevent them from accessing the platform.
                </p>
                <label className="form-label">Please enter the reason for suspension:</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={confirmModal.reason}
                  onChange={(e) => setConfirmModal(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Enter suspension reason..."
                  disabled={actionLoading[`suspend-${confirmModal.userId}`]}
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                  disabled={actionLoading[`suspend-${confirmModal.userId}`]}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleConfirmSuspend}
                  disabled={!confirmModal.reason?.trim() || actionLoading[`suspend-${confirmModal.userId}`]}
                >
                  {actionLoading[`suspend-${confirmModal.userId}`] ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      Suspending...
                    </>
                  ) : (
                    'Suspend User'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
