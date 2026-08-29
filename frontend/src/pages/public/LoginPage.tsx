import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Activity, Lock, Mail, ArrowRight, Shield, Stethoscope, User, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import { User as UserType } from '../../types';

export const LoginPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await api.post<{
        success: boolean;
        message: string;
        token: string;
        user: UserType;
      }>('/auth/login', { email, password });

      if (res.success && res.token && res.user) {
        login(res.token, res.user);
        showToast('success', `Welcome back, ${res.user.fullName || res.user.email}!`);

        const redirect = searchParams.get('redirect');
        if (redirect === 'book') {
          navigate('/patient/appointments');
        } else if (res.user.role === 'ADMIN') {
          navigate('/admin/dashboard');
        } else if (res.user.role === 'DOCTOR') {
          navigate('/doctor/dashboard');
        } else {
          navigate('/patient/dashboard');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password.');
      showToast('error', err.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-teal-600/30">
            <Activity className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Sign In to CarePulse</h2>
          <p className="text-sm text-slate-500">
            Access your personalized hospital dashboard & live queue status
          </p>
        </div>

        {/* Demo Accounts Quick-Picker Banner */}
        <div className="p-4 bg-teal-50/70 border border-teal-200/80 rounded-2xl space-y-3">
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 block text-center">
            ⚡ Quick Evaluation Demo Logins
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin@hospital.com', 'Admin@2026')}
              className="p-2 rounded-xl bg-white border border-teal-200 text-xs font-bold text-slate-800 hover:bg-teal-600 hover:text-white transition flex flex-col items-center gap-1 shadow-sm"
            >
              <Shield className="w-4 h-4 text-teal-600" />
              <span>Admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('doctor.sarah@hospital.com', 'Doctor@2026')}
              className="p-2 rounded-xl bg-white border border-teal-200 text-xs font-bold text-slate-800 hover:bg-teal-600 hover:text-white transition flex flex-col items-center gap-1 shadow-sm"
            >
              <Stethoscope className="w-4 h-4 text-purple-600" />
              <span>Doctor</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickFill('patient.john@example.com', 'Patient@2026')}
              className="p-2 rounded-xl bg-white border border-teal-200 text-xs font-bold text-slate-800 hover:bg-teal-600 hover:text-white transition flex flex-col items-center gap-1 shadow-sm"
            >
              <User className="w-4 h-4 text-blue-600" />
              <span>Patient</span>
            </button>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl space-y-6">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-700 font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@hospital.com"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-600/25 disabled:opacity-50 transition flex items-center justify-center gap-2 mt-2"
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              New patient?{' '}
              <Link to="/register" className="font-bold text-teal-600 hover:text-teal-700">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
