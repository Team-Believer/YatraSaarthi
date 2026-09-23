import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  UserRound,
  Settings,
  Info,
  LogIn,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';

interface MobileAccountMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAbout: () => void;
}

export const MobileAccountMenu: React.FC<MobileAccountMenuProps> = ({
  isOpen,
  onClose,
  onOpenAbout,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, logout } = useAuthStore();

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Invisible backdrop for mobile touch capture */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-2xs md:hidden animate-in fade-in duration-100"
      />

      {/* Popover Card */}
      <div
        ref={menuRef}
        className="fixed top-[calc(env(safe-area-inset-top)+58px)] right-3 z-50 w-[270px] bg-white rounded-2xl border border-border-clean shadow-nav-floating p-2 select-none md:hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* User / Auth Header */}
        <div className="p-3 bg-[#F0F4F4] rounded-xl border border-[#E2EBEB] mb-2">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-[#083335] text-white flex items-center justify-center font-heading font-bold text-sm shrink-0 shadow-2xs">
                {user.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-heading font-semibold text-xs text-ink truncate leading-snug">
                  {user.full_name}
                </div>
                <div className="font-body text-[11px] text-[#4A6364] truncate">
                  {user.email || 'Authenticated User'}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-white border border-border-clean flex items-center justify-center text-ink shrink-0">
                  <UserRound className="w-4 h-4 text-[#083335]" />
                </div>
                <div className="min-w-0">
                  <div className="font-heading font-semibold text-xs text-ink truncate">Guest Driver</div>
                  <div className="font-body text-[10.5px] text-[#4A6364] truncate">Local Session</div>
                </div>
              </div>
              <Link
                to="/login"
                onClick={onClose}
                className="px-2.5 py-1 rounded-lg bg-[#083335] text-white text-xs font-semibold hover:bg-[#052426] transition-colors shrink-0 shadow-2xs inline-flex items-center gap-1 font-body"
              >
                <LogIn className="w-3 h-3" />
                <span>Sign in</span>
              </Link>
            </div>
          )}
        </div>

        {/* Menu Actions List */}
        <div className="space-y-0.5 font-body text-xs text-ink">
          <Link
            to="/app/profile"
            onClick={onClose}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-canvas-soft transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 text-ink">
              <UserRound className="w-4 h-4 text-[#083335]" />
              <span className="font-medium">Profile & Vehicle</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-ink transition-colors" />
          </Link>

          <Link
            to="/app/settings"
            onClick={onClose}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-canvas-soft transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 text-ink">
              <Settings className="w-4 h-4 text-[#083335]" />
              <span className="font-medium">Settings & Preferences</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-ink transition-colors" />
          </Link>

          <Link
            to="/app/diagnostics"
            onClick={onClose}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-canvas-soft transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 text-ink">
              <ShieldCheck className="w-4 h-4 text-[#083335]" />
              <span className="font-medium">System Diagnostics</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-ink transition-colors" />
          </Link>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAbout();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-canvas-soft transition-colors cursor-pointer group text-left"
          >
            <div className="flex items-center gap-2.5 text-ink">
              <Info className="w-4 h-4 text-[#083335]" />
              <span className="font-medium">About YatraSaarthi</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-ink transition-colors" />
          </button>
        </div>

        {/* Auth Sign Out Footer */}
        {isAuthenticated && (
          <div className="pt-1 mt-1 border-t border-border-clean">
            <button
              type="button"
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors font-body text-xs font-semibold cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
};
