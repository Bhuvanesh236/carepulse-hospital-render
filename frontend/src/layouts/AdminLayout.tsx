import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { ToastContainer } from '../components/common/Toast';
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Building2,
  Calendar,
  Layers,
  BarChart3,
  Settings,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  const sidebarLinks = [
    { name: 'Dashboard Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Patient Registry', path: '/admin/patients', icon: Users },
    { name: 'Doctor Roster', path: '/admin/doctors', icon: Stethoscope },
    { name: 'Clinical Departments', path: '/admin/departments', icon: Building2 },
    { name: 'All Appointments', path: '/admin/appointments', icon: Calendar },
    { name: 'Queue Supervisor', path: '/admin/queue', icon: Layers },
    { name: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
    { name: 'System Rules & Limits', path: '/admin/settings', icon: Settings },
    { name: 'Security Audit Logs', path: '/admin/audit-logs', icon: FileText }
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Admin Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm sticky top-24 space-y-6">
              {/* Admin Badge */}
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-11 h-11 rounded-xl bg-slate-900 text-teal-400 flex items-center justify-center font-extrabold text-sm ring-2 ring-slate-100">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-slate-900 truncate">Hospital Admin</h4>
                  <span className="text-[11px] font-semibold text-slate-500 block">Command Center</span>
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
                          ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
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
