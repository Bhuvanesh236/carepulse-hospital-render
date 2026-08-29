import React from 'react';
import { QueueEntry } from '../../types';
import { Badge } from '../common/Badge';
import { Clock, UserCheck, Users, AlertCircle, Sparkles, Stethoscope } from 'lucide-react';

interface LiveQueueCardProps {
  queue: QueueEntry;
  onRefresh?: () => void;
}

export const LiveQueueCard: React.FC<LiveQueueCardProps> = ({ queue }) => {
  const isCalled = queue.status === 'CALLED';
  const isInProgress = queue.status === 'IN_PROGRESS';
  const isWaiting = queue.status === 'WAITING';

  return (
    <div
      className={`relative rounded-2xl border p-6 transition shadow-lg overflow-hidden ${
        isCalled
          ? 'bg-gradient-to-br from-amber-500/10 via-amber-50/70 to-white border-amber-300 ring-2 ring-amber-400/50'
          : isInProgress
          ? 'bg-gradient-to-br from-purple-500/10 via-purple-50/70 to-white border-purple-300'
          : 'bg-white border-slate-200 shadow-slate-200/50'
      }`}
    >
      {/* Top Banner if Called */}
      {isCalled && (
        <div className="mb-4 p-3 bg-amber-500 text-white rounded-xl flex items-center justify-between text-xs font-bold uppercase tracking-wider animate-pulse">
          <span className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> IT IS YOUR TURN! PLEASE ENTER ROOM
          </span>
          <span>{queue.doctor_room || 'Room 101'}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Queue Token</span>
          <div className="text-4xl font-extrabold text-slate-900 tracking-tight mt-1 flex items-baseline gap-2">
            {queue.queue_number}
            <Badge status={queue.priority_level} size="sm" />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Appointment: <span className="font-semibold text-slate-700">{queue.appointment_code}</span>
          </p>
        </div>

        <div className="text-right">
          <Badge status={queue.status} size="md" />
          <div className="mt-2 text-xs font-semibold text-slate-600 flex items-center justify-end gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
            <span>{queue.doctor_name}</span>
          </div>
          <span className="text-[11px] text-slate-400 block">{queue.doctor_room}</span>
        </div>
      </div>

      {/* Dynamic Queue Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 my-5">
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Serving Now</span>
          <span className="text-xl font-extrabold text-teal-600 mt-1 block">
            {queue.currentlyServingNumber || 'None'}
          </span>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Patients Ahead</span>
          <span className="text-xl font-extrabold text-slate-800 mt-1 block flex items-center justify-center gap-1">
            <Users className="w-4 h-4 text-slate-400" />
            {queue.patientsAhead ?? (queue.queue_position ? Math.max(0, queue.queue_position - 1) : 0)}
          </span>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Est. Wait</span>
          <span className="text-xl font-extrabold text-indigo-600 mt-1 block flex items-center justify-center gap-1">
            <Clock className="w-4 h-4 text-indigo-400" />
            {queue.estimated_wait_minutes ?? 0} <span className="text-xs font-normal">min</span>
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      {isWaiting && (
        <div>
          <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5">
            <span>Queue Progress</span>
            <span>Position #{queue.queue_position || 1}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-teal-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(15, Math.min(100, 100 - (queue.patientsAhead || 1) * 20))}%`
              }}
            />
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-400">
        <AlertCircle className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
        <span>
          Waiting time is dynamically estimated using real-time doctor consultation pace and prioritized patient flow.
        </span>
      </div>
    </div>
  );
};
