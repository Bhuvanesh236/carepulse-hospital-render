import React from 'react';
import { Activity, ShieldCheck, Heart, Clock, Phone, MapPin, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Col 1: Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">
                Care<span className="text-teal-400">Pulse</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Smart Hospital Appointments. Less Waiting. Better Care. Designed with intelligent deterministic queue optimization and zero-conflict doctor scheduling.
            </p>
            <div className="flex items-center gap-3 text-xs text-teal-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>HIPAA Compliant & Secure</span>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Patient Services</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><Link to="/doctors" className="hover:text-teal-400 transition">Find a Doctor</Link></li>
              <li><Link to="/patient/book-appointment" className="hover:text-teal-400 transition">Book Consultation</Link></li>
              <li><Link to="/queue" className="hover:text-teal-400 transition">Live Queue Status</Link></li>
              <li><Link to="/patient/dashboard" className="hover:text-teal-400 transition">Patient Portal</Link></li>
            </ul>
          </div>

          {/* Col 3: Departments */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Clinical Centers</h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>Cardiology & Heart Care</li>
              <li>Neurology & Spine Clinic</li>
              <li>Pediatrics & Child Wellness</li>
              <li>Orthopedic Surgery</li>
              <li>Dermatology & Skin Center</li>
              <li>General Internal Medicine</li>
            </ul>
          </div>

          {/* Col 4: Contact */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Emergency & Contact</h4>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                <span>24/7 Emergency Line: +1 (800) 555-0199</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                <span>appointments@carepulse-hospital.org</span>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                <span>742 Evergreen Medical Blvd, Health City</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800/80 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 CarePulse Health System. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-400 transition cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-400 transition cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-400 transition cursor-pointer">Security Standards</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
