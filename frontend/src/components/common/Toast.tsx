import React from 'react';
import { useNotification, ToastMessage } from '../../contexts/NotificationContext';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useNotification();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onClose: () => void }> = ({ toast, onClose }) => {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-teal-600 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
  };

  const borderColors = {
    success: 'border-emerald-200 bg-white shadow-emerald-500/5',
    error: 'border-rose-200 bg-white shadow-rose-500/5',
    info: 'border-teal-200 bg-white shadow-teal-500/5',
    warning: 'border-amber-200 bg-white shadow-amber-500/5'
  };

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl ${borderColors[toast.type]} animate-fade-in transition`}
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        {toast.title && <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{toast.title}</h4>}
        <p className="text-sm text-slate-600 font-medium leading-snug mt-0.5">{toast.message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600 p-0.5 transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
