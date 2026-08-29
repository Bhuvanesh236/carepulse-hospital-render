import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Filter, Stethoscope, Calendar, Clock, MapPin, Award, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { Doctor, Department } from '../../types';
import { Badge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { BookAppointmentModal } from '../../components/appointment/BookAppointmentModal';
import { useAuth } from '../../contexts/AuthContext';
import { DoctorImage } from '../../components/common/DoctorImage';

export const DoctorsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState<string>('');
  const [selectedDep, setSelectedDep] = useState<string>(searchParams.get('departmentId') || 'all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | undefined>(undefined);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | undefined>(undefined);

  const fetchDoctors = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (selectedDep !== 'all') query.append('departmentId', selectedDep);
      if (selectedStatus !== 'all') query.append('status', selectedStatus);

      const res = await api.get<{ success: boolean; doctors: Doctor[]; departments: Department[] }>(
        `/doctors?${query.toString()}`
      );
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
  }, [selectedDep, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDoctors();
  };

  const handleBook = (doc: Doctor) => {
    if (!isAuthenticated) {
      navigate('/login?redirect=book');
      return;
    }
    setSelectedDoctorId(doc.id);
    setSelectedDepartmentId(doc.department_id);
    setIsBookModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-left space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Our Medical Specialists</h1>
        <p className="text-sm text-slate-500">
          Browse verified doctors, view working schedules, and book guaranteed 15-minute consultations.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by doctor name, medical specialization, or department..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedDep}
              onChange={(e) => setSelectedDep(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            >
              <option value="all">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="BUSY">Busy</option>
              <option value="ON_LEAVE">On Leave</option>
            </select>
          </div>

          <div className="md:col-span-1">
            <button
              type="submit"
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-md shadow-teal-600/20 transition flex items-center justify-center"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Doctor Cards Grid */}
      {isLoading ? (
        <LoadingSpinner size="lg" text="Loading hospital specialists..." />
      ) : doctors.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <Stethoscope className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No Doctors Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search criteria or selecting a different department filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm hover:shadow-xl hover:border-teal-300 transition flex flex-col justify-between group"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <DoctorImage
                    src={doc.profile_image}
                    alt={doc.full_name}
                    doctorName={doc.full_name}
                    className="w-16 h-16 rounded-2xl object-cover border border-slate-200 flex-shrink-0 group-hover:scale-105 transition"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">
                        {doc.department_name}
                      </span>
                      <Badge status={doc.status} size="sm" />
                    </div>
                    <h3 className="font-extrabold text-base text-slate-900 truncate mt-0.5">{doc.full_name}</h3>
                    <p className="text-xs text-slate-500 font-medium truncate">{doc.specialization}</p>
                  </div>
                </div>

                {/* Qualification & Details */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    <span className="truncate">{doc.qualification}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    <span>{doc.experience_years} Years Clinical Practice</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal-600 flex-shrink-0" />
                    <span>{doc.room_number || 'Room 101'}</span>
                  </div>
                </div>

                {/* Bio snippet */}
                {doc.bio && (
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed italic bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    "{doc.bio}"
                  </p>
                )}
              </div>

              {/* Action */}
              <div className="pt-5 mt-4 border-t border-slate-100">
                <button
                  onClick={() => handleBook(doc)}
                  disabled={doc.status === 'INACTIVE' || doc.status === 'ON_LEAVE'}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 disabled:shadow-none transition flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>{doc.status === 'ON_LEAVE' ? 'On Leave' : 'Book Appointment'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Book Appointment Modal */}
      <BookAppointmentModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        initialDoctorId={selectedDoctorId}
        initialDepartmentId={selectedDepartmentId}
        onSuccess={() => {
          setIsBookModalOpen(false);
          navigate('/patient/appointments');
        }}
      />
    </div>
  );
};
