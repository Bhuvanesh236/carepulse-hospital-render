import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Appointment, Doctor, Department } from '../../types';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Search, Filter, Calendar, Clock, RefreshCw, Stethoscope, User } from 'lucide-react';

export const AdminAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (statusFilter !== 'all') query.append('status', statusFilter);
      if (doctorFilter !== 'all') query.append('doctorId', doctorFilter);
      if (departmentFilter !== 'all') query.append('departmentId', departmentFilter);
      if (dateFrom) query.append('dateFrom', dateFrom);
      if (dateTo) query.append('dateTo', dateTo);

      const [apptRes, docRes] = await Promise.all([
        api.get<{ success: boolean; appointments: Appointment[] }>(`/admin/appointments?${query.toString()}`),
        api.get<{ success: boolean; doctors: Doctor[]; departments: Department[] }>('/doctors')
      ]);

      if (apptRes.success && apptRes.appointments) {
        setAppointments(apptRes.appointments);
      }
      if (docRes.success) {
        setDoctors(docRes.doctors);
        if (docRes.departments) setDepartments(docRes.departments);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, doctorFilter, departmentFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAppointments();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Global Appointment Supervisor</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor, track, and audit hospital-wide patient consultations
          </p>
        </div>

        <button
          onClick={fetchAppointments}
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, patient name, ID..."
              className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
            >
              <option value="all">All Statuses</option>
              <option value="BOOKED">BOOKED</option>
              <option value="IN_QUEUE">IN QUEUE</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="NO_SHOW">NO SHOW</option>
            </select>
          </div>

          <div>
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
            >
              <option value="all">All Doctors</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50"
            >
              <option value="all">All Departments</option>
              {departments.map((dep) => (
                <option key={dep.id} value={dep.id}>
                  {dep.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Appointments List */}
      {isLoading ? (
        <LoadingSpinner size="lg" text="Loading hospital appointments..." />
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="font-bold text-base text-slate-800">No Appointments Match Search Filter</h4>
          <p className="text-xs text-slate-500">Adjust the filters above to view records.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4 text-left">Booking Code</th>
                  <th className="px-6 py-4 text-left">Patient Details</th>
                  <th className="px-6 py-4 text-left">Doctor & Dept</th>
                  <th className="px-6 py-4 text-left">Date & Slot</th>
                  <th className="px-6 py-4 text-left">Priority</th>
                  <th className="px-6 py-4 text-left">Status</th>
                  <th className="px-6 py-4 text-left">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4 font-mono font-bold text-teal-700">{appt.appointment_code}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{appt.patient_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{appt.patient_code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{appt.doctor_name}</div>
                      <div className="text-[11px] text-teal-600 font-semibold">{appt.department_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{appt.appointment_date}</div>
                      <div className="text-[11px] text-slate-500">{appt.start_time.slice(0, 5)} - {appt.end_time.slice(0, 5)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={appt.priority} size="sm" />
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={appt.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-slate-500">
                      {appt.cancellation_reason ? (
                        <span className="text-rose-600 font-semibold">Cancelled: {appt.cancellation_reason}</span>
                      ) : (
                        appt.reason || '—'
                      )}
                    </td>
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
