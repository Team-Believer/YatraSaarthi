import React, { useState, useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useDemoOutage } from '../../hooks/useDemoOutage';
import { deriveGnssNavStatus, type GnssNavState } from '../../utils/navigation/gnssStatus';
import { ArrowRight } from 'lucide-react';

interface TimelineEvent {
  state: GnssNavState;
  shortLabel: string;
  dotColor: string;
  timestamp: number;
}

export const NavModeTimeline: React.FC<{ className?: string }> = ({ className }) => {
  const isLive = useNavigationStore((s) => s.isLive);
  const navState = useNavigationStore((s) => s.state);
  const { isSimulating: isDemoOutageActive, outageSeconds: demoOutageSeconds } = useDemoOutage();

  const [history, setHistory] = useState<TimelineEvent[]>([]);
  const prevStateRef = useRef<GnssNavState | null>(null);

  // Clear history on session end
  useEffect(() => {
    if (!isLive) {
      setHistory([]);
      prevStateRef.current = null;
    }
  }, [isLive]);

  // Record observed transitions
  useEffect(() => {
    if (!isLive) return;

    const derived = deriveGnssNavStatus({
      isLive: true,
      navigationMode: navState.navigation_mode,
      gnssAvailable: navState.gnss_available,
      gnssQuality: navState.gnss_quality,
      gnssOutageDuration: navState.gnss_outage_duration,
      environmentState: navState.environment_state,
      imuAvailable: navState.imu_available,
      isDemoOutageActive,
      demoOutageSeconds,
    });

    let shortLabel = 'GPS Strong';
    if (derived.state === 'DEAD_RECKONING') shortLabel = 'DR';
    else if (derived.state === 'GNSS_REACQUISITION') shortLabel = 'Reacquiring';
    else if (derived.state === 'GNSS_FUSING') shortLabel = 'GNSS+IMU';
    else if (derived.state === 'DEGRADED') shortLabel = 'Degraded';
    else if (derived.state === 'GNSS_ACQUIRING') shortLabel = 'Acquiring';

    if (derived.state !== prevStateRef.current) {
      prevStateRef.current = derived.state;
      setHistory((prev) => {
        const item: TimelineEvent = {
          state: derived.state,
          shortLabel,
          dotColor: derived.dotColor,
          timestamp: Date.now(),
        };
        // Keep max 5 most recent transitions
        return [...prev.slice(-4), item];
      });
    }
  }, [
    isLive,
    navState.navigation_mode,
    navState.gnss_available,
    navState.gnss_quality,
    navState.gnss_outage_duration,
    navState.environment_state,
    navState.imu_available,
    isDemoOutageActive,
    demoOutageSeconds,
  ]);

  if (!isLive || history.length === 0) return null;

  return (
    <div
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-xs border border-border-clean/80 shadow-2xs text-[10px] font-medium text-ink select-none',
        className
      )}
      title="Observed navigation mode sequence in this session"
    >
      <span className="text-[9px] font-bold uppercase tracking-wider text-ink-mute mr-0.5">
        Mode
      </span>
      {history.map((event, idx) => {
        const isCurrent = idx === history.length - 1;
        return (
          <React.Fragment key={`${event.timestamp}-${idx}`}>
            {idx > 0 && <ArrowRight className="w-2.5 h-2.5 text-ink-mute shrink-0" />}
            <span
              className={clsx(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all',
                isCurrent ? 'bg-[#083335]/8 font-semibold text-[#083335]' : 'text-ink-body opacity-70'
              )}
            >
              <span className={clsx('w-1.5 h-1.5 rounded-full shrink-0', event.dotColor)} />
              <span>{event.shortLabel}</span>
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
};
