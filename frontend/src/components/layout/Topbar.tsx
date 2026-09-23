import { User, LogOut, LogIn, Menu, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { NavStatusPill } from '../navigation/NavStatusPill';
import { YatraSaarthiLogo } from '../branding/YatraSaarthiLogo';

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
      default: return 'Yatra-Sarthi';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isNavRoot = location.pathname === '/app';

  return (
    <header className="h-16 bg-white border-b border-border-clean flex items-center justify-between px-4 md:px-6 shrink-0 w-full select-none shadow-2xs">
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            title="Open Menu"
            className="md:hidden p-2 rounded-lg text-ink hover:bg-[#F3F3F3] active:bg-[#EDEDED] transition-colors duration-150 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="md:hidden flex items-center">
          <Link to="/app">
            <YatraSaarthiLogo variant="compact" height={34} />
          </Link>
        </div>

        {!isNavRoot && (
          <Link
            to="/app"
            aria-label="Back to navigation"
            className="inline-flex items-center gap-1.5 h-10 px-2.5 rounded-lg text-[#111111] text-[15px] font-medium hover:bg-[#F3F3F3] active:bg-[#EDEDED] transition-colors duration-150 cursor-pointer"
          >
            <ArrowLeft className="w-4.5 h-4.5 text-[#111111]" strokeWidth={2} />
            <span className="hidden sm:inline">Navigate</span>
          </Link>
        )}

        <h2 className="text-[18px] sm:text-[19px] font-bold text-[#111111] tracking-tight hidden md:inline">
          {getPageTitle(location.pathname)}
        </h2>

        <NavStatusPill className="hidden lg:inline-flex" />
      </div>

      <div className="flex items-center gap-3">
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3 pl-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-ink leading-tight">{user.full_name}</p>
              <p className="text-[11px] text-ink-body leading-tight mt-0.5">{user.email}</p>
            </div>
            <Link
              to="/app/profile"
              className="w-8.5 h-8.5 rounded-full bg-canvas-soft border border-border-clean flex items-center justify-center text-ink font-semibold text-xs hover:bg-surface-pressed transition-colors"
            >
              <User className="w-4 h-4" />
            </Link>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 text-ink-mute hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="btn-primary text-xs py-1.5 px-4"
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
