import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { getSocket } from '../../services/socket';
import { Layers, RefreshCw, Users, Clock, Stethoscope, MapPin, Sparkles } from 'lucide-react';

export const AdminQueueSupervisor: React.FC = () => {
  const [board, setBoard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueueBoard = async () => {
    try {
      const res = await api.get<{ success: boolean; board: any[] }>('/queue/public-board');
      if (res.success && res.board) {
        setBoard(res.board);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueBoard();

    const socket = getSocket();
    const handleUpdate = () => {
      fetchQueueBoard();
    };

    socket.on('queue:board_updated', handleUpdate);
    socket.on('queue:updated', handleUpdate);
    const timer = setInterval(fetchQueueBoard, 4000);

    return () => {
      socket.off('queue:board_updated', handleUpdate);
      socket.off('queue:updated', handleUpdate);
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" /> Real-time Supervisor
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Central Queue Supervision Grid
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Live overview of all clinical consultation rooms, active tokens, and waiting queues
          </p>
        </div>

        <button
          onClick={fetchQueueBoard}
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner size="lg" text="Supervising live queue channels..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {board.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">
                    {item.department_name}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-0.5">{item.full_name}</h3>
                  <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.room_number || 'Room 101'}</span>
                  </span>
                </div>
                <Badge status={item.status} size="sm" />
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <div className="border-r border-slate-200/70 pr-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Serving</span>
                  <div className="text-xl font-black text-teal-600 mt-0.5">{item.currently_serving || 'None'}</div>
                </div>

                <div className="pl-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Called</span>
                  <div className="text-xl font-black text-amber-600 mt-0.5">{item.currently_called || 'None'}</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                <span className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>{item.waiting_count} in queue</span>
                </span>
                <span className="text-indigo-600 font-semibold">
                  ~{item.waiting_count * 15} min est. wait
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
