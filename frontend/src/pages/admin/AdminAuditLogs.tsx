import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { AuditLogItem } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ShieldCheck, RefreshCw, FileText, Search, User } from 'lucide-react';

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [actionFilter, setActionFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (actionFilter) query.append('action', actionFilter);

      const res = await api.get<{ success: boolean; logs: AuditLogItem[] }>(`/admin/audit-logs?${query.toString()}`);
      if (res.success && res.logs) {
        setLogs(res.logs);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Security & Operational Audit Trail</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Immutable log of appointment creations, cancellations, priority escalations, and system actions
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
          title="Refresh Logs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex gap-3">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 font-medium"
        >
          <option value="">All Security & System Actions</option>
          <option value="USER_LOGIN">USER_LOGIN</option>
          <option value="PATIENT_REGISTER">PATIENT_REGISTER</option>
          <option value="APPOINTMENT_BOOK">APPOINTMENT_BOOK</option>
          <option value="APPOINTMENT_RESCHEDULE">APPOINTMENT_RESCHEDULE</option>
          <option value="APPOINTMENT_CANCEL">APPOINTMENT_CANCEL</option>
          <option value="QUEUE_CHECKIN">QUEUE_CHECKIN</option>
          <option value="QUEUE_CALL_PATIENT">QUEUE_CALL_PATIENT</option>
          <option value="QUEUE_START_CONSULTATION">QUEUE_START_CONSULTATION</option>
          <option value="QUEUE_COMPLETE_CONSULTATION">QUEUE_COMPLETE_CONSULTATION</option>
          <option value="PRIORITY_ESCALATION">PRIORITY_ESCALATION</option>
          <option value="ADMIN_PATIENT_UNFLAG">ADMIN_PATIENT_UNFLAG</option>
        </select>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <LoadingSpinner size="lg" text="Loading security audit records..." />
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
          <FileText className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="font-bold text-base text-slate-800">No Audit Records Found</h4>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4 text-left">Timestamp</th>
                  <th className="px-6 py-4 text-left">Action</th>
                  <th className="px-6 py-4 text-left">User</th>
                  <th className="px-6 py-4 text-left">Entity</th>
                  <th className="px-6 py-4 text-left">Details</th>
                  <th className="px-6 py-4 text-left">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {log.created_at}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{log.user_email || 'System'}</div>
                      <div className="text-[10px] text-slate-400 font-bold">{log.user_role || 'ANONYMOUS'}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                      {log.entity_type} #{log.entity_id || '—'}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate font-mono text-[11px] text-slate-500">
                      {log.details_json || '—'}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-400">{log.ip_address || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
