import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Appointment } from '../../types';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useNotification } from '../../contexts/NotificationContext';
import { Calendar, Clock, PlusCircle, CheckCircle2, RefreshCw, Stethoscope, MapPin } from 'lucide-react';
import { BookAppointmentModal } from '../../components/appointment/BookAppointmentModal';
import { RescheduleModal } from '../../components/appointment/RescheduleModal';
import { CancelModal } from '../../components/appointment/CancelModal';

export const PatientAppointments: React.FC = () => {
  const { showToast } = useNotification();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'all' | 'upcoming' | 'queue' | 'completed' | 'cancelled'>('all');

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedRescheduleAppt, setSelectedRescheduleAppt] = useState<Appointment | null>(null);
  const [selectedCancelAppt, setSelectedCancelAppt] = useState<Appointment | null>(null);

  const fetchAppointments = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ success: boolean; appointments: Appointment[] }>('/patients/appointments');
      if (res.success && res.appointments) {
        setAppointments(res.appointments);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCheckIn = async (appointmentId: number) => {
    try {
      const res = await api.post<{ success: boolean; message: string }>('/queue/check-in', { appointmentId });
      if (res.success) {
        showToast('success', res.message);
        fetchAppointments();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Check-in failed');
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  const filteredAppointments = appointments.filter((a) => {
    if (filterTab === 'upcoming') {
      return a.appointment_date >= todayStr && ['BOOKED', 'CONFIRMED'].includes(a.status);
    }
    if (filterTab === 'queue') {
      return ['CHECKED_IN', 'IN_QUEUE', 'IN_PROGRESS', 'CALLED'].includes(a.status);
    }
    if (filterTab === 'completed') {
      return a.status === 'COMPLETED';
    }
    if (filterTab === 'cancelled') {
      return ['CANCELLED', 'NO_SHOW'].includes(a.status);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Medical Appointments</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            View booking codes, digital check-in tokens, and consultation history
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAppointments}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsBookModalOpen(true)}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: `All (${appointments.length})` },
          {
            id: 'upcoming',
            label: `Upcoming (${appointments.filter((a) => a.appointment_date >= todayStr && ['BOOKED', 'CONFIRMED'].includes(a.status)).length})`
          },
          {
            id: 'queue',
            label: `In Queue (${appointments.filter((a) => ['CHECKED_IN', 'IN_QUEUE', 'IN_PROGRESS', 'CALLED'].includes(a.status)).length})`
          },
          {
            id: 'completed',
            label: `Completed (${appointments.filter((a) => a.status === 'COMPLETED').length})`
          },
          {
            id: 'cancelled',
            label: `Cancelled (${appointments.filter((a) => ['CANCELLED', 'NO_SHOW'].includes(a.status)).length})`
          }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              filterTab === tab.id
                ? 'bg-teal-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Appointment Cards */}
      {isLoading ? (
        <LoadingSpinner size="lg" text="Loading appointments..." />
      ) : filteredAppointments.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Appointments Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You don't have any appointments matching the selected filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAppointments.map((appt) => {
            const isToday = appt.appointment_date === todayStr;
            const canCheckIn = isToday && appt.status === 'BOOKED';
            const canReschedule = ['BOOKED', 'CONFIRMED'].includes(appt.status);
            const canCancel = ['BOOKED', 'CONFIRMED'].includes(appt.status);

            return (
              <div
                key={appt.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5"
              >
                {/* Left details */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg">
                      {appt.appointment_code}
                    </span>
                    <Badge status={appt.status} size="sm" />
                    <Badge status={appt.priority} size="sm" />
                    {appt.queue_number && (
                      <span className="font-mono font-extrabold text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-lg">
                        Token: {appt.queue_number}
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">{appt.doctor_name}</h3>
                    <p className="text-xs text-teal-700 font-semibold">{appt.department_name}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      {appt.appointment_date}
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                      <Clock className="w-3.5 h-3.5 text-teal-600" />
                      {appt.start_time.slice(0, 5)} - {appt.end_time.slice(0, 5)}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {appt.doctor_room || 'Room 101'}
                    </span>
                  </div>

                  {appt.reason && (
                    <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic max-w-2xl">
                      "{appt.reason}"
                    </p>
                  )}
                </div>

                {/* Right Actions */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                  {canCheckIn && (
                    <button
                      onClick={() => handleCheckIn(appt.id)}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Check In</span>
                    </button>
                  )}

                  {canReschedule && (
                    <button
                      onClick={() => setSelectedRescheduleAppt(appt)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                    >
                      Reschedule
                    </button>
                  )}

                  {canCancel && (
                    <button
                      onClick={() => setSelectedCancelAppt(appt)}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <BookAppointmentModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onSuccess={() => {
          setIsBookModalOpen(false);
          fetchAppointments();
        }}
      />

      <RescheduleModal
        isOpen={!!selectedRescheduleAppt}
        onClose={() => setSelectedRescheduleAppt(null)}
        appointment={selectedRescheduleAppt}
        onSuccess={() => {
          setSelectedRescheduleAppt(null);
          fetchAppointments();
        }}
      />

      <CancelModal
        isOpen={!!selectedCancelAppt}
        onClose={() => setSelectedCancelAppt(null)}
        appointment={selectedCancelAppt}
        onSuccess={() => {
          setSelectedCancelAppt(null);
          fetchAppointments();
        }}
      />
    </div>
  );
};
