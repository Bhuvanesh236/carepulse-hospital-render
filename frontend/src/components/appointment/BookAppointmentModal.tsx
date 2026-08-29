import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Department, Doctor, TimeSlot, Appointment } from '../../types';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { Calendar, Clock, Stethoscope, AlertCircle, CheckCircle2, ChevronRight, User, ShieldAlert } from 'lucide-react';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface BookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (appointment: Appointment) => void;
  initialDoctorId?: number;
  initialDepartmentId?: number;
}

export const BookAppointmentModal: React.FC<BookAppointmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialDoctorId,
  initialDepartmentId
}) => {
  const { showToast } = useNotification();

  const [step, setStep] = useState<number>(1);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | ''>(initialDepartmentId || '');
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | ''>(initialDoctorId || '');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [priority, setPriority] = useState<'NORMAL' | 'HIGH' | 'EMERGENCY'>('NORMAL');

  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookedAppointment, setBookedAppointment] = useState<Appointment | null>(null);

  // Sync initial props when opened
  useEffect(() => {
    if (isOpen) {
      if (initialDepartmentId) setSelectedDepartmentId(initialDepartmentId);
      if (initialDoctorId) setSelectedDoctorId(initialDoctorId);
    }
  }, [isOpen, initialDepartmentId, initialDoctorId]);

  // Load departments
  useEffect(() => {
    if (isOpen) {
      setIsLoadingDepartments(true);
      api
        .get<{ success: boolean; departments: Department[] }>('/doctors/departments')
        .then((res) => {
          if (res.success && res.departments) setDepartments(res.departments);
        })
        .finally(() => setIsLoadingDepartments(false));
    }
  }, [isOpen]);

  // Load doctors when department selected (or all doctors if no department filter)
  useEffect(() => {
    if (isOpen) {
      const url = selectedDepartmentId ? `/doctors?departmentId=${selectedDepartmentId}` : '/doctors';
      api
        .get<{ success: boolean; doctors: Doctor[] }>(url)
        .then((res) => {
          if (res.success && res.doctors) setDoctors(res.doctors);
        });
    }
  }, [isOpen, selectedDepartmentId]);

  // Load slots when doctor and date selected
  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      setIsLoadingSlots(true);
      api
        .get<{ success: boolean; slots: TimeSlot[] }>(
          `/doctors/${selectedDoctorId}/availability?date=${selectedDate}`
        )
        .then((res) => {
          if (res.success && res.slots) {
            setSlots(res.slots);
            setSelectedSlot('');
          }
        })
        .finally(() => setIsLoadingSlots(false));
    }
  }, [selectedDoctorId, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId || !selectedDepartmentId || !selectedDate || !selectedSlot || !reason.trim()) {
      showToast('error', 'Please complete all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post<{ success: boolean; message: string; appointment: Appointment }>(
        '/appointments',
        {
          doctorId: Number(selectedDoctorId),
          departmentId: Number(selectedDepartmentId),
          appointmentDate: selectedDate,
          startTime: selectedSlot,
          reason,
          priority
        }
      );

      if (res.success && res.appointment) {
        setBookedAppointment(res.appointment);
        showToast('success', 'Appointment successfully confirmed!');
        onSuccess(res.appointment);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to book appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(1);
    setBookedAppointment(null);
    setSelectedDoctorId('');
    setSelectedSlot('');
    setReason('');
    onClose();
  };

  const selectedDoctor = doctors.find((d) => d.id === Number(selectedDoctorId));

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title={bookedAppointment ? 'Appointment Confirmed' : 'Book a Medical Appointment'}
      subtitle={
        bookedAppointment
          ? 'Your consultation has been reserved'
          : 'Select department, doctor, and convenient time slot'
      }
      maxWidth="lg"
    >
      {bookedAppointment ? (
        <div className="text-center py-4 space-y-5 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mx-auto ring-8 ring-teal-50">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600">Booking Reference</span>
            <h4 className="text-2xl font-extrabold text-slate-900 mt-0.5">{bookedAppointment.appointment_code}</h4>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left space-y-2 text-xs text-slate-600">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-400">Doctor</span>
              <span className="font-bold text-slate-800">{bookedAppointment.doctor_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-400">Department</span>
              <span className="font-semibold text-slate-800">{bookedAppointment.department_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-400">Date & Time</span>
              <span className="font-semibold text-slate-800">
                {bookedAppointment.appointment_date} at {bookedAppointment.start_time.slice(0, 5)}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Room</span>
              <span className="font-semibold text-slate-800">{bookedAppointment.doctor_room || 'Room 101'}</span>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            You can check in on the day of your appointment to receive your live queue number.
          </p>

          <button
            onClick={handleReset}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-600/20 transition"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step 1: Department & Doctor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                1. Department *
              </label>
              <select
                value={selectedDepartmentId}
                onChange={(e) => {
                  setSelectedDepartmentId(e.target.value ? Number(e.target.value) : '');
                  setSelectedDoctorId('');
                }}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
              >
                <option value="">Select Department...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                2. Doctor *
              </label>
              <select
                value={selectedDoctorId}
                onChange={(e) => {
                  const docId = e.target.value ? Number(e.target.value) : '';
                  setSelectedDoctorId(docId);
                  if (docId) {
                    const matched = doctors.find((d) => d.id === docId);
                    if (matched && !selectedDepartmentId) {
                      setSelectedDepartmentId(matched.department_id);
                    }
                  }
                }}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
              >
                <option value="">Select Doctor...</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.full_name} ({doc.specialization})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Doctor Info Card if selected */}
          {selectedDoctor && (
            <div className="p-3 bg-teal-50/60 border border-teal-100 rounded-xl flex items-center gap-3">
              <img
                src={selectedDoctor.profile_image}
                alt={selectedDoctor.full_name}
                className="w-12 h-12 rounded-xl object-cover border border-teal-200"
              />
              <div className="text-xs">
                <h5 className="font-bold text-slate-800">{selectedDoctor.full_name}</h5>
                <p className="text-teal-700 font-medium">{selectedDoctor.specialization} • {selectedDoctor.experience_years} yrs exp</p>
                <p className="text-slate-500 mt-0.5">{selectedDoctor.room_number}</p>
              </div>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              3. Appointment Date *
            </label>
            <input
              type="date"
              min={new Date().toISOString().slice(0, 10)}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
          </div>

          {/* Time Slot Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
              <span>4. Available Time Slot *</span>
              {slots.length > 0 && (
                <span className="text-[11px] font-semibold text-teal-600">
                  {slots.filter((s) => s.available).length} available
                </span>
              )}
            </label>

            {isLoadingSlots ? (
              <LoadingSpinner size="sm" text="Checking availability..." />
            ) : slots.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl text-center text-xs text-slate-500">
                {selectedDoctorId
                  ? 'No available slots for this date (doctor may be on leave or fully booked).'
                  : 'Please select a doctor and date above.'}
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1">
                {slots.map((slot) => {
                  const isSelected = selectedSlot === slot.startTime;
                  return (
                    <button
                      key={slot.startTime}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot.startTime)}
                      className={`py-2 px-1 text-xs font-bold rounded-lg border transition ${
                        isSelected
                          ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20'
                          : slot.available
                          ? 'bg-white text-slate-700 border-slate-200 hover:border-teal-400 hover:bg-teal-50/50'
                          : 'bg-slate-100 text-slate-400 border-slate-200/60 cursor-not-allowed line-through'
                      }`}
                    >
                      {slot.startTime.slice(0, 5)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reason for Visit */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              5. Symptoms & Consultation Reason *
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="Describe your health symptoms, medical history, or consultation goals..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedSlot || !reason.trim()}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 shadow-md shadow-teal-600/20 transition flex items-center gap-2"
            >
              {isSubmitting ? 'Reserving Slot...' : 'Confirm Appointment'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
