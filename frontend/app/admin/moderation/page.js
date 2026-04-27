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

const ACTION_OPTIONS = [
  { value: 'shadow_ban', label: 'Shadow Ban / Flag Content' },
  { value: 'remove_content', label: 'Remove Content' },
  { value: 'warn_user', label: 'Warn User' },
  { value: 'dismiss', label: 'Dismiss Report' },
  { value: 'no_action', label: 'No Action' },
];

const SENSITIVITY_ORDER = { high: 3, medium: 2, low: 1 };

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
      const key = `${report.targetModel}:${report.targetId}`;
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          key,
          targetModel: report.targetModel,
          targetId: report.targetId,
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

  const selectedGroup = useMemo(
    () => groupedQueue.find((item) => item.key === selectedGroupKey) || null,
    [groupedQueue, selectedGroupKey]
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
          setSelectedGroupKey('');
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
    if (!groupedQueue.length) {
      setSelectedGroupKey('');
      return;
    }

    const stillExists = groupedQueue.some((item) => item.key === selectedGroupKey);
    if (!stillExists) {
      setSelectedGroupKey(groupedQueue[0].key);
    }
  }, [groupedQueue, selectedGroupKey]);

  useEffect(() => {
    if (!selectedGroup) {
      setDetailReports([]);
      setReviewReportId('');
      return;
    }
    void loadDetailsForGroup(selectedGroup);
  }, [selectedGroup?.key]);

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
          <div className="col-12 col-lg-5">
            <div className="border rounded-3 bg-white overflow-hidden">
              <div className="p-3 border-bottom fw-semibold">Reported Targets ({groupedQueue.length})</div>
              <div className="list-group list-group-flush">
                {groupedQueue.map((group) => {
                  const targetLink = resolveTargetLink(group.targetModel, group.targetId);
                  const isActive = selectedGroupKey === group.key;
                  return (
                    <button
                      key={group.key}
                      type="button"
                      className={`list-group-item list-group-item-action text-start ${isActive ? 'active' : ''}`}
                      onClick={() => setSelectedGroupKey(group.key)}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <div className="fw-semibold">{group.targetModel}</div>
                        <span className={`badge ${getSensitivityBadgeClass(group.sensitivity)}`}>
                          {group.sensitivity || 'unknown'}
                        </span>
                      </div>
                      <div className="small mb-1">Target ID: {group.targetId}</div>
                      <div className="d-flex flex-wrap gap-2 align-items-center">
                        <span className="badge text-bg-dark">Reports: {group.reportCount}</span>
                        <span className={`badge ${getAutoActionBadgeClass(group.autoActionTaken)}`}>
                          {group.autoActionTaken || 'no auto action'}
                        </span>
                        <span className="badge text-bg-secondary">{group.status}</span>
                      </div>
                      <div className="small mt-2">Latest: {formatDate(group.latestCreatedAt)}</div>
                      {targetLink && (
                        <div className="small mt-1">
                          <span className="text-decoration-underline">Open target after select</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-7">
            <div className="border rounded-3 bg-white h-100">
              {!selectedGroup ? (
                <div className="p-3 text-secondary">Select a target to view all submitted reports.</div>
              ) : detailLoading ? (
                <div className="p-3 text-secondary">Loading report details...</div>
              ) : (
                <>
                  <div className="p-3 border-bottom">
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                      <div>
                        <div className="fw-semibold">{selectedGroup.targetModel} moderation details</div>
                        <div className="small text-secondary">Target ID: {selectedGroup.targetId}</div>
                      </div>
                      {resolveTargetLink(selectedGroup.targetModel, selectedGroup.targetId) ? (
                        <Link
                          href={resolveTargetLink(selectedGroup.targetModel, selectedGroup.targetId)}
                          className="btn btn-sm btn-primary"
                        >
                          Open Target
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <div className="p-3 border-bottom">
                    <form className="row g-2" onSubmit={handleSubmitReview}>
                      <div className="col-12 col-md-4">
                        <label className="form-label small mb-1">Report</label>
                        <select
                          className="form-select form-select-sm"
                          value={reviewReportId}
                          onChange={(e) => setReviewReportId(e.target.value)}
                        >
                          {detailReports.map((report) => (
                            <option key={report._id} value={report._id}>
                              {report.reason} ({report.status})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12 col-md-4">
                        <label className="form-label small mb-1">Action</label>
                        <select
                          className="form-select form-select-sm"
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
                      <div className="col-12 col-md-4 d-flex align-items-end">
                        <button type="submit" className="btn btn-sm btn-danger w-100" disabled={submittingReview}>
                          {submittingReview ? 'Applying...' : 'Apply Action'}
                        </button>
                      </div>
                      <div className="col-12">
                        <label className="form-label small mb-1">Admin Note</label>
                        <textarea
                          className="form-control form-control-sm"
                          rows={2}
                          value={reviewNote}
                          onChange={(e) => setReviewNote(e.target.value)}
                          placeholder="Optional moderation note"
                        />
                      </div>
                    </form>
                  </div>

                  <div className="p-3 d-grid gap-2">
                    {detailReports.length === 0 ? (
                      <div className="text-secondary small">No reports found for this target.</div>
                    ) : (
                      detailReports.map((report) => (
                        <div key={report._id} className="border rounded-2 p-2">
                          <div className="d-flex flex-wrap justify-content-between gap-2 mb-1">
                            <div className="fw-semibold text-capitalize">{report.reason?.replace(/_/g, ' ') || 'Unknown reason'}</div>
                            <div className="d-flex gap-2">
                              <span className={`badge ${getSensitivityBadgeClass(report.sensitivity)}`}>{report.sensitivity}</span>
                              <span className="badge text-bg-secondary">{report.status}</span>
                            </div>
                          </div>
                          <div className="small mb-1">Reporter: {report.reportedBy?.name || 'Unknown'} ({report.reportedBy?.email || 'no email'})</div>
                          <div className="small mb-1">Comment: {report.comment || 'No comment provided.'}</div>
                          <div className="d-flex flex-wrap gap-2 small">
                            <span>ID: {report._id}</span>
                            <span>Auto: {report.autoActionTaken || 'none'}</span>
                            <span>Created: {formatDate(report.createdAt)}</span>
                          </div>
                          {report.adminNote ? (
                            <div className="small mt-1"><strong>Admin note:</strong> {report.adminNote}</div>
                          ) : null}
                        </div>
                      ))
                    )}
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
