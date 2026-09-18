import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileBottomNav from './MobileBottomNav';
import { useNavigationWebSocket } from '../../hooks/useNavigationWebSocket';
import { useNavigationStore } from '../../stores/useNavigationStore';

// Pages where we want zero padding (full-bleed map)
const fullBleedPages = ['/app/map'];

export default function AppLayout() {
  const sessionId = useNavigationStore((s) => s.state.session_id);
  useNavigationWebSocket(sessionId);
  const location = useLocation();
  const isFullBleed = fullBleedPages.includes(location.pathname);

  return (
    <div className="flex h-screen bg-brand-50">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Desktop topbar — hidden on mobile */}
        <div className="hidden md:flex">
          <Topbar />
        </div>

        {/* Mobile header — visible only on mobile, hidden on full-bleed pages */}
        {!isFullBleed && (
          <MobileHeader />
        )}

        {/* Main content area */}
        <main
          className={`flex-1 overflow-x-hidden overflow-y-auto bg-brand-50 ${
            isFullBleed
              ? 'p-0'
              : 'p-4 md:p-6 pb-20 md:pb-6'
          }`}
        >
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav — hidden on desktop */}
      <MobileBottomNav />
    </div>
  );
}

/** Minimal mobile-only header bar */
import { Navigation } from 'lucide-react';
import { GlobalStatusBadge } from '../common/GlobalStatusBadge';
import { Link } from 'react-router-dom';

function MobileHeader() {
  return (
    <header className="flex md:hidden items-center justify-between h-14 px-4 bg-white border-b border-brand-100 shrink-0">
      <Link to="/app" className="flex items-center gap-2 text-brand-600">
        <Navigation className="w-6 h-6 fill-brand-600" />
        <span className="text-base font-bold text-brand-navy">YatraSaarthi</span>
      </Link>
      <GlobalStatusBadge />
    </header>
  );
}
