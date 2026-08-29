import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Appointment } from '../../types';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { AlertTriangle } from 'lucide-react';

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onSuccess: () => void;
}

export const CancelModal: React.FC<CancelModalProps> = ({
  isOpen,
  onClose,
  appointment,
  onSuccess
}) => {
  const { showToast } = useNotification();
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!appointment) return null;

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post(`/appointments/${appointment.id}/cancel`, {
        reason: reason.trim() || 'Cancelled by patient'
      });

      if (res.success) {
        showToast('info', 'Appointment has been cancelled.');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to cancel appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancel Appointment"
      subtitle="Please confirm if you want to cancel this booking"
      maxWidth="md"
    >
      <form onSubmit={handleCancel} className="space-y-4">
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-xs text-rose-800">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Are you sure you want to cancel this appointment?</p>
            <p className="mt-0.5 text-rose-600">
              Reference: <span className="font-semibold">{appointment.appointment_code}</span> on{' '}
              <span className="font-semibold">{appointment.appointment_date}</span> at{' '}
              <span className="font-semibold">{appointment.start_time.slice(0, 5)}</span> with{' '}
              <span className="font-semibold">{appointment.doctor_name}</span>.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
            Reason for Cancellation (Optional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Schedule conflict, feeling better, relocated..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
          >
            Keep Appointment
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition shadow-md shadow-rose-600/20"
          >
            {isSubmitting ? 'Cancelling...' : 'Yes, Cancel Appointment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
