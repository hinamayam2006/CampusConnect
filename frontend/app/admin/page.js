'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import useStore from '../../store/useStore';
import { fetchAdminAnalytics, fetchAdminAuditLog } from '../../lib/apiAdmin';

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function getAuditLabel(item) {
  const type = item?.type || '';
  const actor = item?.userId?.name || 'Admin';
  
  // Create a descriptive target label: " a Note ('Physics 101')" or just " a Note"
  const modelName = item?.refModel ? ` ${item.refModel}` : ' content';
  const specificName = item?.meta?.targetName ? ` ('${item.meta.targetName}')` : '';
  const target = `${modelName}${specificName}`;
  
  // Existing ticket/user actions
  if (type === 'admin_user_suspended') return `${actor} suspended a user`;
  if (type === 'admin_user_unsuspended') return `${actor} unsuspended a user`;
  if (type === 'admin_role_changed') return `${actor} changed user role`;
  if (type === 'admin_ticket_updated') return `${actor} updated a ticket`;
  if (type === 'admin_content_deleted') return `${actor} deleted${target}`;
  
  // Moderation Queue actions
  if (type === 'admin_moderation_shadow_ban') return `${actor} shadow-banned/flagged a${target}`;
  if (type === 'admin_moderation_remove_content') return `${actor} removed a${target}`;
  if (type === 'admin_moderation_warn_user') return `${actor} issued a warning to a${target}`;
  if (type === 'admin_moderation_dismiss') return `${actor} dismissed a report against a${target}`;
  if (type === 'admin_moderation_no_action') return `${actor} reviewed a${target} but took no action`;
  
  return `${actor} performed ${type.replace(/_/g, ' ')}`;
}

