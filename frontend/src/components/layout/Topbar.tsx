import { User, LogOut, LogIn } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { Link, useNavigate } from 'react-router-dom';
import { GlobalStatusBadge } from '../common/GlobalStatusBadge';

export default function Topbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="h-16 bg-white border-b border-brand-100 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <GlobalStatusBadge />
      </div>
      
      <div className="flex items-center gap-4">
        {isAuthenticated && user ? (
          <div className="flex items-center gap-3 pl-4 border-l border-brand-100">
            <div className="text-right">
              <p className="text-sm font-semibold text-brand-navy">{user.full_name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm">
              <User className="w-5 h-5" />
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 text-gray-400 hover:text-status-danger transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-2 bg-brand-50 hover:bg-brand-100 text-brand-600 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors border border-brand-100"
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In / Register
          </Link>
        )}
      </div>
    </header>
  );
}

