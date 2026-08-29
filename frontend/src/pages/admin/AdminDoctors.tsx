import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Doctor, Department } from '../../types';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useNotification } from '../../contexts/NotificationContext';
import { DoctorImage } from '../../components/common/DoctorImage';
import { PlusCircle, Stethoscope, Edit, RefreshCw, MapPin, Clock, Award } from 'lucide-react';

export const AdminDoctors: React.FC = () => {
  const { showToast } = useNotification();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add doctor modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Doctor@2026');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [specialization, setSpecialization] = useState('');
  const [qualification, setQualification] = useState('');
  const [experienceYears, setExperienceYears] = useState(5);
  const [contactPhone, setContactPhone] = useState('+1 (555) 234-0000');
  const [roomNumber, setRoomNumber] = useState('Room 101');
  const [duration, setDuration] = useState(15);
  const [bio, setBio] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit doctor modal
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  const fetchDoctors = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ success: boolean; doctors: Doctor[]; departments: Department[] }>('/doctors');
      if (res.success) {
        setDoctors(res.doctors);
        if (res.departments) setDepartments(res.departments);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId) return;

    setIsSubmitting(true);
    try {
      const res = await api.post('/admin/doctors', {
        fullName,
        email,
        password,
        departmentId: Number(departmentId),
        specialization,
        qualification,
        experienceYears,
        contactPhone,
        roomNumber,
        consultationDurationMinutes: duration,
        bio
      });

      if (res.success) {
        showToast('success', `Dr. ${fullName} added successfully.`);
        setIsAddModalOpen(false);
        setFullName('');
        setEmail('');
        setSpecialization('');
        fetchDoctors();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to add doctor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDoctor) return;

    setIsSubmitting(true);
    try {
      const res = await api.put(`/admin/doctors/${editingDoctor.id}`, {
        fullName: editingDoctor.full_name,
        departmentId: editingDoctor.department_id,
        specialization: editingDoctor.specialization,
        qualification: editingDoctor.qualification,
        roomNumber: editingDoctor.room_number,
        status: editingDoctor.status,
        consultationDurationMinutes: editingDoctor.consultation_duration_minutes,
        bio: editingDoctor.bio
      });

      if (res.success) {
        showToast('success', 'Doctor details updated.');
        setEditingDoctor(null);
        fetchDoctors();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update doctor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Doctor & Clinical Staff Roster</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage hospital medical staff, clinic rooms, schedules, and active consultation availability
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDoctors}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-teal-400" />
            <span>Add New Doctor</span>
          </button>
        </div>
      </div>

      {/* Grid of Doctors */}
      {isLoading ? (
        <LoadingSpinner size="lg" text="Loading doctor roster..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <DoctorImage
                    src={doc.profile_image}
                    alt={doc.full_name}
                    doctorName={doc.full_name}
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-200 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">
                        {doc.department_name}
                      </span>
                      <Badge status={doc.status} size="sm" />
                    </div>
                    <h3 className="font-extrabold text-base text-slate-900 truncate mt-0.5">{doc.full_name}</h3>
                    <span className="font-mono text-xs text-slate-400 font-bold">{doc.doctor_id_code}</span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Specialization</span>
                    <span className="font-semibold text-slate-800">{doc.specialization}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Assigned Room</span>
                    <span className="font-semibold text-slate-800">{doc.room_number}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Slot Duration</span>
                    <span className="font-semibold text-slate-800">{doc.consultation_duration_minutes} min / visit</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setEditingDoctor(doc)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Profile & Status</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Doctor Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Doctor"
        subtitle="Create physician profile and generate weekly consultation schedules"
        maxWidth="lg"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Dr. Gregory House"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="dr.house@hospital.com"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Department *
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
                required
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Medical Specialization *
              </label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                required
                placeholder="Diagnostic Medicine & Nephrology"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Qualification
              </label>
              <input
                type="text"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="MD, Johns Hopkins"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Room Number
              </label>
              <input
                type="text"
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="Room 205"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Slot Duration (Min)
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              >
                <option value={10}>10 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={20}>20 Minutes</option>
                <option value={30}>30 Minutes</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md"
            >
              {isSubmitting ? 'Creating Doctor...' : 'Add Doctor'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Doctor Modal */}
      {editingDoctor && (
        <Modal
          isOpen={!!editingDoctor}
          onClose={() => setEditingDoctor(null)}
          title="Edit Doctor Details"
          subtitle={`Update settings for ${editingDoctor.full_name} (${editingDoctor.doctor_id_code})`}
          maxWidth="md"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Practice Status
              </label>
              <select
                value={editingDoctor.status}
                onChange={(e) => setEditingDoctor({ ...editingDoctor, status: e.target.value as any })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-bold"
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="BUSY">BUSY</option>
                <option value="ON_LEAVE">ON LEAVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Assigned Consultation Room
              </label>
              <input
                type="text"
                value={editingDoctor.room_number}
                onChange={(e) => setEditingDoctor({ ...editingDoctor, room_number: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Consultation Slot Duration (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={60}
                value={editingDoctor.consultation_duration_minutes}
                onChange={(e) =>
                  setEditingDoctor({ ...editingDoctor, consultation_duration_minutes: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingDoctor(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
