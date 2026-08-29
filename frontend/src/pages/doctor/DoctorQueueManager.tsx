import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Doctor, QueueEntry } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useNotification } from '../../contexts/NotificationContext';
import {
  Users,
  Clock,
  PhoneCall,
  Play,
  Check,
  UserX,
  SkipForward,
  AlertTriangle,
  FileText,
  RefreshCw,
  Sparkles,
  Zap,
  Activity
} from 'lucide-react';
import { getSocket, joinDoctorQueue } from '../../services/socket';

export const DoctorQueueManager: React.FC = () => {
  const { showToast } = useNotification();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [currentlyServing, setCurrentlyServing] = useState<QueueEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Consultation completion state
  const [completeNotes, setCompleteNotes] = useState('');

  // Priority escalation modal state
  const [escalateQueueEntry, setEscalateQueueEntry] = useState<QueueEntry | null>(null);
  const [escalatePriorityLevel, setEscalatePriorityLevel] = useState<'EMERGENCY' | 'HIGH'>('EMERGENCY');
  const [escalateReason, setEscalateReason] = useState('');
  const [isEscalating, setIsEscalating] = useState(false);

  const fetchDoctorQueue = async () => {
    try {
      const res = await api.get<{
        success: boolean;
        doctor: Doctor;
        queue: QueueEntry[];
        currentlyServing: QueueEntry | null;
      }>('/queue/doctor/0');

      if (res.success) {
        setDoctor(res.doctor);
        setQueue(res.queue || []);
        setCurrentlyServing(res.currentlyServing);

        if (res.doctor.id) {
          joinDoctorQueue(res.doctor.id);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorQueue();

    const socket = getSocket();
    const handleUpdate = () => {
      fetchDoctorQueue();
    };

    socket.on('queue:updated', handleUpdate);
    const interval = setInterval(fetchDoctorQueue, 4000);

    return () => {
      socket.off('queue:updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const handleCall = async (queueId: number) => {
    try {
      const res = await api.post(`/queue/${queueId}/call`);
      if (res.success) {
        showToast('info', 'Patient has been notified and called to consultation room.');
        fetchDoctorQueue();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Call failed');
    }
  };

  const handleStart = async (queueId: number) => {
    try {
      const res = await api.post(`/queue/${queueId}/start`);
      if (res.success) {
        showToast('success', 'Consultation in progress.');
        fetchDoctorQueue();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Start failed');
    }
  };

  const handleComplete = async (queueId: number) => {
    try {
      const res = await api.post(`/queue/${queueId}/complete`, { notes: completeNotes.trim() });
      if (res.success) {
        showToast('success', 'Consultation complete! Next patient automatically eligible.');
        setCompleteNotes('');
        fetchDoctorQueue();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Complete failed');
    }
  };

  const handleNoShow = async (queueId: number) => {
    try {
      const res = await api.post(`/queue/${queueId}/no-show`);
      if (res.success) {
        showToast('warning', 'Patient marked as NO-SHOW. Account history updated.');
        fetchDoctorQueue();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Action failed');
    }
  };

  const handleSkip = async (queueId: number) => {
    try {
      const res = await api.post(`/queue/${queueId}/skip`);
      if (res.success) {
        showToast('info', 'Patient skipped and re-queued.');
        fetchDoctorQueue();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Skip failed');
    }
  };

  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escalateQueueEntry || !escalateReason.trim()) return;

    setIsEscalating(true);
    try {
      const res = await api.post(`/queue/${escalateQueueEntry.id}/priority`, {
        priority: escalatePriorityLevel,
        reason: escalateReason.trim()
      });

      if (res.success) {
        showToast('success', `Patient priority escalated to ${escalatePriorityLevel}!`);
        setEscalateQueueEntry(null);
        setEscalateReason('');
        fetchDoctorQueue();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Escalation failed');
    } finally {
      setIsEscalating(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading Live Queue Console..." />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" /> Live Queue Console
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Consultation & Queue Manager
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {doctor?.full_name} • {doctor?.room_number} • Total Waiting: {queue.filter((q) => q.status === 'WAITING').length}
          </p>
        </div>

        <button
          onClick={fetchDoctorQueue}
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition flex items-center gap-2 text-xs font-bold"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Currently Serving Box */}
      {currentlyServing ? (
        <div className="bg-gradient-to-tr from-purple-900 via-slate-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/30 text-purple-300 flex items-center justify-center font-bold">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                  Active Consultation in Room {doctor?.room_number}
                </span>
                <h2 className="text-3xl font-black text-white mt-0.5">
                  {currentlyServing.patient_name}{' '}
                  <span className="text-purple-400 font-mono text-xl">({currentlyServing.queue_number})</span>
                </h2>
              </div>
            </div>

            <Badge status={currentlyServing.priority_level} size="md" />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Consultation Diagnosis & Clinical Notes
              </label>
              <textarea
                rows={3}
                value={completeNotes}
                onChange={(e) => setCompleteNotes(e.target.value)}
                placeholder="Enter prescription notes, diagnostic findings, or follow-up recommendations..."
                className="w-full px-4 py-3 rounded-2xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <span className="text-xs text-slate-400">
                Clicking complete consultation will update appointment status and move next patient forward.
              </span>

              <button
                onClick={() => handleComplete(currentlyServing.id)}
                className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-500/30 transition flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                <span>Complete Consultation</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-teal-50/70 border border-teal-200 rounded-3xl text-teal-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-teal-600" />
            <div>
              <h4 className="font-extrabold text-base">Doctor Room is Currently Available</h4>
              <p className="text-xs text-teal-700 mt-0.5">
                Select the next patient from the waiting list below to start consultation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Queue List Table */}
      <div className="space-y-4">
        <h3 className="text-lg font-extrabold text-slate-900">Live Waiting Queue (Deterministic Priority Order)</h3>

        {queue.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
            <Users className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="font-bold text-base text-slate-800">No Patients in Waiting Queue</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Checked-in patients will be dynamically placed in this queue based on medical priority.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-4 text-left">Queue Pos</th>
                    <th className="px-6 py-4 text-left">Token</th>
                    <th className="px-6 py-4 text-left">Patient</th>
                    <th className="px-6 py-4 text-left">Priority</th>
                    <th className="px-6 py-4 text-left">Score</th>
                    <th className="px-6 py-4 text-left">Status</th>
                    <th className="px-6 py-4 text-left">Est. Wait</th>
                    <th className="px-6 py-4 text-right">Doctor Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {queue.map((entry) => {
                    const isServing = entry.status === 'IN_PROGRESS';
                    const isCalled = entry.status === 'CALLED';

                    return (
                      <tr
                        key={entry.id}
                        className={`transition ${
                          isServing
                            ? 'bg-purple-50/60 font-semibold'
                            : isCalled
                            ? 'bg-amber-50/60 font-semibold'
                            : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {entry.queue_position === 0 ? 'Serving' : `#${entry.queue_position}`}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-teal-700 text-sm">
                          {entry.queue_number}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{entry.patient_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{entry.patient_code}</div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge status={entry.priority_level} size="sm" />
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-500 text-[11px]">
                          {entry.priority_score} pts
                        </td>
                        <td className="px-6 py-4">
                          <Badge status={entry.status} size="sm" />
                        </td>
                        <td className="px-6 py-4 text-indigo-600 font-semibold">
                          {entry.estimated_wait_minutes} min
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                          {entry.status === 'WAITING' && (
                            <>
                              <button
                                onClick={() => handleCall(entry.id)}
                                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold rounded-lg transition"
                                title="Call patient to room"
                              >
                                Call
                              </button>

                              <button
                                onClick={() => handleStart(entry.id)}
                                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition"
                                title="Start consultation"
                              >
                                Start
                              </button>

                              <button
                                onClick={() => setEscalateQueueEntry(entry)}
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-lg transition"
                                title="Escalate to Emergency"
                              >
                                <Zap className="w-3.5 h-3.5 inline" />
                              </button>

                              <button
                                onClick={() => handleSkip(entry.id)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                                title="Skip patient"
                              >
                                <SkipForward className="w-3.5 h-3.5 inline" />
                              </button>

                              <button
                                onClick={() => handleNoShow(entry.id)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition"
                                title="Mark as No-Show"
                              >
                                <UserX className="w-3.5 h-3.5 inline" />
                              </button>
                            </>
                          )}

                          {entry.status === 'CALLED' && (
                            <>
                              <button
                                onClick={() => handleStart(entry.id)}
                                className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition"
                              >
                                Start
                              </button>
                              <button
                                onClick={() => handleNoShow(entry.id)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition"
                              >
                                No-Show
                              </button>
                            </>
                          )}

                          {entry.status === 'IN_PROGRESS' && (
                            <button
                              onClick={() => handleComplete(entry.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                            >
                              Complete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Escalate Priority Modal */}
      <Modal
        isOpen={!!escalateQueueEntry}
        onClose={() => setEscalateQueueEntry(null)}
        title="Escalate Patient Priority"
        subtitle={`Adjust triage status for ${escalateQueueEntry?.patient_name} (${escalateQueueEntry?.queue_number})`}
        maxWidth="md"
      >
        <form onSubmit={handleEscalateSubmit} className="space-y-4">
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            Emergency patients are deterministically placed at the immediate top of the waiting queue.
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Select Escalation Level *
            </label>
            <select
              value={escalatePriorityLevel}
              onChange={(e) => setEscalatePriorityLevel(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold"
            >
              <option value="EMERGENCY">EMERGENCY (Highest Priority - Immediate Top)</option>
              <option value="HIGH">HIGH PRIORITY (Accelerated Queue Position)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Clinical Justification & Reason *
            </label>
            <textarea
              rows={3}
              value={escalateReason}
              onChange={(e) => setEscalateReason(e.target.value)}
              required
              placeholder="e.g. Acute chest pain, critical vitals, severe trauma triage..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEscalateQueueEntry(null)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isEscalating || !escalateReason.trim()}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md shadow-red-600/20"
            >
              {isEscalating ? 'Escalating...' : 'Confirm Priority Escalation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
