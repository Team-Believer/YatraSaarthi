import React, { useState, useEffect } from 'react';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { Milestone, Clock } from 'lucide-react';
import { clsx } from 'clsx';

interface TripMetricsProps {
  compact?: boolean;
  className?: string;
}

export const TripMetrics: React.FC<TripMetricsProps> = ({
  compact = false,
  className,
}) => {
  const isLive = useNavigationStore((s) => s.isLive);
  const trajectory = useNavigationStore((s) => s.trajectory);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Track session duration
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isLive) {
      if (!startTime) setStartTime(Date.now());
      interval = setInterval(() => {
        if (startTime) {
          setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
        }
      }, 1000);
    } else {
      setStartTime(null);
      setElapsedSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLive, startTime]);

  if (!isLive) return null;

  // Calculate live displacement distance from trajectory points (km)
  let calculatedDistanceKm = 0;
  if (trajectory.length > 1) {
    for (let i = 1; i < trajectory.length; i++) {
      const [lon1, lat1] = trajectory[i - 1];
      const [lon2, lat2] = trajectory[i];
      const R = 6371; // Earth radius in km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      calculatedDistanceKm += R * c;
    }
  }

  // Format Elapsed Time
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins}m`;
    }
    return `${mins}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const formattedDistance =
    calculatedDistanceKm < 1
      ? `${(calculatedDistanceKm * 1000).toFixed(0)} m`
      : `${calculatedDistanceKm.toFixed(2)} km`;

  if (compact) {
    return (
      <div className={clsx('flex items-center gap-2 text-xs font-mono text-slate-700 select-none', className)}>
        <span className="font-bold">{formattedDistance}</span>
        <span className="text-slate-300">•</span>
        <span className="text-slate-500">{formatTime(elapsedSeconds)}</span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex items-center gap-3 sm:gap-5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200/70 select-none',
        className
      )}
    >
      {/* Distance */}
      <div className="flex items-center gap-2">
        <Milestone className="w-4 h-4 text-slate-400 shrink-0" />
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400 leading-none">
            Distance
          </div>
          <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono mt-0.5">
            {formattedDistance}
          </div>
        </div>
      </div>

      <div className="h-6 w-px bg-slate-200 shrink-0" />

      {/* Elapsed */}
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-slate-400 shrink-0" />
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400 leading-none">
            Elapsed
          </div>
          <div className="text-xs sm:text-sm font-bold text-slate-900 font-mono mt-0.5">
            {formatTime(elapsedSeconds)}
          </div>
        </div>
      </div>
    </div>
  );
};
