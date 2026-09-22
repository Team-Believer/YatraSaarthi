import { User, LogOut, LogIn } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GlobalStatusBadge } from '../common/GlobalStatusBadge';

export default function Topbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/app': return 'Dashboard';
      case '/app/map': return 'Live Navigation Map';
      case '/app/tunnel': return 'Tunnel & Outage Mode';
      case '/app/history': return 'Journey History';
      case '/app/learning': return 'Learning Insights';
      case '/app/diagnostics': return 'Sensor Diagnostics';
      case '/app/settings': return 'System Settings';
      default: return 'YatraSaarthi Platform';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-6 shrink-0 w-full select-none">
      <div className="flex items-center gap-3.5">
        <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">
          {getPageTitle(location.pathname)}
        </h2>
        <div className="h-4 w-px bg-slate-200" />
        <GlobalStatusBadge />
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
            Sign In / Register
          </Link>
        )}
      </div>
    </header>
  );
}

