import React from 'react';
import { X, ShieldCheck, Compass, Info, CircleHelp, Cpu } from 'lucide-react';
import { YatraSaarthiLogo } from '../branding/YatraSaarthiLogo';

interface HelpAboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'help' | 'about';
}

export const HelpAboutModal: React.FC<HelpAboutModalProps> = ({
  isOpen,
  onClose,
  type,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#083335]/60 backdrop-blur-xs animate-in fade-in duration-150"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-border-clean shadow-nav-floating overflow-hidden z-10 animate-in zoom-in-95 duration-150 select-none">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border-clean flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            {type === 'help' ? (
              <CircleHelp className="w-5 h-5 text-[#083335]" />
            ) : (
              <Info className="w-5 h-5 text-[#083335]" />
            )}
            <h3 className="font-heading font-bold text-base text-ink">
              {type === 'help' ? 'Help & Navigation Guide' : 'About YatraSaarthi'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-border-clean flex items-center justify-center text-ink-body hover:text-ink transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {type === 'help' ? (
            <div className="space-y-3.5 text-xs text-ink-body font-body">
              <div className="p-3.5 rounded-2xl bg-[#F0F4F4] border border-[#E2EBEB] space-y-1">
                <div className="font-semibold text-ink font-heading text-sm flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-[#083335]" />
                  <span>Map & Follow Navigation</span>
                </div>
                <p className="leading-relaxed">
                  Search your destination in the top search bar, choose a route, and tap <strong>Start navigation</strong>. The map will automatically orient and follow your heading in 3D.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-border-clean space-y-1">
                <div className="font-semibold text-ink font-heading text-sm flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-[#083335]" />
                  <span>GNSS Outage & Dead Reckoning</span>
                </div>
                <p className="leading-relaxed">
                  In tunnels, basements, or urban canyons when satellite signals drop, YatraSaarthi seamlessly activates InEKF inertial dead reckoning with Zero Velocity and Non-Holonomic Constraints.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-border-clean space-y-1">
                <div className="font-semibold text-ink font-heading text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#083335]" />
                  <span>Diagnostics & Sensor Stream</span>
                </div>
                <p className="leading-relaxed">
                  Visit the Diagnostics screen from the More menu to inspect live IMU streaming rates, sensor biases, and E5/U2 innovation metrics.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-xs text-ink-body font-body">
              <div className="flex flex-col items-center justify-center text-center py-2">
                <YatraSaarthiLogo variant="compact" height={42} showText={true} />
                <p className="text-[11px] text-ink-mute font-medium mt-2">
                  Version 2.4.0 (Production Release)
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F0F4F4] border border-[#E2EBEB] text-center space-y-1">
                <p className="font-semibold text-[#083335] text-xs">
                  Intelligent GNSS-Denied Inertial Navigation
                </p>
                <p className="leading-relaxed text-[11.5px] text-[#4A6364]">
                  Empowered by invariant extended Kalman filtering (InEKF), vehicle motion intelligence, and smartphone sensor fusion.
                </p>
              </div>

              <div className="text-[11px] text-ink-mute text-center space-y-0.5 pt-1 border-t border-border-clean">
                <p>© 2026 YatraSaarthi Systems. All rights reserved.</p>
                <p>Designed for resilient ground vehicle navigation.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-border-clean flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#083335] text-white text-xs font-semibold hover:bg-[#052426] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
