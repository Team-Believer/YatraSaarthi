import { useState } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import { NavStatusDrawer } from '../navigation/NavStatusDrawer';
import { NavStatusPill } from '../navigation/NavStatusPill';
import { useNavigationWebSocket } from '../../hooks/useNavigationWebSocket';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { YatraSaarthiLogo } from '../branding/YatraSaarthiLogo';
import { Menu, LogIn, LogOut, User } from 'lucide-react';

// Full-bleed map pages that take over the complete viewport
const mapPages = ['/app', '/app/map', '/app/tunnel'];

export default function AppLayout() {
  const sessionId = useNavigationStore((s) => s.state.session_id);
  useNavigationWebSocket(sessionId);
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();

  const isMapPage = mapPages.includes(location.pathname);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-50">
      {/* 1. Mobile Floating Menu Drawer Backdrop */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 bg-[#083335]/60 backdrop-blur-xs z-50 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* 2. Mobile Slide-out Navigation Drawer (Only on small screens) */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 transform transition-transform duration-300 ease-out md:hidden ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setDrawerOpen(false)} isDrawer={true} />
      </div>

      {/* 3. Desktop Vertical Floating Navigation Rail Overlay (Single Global Navigation) */}
      <div className="fixed top-4 left-4 z-40 hidden md:flex items-center pointer-events-none">
        <div className="pointer-events-auto flex flex-col">
          <Sidebar />
        </div>
      </div>

      {/* 4. Desktop Top-Right Floating Utility Action (Nav Status / Profile) */}
      <div className="fixed top-4 right-4 sm:right-6 z-30 hidden md:flex items-center gap-2.5 select-none">
        <NavStatusPill />
        {isAuthenticated && user && (
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/90 shadow-2xs">
            <span className="text-xs font-semibold text-ink hidden lg:inline truncate max-w-[120px]">
              {user.full_name}
            </span>
            <Link
              to="/app/profile"
              title="Profile"
              aria-label="Profile"
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-ink text-xs transition-colors"
            >
              <User className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 5. Main Viewport Canvas (Full 100vw x 100vh) */}
      <div className="w-full h-full relative flex flex-col overflow-hidden">
        {/* Mobile Header Bar (Only on mobile screens) */}
        <div className="md:hidden flex items-center justify-between px-4 py-2.5 bg-white border-b border-border-clean shrink-0 z-30 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              title="Open menu"
              className="p-1.5 rounded-xl text-ink hover:bg-slate-100 active:bg-slate-200 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/app" className="flex items-center">
              <YatraSaarthiLogo variant="compact" height={30} />
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <Link
                to="/app/profile"
                className="w-8 h-8 rounded-full bg-slate-100 border border-border-clean flex items-center justify-center text-ink text-xs font-semibold"
                aria-label="Profile"
              >
                <User className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                to="/login"
                className="h-8 px-3 rounded-full bg-[#083335] hover:bg-[#052426] active:bg-[#031718] text-white text-xs font-medium inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign in</span>
              </Link>
            )}
          </div>
        </div>

        {/* Content Body (Full bleed on map pages; comfortably padded on non-map pages) */}
        <main
          className={`flex-1 w-full h-full relative ${
            isMapPage
              ? 'p-0 overflow-hidden'
              : 'px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:pl-[96px] lg:pl-[104px] pb-24 md:pb-12 overflow-y-auto bg-slate-50'
          }`}
        >
          <Outlet />
        </main>

        {/* Mobile Bottom Nav Bar */}
        <MobileBottomNav />
      </div>

      {/* Global Viewport Navigation Status Drawer Overlay */}
      <NavStatusDrawer />
    </div>
  );
}
