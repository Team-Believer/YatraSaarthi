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
} from 'lucide-react';

const profileLinks = [
  { label: 'My Places', icon: MapPin, path: '/app/memory' },
  { label: 'My Trips', icon: Navigation, path: '/app/history' },
  { label: 'Navigation Memory', icon: Brain, path: '/app/memory' },
  { label: 'Help & Support', icon: HelpCircle, path: '/app/settings' },
  { label: 'About YatraSaarthi', icon: Info, path: '/app/settings' },
];

export default function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuthStore();

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-8">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-6 border border-brand-50 shadow-sm text-center space-y-4">
        <div className="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mx-auto text-brand-600 shadow-md">
          <User className="w-10 h-10" />
        </div>

        {isAuthenticated && user ? (
          <>
            <div>
              <h1 className="text-xl font-bold text-brand-navy">{user.full_name}</h1>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
            <p className="text-xs text-gray-400">Member since Sep 2025</p>
          </>
        ) : (
          <>
            <div>
              <h1 className="text-xl font-bold text-brand-navy">Guest User</h1>
              <p className="text-sm text-gray-500">Sign in to sync your data</p>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-brand-600 text-white px-6 py-2.5 rounded-2xl text-sm font-semibold hover:bg-brand-700 transition-colors shadow-md"
            >
              <LogIn className="w-4 h-4" />
              Sign In / Register
            </Link>
          </>
        )}
      </div>

      {/* Navigation Links */}
      <div className="bg-white rounded-3xl border border-brand-50 shadow-sm overflow-hidden divide-y divide-gray-100">
        {profileLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.path}
              className="flex items-center gap-4 px-5 py-4 hover:bg-brand-50/50 transition-colors"
            >
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 shrink-0">
                <Icon className="w-5 h-5" />
              </div>
              <span className="flex-1 text-sm font-semibold text-brand-navy">
                {item.label}
              </span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          );
        })}
      </div>

      {/* Logout */}
      {isAuthenticated && (
        <button
          onClick={() => logout()}
          className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 rounded-2xl text-sm font-semibold hover:bg-red-100 transition-colors border border-red-100"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      )}

      {/* Tagline Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-gray-400 font-medium">
          Better Navigation for a Smarter Tomorrow
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-2 text-brand-600">
          <Navigation className="w-4 h-4 fill-brand-600" />
          <span className="text-xs font-bold">YatraSaarthi</span>
        </div>
      </div>
    </div>
  );
}
