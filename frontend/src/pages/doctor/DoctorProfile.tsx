import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Doctor } from '../../types';
import { useNotification } from '../../contexts/NotificationContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Badge } from '../../components/common/Badge';
import { DoctorImage } from '../../components/common/DoctorImage';
import { Stethoscope, Calendar, Clock, MapPin, Award, Mail, Phone } from 'lucide-react';

export const DoctorProfile: React.FC = () => {
  const { showToast } = useNotification();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [status, setStatus] = useState<string>('AVAILABLE');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ success: boolean; doctor: Doctor; schedules: any[] }>('/doctors/0');
      if (res.success && res.doctor) {
        setDoctor(res.doctor);
        setStatus(res.doctor.status);
        setSchedules(res.schedules || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleStatusUpdate = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const res = await api.put('/doctors/me/status', { status: newStatus });
      if (res.success) {
        setStatus(newStatus);
        showToast('success', `Status updated to ${newStatus}`);
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading doctor profile..." />;
  }

  const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Doctor Practice Profile</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage clinical availability status and review consultation room schedule
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Summary */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="text-center space-y-3">
            <DoctorImage
              src={doctor?.profile_image}
              alt={doctor?.full_name || 'Doctor'}
              doctorName={doctor?.full_name}
              className="w-24 h-24 rounded-3xl object-cover mx-auto ring-4 ring-purple-50 shadow-md"
            />
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">{doctor?.full_name}</h3>
              <p className="text-xs text-teal-600 font-bold">{doctor?.department_name}</p>
              <span className="font-mono text-xs font-bold text-slate-400 block mt-0.5">{doctor?.doctor_id_code}</span>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Availability Status
              </span>
              <div className="grid grid-cols-2 gap-2">
                {['AVAILABLE', 'BUSY', 'ON_LEAVE', 'INACTIVE'].map((st) => (
                  <button
                    key={st}
                    disabled={isUpdating}
                    onClick={() => handleStatusUpdate(st)}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border transition ${
                      status === st
                        ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500">Consultation Duration</span>
              <span className="font-bold text-slate-800">{doctor?.consultation_duration_minutes} Minutes / slot</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <span className="text-slate-500">Assigned Room</span>
              <span className="font-bold text-slate-800">{doctor?.room_number}</span>
            </div>
          </div>
        </div>

        {/* Right: Practice Information & Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">Clinical Background & Credentials</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-700">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block">Specialization</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{doctor?.specialization}</span>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-slate-400 block">Qualifications</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{doctor?.qualification}</span>
              </div>
            </div>

            {doctor?.bio && (
              <div className="pt-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Professional Bio
                </span>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  {doctor.bio}
                </p>
              </div>
            )}
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">Weekly Clinical Consultation Schedule</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[1, 2, 3, 4, 5].map((dayNum) => (
                <div key={dayNum} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-slate-800">{daysMap[dayNum]}</span>
                  <span className="font-mono text-teal-700 font-semibold">09:00 - 17:00 (Break: 13:00-14:00)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
