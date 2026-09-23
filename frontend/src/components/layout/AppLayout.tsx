import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import { NavStatusDrawer } from '../navigation/NavStatusDrawer';
import { NavStatusPill } from '../navigation/NavStatusPill';
import { useNavigationWebSocket } from '../../hooks/useNavigationWebSocket';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { YatraSaarthiLogo } from '../branding/YatraSaarthiLogo';
import { Menu, LogOut, User } from 'lucide-react';

// Full-bleed map pages that take over the complete viewport
const mapPages = ['/app', '/app/map', '/app/tunnel'];

export default function AppLayout() {
  const sessionId = useNavigationStore((s) => s.state.session_id);
  useNavigationWebSocket(sessionId);
  const location = useLocation();
  const navigate = useNavigate();

  // Mobile Navigation Drawer State (Triggered ONLY by Hamburger Menu)
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);

  const { user, isAuthenticated, logout } = useAuthStore();
  const isMapPage = mapPages.includes(location.pathname);

  const handleOpenNavDrawer = useCallback(() => {
    setNavDrawerOpen(true);
  }, []);

  const handleCloseNavDrawer = useCallback(() => {
    setNavDrawerOpen(false);
  }, []);

  // Close drawer on route change
  useEffect(() => {
    handleCloseNavDrawer();
  }, [location.pathname, handleCloseNavDrawer]);

  // Global Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseNavDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCloseNavDrawer]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-slate-50">
      {/* 1. Mobile Main Navigation Drawer Backdrop (Only when hamburger drawer is open) */}
      {navDrawerOpen && (
        <div
          onClick={handleCloseNavDrawer}
          className="fixed inset-0 bg-[#083335]/16 backdrop-blur-[1px] z-50 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* 2. Mobile Main Navigation Drawer (Triggered ONLY by Top-Left Hamburger) */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 transform transition-transform duration-200 ease-out md:hidden ${
          navDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={handleCloseNavDrawer} isDrawer={true} />
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

      {/* 5. Main Viewport Canvas (Full 100vw x 100dvh) */}
      <div className="w-full h-full relative flex flex-col overflow-hidden">
        {/* Mobile Header Bar - Floating Overlay on Map Pages; Sticky on Content Pages */}
        {isMapPage ? (
          /* FLOATING TOP HEADER OVERLAY FOR MAP (Clean floating bar: Menu + Centered Logo) */
          <div className="absolute top-0 left-0 right-0 z-30 pt-[calc(env(safe-area-inset-top)+8px)] px-2.5 sm:px-3 pointer-events-none md:hidden">
            <div className="pointer-events-auto relative flex items-center justify-between h-[54px] px-2.5 bg-white/96 backdrop-blur-md rounded-2xl border border-border-clean shadow-nav-floating max-w-lg mx-auto">
              {/* Left: Hamburger (Main Navigation Drawer ONLY) */}
              <button
                type="button"
                onClick={handleOpenNavDrawer}
                aria-label="Open navigation menu"
                title="Open navigation menu"
                className="w-11 h-11 flex items-center justify-center rounded-xl text-[#083335] hover:bg-canvas-soft active:bg-surface-pressed transition-colors cursor-pointer shrink-0 z-10"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Center: Real YatraSaarthi Logo strictly centered across the bar */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Link
                  to="/app"
                  className="pointer-events-auto flex items-center justify-center select-none py-1"
                  aria-label="YatraSaarthi Home"
                >
                  <YatraSaarthiLogo variant="header" height={26} showText={true} />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD STICKY TOP HEADER FOR CONTENT PAGES */
          <div className="md:hidden relative flex items-center justify-between px-2.5 pt-[env(safe-area-inset-top)] h-[calc(54px+env(safe-area-inset-top))] bg-white border-b border-border-clean shrink-0 z-30 shadow-2xs">
            {/* Left: Hamburger */}
            <button
              type="button"
              onClick={handleOpenNavDrawer}
              aria-label="Open navigation menu"
              title="Open navigation menu"
              className="w-11 h-11 flex items-center justify-center rounded-xl text-[#083335] hover:bg-canvas-soft active:bg-surface-pressed transition-colors cursor-pointer shrink-0 z-10"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Center: Real YatraSaarthi Logo strictly centered */}
            <div className="absolute inset-0 flex items-center justify-center pt-[env(safe-area-inset-top)] pointer-events-none">
              <Link
                to="/app"
                className="pointer-events-auto flex items-center justify-center select-none py-1"
                aria-label="YatraSaarthi Home"
              >
                <YatraSaarthiLogo variant="header" height={26} showText={true} />
              </Link>
            </div>
          </div>
        )}

        {/* Content Body (Absolute full bleed on map pages; comfortably padded and scrollable on non-map pages) */}
        <main
          className={`w-full h-full relative ${
            isMapPage
              ? 'absolute inset-0 p-0 overflow-hidden'
              : 'flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:pl-[96px] lg:pl-[104px] pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-12 overflow-y-auto bg-slate-50'
          }`}
        >
          <Outlet />
        </main>

        {/* Mobile Bottom Nav Bar (4 evenly distributed items: Home, Navigate, Trips, Saved) */}
        <MobileBottomNav />
      </div>

      {/* Global Viewport Navigation Status Drawer Overlay */}
      <NavStatusDrawer />
    </div>
  );
}


