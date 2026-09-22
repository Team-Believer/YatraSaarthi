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
import { YatraSaarthiLogo } from '../components/branding/YatraSaarthiLogo';

const profileLinks = [
  { label: 'Saved routes', icon: MapPin, path: '/app/memory', desc: 'Saved corridors & spatial memory' },
  { label: 'Trips', icon: Navigation, path: '/app/history', desc: 'Recorded dead reckoning sessions' },
  { label: 'Navigation intelligence', icon: Brain, path: '/app/learning', desc: 'Neural velocity & uncertainty models' },
  { label: 'Settings', icon: HelpCircle, path: '/app/settings', desc: 'Kinematic profiles & filter tuning' },
  { label: 'Diagnostics', icon: Info, path: '/app/diagnostics', desc: 'Hardware streams & innovation gates' },
];

export default function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-300 pb-24 md:pb-12 text-ink select-none">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-border-clean shadow-2xs text-center space-y-4">
        <div className="w-18 h-18 bg-canvas-soft border border-border-clean rounded-full flex items-center justify-center mx-auto text-ink shadow-2xs">
          <User className="w-9 h-9 text-ink" />
        </div>

        {isAuthenticated && user ? (
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">{user.full_name}</h1>
            <p className="text-xs sm:text-sm text-ink-body font-normal">{user.email}</p>
            <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Verified navigation profile
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink">Guest session</h1>
              <p className="text-xs sm:text-sm text-ink-body mt-0.5">Telemetry is stored locally on this device</p>
            </div>
            <Link
              to="/login"
              className="btn-primary py-2.5 px-6 text-xs sm:text-sm"
            >
              <LogIn className="w-4 h-4" />
              Sign in to cloud sync
            </Link>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="bg-white rounded-2xl border border-border-clean shadow-2xs overflow-hidden divide-y divide-border-clean">
        {profileLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.path}
              className="flex items-center gap-4 px-5 py-4 hover:bg-canvas-softer transition-colors group cursor-pointer"
            >
              <div className="w-10 h-10 bg-canvas-soft group-hover:bg-black group-hover:text-white rounded-full flex items-center justify-center text-ink shrink-0 transition-colors">
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs sm:text-sm font-semibold text-ink group-hover:text-black transition-colors">
                  {item.label}
                </div>
                <div className="text-[11px] text-ink-body truncate mt-0.5">{item.desc}</div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-mute group-hover:text-ink group-hover:translate-x-0.5 transition-all" />
            </Link>
          );
        })}
      </div>

      {/* Logout */}
      {isAuthenticated && (
        <button
          onClick={() => logout()}
          className="btn-secondary w-full py-3 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
        >
          <LogOut className="w-4 h-4" />
          Sign out of account
        </button>
      )}

      {/* Brand Footer */}
      <div className="flex flex-col items-center justify-center py-2 space-y-1">
        <YatraSaarthiLogo variant="compact" height={32} />
      </div>
    </div>
  );
}
