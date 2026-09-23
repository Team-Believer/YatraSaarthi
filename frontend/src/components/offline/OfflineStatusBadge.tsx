import React from 'react';
import { Wifi, WifiOff, Satellite, Navigation, ServerOff } from 'lucide-react';
import { useSystemState } from '../../hooks/useSystemState';

export const OfflineStatusBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { networkState, gnssState, engineState } = useSystemState();

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] font-medium">
        {networkState === 'ONLINE' ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-400">
            <Wifi className="h-3 w-3" /> Net
          </span>
        ) : networkState === 'OFFLINE' ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-500/15 px-1.5 py-0.5 text-slate-700 dark:text-slate-300">
            <WifiOff className="h-3 w-3 text-slate-500" /> Offline
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-amber-700 dark:text-amber-400">
            <ServerOff className="h-3 w-3 text-amber-500" /> Server Off
          </span>
        )}

        {gnssState === 'AVAILABLE' ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-emerald-600 dark:text-emerald-400">
            <Satellite className="h-3 w-3" /> GNSS
          </span>
        ) : gnssState === 'DEGRADED' ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-amber-700 dark:text-amber-400">
            <Satellite className="h-3 w-3 text-amber-500" /> Weak GNSS
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-1.5 py-0.5 text-rose-700 dark:text-rose-400">
            <Satellite className="h-3 w-3 text-rose-500" /> GNSS Lost
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-1.5 text-xs backdrop-blur-md">
      {/* Network Status */}
      <div className="flex items-center gap-1.5">
        {networkState === 'ONLINE' ? (
          <>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Online</span>
          </>
        ) : networkState === 'OFFLINE' ? (
          <>
            <span className="h-2 w-2 rounded-full bg-slate-400" />
            <span className="font-semibold text-muted-foreground">Network Offline</span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="font-semibold text-amber-600 dark:text-amber-400">Backend Unavailable</span>
          </>
        )}
      </div>

      <span className="text-muted-foreground/30">•</span>

      {/* GNSS Status */}
      <div className="flex items-center gap-1.5">
        {gnssState === 'AVAILABLE' ? (
          <span className="text-foreground/80">GNSS Fixed</span>
        ) : gnssState === 'DEGRADED' ? (
          <span className="text-amber-600 dark:text-amber-400">GNSS Degraded</span>
        ) : (
          <span className="text-rose-600 dark:text-rose-400">GNSS Lost (DR Active)</span>
        )}
      </div>

      <span className="text-muted-foreground/30">•</span>

      {/* Engine Status */}
      <div className="flex items-center gap-1.5">
        <Navigation className="h-3 w-3 text-primary" />
        <span className="text-foreground/80">
          {engineState === 'GNSS_AIDED'
            ? 'GNSS-Aided'
            : engineState === 'DEAD_RECKONING_SERVER'
            ? 'Server DR (InEKF+E5)'
            : engineState === 'LOCAL_OFFLINE_ENGINE'
            ? 'Local Offline Logging'
            : 'Engine Idle'}
        </span>
      </div>
    </div>
  );
};
