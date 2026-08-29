import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Patient } from '../../types';
import { useNotification } from '../../contexts/NotificationContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { User, Phone, MapPin, Mail, ShieldAlert, HeartPulse, Save } from 'lucide-react';

export const PatientProfile: React.FC = () => {
  const { showToast } = useNotification();
  const [profile, setProfile] = useState<(Patient & { email: string }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ success: boolean; patient: Patient & { email: string } }>('/patients/me');
      if (res.success && res.patient) {
        setProfile(res.patient);
        setFullName(res.patient.full_name);
        setPhone(res.patient.phone);
        setAddress(res.patient.address);
        setEmergencyContact(res.patient.emergency_contact || '');
        setBloodGroup(res.patient.blood_group || 'O+');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.put('/patients/me', {
        fullName,
        phone,
        address,
        emergencyContact,
        bloodGroup
      });
      if (res.success) {
        showToast('success', 'Profile updated successfully.');
        fetchProfile();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading profile details..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Patient Profile Management</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          View your permanent patient identification and manage contact details
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Summary Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-3xl bg-teal-100 text-teal-700 flex items-center justify-center font-black text-2xl mx-auto ring-4 ring-teal-50">
              {profile?.full_name ? profile.full_name[0] : 'P'}
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900">{profile?.full_name}</h3>
              <p className="text-xs text-slate-500">{profile?.email}</p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100 text-xs text-slate-600">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Permanent Patient ID</span>
              <span className="text-base font-mono font-bold text-teal-700 mt-0.5 block">
                {profile?.patient_id_code}
              </span>
              <span className="text-[10px] text-slate-400">System-generated immutable record</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Risk / Flag Status</span>
                <span className="font-bold text-xs text-slate-800">
                  {profile?.risk_flag_level === 0 ? 'Verified & Clean' : `Flagged Level ${profile?.risk_flag_level}`}
                </span>
              </div>
              {profile?.risk_flag_level === 0 ? (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-bold text-[10px]">Good</span>
              ) : (
                <ShieldAlert className="w-5 h-5 text-amber-500" />
              )}
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
              <span className="text-slate-500">Date of Birth</span>
              <span className="font-bold text-slate-800">{profile?.dob}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
              <span className="text-slate-500">Gender</span>
              <span className="font-bold text-slate-800">{profile?.gender}</span>
            </div>
          </div>
        </div>

        {/* Right: Editable Form */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
          <h3 className="font-extrabold text-base text-slate-900">Personal & Contact Information</h3>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Blood Group
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Emergency Contact Person & Phone
              </label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="e.g. Jane Doe (+1 555-0199)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Residential Address
              </label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 disabled:opacity-50 transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
