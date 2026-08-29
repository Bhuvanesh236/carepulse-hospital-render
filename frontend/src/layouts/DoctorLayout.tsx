import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { ToastContainer } from '../components/common/Toast';
import { LayoutDashboard, Users, Clock, Calendar, User, Stethoscope, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const DoctorLayout: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const sidebarLinks = [
    { name: 'Doctor Console', path: '/doctor/dashboard', icon: LayoutDashboard },
    { name: 'Live Queue Manager', path: '/doctor/queue', icon: Users },
    { name: 'My Profile & Status', path: '/doctor/profile', icon: User }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Doctor Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm sticky top-24 space-y-6">
              {/* Doctor Badge */}
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-extrabold text-sm ring-2 ring-purple-50">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-slate-900 truncate">{user?.fullName || 'Dr. Specialist'}</h4>
                  <span className="text-[11px] font-mono font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                    {user?.doctorCode || 'DOC-2026-000'}
                  </span>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                {sidebarLinks.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                        active
                          ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Queue Shortcut */}
              <div className="pt-2">
                <Link
                  to="/doctor/queue"
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 transition"
                >
                  <Activity className="w-4 h-4" />
                  <span>Open Live Queue</span>
                </Link>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>

      <Footer />
      <ToastContainer />
    </div>
  );
};
