import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { BarChart3, TrendingUp, Users, Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

const COLORS = ['#0d9488', '#6366f1', '#ec4899', '#f59e0b', '#8b5cf6', '#10b981'];

export const AdminReports: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ success: boolean; analytics: any }>('/admin/reports');
      if (res.success && res.analytics) {
        setAnalytics(res.analytics);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Compiling healthcare analytics & reports..." />;
  }

  const kpis = analytics?.kpis || {};
  const dailyTrend = analytics?.dailyTrend || [];
  const departmentStats = analytics?.departmentStats || [];
  const hourlyDistribution = analytics?.hourlyDistribution || [];
  const doctorStats = analytics?.doctorStats || [];

  // Calculate max values for bar chart scales
  const maxDailyTotal = Math.max(1, ...dailyTrend.map((d: any) => (d.completed || 0) + (d.cancelled || 0) + (d.no_show || 0)));
  const maxHourlyCount = Math.max(1, ...hourlyDistribution.map((h: any) => h.count || 0));
  const totalDepAppointments = departmentStats.reduce((acc: number, curr: any) => acc + (curr.appointment_count || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Hospital Analytics & Operational Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Statistical insights on appointment throughput, no-show rates, peak hours, and specialist utilization
          </p>
        </div>

        <button
          onClick={fetchReports}
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
          title="Refresh Reports"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 1. KPIs Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Bookings</span>
          <div className="text-2xl font-black text-slate-900">{kpis.totalAppointments || 0}</div>
          <span className="text-[10px] text-teal-600 font-semibold">{kpis.completedAppointments || 0} completed</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Completion Rate</span>
          <div className="text-2xl font-black text-emerald-600">{kpis.completionRate || '0%'}</div>
          <span className="text-[10px] text-slate-500">Target: {'>'}85%</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">No-Show Rate</span>
          <div className="text-2xl font-black text-rose-600">{kpis.noShowRate || '0%'}</div>
          <span className="text-[10px] text-slate-500">Unattended visits</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Avg. Consultation Pace</span>
          <div className="text-2xl font-black text-indigo-600">{kpis.averageConsultationMinutes || 15} min</div>
          <span className="text-[10px] text-slate-500">Per patient visit</span>
        </div>
      </div>

      {/* 2. Charts Row: Daily Trend & Department Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Appointments Volume Chart */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Appointment Volume Trend</h3>
              <p className="text-xs text-slate-500">Daily breakdown by Completed, Cancelled, and No-Show</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Completed</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Cancelled</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500" /> No-Show</span>
            </div>
          </div>

          {dailyTrend.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">No trend data available</div>
          ) : (
            <div className="space-y-3 pt-2">
              {dailyTrend.map((d: any, idx: number) => {
                const completedPct = ((d.completed || 0) / maxDailyTotal) * 100;
                const cancelledPct = ((d.cancelled || 0) / maxDailyTotal) * 100;
                const noshowPct = ((d.no_show || 0) / maxDailyTotal) * 100;

                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-600 font-semibold">
                      <span>{d.date}</span>
                      <span className="font-mono text-slate-800">
                        {d.completed + d.cancelled + d.no_show} visits ({d.completed} completed)
                      </span>
                    </div>
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex">
                      <div style={{ width: `${completedPct}%` }} className="bg-emerald-500 h-full transition-all" title={`Completed: ${d.completed}`} />
                      <div style={{ width: `${cancelledPct}%` }} className="bg-rose-500 h-full transition-all" title={`Cancelled: ${d.cancelled}`} />
                      <div style={{ width: `${noshowPct}%` }} className="bg-amber-500 h-full transition-all" title={`No-Show: ${d.no_show}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Department Share */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">Clinical Department Share</h3>
            <p className="text-xs text-slate-500">Appointment distribution by specialty</p>
          </div>

          <div className="space-y-3 pt-2">
            {departmentStats.map((dep: any, idx: number) => {
              const pct = totalDepAppointments > 0 ? Math.round((dep.appointment_count / totalDepAppointments) * 100) : 0;
              const color = COLORS[idx % COLORS.length];

              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      {dep.department}
                    </span>
                    <span className="font-mono text-slate-500">{dep.appointment_count} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div style={{ width: `${pct}%`, backgroundColor: color }} className="h-full rounded-full transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Peak Hours Distribution */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <div>
          <h3 className="font-extrabold text-base text-slate-900">Peak Consultation Hours Distribution</h3>
          <p className="text-xs text-slate-500">Hourly appointment traffic across clinic hours (09:00 - 17:00)</p>
        </div>

        <div className="grid grid-cols-8 gap-2 pt-4">
          {[9, 10, 11, 12, 14, 15, 16, 17].map((hour) => {
            const match = hourlyDistribution.find((h: any) => Number(h.hour) === hour);
            const count = match ? match.count : 0;
            const heightPct = Math.max(15, (count / maxHourlyCount) * 100);

            return (
              <div key={hour} className="flex flex-col items-center gap-2">
                <div className="w-full h-36 bg-slate-50 rounded-2xl p-1 flex flex-col justify-end items-center">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full bg-teal-500 hover:bg-teal-600 rounded-xl transition-all flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                  >
                    {count}
                  </div>
                </div>
                <span className="font-mono text-[10px] font-bold text-slate-500">{hour}:00</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Doctor Utilization & Performance Table */}
      <div className="space-y-4">
        <h3 className="text-lg font-extrabold text-slate-900">Physician Utilization & Completion Rates</h3>

        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4 text-left">Doctor</th>
                  <th className="px-6 py-4 text-left">Department</th>
                  <th className="px-6 py-4 text-left">Total Booked</th>
                  <th className="px-6 py-4 text-left">Completed</th>
                  <th className="px-6 py-4 text-left">No-Shows</th>
                  <th className="px-6 py-4 text-right">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {doctorStats.map((doc: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4 font-bold text-slate-900">{doc.doctor_name}</td>
                    <td className="px-6 py-4 text-teal-700 font-semibold">{doc.department_name}</td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">{doc.total_appointments}</td>
                    <td className="px-6 py-4 font-mono text-emerald-600 font-bold">{doc.completed}</td>
                    <td className="px-6 py-4 font-mono text-rose-600">{doc.no_show}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-mono font-extrabold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg">
                        {doc.completion_rate || '0'}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
