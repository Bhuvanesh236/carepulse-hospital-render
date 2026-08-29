import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Users,
  Stethoscope,
  Calendar,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Activity,
  CheckCircle2,
  XCircle,
  UserX,
  Layers,
  BarChart3,
  Settings,
  ArrowRight
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await api.get<{ success: boolean; stats: any }>('/admin/dashboard');
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading hospital command center..." />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" /> Hospital Administrator Dashboard
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">CarePulse Health System HQ</h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Real-time appointment flows, active queue monitoring, anti-abuse alerts, and clinical capacity.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            to="/admin/reports"
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 transition flex items-center gap-1.5"
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics</span>
          </Link>
        </div>
      </div>

      {/* 1. Core KPIs Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Patients</span>
            <Users className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats?.totalPatients || 0}</div>
          <span className="text-[10px] text-slate-500">Registered across system</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Doctors</span>
            <Stethoscope className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700">
            {stats?.availableDoctors || 0} / {stats?.totalDoctors || 0}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold">{stats?.availableDoctors || 0} currently available</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Waiting in Queue</span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600">{stats?.currentWaitingQueueSize || 0}</div>
          <span className="text-[10px] text-slate-500">Avg. wait: ~{stats?.averageEstimatedWaitMinutes || 0} min</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Flagged Risk Accounts</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600">{stats?.flaggedPatientsCount || 0}</div>
          <Link to="/admin/patients?riskOnly=true" className="text-[10px] text-rose-600 font-bold hover:underline">
            Review Flagged Patients →
          </Link>
        </div>
      </div>

      {/* 2. Today's Appointments Breakdown */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Today's Appointment Performance</h3>
            <p className="text-xs text-slate-500">Breakdown of today's booked patient throughput</p>
          </div>
          <Link to="/admin/appointments" className="text-xs font-bold text-teal-600 hover:underline">
            Manage All Appointments →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Today</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">{stats?.todayTotalAppointments || 0}</span>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Completed</span>
            <span className="text-2xl font-black text-emerald-700 mt-1 block">{stats?.todayCompleted || 0}</span>
          </div>

          <div className="p-4 bg-teal-50 rounded-2xl border border-teal-100 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 block">In Queue / Serving</span>
            <span className="text-2xl font-black text-teal-700 mt-1 block">{stats?.todayInQueue || 0}</span>
          </div>

          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Cancelled</span>
            <span className="text-2xl font-black text-rose-700 mt-1 block">{stats?.todayCancelled || 0}</span>
          </div>

          <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700 block">No-Show</span>
            <span className="text-2xl font-black text-orange-700 mt-1 block">{stats?.todayNoShow || 0}</span>
          </div>
        </div>
      </div>

      {/* 3. Fast Administrative Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/admin/patients"
          className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:border-teal-300 transition space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-base text-slate-900 group-hover:text-teal-600 transition">
            Patient Registry & Risk Review
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Search patient records, review no-show counters, and unflag patients following administrative review.
          </p>
        </Link>

        <Link
          to="/admin/doctors"
          className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:border-purple-300 transition space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Stethoscope className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-base text-slate-900 group-hover:text-purple-600 transition">
            Doctor & Schedule Roster
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Add doctors, configure working hours, lunch break intervals, and consultation slot durations.
          </p>
        </Link>

        <Link
          to="/admin/settings"
          className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-lg hover:border-slate-400 transition space-y-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-base text-slate-900 group-hover:text-slate-900 transition">
            Anti-Abuse & Queue Settings
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Configure maximum active appointments per user, check-in windows, and emergency weight multipliers.
          </p>
        </Link>
      </div>
    </div>
  );
};
