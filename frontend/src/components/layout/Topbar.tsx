import { User, LogOut, LogIn, Menu, Navigation } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { NavStatusPill } from '../navigation/NavStatusPill';

interface TopbarProps {
  onMenuClick?: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/app': return 'Navigate';
      case '/app/map': return 'Map';
      case '/app/tunnel': return 'GNSS Outage Test';
      case '/app/history': return 'Trips';
      case '/app/learning': return 'Navigation Intelligence';
      case '/app/diagnostics': return 'Diagnostics';
      case '/app/settings': return 'Settings';
      case '/app/profile': return 'Profile';
      case '/app/memory': return 'Saved Routes';
      default: return 'YatraSaarthi';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 flex items-center justify-between px-4 md:px-6 shrink-0 w-full select-none shadow-xs">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            title="Open Menu"
            className="md:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <Link
          to="/app"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold transition-colors border border-brand-200/60 mr-1"
        >
          <Navigation className="w-3.5 h-3.5 fill-brand-600 rotate-[-20deg]" />
          <span>Back to Nav</span>
        </Link>

        <h2 className="text-[16px] font-bold text-slate-900 tracking-tight hidden sm:inline">
          {getPageTitle(location.pathname)}
        </h2>

        <div className="hidden md:block h-4 w-px bg-slate-200" />
        <NavStatusPill className="hidden lg:inline-flex" />
      </div>

      <div className="flex items-center gap-3">
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3 pl-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-900 leading-tight">{user.full_name}</p>
              <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{user.email}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs">
              <User className="w-4 h-4" />
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-0.5"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-2 bg-brand-50 hover:bg-brand-100 text-brand-700 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border border-brand-200/70 shadow-2xs"
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
