import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Doctor, QueueEntry, Appointment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Activity,
  ArrowRight,
  PhoneCall,
  Play,
  Check,
  MapPin,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { getSocket, joinDoctorQueue } from '../../services/socket';

export const DoctorDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [currentlyServing, setCurrentlyServing] = useState<QueueEntry | null>(null);
  const [nextPatient, setNextPatient] = useState<QueueEntry | null>(null);
  const [doctorStatus, setDoctorStatus] = useState<string>('AVAILABLE');
  const [isLoading, setIsLoading] = useState(true);

  const fetchDoctorQueue = async () => {
    try {
      const res = await api.get<{
        success: boolean;
        doctor: Doctor;
        queue: QueueEntry[];
        currentlyServing: QueueEntry | null;
        nextPatient: QueueEntry | null;
      }>('/queue/doctor/0');

      if (res.success) {
        setDoctor(res.doctor);
        setQueue(res.queue || []);
        setCurrentlyServing(res.currentlyServing);
        setNextPatient(res.nextPatient);
        setDoctorStatus(res.doctor.status);

        // Join doctor socket room
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
    const interval = setInterval(fetchDoctorQueue, 5000);

    return () => {
      socket.off('queue:updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await api.put('/doctors/me/status', { status: newStatus });
      if (res.success) {
        setDoctorStatus(newStatus);
        showToast('success', `Status updated to ${newStatus}`);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update status');
    }
  };

  const handleCall = async (queueId: number) => {
    try {
      const res = await api.post(`/queue/${queueId}/call`);
      if (res.success) {
        showToast('success', 'Patient called!');
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
        showToast('success', 'Consultation started!');
        fetchDoctorQueue();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Start failed');
    }
  };

  const handleComplete = async (queueId: number) => {
    try {
      const res = await api.post(`/queue/${queueId}/complete`, { notes: 'Completed regular consultation.' });
      if (res.success) {
        showToast('success', 'Consultation completed! Next patient moved forward.');
        fetchDoctorQueue();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Complete failed');
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading doctor console..." />;
  }

  const waitingPatients = queue.filter((q) => q.status === 'WAITING');

  return (
    <div className="space-y-8">
      {/* 1. Top Banner & Status Controls */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400">Doctor Practice Console</span>
            <Badge status={doctorStatus} size="sm" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {doctor?.full_name || 'Dr. Specialist'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            {doctor?.specialization} • {doctor?.room_number || 'Room 101'}
          </p>
        </div>

        {/* Doctor Status Quick Switcher */}
        <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Current Practice Status
          </span>
          <div className="flex gap-1.5">
            {['AVAILABLE', 'BUSY', 'ON_LEAVE'].map((st) => (
              <button
                key={st}
                onClick={() => handleStatusChange(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  doctorStatus === st
                    ? st === 'AVAILABLE'
                      ? 'bg-emerald-600 text-white'
                      : st === 'BUSY'
                      ? 'bg-purple-600 text-white'
                      : 'bg-amber-600 text-white'
                    : 'bg-slate-900/60 text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Key Queue Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Serving Now</span>
          <div className="text-2xl font-black text-teal-600">
            {currentlyServing ? currentlyServing.queue_number : 'None'}
          </div>
          <span className="text-[10px] text-slate-500">In consultation</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Waiting Patients</span>
          <div className="text-2xl font-black text-slate-800">{waitingPatients.length}</div>
          <span className="text-[10px] text-slate-500">Checked-in queue</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Next Eligible</span>
          <div className="text-2xl font-black text-indigo-600">
            {nextPatient ? nextPatient.queue_number : '—'}
          </div>
          <span className="text-[10px] text-slate-500">{nextPatient?.patient_name || 'No queue'}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Queue Duration</span>
          <div className="text-2xl font-black text-purple-600">
            ~{waitingPatients.length * (doctor?.consultation_duration_minutes || 15)} min
          </div>
          <span className="text-[10px] text-slate-500">Total remaining</span>
        </div>
      </div>

      {/* 3. Live Active Consultation Panel */}
      {currentlyServing ? (
        <div className="bg-gradient-to-r from-purple-50 via-white to-purple-50 border border-purple-200 rounded-3xl p-6 sm:p-8 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-100">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-purple-600 animate-ping" />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-700">Active Consultation</span>
                <h3 className="text-2xl font-black text-slate-900">
                  {currentlyServing.patient_name} ({currentlyServing.queue_number})
                </h3>
              </div>
            </div>

            <button
              onClick={() => handleComplete(currentlyServing.id)}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              <span>Complete Consultation</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
            <div className="p-3.5 bg-white rounded-xl border border-purple-100">
              <span className="text-slate-400 block">Patient Code</span>
              <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
                {currentlyServing.patient_code}
              </span>
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-purple-100">
              <span className="text-slate-400 block">Priority Level</span>
              <Badge status={currentlyServing.priority_level} size="sm" className="mt-1" />
            </div>
            <div className="p-3.5 bg-white rounded-xl border border-purple-100">
              <span className="text-slate-400 block">Consultation Reason</span>
              <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                {currentlyServing.notes || 'Routine consultation'}
              </span>
            </div>
          </div>
        </div>
      ) : nextPatient ? (
        <div className="bg-teal-50/70 border border-teal-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-bold uppercase tracking-wider">
              Ready for Consultation
            </div>
            <h4 className="text-xl font-extrabold text-slate-900">
              Next Patient: {nextPatient.patient_name} ({nextPatient.queue_number})
            </h4>
            <p className="text-xs text-slate-600">
              Scheduled slot: {nextPatient.appointment_time?.slice(0, 5)} • Priority: {nextPatient.priority_level}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {nextPatient.status === 'WAITING' && (
              <button
                onClick={() => handleCall(nextPatient.id)}
                className="flex-1 sm:flex-none px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Patient</span>
              </button>
            )}

            <button
              onClick={() => handleStart(nextPatient.id)}
              className="flex-1 sm:flex-none px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 transition flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              <span>Start Consultation</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* 4. Live Queue Table Preview */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900">Today's Patient Queue</h3>
          <Link
            to="/doctor/queue"
            className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1"
          >
            <span>Open Interactive Queue Console</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {queue.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-bold text-sm text-slate-800">Queue is Currently Empty</h4>
            <p className="text-xs text-slate-500">Patients will appear here in real-time as they check in.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3.5 text-left">Pos</th>
                  <th className="px-6 py-3.5 text-left">Token</th>
                  <th className="px-6 py-3.5 text-left">Patient Details</th>
                  <th className="px-6 py-3.5 text-left">Priority</th>
                  <th className="px-6 py-3.5 text-left">Status</th>
                  <th className="px-6 py-3.5 text-left">Est. Wait</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {queue.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {entry.queue_position === 0 ? 'Serving' : `#${entry.queue_position}`}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-teal-700">{entry.queue_number}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{entry.patient_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{entry.patient_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={entry.priority_level} size="sm" />
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={entry.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-indigo-600 font-semibold">{entry.estimated_wait_minutes} min</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {entry.status === 'WAITING' && (
                        <button
                          onClick={() => handleCall(entry.id)}
                          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold rounded-lg transition"
                        >
                          Call
                        </button>
                      )}
                      {entry.status === 'CALLED' && (
                        <button
                          onClick={() => handleStart(entry.id)}
                          className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition"
                        >
                          Start
                        </button>
                      )}
                      {entry.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleComplete(entry.id)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
