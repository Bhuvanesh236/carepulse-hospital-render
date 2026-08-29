import React from 'react';
import { PriorityLevel, AppointmentStatus, QueueStatus, DoctorStatus } from '../../types';

interface BadgeProps {
  status?: AppointmentStatus | QueueStatus | DoctorStatus | PriorityLevel | string;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '', size = 'md' }) => {
  if (!status) return null;

  const s = String(status).toUpperCase();
  let colorStyles = 'bg-slate-100 text-slate-700 border-slate-200';

  // Priority badges
  if (s === 'EMERGENCY') {
    colorStyles = 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-400/30 animate-pulse';
  } else if (s === 'HIGH') {
    colorStyles = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (s === 'NORMAL') {
    colorStyles = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (s === 'LOW') {
    colorStyles = 'bg-slate-50 text-slate-600 border-slate-200';
  }

  // Appointment & Queue statuses
  else if (s === 'BOOKED' || s === 'CONFIRMED') {
    colorStyles = 'bg-teal-50 text-teal-700 border-teal-200';
  } else if (s === 'CHECKED_IN' || s === 'IN_QUEUE' || s === 'WAITING') {
    colorStyles = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  } else if (s === 'CALLED') {
    colorStyles = 'bg-amber-50 text-amber-800 border-amber-300 ring-2 ring-amber-400/40 animate-bounce';
  } else if (s === 'IN_PROGRESS' || s === 'BUSY') {
    colorStyles = 'bg-purple-50 text-purple-700 border-purple-200';
  } else if (s === 'COMPLETED' || s === 'AVAILABLE' || s === 'ACTIVE') {
    colorStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (s === 'CANCELLED' || s === 'SUSPENDED' || s === 'INACTIVE') {
    colorStyles = 'bg-rose-50 text-rose-700 border-rose-200';
  } else if (s === 'NO_SHOW' || s === 'SKIPPED') {
    colorStyles = 'bg-orange-50 text-orange-700 border-orange-200';
  } else if (s === 'ON_LEAVE' || s === 'RESCHEDULED') {
    colorStyles = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${sizeClasses} ${colorStyles} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {s.replace(/_/g, ' ')}
    </span>
  );
};
