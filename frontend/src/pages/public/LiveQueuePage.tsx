import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { getSocket } from '../../services/socket';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Activity, Clock, Users, Stethoscope, Sparkles, RefreshCw, MapPin } from 'lucide-react';

interface DoctorQueueSummary {
  id: number;
  full_name: string;
  specialization: string;
  room_number: string;
  status: string;
  department_name: string;
  waiting_count: number;
  currently_serving: string | null;
  currently_called: string | null;
}

export const LiveQueuePage: React.FC = () => {
  const [board, setBoard] = useState<DoctorQueueSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toLocaleTimeString());

  const fetchBoard = async () => {
    try {
      const res = await api.get<{ success: boolean; board: DoctorQueueSummary[] }>('/queue/public-board');
      if (res.success && res.board) {
        setBoard(res.board);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();

    // Setup Socket.IO listener for real-time changes
    const socket = getSocket();
    const handleUpdate = () => {
      fetchBoard();
    };

    socket.on('queue:board_updated', handleUpdate);
    socket.on('queue:updated', handleUpdate);

    // Polling fallback every 6s
    const timer = setInterval(fetchBoard, 6000);

    return () => {
      socket.off('queue:board_updated', handleUpdate);
      socket.off('queue:updated', handleUpdate);
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" /> Live Queue Monitor
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Hospital-Wide Queue Board</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time consultation status, currently called patients, and room assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono">Updated: {lastUpdated}</span>
          <button
            onClick={fetchBoard}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner size="lg" text="Connecting to Hospital Queue Network..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {board.map((doc) => {
            const hasActiveServing = !!doc.currently_serving;
            const hasCalled = !!doc.currently_called;

            return (
              <div
                key={doc.id}
                className={`bg-white rounded-3xl border p-6 transition shadow-sm hover:shadow-xl space-y-5 ${
                  hasCalled
                    ? 'border-amber-300 ring-2 ring-amber-400/40 bg-gradient-to-br from-amber-50/40 via-white to-white'
                    : 'border-slate-200/80'
                }`}
              >
                {/* Doctor Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">
                      {doc.department_name}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 mt-0.5">{doc.full_name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{doc.room_number || 'Room 101'}</span>
                    </p>
                  </div>
                  <Badge status={doc.status} size="sm" />
                </div>

                {/* Queue Display Box */}
                <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <div className="border-r border-slate-200/70 pr-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Serving Now</span>
                    <div className="text-2xl font-black text-teal-600 mt-1">
                      {doc.currently_serving || '—'}
                    </div>
                  </div>

                  <div className="pl-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Next / Called</span>
                    <div className="text-2xl font-black text-amber-600 mt-1">
                      {doc.currently_called || '—'}
                    </div>
                  </div>
                </div>

                {/* Waiting Count & Status */}
                <div className="flex items-center justify-between text-xs text-slate-600 font-semibold pt-1">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span>In Queue: {doc.waiting_count} waiting</span>
                  </span>
                  <span className="text-indigo-600">
                    ~{doc.waiting_count * 15} min est.
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
