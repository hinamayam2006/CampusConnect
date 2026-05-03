'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import useStore from '../../../store/useStore';
import {
  fetchModerationContentReports,
  fetchModerationQueue,
  reviewModerationReport,
} from '../../../lib/apiAdmin';
import { AlertCircle, FileText, User, ShieldAlert, XCircle, UserCheck } from 'lucide-react';

const ACTION_OPTIONS = [
  { value: 'shadow_ban', label: 'Shadow Ban / Flag Content' },
  { value: 'remove_content', label: 'Remove Content' },
  { value: 'warn_user', label: 'Warn User' },
  { value: 'dismiss', label: 'Dismiss Report' },
  { value: 'no_action', label: 'No Action' },
];

const SENSITIVITY_ORDER = { high: 3, medium: 2, low: 1 };

function resolveTargetLink(targetType, targetIdStr) {
  if (!targetType || !targetIdStr) return '';
  const normalized = String(targetType).toLowerCase();
  if (normalized === 'listing') return `/marketplace/${targetIdStr}`;
  if (normalized === 'ride') return `/rides/${targetIdStr}`;
  if (normalized === 'note') return `/notes/${targetIdStr}`;
  if (normalized === 'borrowing') return `/borrow/${targetIdStr}`;
  if (normalized === 'lostnfound') return `/lostnfound/${targetIdStr}`;
  if (normalized === 'request') return `/requests/${targetIdStr}`;
  if (normalized === 'user') return `/profile/${targetIdStr}`;
  return '';
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function getAutoActionBadgeClass(autoAction) {
  if (autoAction === 'shadow_banned') return 'text-bg-danger';
  if (autoAction === 'flagged' || autoAction === 'hidden') return 'text-bg-warning';
  if (autoAction === 'warning_badge') return 'text-bg-info';
  return 'text-bg-secondary';
}

function getSensitivityBadgeClass(sensitivity) {
  if (sensitivity === 'high') return 'text-bg-danger';
  if (sensitivity === 'medium') return 'text-bg-warning';
  return 'text-bg-secondary';
}

function getTargetName(targetObj) {
  if (!targetObj || typeof targetObj !== 'object') return null;
  if (targetObj.title) return targetObj.title;
  if (targetObj.name) return targetObj.name;
  if (targetObj.originName && targetObj.destinationName) return `${targetObj.originName} → ${targetObj.destinationName}`;
  return null;
}

export default function AdminModerationQueuePage() {
  const router = useRouter();
  const { user } = useStore();

  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [queueItems, setQueueItems] = useState([]);

  const [selectedGroupKey, setSelectedGroupKey] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailReports, setDetailReports] = useState([]);

  const [reviewReportId, setReviewReportId] = useState('');
  const [reviewAction, setReviewAction] = useState('dismiss');
  const [reviewNote, setReviewNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const isAdmin = user?.role === 'admin';

  const groupedQueue = useMemo(() => {
    const map = new Map();

    for (const report of queueItems) {
      const targetObj = report.targetId;
      const targetIdStr = typeof targetObj === 'object' ? targetObj?._id : targetObj;
      if (!targetIdStr) continue;

      const key = `${report.targetModel}:${targetIdStr}`;
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          key,
          targetModel: report.targetModel,
          targetId: targetIdStr,
          targetName: getTargetName(targetObj),
          sensitivity: report.sensitivity,
          status: report.status,
          latestCreatedAt: report.createdAt,
          autoActionTaken: report.autoActionTaken || null,
          reportCount: 1,
          reports: [report],
        });
        continue;
      }

      existing.reports.push(report);
      existing.reportCount += 1;

      if ((SENSITIVITY_ORDER[report.sensitivity] || 0) > (SENSITIVITY_ORDER[existing.sensitivity] || 0)) {
        existing.sensitivity = report.sensitivity;
      }

      if (new Date(report.createdAt).getTime() > new Date(existing.latestCreatedAt).getTime()) {
        existing.latestCreatedAt = report.createdAt;
      }

      if (!existing.autoActionTaken && report.autoActionTaken) {
        existing.autoActionTaken = report.autoActionTaken;
      }

      if (existing.status !== 'pending' && report.status === 'pending') {
        existing.status = 'pending';
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.latestCreatedAt).getTime() - new Date(a.latestCreatedAt).getTime()
    );
  }, [queueItems]);

  const effectiveSelectedGroupKey = useMemo(() => {
    if (!groupedQueue.length) return '';
    const stillExists = groupedQueue.some((item) => item.key === selectedGroupKey);
    return stillExists ? selectedGroupKey : groupedQueue[0].key;
  }, [groupedQueue, selectedGroupKey]);

  const selectedGroup = useMemo(
    () => groupedQueue.find((item) => item.key === effectiveSelectedGroupKey) || null,
    [groupedQueue, effectiveSelectedGroupKey]
  );

  const loadQueue = async () => {
    const response = await fetchModerationQueue({ priority: priorityFilter, page: 1, limit: 200 });
    const items = response?.data?.items || [];
    setQueueItems(items);
  };

  const loadDetailsForGroup = async (group) => {
    if (!group) return;
    setDetailLoading(true);
    try {
      const response = await fetchModerationContentReports(group.targetModel, group.targetId);
      const reports = response?.data?.items || [];
      setDetailReports(reports);

      const firstPending = reports.find((item) => item.status === 'pending');
      setReviewReportId(firstPending?._id || reports[0]?._id || '');
      setReviewAction('dismiss');
      setReviewNote('');
    } catch (err) {
      toast.error(err?.message || 'Failed to load report details');
      setDetailReports([]);
      setReviewReportId('');
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    if (!user?._id) return;
    if (!isAdmin) {
      toast.error('Admin access required');
      router.replace('/');
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const response = await fetchModerationQueue({ priority: priorityFilter, page: 1, limit: 200 });
        if (cancelled) return;

        const items = response?.data?.items || [];
        setQueueItems(items);

        if (!items.length) {
          setDetailReports([]);
          setReviewReportId('');
          return;
        }
      } catch (err) {
        if (!cancelled) toast.error(err?.message || 'Failed to load moderation queue');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [user?._id, isAdmin, router, priorityFilter]);
  useEffect(() => {
    if (!selectedGroup) {
      // Defer clearing state to avoid synchronous setState within an effect
      // which can trigger cascading renders and trips the linter rule.
      const id = setTimeout(() => {
        setDetailReports([]);
        setReviewReportId('');
      }, 0);
      return () => clearTimeout(id);
    }

    // Defer the async load to the next microtask so any setState calls happen
    // outside the synchronous effect body (avoids lint rule about setState-in-effect).
    Promise.resolve().then(() => loadDetailsForGroup(selectedGroup));
  }, [selectedGroup]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewReportId) {
      toast.error('Select a report to review');
      return;
    }

    setSubmittingReview(true);
    try {
      await reviewModerationReport(reviewReportId, {
        action: reviewAction,
        adminNote: reviewNote,
      });
      toast.success('Moderation action applied');

      await loadQueue();
      if (selectedGroup) {
        await loadDetailsForGroup(selectedGroup);
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to apply moderation action');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (!user) return <div className="container py-5 text-secondary">Loading session...</div>;
  if (!isAdmin) return null;

  return (
    <div className="container py-4 py-md-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h1 className="h3 mb-1">Moderation Queue</h1>
          <p className="text-secondary mb-0">Flagged and high-alert reports from report buttons (notes, rides, listings, and more).</p>
        </div>
        <div className="d-flex gap-2">
          <Link href="/admin/reports" className="btn btn-outline-primary">Reports Inbox</Link>
          <Link href="/admin" className="btn btn-outline-secondary">Back to Command Center</Link>
        </div>
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <label className="form-label mb-0 small text-secondary">Priority</label>
        <select
          className="form-select form-select-sm"
          style={{ width: '220px' }}
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
        >
          <option value="all">All reports</option>
          <option value="critical">Critical (high + shadow banned)</option>
          <option value="high">High (flagged/hidden)</option>
          <option value="medium">Medium (warning badge)</option>
        </select>
      </div>

      {loading ? (
        <div className="text-secondary">Loading moderation queue...</div>
      ) : !groupedQueue.length ? (
        <div className="text-secondary">No moderation reports for this filter.</div>
      ) : (
        <div className="row g-3">
          {/* LEFT PANEL - QUEUE LIST */}
          <div className="col-12 col-lg-4">
            <div className="border rounded-3 bg-white overflow-hidden" style={{ maxHeight: '800px', display: 'flex', flexDirection: 'column' }}>
              <div className="p-3 border-bottom fw-semibold bg-light">Reported Targets ({groupedQueue.length})</div>
              <div className="list-group list-group-flush overflow-auto">
                {groupedQueue.map((group) => {
                  const isActive = effectiveSelectedGroupKey === group.key;
                  return (
                    <button
                      key={group.key}
                      type="button"
                      className={`list-group-item list-group-item-action text-start ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedGroupKey(group.key)}
                      style={{ padding: '1rem' }}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <div className="fw-bold" style={{ fontSize: '0.95rem' }}>
                            {group.targetModel}
                          </div>
                          {group.targetName ? (
                            <div className="text-truncate" style={{ fontSize: '0.85rem', maxWidth: '200px', opacity: isActive ? 0.9 : 0.6 }}>
                              {group.targetName}
                            </div>
                          ) : (
                            <div className="text-truncate font-monospace" style={{ fontSize: '0.75rem', opacity: isActive ? 0.9 : 0.5 }}>
                              ID: {group.targetId}
                            </div>
                          )}
                        </div>
                        <span className={`badge ${getSensitivityBadgeClass(group.sensitivity)}`}>
                          {group.sensitivity || 'unknown'}
                        </span>
                      </div>
                      
                      <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
                        <span className="badge text-bg-dark">
                          <AlertCircle size={10} className="me-1" />
                          {group.reportCount} Report{group.reportCount !== 1 && 's'}
                        </span>
                        {group.autoActionTaken && (
                          <span className={`badge ${getAutoActionBadgeClass(group.autoActionTaken)}`}>
                            {group.autoActionTaken.replace(/_/g, ' ')}
                          </span>
                        )}
                        {group.status !== 'pending' && <span className="badge text-bg-secondary">{group.status}</span>}
                      </div>
                      
                      <div className="small mt-2" style={{ opacity: isActive ? 0.8 : 0.5, fontSize: '0.75rem' }}>
                        Latest: {formatDate(group.latestCreatedAt)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - DETAILS & ACTION */}
          <div className="col-12 col-lg-8">
            <div className="border rounded-3 bg-white h-100 d-flex flex-column">
              {!selectedGroup ? (
                <div className="p-5 text-secondary text-center d-flex flex-column align-items-center justify-content-center h-100">
                  <FileText size={48} className="mb-3 opacity-25" />
                  <h4>Select a target</h4>
                  <p>Choose an item from the queue to review evidence and take action.</p>
                </div>
              ) : detailLoading ? (
                <div className="p-5 text-secondary text-center">Loading evidence...</div>
              ) : (
                <>
                  {/* HEADER */}
                  <div className="p-3 border-bottom bg-light">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                      <div>
                        <div className="d-flex align-items-center gap-2">
                          <h4 className="fw-bold mb-0">{selectedGroup.targetModel}</h4>
                          {selectedGroup.targetName && (
                            <span className="text-secondary fs-5">— {selectedGroup.targetName}</span>
                          )}
                        </div>
                        <div className="small text-secondary font-monospace mt-1">ID: {selectedGroup.targetId}</div>
                      </div>
                      {resolveTargetLink(selectedGroup.targetModel, selectedGroup.targetId) && (
                        <Link
                          href={resolveTargetLink(selectedGroup.targetModel, selectedGroup.targetId)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline-dark btn-sm d-flex align-items-center gap-1"
                        >
                          View Original Content ↗
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* EVIDENCE SECTION (Moved to top) */}
                  <div className="p-4 border-bottom bg-white flex-grow-1 overflow-auto">
                    <h5 className="mb-3 d-flex align-items-center gap-2">
                      <ShieldAlert size={18} className="text-danger" /> 
                      Evidence & Complaints ({detailReports.length})
                    </h5>
                    
                    {detailReports.length === 0 ? (
                      <div className="text-secondary small">No reports found for this target.</div>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {detailReports.map((report) => (
                          <div key={report._id} className="border border-danger-subtle rounded-3 p-3 bg-white shadow-sm">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <h6 className="fw-bold text-danger text-capitalize m-0">
                                {report.reason?.replace(/_/g, ' ') || 'Unknown violation'}
                              </h6>
                              <div className="d-flex gap-2">
                                <span className={`badge ${getSensitivityBadgeClass(report.sensitivity)}`}>{report.sensitivity} risk</span>
                                <span className="badge text-bg-light border">{report.status}</span>
                              </div>
                            </div>
                            
                            <div className="p-3 bg-light rounded-2 mb-3 mt-2 font-monospace" style={{ fontSize: '0.9rem', color: '#333' }}>
                              &quot;{report.comment || 'No additional context provided.'}&quot;
                            </div>
                            
                            <div className="d-flex flex-wrap justify-content-between align-items-center text-secondary" style={{ fontSize: '0.8rem' }}>
                              <div className="d-flex align-items-center gap-2">
                                <User size={14} />
                                <span>{report.reportedBy?.name || 'Unknown'} ({report.reportedBy?.email || 'no email'})</span>
                              </div>
                              <div className="d-flex gap-3">
                                {report.autoActionTaken && (
                                  <span className="text-danger">Auto-action: {report.autoActionTaken}</span>
                                )}
                                <span>Reported: {formatDate(report.createdAt)}</span>
                              </div>
                            </div>

                            {report.adminNote && (
                              <div className="mt-3 p-2 bg-info-subtle rounded border border-info-subtle small">
                                <strong>Previous Admin Note:</strong> {report.adminNote}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ACTION SECTION (Moved to bottom) */}
                  <div className="p-4 bg-light border-top" style={{ borderTopWidth: '2px !important' }}>
                    <h5 className="mb-3 d-flex align-items-center gap-2">
                      <UserCheck size={18} className="text-primary" />
                      Take Action
                    </h5>
                    <form className="row g-3" onSubmit={handleSubmitReview}>
                      <div className="col-12 col-md-5">
                        <label className="form-label fw-semibold small mb-1">Target Report</label>
                        <select
                          className="form-select bg-white"
                          value={reviewReportId}
                          onChange={(e) => setReviewReportId(e.target.value)}
                        >
                          {detailReports.map((report) => (
                            <option key={report._id} value={report._id}>
                              {report.reason.replace(/_/g, ' ')} ({report.status})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label fw-semibold small mb-1">Resolution Action</label>
                        <select
                          className="form-select bg-white"
                          value={reviewAction}
                          onChange={(e) => setReviewAction(e.target.value)}
                        >
                          {ACTION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 col-md-3 d-flex align-items-end">
                        <button type="submit" className={`btn w-100 ${reviewAction === 'dismiss' || reviewAction === 'no_action' ? 'btn-secondary' : 'btn-danger'}`} disabled={submittingReview}>
                          {submittingReview ? 'Processing...' : 'Apply Decision'}
                        </button>
                      </div>
                      <div className="col-12">
                        <label className="form-label fw-semibold small mb-1">Internal Admin Note (Optional)</label>
                        <textarea
                          className="form-control bg-white"
                          rows={2}
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          placeholder="Document your decision for other admins..."
                        />
                      </div>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

