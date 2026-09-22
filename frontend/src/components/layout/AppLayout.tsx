import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileBottomNav from './MobileBottomNav';
import { NavStatusDrawer } from '../navigation/NavStatusDrawer';
import { useNavigationWebSocket } from '../../hooks/useNavigationWebSocket';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { Menu } from 'lucide-react';

// Full-bleed map pages that take over the complete viewport
const mapPages = ['/app', '/app/map', '/app/tunnel'];

export default function AppLayout() {
  const sessionId = useNavigationStore((s) => s.state.session_id);
  useNavigationWebSocket(sessionId);
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isMapPage = mapPages.includes(location.pathname);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-900 flex">
      {/* Floating Menu Drawer Backdrop (when open) */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 animate-in fade-in duration-200"
        />
      )}

      {/* Slide-out Navigation Drawer */}
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 transform transition-transform duration-300 ease-out ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        } ${!isMapPage ? 'md:relative md:translate-x-0' : ''}`}
      >
        <Sidebar onClose={() => setDrawerOpen(false)} isDrawer={isMapPage} />
      </div>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
        {/* On secondary pages, render the topbar */}
        {!isMapPage && (
          <div className="shrink-0 z-20">
            <Topbar onMenuClick={() => setDrawerOpen(true)} />
          </div>
        )}

        {/* Floating Menu Trigger Button on Map Pages */}
        {isMapPage && location.pathname !== '/app/tunnel' && (
          <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-30 flex items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              title="Open menu"
              className="w-11 h-11 bg-white hover:bg-canvas-softer text-ink rounded-full shadow-nav-floating border border-border-clean transition-all flex items-center justify-center cursor-pointer select-none active:scale-[0.97]"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <main
          className={`flex-1 w-full h-full relative ${
            isMapPage
              ? 'p-0 overflow-hidden'
              : 'p-4 md:p-6 pb-20 md:pb-6 overflow-y-auto bg-slate-50'
          }`}
        >
          <Outlet />
        </main>

        {/* Mobile Bottom Nav Bar (renders across all views on small screens) */}
        <MobileBottomNav />
      </div>

      {/* Global Viewport Navigation Status Drawer Overlay */}
      <NavStatusDrawer />
    </div>
  );
}
