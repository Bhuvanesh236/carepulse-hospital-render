import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Appointment, TimeSlot } from '../../types';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onSuccess: () => void;
}

export const RescheduleModal: React.FC<RescheduleModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onSuccess
}) => {
  const { showToast } = useNotification();

  const [newDate, setNewDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  );
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (appointment && newDate) {
      setIsLoadingSlots(true);
      api
        .get<{ success: boolean; slots: TimeSlot[] }>(
          `/doctors/${appointment.doctor_id}/availability?date=${newDate}`
        )
        .then((res) => {
          if (res.success && res.slots) {
            setSlots(res.slots);
            setSelectedSlot('');
          }
        })
        .finally(() => setIsLoadingSlots(false));
    }
  }, [appointment, newDate]);

  if (!appointment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !newDate) {
      showToast('error', 'Please choose a valid new date and time slot.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post(`/appointments/${appointment.id}/reschedule`, {
        newDate,
        newStartTime: selectedSlot
      });

      if (res.success) {
        showToast('success', 'Appointment rescheduled successfully!');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to reschedule appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reschedule Appointment"
      subtitle={`Change schedule for ${appointment.appointment_code} with ${appointment.doctor_name}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Select New Date *
          </label>
          <input
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
            <span>Select New Time Slot *</span>
            {slots.length > 0 && (
              <span className="text-[11px] font-semibold text-teal-600">
                {slots.filter((s) => s.available).length} available
              </span>
            )}
          </label>

          {isLoadingSlots ? (
            <LoadingSpinner size="sm" text="Loading slots..." />
          ) : (
            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
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

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !selectedSlot}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition"
          >
            {isSubmitting ? 'Rescheduling...' : 'Confirm Reschedule'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
