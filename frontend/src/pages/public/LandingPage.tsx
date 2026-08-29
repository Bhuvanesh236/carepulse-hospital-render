import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Calendar,
  Clock,
  ShieldCheck,
  Zap,
  Users,
  CheckCircle,
  ArrowRight,
  Stethoscope,
  HeartPulse,
  Award,
  Sparkles,
  Lock
} from 'lucide-react';
import { api } from '../../services/api';
import { Doctor, Department } from '../../types';
import { BookAppointmentModal } from '../../components/appointment/BookAppointmentModal';
import { useAuth } from '../../contexts/AuthContext';
import { DoctorImage } from '../../components/common/DoctorImage';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | undefined>(undefined);

  useEffect(() => {
    api.get<{ success: boolean; doctors: Doctor[]; departments: Department[] }>('/doctors').then((res) => {
      if (res.success) {
        setDoctors(res.doctors.slice(0, 4));
        setDepartments(res.departments);
      }
    });
  }, []);

  const handleBookClick = (docId?: number) => {
    if (!isAuthenticated) {
      navigate('/login?redirect=book');
      return;
    }
    setSelectedDoctorId(docId);
    setIsBookModalOpen(true);
  };

  return (
    <div className="space-y-24">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-teal-500/10 via-slate-50 to-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Col */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-100/80 border border-teal-200 text-teal-800 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Next-Gen Hospital Queue Engine
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
                Smart Hospital Appointments.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-emerald-600">
                  Less Waiting.
                </span>{' '}
                Better Care.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl font-normal">
                CarePulse combines real-time doctor availability with an intelligent, deterministic queue engine. Book conflict-free appointments, track live waiting times, and eliminate hospital waiting room congestion.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <button
                  onClick={() => handleBookClick()}
                  className="px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-base rounded-2xl shadow-xl shadow-teal-600/25 hover:shadow-teal-600/35 transition flex items-center justify-center gap-2"
                >
                  <Calendar className="w-5 h-5" />
                  <span>Book an Appointment</span>
                </button>

                <Link
                  to="/queue"
                  className="px-8 py-4 bg-white hover:bg-slate-100 text-slate-800 font-bold text-base rounded-2xl border border-slate-200 shadow-sm transition flex items-center justify-center gap-2"
                >
                  <Clock className="w-5 h-5 text-teal-600" />
                  <span>Check Queue Status</span>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-6 grid grid-cols-3 gap-6 border-t border-slate-200/80 text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Zero-Overlap Guarantee</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Live Queue Updates</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>Priority Triage Ready</span>
                </div>
              </div>
            </div>

            {/* Right Col: Live Queue Card Showcase */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md">
                {/* Decorative glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-3xl blur-xl opacity-30 group-hover:opacity-100 transition duration-1000" />

                <div className="relative bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-800">Live Hospital Monitor</h4>
                        <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Real-time active
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                      CARD-W201
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-100 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">Currently Serving</span>
                        <div className="text-3xl font-extrabold text-teal-950 mt-0.5">Q-023</div>
                        <span className="text-xs text-teal-700 font-medium">Dr. Sarah Jenkins</span>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/30">
                        <Stethoscope className="w-6 h-6" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Patients Ahead</span>
                        <div className="text-xl font-extrabold text-slate-800 mt-0.5">3 Patients</div>
                      </div>
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Est. Wait Time</span>
                        <div className="text-xl font-extrabold text-indigo-600 mt-0.5">~25 mins</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs text-amber-900 font-medium">
                    <span>Emergency triage queue position dynamically adjusted</span>
                    <Zap className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Key Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-teal-600">Enterprise Capabilities</h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Designed to Eliminate Bottlenecks & Enhance Patient Care
          </p>
          <p className="text-slate-600 text-sm sm:text-base">
            Engineered with strict concurrency control, transparent priority algorithms, and instant notifications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-teal-300 transition space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Zero-Conflict Scheduling</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Automated 15-minute slot generator with transactional locking prevents double bookings and guarantees schedule integrity across all doctors.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-300 transition space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Deterministic Priority Queue</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Intelligent mathematical priority scoring prioritizes emergency cases without random re-ordering, factoring in appointment urgency and check-in times.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-emerald-300 transition space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Real-Time Live Updates</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              WebSocket channels deliver instant queue progression alerts, doctor status changes, and dynamic estimated wait time recalculations directly to patients.
            </p>
          </div>
        </div>
      </section>

      {/* 3. How It Works Section */}
      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-teal-400">Streamlined Patient Flow</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">How CarePulse Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 font-extrabold text-sm flex items-center justify-center">1</div>
              <h4 className="font-bold text-base text-white">Register & Book</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Receive your unique Patient ID code and choose your preferred specialist and 15-minute slot.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 font-extrabold text-sm flex items-center justify-center">2</div>
              <h4 className="font-bold text-base text-white">Digital Check-In</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                On appointment day, check in to enter the optimized queue and receive your instant token number.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 font-extrabold text-sm flex items-center justify-center">3</div>
              <h4 className="font-bold text-base text-white">Live Queue Monitor</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Track dynamic estimated wait times and patients ahead from your mobile phone or hospital display.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 font-extrabold text-sm flex items-center justify-center">4</div>
              <h4 className="font-bold text-base text-white">Attend Consultation</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Get called when ready. Doctor completes consultation and queue auto-advances the next patient.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Featured Doctors Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-12">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-teal-600">Expert Medical Staff</h2>
            <p className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">Our Leading Specialists</p>
          </div>
          <Link
            to="/doctors"
            className="text-sm font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1.5"
          >
            <span>View All Doctors</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {doctors.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm hover:shadow-xl transition group flex flex-col justify-between"
            >
              <div className="space-y-4">
                <DoctorImage
                  src={doc.profile_image}
                  alt={doc.full_name}
                  doctorName={doc.full_name}
                  className="w-full h-48 rounded-2xl object-cover group-hover:scale-[1.02] transition"
                />
                <div>
                  <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">{doc.department_name}</span>
                  <h4 className="text-base font-bold text-slate-900 mt-0.5">{doc.full_name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{doc.specialization}</p>
                </div>
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 flex justify-between">
                  <span>{doc.experience_years} Years Experience</span>
                  <span className="font-semibold text-slate-700">{doc.room_number}</span>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => handleBookClick(doc.id)}
                  className="w-full py-2.5 bg-teal-50 hover:bg-teal-600 hover:text-white text-teal-700 font-bold text-xs rounded-xl border border-teal-200 transition"
                >
                  Book Consultation
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Security & Anti-Abuse Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-tr from-slate-900 to-slate-800 text-white rounded-3xl p-8 sm:p-12 lg:p-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/20 text-teal-400 text-xs font-bold uppercase tracking-wider">
                <Lock className="w-3.5 h-3.5" /> High-Security Architecture
              </div>
              <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Enterprise Data Integrity & Anti-Abuse Protection
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed font-normal">
                CarePulse protects hospital systems with encrypted JWT sessions, bcrypt password hashing, parameterized SQL execution, and anti-abuse safeguards (limiting simultaneous active appointments and tracking no-show patterns).
              </p>
              <div className="grid grid-cols-2 gap-4 text-xs text-slate-300 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-teal-400" />
                  <span>Configurable Booking Limits</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-teal-400" />
                  <span>Immutable Audit Logs</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-teal-400" />
                  <span>No-Show Flagging Rules</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-teal-400" />
                  <span>Role-Based Access Control</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <span className="text-xs font-bold uppercase text-teal-400">Hospital Anti-Abuse Rules</span>
                <span className="text-[11px] text-emerald-400 font-mono">ENFORCED</span>
              </div>
              <div className="space-y-2.5 text-xs text-slate-300">
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50 flex justify-between">
                  <span>Max Concurrent Active Bookings</span>
                  <span className="font-bold text-white">3 Appointments</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50 flex justify-between">
                  <span>Slot Booking Concurrency Lock</span>
                  <span className="font-bold text-white">Row-level ACID Isolation</span>
                </div>
                <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/50 flex justify-between">
                  <span>No-Show Review Threshold</span>
                  <span className="font-bold text-white">2 Unattended Appointments</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Book Appointment Modal */}
      <BookAppointmentModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        initialDoctorId={selectedDoctorId}
        onSuccess={() => {
          setIsBookModalOpen(false);
          navigate('/patient/appointments');
        }}
      />
    </div>
  );
};
