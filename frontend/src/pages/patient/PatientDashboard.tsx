import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  User,
  PlusCircle,
  Activity,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Stethoscope,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { api } from '../../services/api';
import { Appointment, QueueEntry } from '../../types';
import { Badge } from '../../components/common/Badge';
import { LiveQueueCard } from '../../components/queue/LiveQueueCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { BookAppointmentModal } from '../../components/appointment/BookAppointmentModal';
import { RescheduleModal } from '../../components/appointment/RescheduleModal';
import { CancelModal } from '../../components/appointment/CancelModal';

export const PatientDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeQueue, setActiveQueue] = useState<QueueEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedRescheduleAppt, setSelectedRescheduleAppt] = useState<Appointment | null>(null);
  const [selectedCancelAppt, setSelectedCancelAppt] = useState<Appointment | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [apptRes, queueRes] = await Promise.all([
        api.get<{ success: boolean; appointments: Appointment[] }>('/patients/appointments'),
        api.get<{ success: boolean; inQueue: boolean; queue: QueueEntry }>('/patients/queue')
      ]);

      if (apptRes.success && apptRes.appointments) {
        setAppointments(apptRes.appointments);
      }

      if (queueRes.success && queueRes.inQueue && queueRes.queue) {
        setActiveQueue(queueRes.queue);
      } else {
        setActiveQueue(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCheckIn = async (appointmentId: number) => {
    try {
      const res = await api.post<{ success: boolean; message: string; queue: QueueEntry }>(
        '/queue/check-in',
        { appointmentId }
      );
      if (res.success) {
        showToast('success', res.message);
        fetchDashboardData();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Check-in failed');
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const upcomingAppointments = appointments.filter(
    (a) => a.appointment_date >= todayStr && !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(a.status)
  );
  const todayAppointment = appointments.find(
    (a) => a.appointment_date === todayStr && !['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(a.status)
  );

  return (
    <div className="space-y-8">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-300">Patient Command Portal</span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hello, {user?.fullName || 'Patient'}
            </h1>
            <p className="text-xs sm:text-sm text-teal-100 max-w-xl">
              Manage your clinic visits, check in digitally on appointment day, and monitor live queue positions in real time.
            </p>
          </div>

          {/* Quick stats pill */}
          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 bg-white/10 backdrop-blur-md px-4 py-3 rounded-2xl border border-white/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-200">Patient Identifier</span>
            <span className="font-mono font-extrabold text-lg text-white">
              {user?.patientCode || 'PAT-2026-000000'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Bookings</span>
          <div className="text-2xl font-extrabold text-slate-800">{appointments.length}</div>
          <span className="text-[10px] text-slate-500">Lifetime Consultations</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Upcoming Visits</span>
          <div className="text-2xl font-extrabold text-teal-600">{upcomingAppointments.length}</div>
          <span className="text-[10px] text-slate-500">Scheduled Appointments</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Live Queue Status</span>
          <div className="text-2xl font-extrabold text-indigo-600">
            {activeQueue ? activeQueue.queue_number : 'Not in Queue'}
          </div>
          <span className="text-[10px] text-slate-500">{activeQueue ? `Position #${activeQueue.queue_position}` : 'Check in when ready'}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Est. Waiting Time</span>
          <div className="text-2xl font-extrabold text-purple-600">
            {activeQueue ? `${activeQueue.estimated_wait_minutes} min` : '0 min'}
          </div>
          <span className="text-[10px] text-slate-500">Real-time estimate</span>
        </div>
      </div>

      {/* 3. Live Active Queue Section (if checked in) */}
      {activeQueue && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-ping" /> Today's Live Consultation Queue
            </h3>
            <button
              onClick={fetchDashboardData}
              className="text-xs text-teal-600 font-bold hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
            </button>
          </div>

          <LiveQueueCard queue={activeQueue} onRefresh={fetchDashboardData} />
        </div>
      )}

      {/* 4. Today's Appointment & Check-In Action */}
      {todayAppointment && !activeQueue && (
        <div className="bg-gradient-to-r from-teal-50 to-indigo-50 border border-teal-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-bold uppercase tracking-wider">
              Today's Appointment
            </div>
            <h4 className="text-lg font-extrabold text-slate-900">
              {todayAppointment.doctor_name} ({todayAppointment.department_name})
            </h4>
            <p className="text-xs text-slate-600">
              Scheduled for today at <span className="font-bold text-slate-800">{todayAppointment.start_time.slice(0, 5)}</span> • {todayAppointment.doctor_room}
            </p>
          </div>

          <button
            onClick={() => handleCheckIn(todayAppointment.id)}
            className="w-full sm:w-auto px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-teal-600/25 transition flex items-center justify-center gap-2 flex-shrink-0"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Check In for Queue Token</span>
          </button>
        </div>
      )}

      {/* 5. Upcoming Appointments & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Upcoming Appointments List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-slate-900">Upcoming Appointments</h3>
            <Link to="/patient/appointments" className="text-xs font-bold text-teal-600 hover:underline">
              View All
            </Link>
          </div>

          {isLoading ? (
            <LoadingSpinner size="md" text="Loading appointments..." />
          ) : upcomingAppointments.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80 space-y-3">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-sm text-slate-700">No Upcoming Appointments</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Need medical consultation? Browse our hospital doctors and schedule your visit online.
              </p>
              <button
                onClick={() => setIsBookModalOpen(true)}
                className="py-2 px-4 bg-teal-600 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Book Appointment
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.slice(0, 3).map((appt) => (
                <div
                  key={appt.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-500">{appt.appointment_code}</span>
                      <Badge status={appt.status} size="sm" />
                      <Badge status={appt.priority} size="sm" />
                    </div>
                    <h4 className="font-bold text-sm text-slate-900">{appt.doctor_name}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{appt.department_name}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700">
                        {appt.appointment_date} at {appt.start_time.slice(0, 5)}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {appt.appointment_date === todayStr && appt.status === 'BOOKED' && (
                      <button
                        onClick={() => handleCheckIn(appt.id)}
                        className="py-1.5 px-3 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition"
                      >
                        Check In
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedRescheduleAppt(appt)}
                      className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => setSelectedCancelAppt(appt)}
                      className="py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Quick Action Cards */}
        <div className="space-y-4">
          <h3 className="text-lg font-extrabold text-slate-900">Quick Actions</h3>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => setIsBookModalOpen(true)}
              className="p-4 bg-white hover:bg-teal-50/50 rounded-2xl border border-slate-200/80 shadow-sm text-left flex items-center gap-4 transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-105 transition">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h5 className="font-bold text-sm text-slate-900">Book New Appointment</h5>
                <p className="text-xs text-slate-500">Pick doctor & 15-minute slot</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
            </button>

            <Link
              to="/doctors"
              className="p-4 bg-white hover:bg-teal-50/50 rounded-2xl border border-slate-200/80 shadow-sm text-left flex items-center gap-4 transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h5 className="font-bold text-sm text-slate-900">Browse Doctors & Specialists</h5>
                <p className="text-xs text-slate-500">View qualifications and schedules</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
            </Link>

            <Link
              to="/queue"
              className="p-4 bg-white hover:bg-teal-50/50 rounded-2xl border border-slate-200/80 shadow-sm text-left flex items-center gap-4 transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition">
                <Activity className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h5 className="font-bold text-sm text-slate-900">Public Live Queue Board</h5>
                <p className="text-xs text-slate-500">Hospital-wide active numbers</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
            </Link>

            <Link
              to="/patient/profile"
              className="p-4 bg-white hover:bg-teal-50/50 rounded-2xl border border-slate-200/80 shadow-sm text-left flex items-center gap-4 transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h5 className="font-bold text-sm text-slate-900">Manage Profile & Contact</h5>
                <p className="text-xs text-slate-500">Update address & phone info</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
            </Link>
          </div>
        </div>
      </div>

      {/* Modals */}
      <BookAppointmentModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onSuccess={() => {
          setIsBookModalOpen(false);
          fetchDashboardData();
        }}
      />

      <RescheduleModal
        isOpen={!!selectedRescheduleAppt}
        onClose={() => setSelectedRescheduleAppt(null)}
        appointment={selectedRescheduleAppt}
        onSuccess={() => {
          setSelectedRescheduleAppt(null);
          fetchDashboardData();
        }}
      />

      <CancelModal
        isOpen={!!selectedCancelAppt}
        onClose={() => setSelectedCancelAppt(null)}
        appointment={selectedCancelAppt}
        onSuccess={() => {
          setSelectedCancelAppt(null);
          fetchDashboardData();
        }}
      />
    </div>
  );
};
