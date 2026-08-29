import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Department } from '../../types';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useNotification } from '../../contexts/NotificationContext';
import { Building2, PlusCircle, RefreshCw, Stethoscope, Layers } from 'lucide-react';

export const AdminDepartments: React.FC = () => {
  const { showToast } = useNotification();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add department modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Activity');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const res = await api.get<{ success: boolean; departments: Department[] }>('/doctors/departments');
      if (res.success && res.departments) {
        setDepartments(res.departments);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/admin/departments', {
        name,
        code,
        description,
        icon
      });

      if (res.success) {
        showToast('success', `Department ${name} created successfully.`);
        setIsAddModalOpen(false);
        setName('');
        setCode('');
        setDescription('');
        fetchDepartments();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create department');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Clinical Departments & Centers</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage hospital medical wings, specialization categories, and assigned doctor quotas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDepartments}
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
            <span>Add Department</span>
          </button>
        </div>
      </div>

      {/* Department Cards Grid */}
      {isLoading ? (
        <LoadingSpinner size="lg" text="Loading clinical departments..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dep) => (
            <div
              key={dep.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-md transition space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                  <Building2 className="w-6 h-6" />
                </div>
                <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                  {dep.code}
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-lg text-slate-900">{dep.name}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{dep.description}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Stethoscope className="w-4 h-4 text-teal-600" />
                  <span>{dep.doctor_count || 0} Doctors Assigned</span>
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-bold text-[10px]">
                  ACTIVE
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Department Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Clinical Department"
        subtitle="Create a medical specialty wing in the hospital"
        maxWidth="md"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Department Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Ophthalmology"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Department Code (3-4 Chars) *
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              placeholder="e.g. OPHT"
              maxLength={6}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm uppercase font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Description & Clinical Scope
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Eye examinations, retinal surgery, and refractive corrections..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
            />
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
              {isSubmitting ? 'Creating...' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
