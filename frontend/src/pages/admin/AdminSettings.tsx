import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { SystemSetting } from '../../types';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useNotification } from '../../contexts/NotificationContext';
import { Settings, Save, ShieldAlert, Clock, Layers } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const { showToast } = useNotification();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [formData, setFormData] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ success: boolean; settings: SystemSetting[] }>('/admin/settings');
      if (res.success && res.settings) {
        setSettings(res.settings);
        const map: { [key: string]: string } = {};
        for (const s of res.settings) {
          map[s.setting_key] = s.setting_value;
        }
        setFormData(map);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: string) => {
    setIsSaving(true);
    try {
      const res = await api.put('/admin/settings', {
        key,
        value: formData[key]
      });
      if (res.success) {
        showToast('success', `Setting "${key}" updated.`);
        fetchSettings();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update setting');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading hospital system rules..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          System Rules & Anti-Abuse Configuration
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Tune booking thresholds, digital check-in windows, priority algorithms, and automated flagging rules
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Anti-Abuse & Booking Quota */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Anti-Abuse Limits</h3>
              <p className="text-xs text-slate-500">Prevent excessive bookings and repeated no-shows</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Max Active Appointments Per Patient
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={formData['max_active_appointments_per_patient'] || '3'}
                  onChange={(e) => handleChange('max_active_appointments_per_patient', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200"
                />
                <button
                  onClick={() => handleSave('max_active_appointments_per_patient')}
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl"
                >
                  Save
                </button>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Prevents patient from holding more than N active future slots simultaneously.
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                No-Show Automatic Flagging Threshold
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={formData['auto_flag_noshow_threshold'] || '2'}
                  onChange={(e) => handleChange('auto_flag_noshow_threshold', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200"
                />
                <button
                  onClick={() => handleSave('auto_flag_noshow_threshold')}
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl"
                >
                  Save
                </button>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Auto-flags patient account for admin review after N unattended bookings.
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Queue & Check-In Window */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Check-In & Timings</h3>
              <p className="text-xs text-slate-500">Configure appointment arrival and token windows</p>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Check-In Window Before Slot (Minutes)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={15}
                  max={120}
                  value={formData['checkin_window_before_minutes'] || '60'}
                  onChange={(e) => handleChange('checkin_window_before_minutes', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200"
                />
                <button
                  onClick={() => handleSave('checkin_window_before_minutes')}
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl"
                >
                  Save
                </button>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Allows patients to check in up to N minutes before their scheduled time slot.
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Emergency Priority Base Score Bonus
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1000}
                  max={50000}
                  value={formData['priority_weight_emergency'] || '10000'}
                  onChange={(e) => handleChange('priority_weight_emergency', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200"
                />
                <button
                  onClick={() => handleSave('priority_weight_emergency')}
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl"
                >
                  Save
                </button>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Mathematical bonus for emergency cases in deterministic queue engine.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
