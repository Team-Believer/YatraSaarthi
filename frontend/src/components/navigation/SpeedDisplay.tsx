import React from 'react';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { clsx } from 'clsx';

interface SpeedDisplayProps {
  compact?: boolean;
  className?: string;
}

export const SpeedDisplay: React.FC<SpeedDisplayProps> = ({
  compact = false,
  className,
}) => {
  const isLive = useNavigationStore((s) => s.isLive);
  const rawSpeed = useNavigationStore((s) => s.state.speed);

  // Speed in km/h (m/s * 3.6)
  const speedKmh = isLive && typeof rawSpeed === 'number' && !isNaN(rawSpeed)
    ? Math.max(0, Math.round(rawSpeed * 3.6))
    : 0;

  if (compact) {
    return (
      <div className={clsx('flex items-baseline gap-1 shrink-0 select-none', className)}>
        <span className="text-xl md:text-2xl font-bold font-mono text-slate-900 tabular-nums leading-none">
          {speedKmh}
        </span>
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
          km/h
        </span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex items-baseline gap-1.5 shrink-0 bg-slate-950 text-white px-3.5 py-2 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl shadow-inner border border-slate-800 select-none',
        className
      )}
    >
      <span className="text-2xl md:text-4xl font-bold font-mono tracking-tight tabular-nums leading-none">
        {speedKmh}
      </span>
      <span className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-wide">
        km/h
      </span>
    </div>
  );
};