export default function AdminCommandCenterPage() {
  const router = useRouter();
  const { user } = useStore();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [auditItems, setAuditItems] = useState([]);
  const [auditFilter, setAuditFilter] = useState('');

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
        const auditParams = { limit: 10 };
        if (auditFilter) auditParams.type = auditFilter;

        const [analyticsRes, auditRes] = await Promise.all([
          fetchAdminAnalytics(),
          fetchAdminAuditLog(auditParams),
        ]);
        if (cancelled) return;
        setAnalytics(analyticsRes?.data || null);
        setAuditItems(auditRes?.data?.items || []);
      } catch (err) {
        if (!cancelled) {
          toast.error(err?.message || 'Failed to load admin dashboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?._id, isAdmin, router, auditFilter]);

  const overviewCards = useMemo(() => {
    const o = analytics?.overview || {};
    const marketplace = analytics?.marketplace || {};
    return [
      { label: 'Active Users', value: Math.max(0, (o.totalUsers || 0) - (o.suspendedUsers || 0)) },
      { label: 'Suspended Users', value: o.suspendedUsers || 0 },
      { label: 'Marketplace Sold This Week', value: marketplace.soldThisWeek || 0 },
      { label: 'Open Tickets', value: o.openTickets || 0 },
    ];
  }, [analytics]);

  if (!user) return <div className="container py-5 text-secondary">Loading session...</div>;
  if (!isAdmin) return null;

  return (
    <div className="container py-4 py-md-5">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h1 className="h3 mb-1">Admin Command Center</h1>
          <p className="text-secondary mb-0">Live operational insights from aggregation pipelines and audit logs.</p>
        </div>
        <div className="d-flex gap-2">
          <Link href="/admin/reports" className="btn btn-primary">
            Open Reports Inbox
          </Link>
          <Link href="/admin/moderation" className="btn btn-outline-primary">
            Open Moderation Queue
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-secondary">Loading analytics...</div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            {overviewCards.map((card) => (
              <div key={card.label} className="col-12 col-sm-6 col-xl-3">
                <div className="border rounded-3 p-3 h-100 bg-white">
                  <div className="text-secondary small">{card.label}</div>
                  <div className="display-6 fw-semibold">{card.value}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="row g-4">
            <div className="col-12 col-lg-6">
              <div className="border rounded-3 p-3 h-100 bg-white">
                <h2 className="h6 mb-3">Department Activity (Last 30 Days)</h2>
                {analytics?.departmentActivity?.length ? (
                  <div className="d-grid gap-2">
                    {analytics.departmentActivity.map((entry) => (
                      <div key={entry.department} className="d-flex justify-content-between small border rounded-2 p-2">
                        <span>{entry.department || 'Unknown'}</span>
                        <span>{entry.totalEvents} events</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-secondary small">No activity data yet.</div>
                )}
              </div>
            </div>

            <div className="col-12 col-lg-6">
              <div className="border rounded-3 p-3 h-100 bg-white">
                <h2 className="h6 mb-3">Top Marketplace Categories</h2>
                {analytics?.topCategories?.marketplace?.length ? (
                  <div className="d-grid gap-2">
                    {analytics.topCategories.marketplace.map((entry) => (
                      <div key={entry.category} className="d-flex justify-content-between align-items-center small border rounded-2 p-2">
                        <span className="text-capitalize">{entry.category}</span>
                        <div className="d-flex align-items-center gap-2">
                          <div className="progress" style={{ width: '60px', height: '4px' }}>
                            <div 
                              className="progress-bar bg-primary" 
                              style={{ 
                                width: `${Math.min(100, (entry.count / Math.max(...analytics.topCategories.marketplace.map(c => c.count))) * 100)}%` 
                              }}
                            />
                          </div>
                          <span className="text-secondary">{entry.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-secondary small">No marketplace data yet.</div>
                )}
              </div>
            </div>
            </div>

          {/* Audit Logs (Moved to Bottom, Full Width & Scrollable) */}
          <div className="row g-4 mt-1">
            <div className="col-12">
              <div className="border rounded-3 p-3 bg-white">
                <div className="d-flex justify-content-between align-items-center mb-3 border-bottom pb-3">
                  <div>
                    <h2 className="h5 mb-1">Latest ActivityEvents (Audit Log)</h2>
                    <p className="text-secondary small mb-0">Complete historical record of all administrative and moderation actions.</p>
                  </div>
                  <select
                    className="form-select"
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value)}
                    style={{ width: '250px' }}
                  >
                    <option value="">All Actions</option>
                    <optgroup label="User Management">
                      <option value="admin_user_suspended">User Suspended</option>
                      <option value="admin_user_unsuspended">User Unsuspended</option>
                      <option value="admin_role_changed">Role Changed</option>
                    </optgroup>
                    <optgroup label="Moderation Decisions">
                      <option value="admin_moderation_shadow_ban">Shadow Ban Applied</option>
                      <option value="admin_moderation_remove_content">Content Removed</option>
                      <option value="admin_moderation_warn_user">Warning Issued</option>
                      <option value="admin_moderation_dismiss">Report Dismissed</option>
                      <option value="admin_moderation_no_action">Reviewed / No Action</option>
                    </optgroup>
                    <optgroup label="General Admin">
                      <option value="admin_ticket_updated">Ticket Updated</option>
                      <option value="admin_content_deleted">Content Deleted</option>
                    </optgroup>
                  </select>
                </div>
                
                <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '10px' }}>
                  {auditItems.length ? (
                    <div className="d-flex flex-column gap-2">
                      {auditItems.map((item) => (
                        <div key={item._id} className="d-flex justify-content-between align-items-center border rounded-2 p-3 bg-light">
                          <div className="fw-semibold text-dark" style={{ fontSize: '0.95rem' }}>
                            {getAuditLabel(item)}
                          </div>
                          <div className="small text-secondary font-monospace" style={{ fontSize: '0.8rem' }}>
                            {formatDate(item.createdAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-secondary small text-center p-4 border rounded bg-light">
                      {auditFilter ? `No ${auditFilter.replace('admin_', '').replace(/_/g, ' ')} events found.` : 'No recent audit events found.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
