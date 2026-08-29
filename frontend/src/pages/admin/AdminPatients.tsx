import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Patient } from '../../types';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useNotification } from '../../contexts/NotificationContext';
import { Search, Filter, ShieldCheck, ShieldAlert, Check, RefreshCw, User } from 'lucide-react';

export const AdminPatients: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { showToast } = useNotification();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [riskOnly, setRiskOnly] = useState(searchParams.get('riskOnly') === 'true');
  const [isLoading, setIsLoading] = useState(true);

  // Unflag modal
  const [selectedPatientToUnflag, setSelectedPatientToUnflag] = useState<Patient | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isUnflagging, setIsUnflagging] = useState(false);

  const fetchPatients = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (riskOnly) query.append('riskOnly', 'true');

      const res = await api.get<{ success: boolean; patients: Patient[] }>(`/admin/patients?${query.toString()}`);
      if (res.success && res.patients) {
        setPatients(res.patients);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [riskOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients();
  };

  const handleUnflagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientToUnflag) return;

    setIsUnflagging(true);
    try {
      const res = await api.put(`/admin/patients/${selectedPatientToUnflag.id}/unflag`, {
        notes: reviewNotes.trim() || 'Cleared by Administrator'
      });

      if (res.success) {
        showToast('success', `Flags cleared for ${selectedPatientToUnflag.patient_id_code}`);
        setSelectedPatientToUnflag(null);
        setReviewNotes('');
        fetchPatients();
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to unflag patient');
    } finally {
      setIsUnflagging(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Patient Registry & Anti-Abuse</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Search patient records, examine no-show flags, and review account risk levels
          </p>
        </div>

        <button
          onClick={fetchPatients}
          className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by patient ID, name, email, or phone number..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer whitespace-nowrap px-3 py-2 bg-slate-50 rounded-xl border border-slate-200">
            <input
              type="checkbox"
              checked={riskOnly}
              onChange={(e) => setRiskOnly(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500"
            />
            <span>Show Flagged / High-Risk Only</span>
          </label>

          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner size="lg" text="Loading patient database..." />
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
          <User className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="font-bold text-base text-slate-800">No Patients Found</h4>
          <p className="text-xs text-slate-500">Try changing your search keywords.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-4 text-left">Patient ID</th>
                  <th className="px-6 py-4 text-left">Full Name</th>
                  <th className="px-6 py-4 text-left">Contact Info</th>
                  <th className="px-6 py-4 text-left">Risk Status</th>
                  <th className="px-6 py-4 text-left">No-Shows</th>
                  <th className="px-6 py-4 text-left">Cancellations</th>
                  <th className="px-6 py-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {patients.map((pat) => (
                  <tr key={pat.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4 font-mono font-bold text-teal-700">{pat.patient_id_code}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{pat.full_name}</div>
                      <div className="text-[11px] text-slate-400">
                        {pat.gender} • DOB: {pat.dob}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-800">{pat.phone}</div>
                      <div className="text-[11px] text-slate-400">{pat.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {pat.risk_flag_level === 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <ShieldCheck className="w-3.5 h-3.5" /> Good Standing
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                          <ShieldAlert className="w-3.5 h-3.5" /> Flagged Level {pat.risk_flag_level}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-rose-600">{pat.no_show_count}</td>
                    <td className="px-6 py-4 font-mono text-slate-600">{pat.cancellation_count}</td>
                    <td className="px-6 py-4 text-right">
                      {pat.risk_flag_level > 0 ? (
                        <button
                          onClick={() => setSelectedPatientToUnflag(pat)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                        >
                          Review & Unflag
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">No flags</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unflag Modal */}
      <Modal
        isOpen={!!selectedPatientToUnflag}
        onClose={() => setSelectedPatientToUnflag(null)}
        title="Administrative Risk Review"
        subtitle={`Clear flags for ${selectedPatientToUnflag?.full_name} (${selectedPatientToUnflag?.patient_id_code})`}
        maxWidth="md"
      >
        <form onSubmit={handleUnflagSubmit} className="space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <p className="font-bold text-slate-800">Current Flags Record:</p>
            <p className="text-slate-600">
              No-show count: <span className="font-bold text-rose-600">{selectedPatientToUnflag?.no_show_count}</span> | Cancellations: {selectedPatientToUnflag?.cancellation_count}
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Review Findings & Admin Notes *
            </label>
            <textarea
              rows={3}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              required
              placeholder="e.g. Patient contacted clinic explaining medical emergency, approved unflagging..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSelectedPatientToUnflag(null)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUnflagging}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20"
            >
              {isUnflagging ? 'Clearing...' : 'Approve & Clear Flags'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
