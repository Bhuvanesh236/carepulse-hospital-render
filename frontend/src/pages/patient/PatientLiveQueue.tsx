import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { QueueEntry } from '../../types';
import { LiveQueueCard } from '../../components/queue/LiveQueueCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Clock, RefreshCw, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getSocket } from '../../services/socket';

export const PatientLiveQueue: React.FC = () => {
  const [activeQueue, setActiveQueue] = useState<QueueEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueue = async () => {
    try {
      const res = await api.get<{ success: boolean; inQueue: boolean; queue: QueueEntry }>('/patients/queue');
      if (res.success && res.inQueue && res.queue) {
        setActiveQueue(res.queue);
      } else {
        setActiveQueue(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();

    const socket = getSocket();
    const handleUpdate = () => {
      fetchQueue();
    };

    socket.on('queue:updated', handleUpdate);
    const interval = setInterval(fetchQueue, 5000);

    return () => {
      socket.off('queue:updated', handleUpdate);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Your Live Consultation Queue</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Dynamic waiting time calculation, patients ahead, and real-time doctor progress
          </p>
        </div>

        <button
          onClick={fetchQueue}
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner size="lg" text="Connecting to live queue..." />
      ) : activeQueue ? (
        <div className="space-y-6">
          <LiveQueueCard queue={activeQueue} onRefresh={fetchQueue} />

          <div className="bg-slate-900 text-white rounded-2xl p-6 space-y-4">
            <h4 className="font-bold text-sm text-teal-400 uppercase tracking-wider">Queue Guidelines</h4>
            <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside leading-relaxed">
              <li>Please remain in the clinic waiting area or stay nearby with your mobile phone active.</li>
              <li>When your queue number turns amber (CALLED), proceed immediately to the doctor's room.</li>
              <li>Estimated wait time updates dynamically based on the current consultation duration.</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-4">
          <Clock className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">You Are Not Currently in Any Queue</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            You do not have an active check-in for today. If you have an appointment scheduled for today, go to My Appointments to check in.
          </p>
          <Link
            to="/patient/appointments"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 transition"
          >
            <span>Go to Appointments</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
};
