import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import {
  User,
  MapPin,
  Navigation,
  Brain,
  HelpCircle,
  Info,
  ChevronRight,
  LogOut,
  LogIn,
  ShieldCheck,
} from 'lucide-react';

const profileLinks = [
  { label: 'Navigation Memory & Bookmarks', icon: MapPin, path: '/app/memory', desc: 'Saved corridors & spatial memory' },
  { label: 'Journey History & Logs', icon: Navigation, path: '/app/history', desc: 'Recorded dead reckoning sessions' },
  { label: 'AI Motion Intelligence', icon: Brain, path: '/app/learning', desc: 'Neural velocity & uncertainty models' },
  { label: 'System Configuration', icon: HelpCircle, path: '/app/settings', desc: 'Kinematic profiles & filter tuning' },
  { label: 'Sensor Diagnostics', icon: Info, path: '/app/diagnostics', desc: 'Hardware streams & innovation gates' },
];

export default function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-300 pb-24 md:pb-12 text-slate-900">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-xs text-center space-y-4">
        <div className="w-20 h-20 bg-brand-50 border border-brand-200/80 rounded-full flex items-center justify-center mx-auto text-brand-600 shadow-md">
          <User className="w-10 h-10" />
        </div>

        {isAuthenticated && user ? (
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">{user.full_name}</h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">{user.email}</p>
            <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-emerald-700 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verified Driver Profile
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">Guest Navigation Session</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">Telemetry is stored locally on this device</p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-xs press-scale"
            >
              <LogIn className="w-4 h-4" />
              Sign In to Cloud Sync
            </Link>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden divide-y divide-slate-100">
        {profileLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.path}
              className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/80 transition-colors group"
            >
              <div className="w-10 h-10 bg-slate-100 group-hover:bg-brand-50 group-hover:text-brand-600 rounded-xl flex items-center justify-center text-slate-600 shrink-0 transition-colors">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-brand-700 transition-colors">
                  {item.label}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">{item.desc}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          );
        })}
      </div>

      {/* Logout */}
      {isAuthenticated && (
        <button
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 py-3 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-2xl text-xs sm:text-sm font-bold transition-colors border border-rose-200/80 shadow-2xs press-scale"
        >
          <LogOut className="w-4 h-4" />
          Sign Out of Account
        </button>
      )}

      {/* Tagline Footer */}
      <div className="text-center py-2 space-y-1">
        <div className="flex items-center justify-center gap-1.5 text-brand-600">
          <Navigation className="w-3.5 h-3.5 fill-brand-600 rotate-[-20deg]" />
          <span className="text-xs font-bold text-slate-900">YatraSaarthi Navigation</span>
        </div>
        <p className="text-[11px] text-slate-400 font-medium">
          Continuous Dead Reckoning & AI Motion Intelligence
        </p>
      </div>
    </div>
  );
}
