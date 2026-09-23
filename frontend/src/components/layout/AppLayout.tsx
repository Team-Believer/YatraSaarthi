import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import { MobileAccountMenu } from './MobileAccountMenu';
import { MobileMoreSheet } from './MobileMoreSheet';
import { HelpAboutModal } from './HelpAboutModal';
import { NavStatusDrawer } from '../navigation/NavStatusDrawer';
import { NavStatusPill } from '../navigation/NavStatusPill';
import { useNavigationWebSocket } from '../../hooks/useNavigationWebSocket';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { YatraSaarthiLogo } from '../branding/YatraSaarthiLogo';
import { Menu, MoreHorizontal, LogOut, User } from 'lucide-react';
import { clsx } from 'clsx';

// Full-bleed map pages that take over the complete viewport
const mapPages = ['/app', '/app/map', '/app/tunnel'];

export default function AppLayout() {
  const sessionId = useNavigationStore((s) => s.state.session_id);
  useNavigationWebSocket(sessionId);
  const location = useLocation();
  const navigate = useNavigate();

  // 3 Distinct Mobile Overlay States
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  // Dialog Modals
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);

  const { user, isAuthenticated, logout } = useAuthStore();
  const isMapPage = mapPages.includes(location.pathname);

  // Mutual Exclusivity Handlers
  const handleOpenNavDrawer = useCallback(() => {
    setNavDrawerOpen(true);
    setAccountMenuOpen(false);
    setMoreSheetOpen(false);
  }, []);

  const handleOpenAccountMenu = useCallback(() => {
    setAccountMenuOpen((prev) => !prev);
    setNavDrawerOpen(false);
    setMoreSheetOpen(false);
  }, []);

  const handleOpenMoreSheet = useCallback(() => {
    setMoreSheetOpen(true);
    setNavDrawerOpen(false);
    setAccountMenuOpen(false);
  }, []);

  const handleCloseAll = useCallback(() => {
    setNavDrawerOpen(false);
    setAccountMenuOpen(false);
    setMoreSheetOpen(false);
  }, []);

  // Close overlays on route change
  useEffect(() => {
    handleCloseAll();
  }, [location.pathname, handleCloseAll]);

  // Global Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseAll();
        setHelpModalOpen(false);
        setAboutModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCloseAll]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-slate-50">
      {/* 1. Mobile Main Navigation Drawer Backdrop (Only when hamburger drawer is open) */}
      {navDrawerOpen && (
        <div
          onClick={() => setNavDrawerOpen(false)}
          className="fixed inset-0 bg-[#083335]/20 backdrop-blur-2xs z-50 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* 2. Mobile Main Navigation Drawer (Triggered ONLY by Top-Left Hamburger) */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 transform transition-transform duration-200 ease-out md:hidden ${
          navDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setNavDrawerOpen(false)} isDrawer={true} />
      </div>

      {/* 3. Top-Right Account & Utility Popover (Triggered ONLY by Top-Right More Button) */}
      <MobileAccountMenu
        isOpen={accountMenuOpen}
        onClose={() => setAccountMenuOpen(false)}
        onOpenAbout={() => setAboutModalOpen(true)}
      />

      {/* 4. Bottom More Sheet (Triggered ONLY by Bottom Nav 'More' Tab) */}
      <MobileMoreSheet
        isOpen={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        onOpenHelp={() => setHelpModalOpen(true)}
        onOpenAbout={() => setAboutModalOpen(true)}
      />

      {/* 5. Help & About Modals */}
      <HelpAboutModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        type="help"
      />
      <HelpAboutModal
        isOpen={aboutModalOpen}
        onClose={() => setAboutModalOpen(false)}
        type="about"
      />

      {/* 6. Desktop Vertical Floating Navigation Rail Overlay (Single Global Navigation) */}
      <div className="fixed top-4 left-4 z-40 hidden md:flex items-center pointer-events-none">
        <div className="pointer-events-auto flex flex-col">
          <Sidebar />
        </div>
      </div>

      {/* 7. Desktop Top-Right Floating Utility Action (Nav Status / Profile) */}
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

      {/* 8. Main Viewport Canvas (Full 100vw x 100dvh) */}
      <div className="w-full h-full relative flex flex-col overflow-hidden">
        {/* Mobile Header Bar - Floating Overlay on Map Pages; Sticky on Content Pages */}
        {isMapPage ? (
          /* FLOATING TOP HEADER OVERLAY FOR MAP */
          <div className="absolute top-0 left-0 right-0 z-30 pt-[calc(env(safe-area-inset-top)+6px)] px-3 pointer-events-none md:hidden">
            <div className="pointer-events-auto flex items-center justify-between h-[52px] px-3 bg-white/95 backdrop-blur-md rounded-2xl border border-border-clean shadow-nav-floating max-w-lg mx-auto">
              {/* Left: Hamburger (Main Navigation Drawer ONLY) */}
              <button
                type="button"
                onClick={handleOpenNavDrawer}
                aria-label="Open navigation menu"
                title="Open menu"
                className="w-10 h-10 -ml-1 flex items-center justify-center rounded-xl text-[#083335] hover:bg-canvas-soft active:bg-surface-pressed transition-colors cursor-pointer shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Center: Real YatraSaarthi Logo */}
              <Link
                to="/app"
                className="flex items-center justify-center min-w-0 px-2 py-0.5"
                aria-label="YatraSaarthi Home"
              >
                <YatraSaarthiLogo variant="header" height={30} showText={true} />
              </Link>

              {/* Right: Account & Utilities Menu Trigger */}
              <button
                type="button"
                onClick={handleOpenAccountMenu}
                aria-label="Open account menu"
                title="Account options"
                className={clsx(
                  'w-10 h-10 -mr-1 flex items-center justify-center rounded-xl text-[#083335] hover:bg-canvas-soft active:bg-surface-pressed transition-colors cursor-pointer shrink-0',
                  accountMenuOpen && 'bg-canvas-soft ring-1 ring-[#083335]/20'
                )}
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          /* STANDARD STICKY TOP HEADER FOR CONTENT PAGES */
          <div className="md:hidden flex items-center justify-between px-3 pt-[env(safe-area-inset-top)] h-[calc(54px+env(safe-area-inset-top))] bg-white border-b border-border-clean shrink-0 z-30 shadow-2xs">
            {/* Left: Hamburger */}
            <button
              type="button"
              onClick={handleOpenNavDrawer}
              aria-label="Open navigation menu"
              title="Open menu"
              className="w-10 h-10 flex items-center justify-center rounded-xl text-[#083335] hover:bg-canvas-soft active:bg-surface-pressed transition-colors cursor-pointer shrink-0"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Center: Real YatraSaarthi Logo */}
            <Link
              to="/app"
              className="flex items-center justify-center min-w-0"
              aria-label="YatraSaarthi Home"
            >
              <YatraSaarthiLogo variant="header" height={28} showText={true} />
            </Link>

            {/* Right: Account Menu Trigger */}
            <button
              type="button"
              onClick={handleOpenAccountMenu}
              aria-label="Open account menu"
              title="Account options"
              className={clsx(
                'w-10 h-10 flex items-center justify-center rounded-xl text-[#083335] hover:bg-canvas-soft active:bg-surface-pressed transition-colors cursor-pointer shrink-0',
                accountMenuOpen && 'bg-canvas-soft ring-1 ring-[#083335]/20'
              )}
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
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

        {/* Mobile Bottom Nav Bar */}
        <MobileBottomNav
          onOpenMore={handleOpenMoreSheet}
          onOpenMenu={handleOpenNavDrawer}
        />
      </div>

      {/* Global Viewport Navigation Status Drawer Overlay */}
      <NavStatusDrawer />
    </div>
  );
}

