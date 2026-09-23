import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Settings,
  UserRound,
  CircleHelp,
  Info,
  X,
  ChevronRight,
  BrainCircuit,
} from 'lucide-react';

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenHelp: () => void;
  onOpenAbout: () => void;
}

export const MobileMoreSheet: React.FC<MobileMoreSheetProps> = ({
  isOpen,
  onClose,
  onOpenHelp,
  onOpenAbout,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
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
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-[#083335]/50 backdrop-blur-2xs md:hidden animate-in fade-in duration-200"
      />

      {/* Slide-Up Bottom Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-[calc(64px+env(safe-area-inset-bottom)+8px)] left-3 right-3 z-50 max-w-lg mx-auto bg-white rounded-3xl border border-border-clean shadow-nav-floating p-4 select-none md:hidden animate-in slide-in-from-bottom-5 duration-200"
      >
        {/* Drag Handle Indicator */}
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-3" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border-clean">
          <div>
            <h3 className="font-heading font-bold text-sm sm:text-base text-ink leading-tight">
              More Options
            </h3>
            <p className="font-body text-[11px] text-[#4A6364]">
              Secondary tools & system preferences
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close more options"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-ink transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options List */}
        <div className="py-2 space-y-1 font-body text-xs text-ink">
          <Link
            to="/app/diagnostics"
            onClick={onClose}
            className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl hover:bg-canvas-soft transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F0F4F4] text-[#083335] flex items-center justify-center group-hover:bg-[#083335] group-hover:text-white transition-colors">
                <Activity className="w-4.5 h-4.5" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-ink text-sm">Diagnostics</div>
                <div className="text-[11px] text-[#4A6364]">Sensors, IMU streams & InEKF gates</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-ink transition-colors" />
          </Link>

          <Link
            to="/app/learning"
            onClick={onClose}
            className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl hover:bg-canvas-soft transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F0F4F4] text-[#083335] flex items-center justify-center group-hover:bg-[#083335] group-hover:text-white transition-colors">
                <BrainCircuit className="w-4.5 h-4.5" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-ink text-sm">Navigation Intelligence</div>
                <div className="text-[11px] text-[#4A6364]">Motion models & dead reckoning design</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-ink transition-colors" />
          </Link>

          <Link
            to="/app/settings"
            onClick={onClose}
            className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl hover:bg-canvas-soft transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F0F4F4] text-[#083335] flex items-center justify-center group-hover:bg-[#083335] group-hover:text-white transition-colors">
                <Settings className="w-4.5 h-4.5" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-ink text-sm">Settings</div>
                <div className="text-[11px] text-[#4A6364]">Vehicle profiles & filter tuning</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-ink transition-colors" />
          </Link>

          <Link
            to="/app/profile"
            onClick={onClose}
            className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl hover:bg-canvas-soft transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F0F4F4] text-[#083335] flex items-center justify-center group-hover:bg-[#083335] group-hover:text-white transition-colors">
                <UserRound className="w-4.5 h-4.5" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-ink text-sm">Profile</div>
                <div className="text-[11px] text-[#4A6364]">Driver identity & saved preferences</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-ink transition-colors" />
          </Link>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenHelp();
            }}
            className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl hover:bg-canvas-soft transition-colors cursor-pointer group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F0F4F4] text-[#083335] flex items-center justify-center group-hover:bg-[#083335] group-hover:text-white transition-colors">
                <CircleHelp className="w-4.5 h-4.5" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-ink text-sm">Help & Guidance</div>
                <div className="text-[11px] text-[#4A6364]">Navigation instructions & outage tips</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-ink transition-colors" />
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAbout();
            }}
            className="w-full flex items-center justify-between px-3.5 py-3 rounded-2xl hover:bg-canvas-soft transition-colors cursor-pointer group text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#F0F4F4] text-[#083335] flex items-center justify-center group-hover:bg-[#083335] group-hover:text-white transition-colors">
                <Info className="w-4.5 h-4.5" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-ink text-sm">About YatraSaarthi</div>
                <div className="text-[11px] text-[#4A6364]">System version & engineering overview</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-ink transition-colors" />
          </button>
        </div>
      </div>
    </>
  );
};
