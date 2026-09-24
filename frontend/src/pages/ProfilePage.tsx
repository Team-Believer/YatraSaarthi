import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import {
  User,
  Bookmark,
  Navigation2,
  BrainCircuit,
  Settings,
  Activity,
  ChevronRight,
  LogOut,
  LogIn,
  ShieldCheck,
} from 'lucide-react';
import { savedRouteService } from '../services/navigation/savedRouteService';
import { offlineStorage } from '../services/storage/offlineStorage';

const WORKSPACE_LINKS = [
  {
    label: 'Saved routes',
    path: '/app/memory',
    desc: 'Saved corridors & spatial memory',
    icon: Bookmark,
  },
  {
    label: 'Trips',
    path: '/app/history',
    desc: 'Recorded navigation sessions',
    icon: (props: { className?: string }) => <Navigation2 {...props} className="w-5 h-5 rotate-45" />,
  },
  {
    label: 'Navigation Intelligence',
    path: '/app/learning',
    desc: 'Motion intelligence and uncertainty models',
    icon: BrainCircuit,
  },
  {
    label: 'Settings',
    path: '/app/settings',
    desc: 'Vehicle and navigation preferences',
    icon: Settings,
  },
  {
    label: 'Diagnostics',
    path: '/app/diagnostics',
    desc: 'Sensor and navigation runtime health',
    icon: Activity,
  },
];

export default function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [savedCount, setSavedCount] = useState<number>(0);
  const [tripsCount, setTripsCount] = useState<number>(0);
  const [samplesCount, setSamplesCount] = useState<number>(0);

  useEffect(() => {
    // Fetch real persistent statistics from actual application services
    const items = savedRouteService.getSavedItems();
    setSavedCount(items.length);

    offlineStorage.getStorageMetrics().then((m) => {
      if (m) {
        setTripsCount(m.cachedTripsCount || m.sessionCount || 0);
        setSamplesCount(m.totalSensorSamples || 0);
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="w-full bg-[#F7F9F8] min-h-screen text-ink select-none font-sans">
      <div className="max-w-[1080px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 pb-32 md:pb-20 animate-in fade-in duration-300">
        
        {/* ========================================================================= */}
        {/* 01. PAGE HEADER                                                           */}
        {/* ========================================================================= */}
        <header className="space-y-1.5 pb-6 border-b border-slate-200/80">
          <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-bold font-display text-ink tracking-tight">
            Your navigation workspace
          </h1>
          <p className="text-xs sm:text-sm text-ink-body font-normal">
            Manage saved routes, recorded trips, and navigation system areas.
          </p>
        </header>

        {/* ========================================================================= */}
        {/* 02. SESSION & AUTH STATUS                                                 */}
        {/* ========================================================================= */}
        <section aria-label="Session status" className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            
            {/* Left: Avatar & Identity details */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#083335]/[0.06] text-[#083335] border border-[#083335]/10 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.8} />
              </div>

              <div className="min-w-0">
                {isAuthenticated && user ? (
                  <>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm sm:text-base font-bold font-display text-ink truncate">
                        {user.full_name}
                      </h2>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                        <ShieldCheck className="w-3 h-3" />
                        Verified
                      </span>
                    </div>
                    <p className="text-xs text-ink-body mt-0.5 truncate font-sans">
                      {user.email} · Telemetry synced with personal profile
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-sm sm:text-base font-bold font-display text-ink">
                      Guest session
                    </h2>
                    <p className="text-xs text-ink-body mt-0.5 font-sans leading-relaxed">
                      Telemetry is stored locally on this device.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Right: Primary Auth Action */}
            <div className="shrink-0 self-start sm:self-auto pt-1 sm:pt-0">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => logout()}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-[#083335] hover:bg-[#052426] active:bg-[#031718] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer select-none"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign in to sync</span>
                </Link>
              )}
            </div>

          </div>

          {/* Optional Data Summary (Real metadata from stores) */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-sans text-ink-body">
            <div className="flex items-center gap-1.5">
              <span className="text-ink-mute">Saved routes:</span>
              <strong className="text-ink font-mono">{savedCount}</strong>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-ink-mute">Recorded trips:</span>
              <strong className="text-ink font-mono">{tripsCount}</strong>
            </div>
            {samplesCount > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-ink-mute">Stored IMU samples:</span>
                <strong className="text-ink font-mono">{samplesCount.toLocaleString()}</strong>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-ink-mute">Storage:</span>
              <span className="text-emerald-700 font-semibold">IndexedDB Active</span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 03. NAVIGATION WORKSPACE                                                   */}
        {/* ========================================================================= */}
        <section aria-labelledby="workspace-heading" className="space-y-3">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase text-[#083335] font-sans block mb-1">
              Workspace
            </span>
            <h2 id="workspace-heading" className="text-lg sm:text-xl font-bold font-display text-ink tracking-tight">
              Navigation workspace
            </h2>
          </div>

          {/* Unified Workspace Surface */}
          <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
            {WORKSPACE_LINKS.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className="p-4 sm:px-5 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#083335]/[0.05] group-hover:bg-[#083335] group-hover:text-white text-[#083335] flex items-center justify-center shrink-0 transition-colors">
                      <Icon className="w-4.5 h-4.5" />
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold font-display text-ink group-hover:text-[#083335] transition-colors">
                        {item.label}
                      </div>
                      <p className="text-xs text-ink-body mt-0.5 truncate font-sans">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-slate-300 group-hover:text-ink group-hover:translate-x-0.5 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 04. SUBTLE FOOTER                                                         */}
        {/* ========================================================================= */}
        <footer className="pt-4 text-center text-xs text-ink-mute font-sans">
          <p>YatraSaarthi · Intelligent Navigation Workspace</p>
        </footer>

      </div>
    </div>
  );
}
