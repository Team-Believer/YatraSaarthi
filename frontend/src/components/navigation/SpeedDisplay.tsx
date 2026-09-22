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
        <span className="text-2xl md:text-[32px] font-bold font-sans text-ink tabular-nums leading-none tracking-tight">
          {speedKmh}
        </span>
        <span className="text-xs md:text-sm font-normal text-ink-mute lowercase">
          km/h
        </span>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex items-baseline gap-1.5 shrink-0 select-none',
        className
      )}
    >
      <span className="text-3xl md:text-[36px] font-bold font-sans tracking-tight tabular-nums leading-none text-ink">
        {speedKmh}
      </span>
      <span className="text-xs md:text-sm font-normal text-ink-mute lowercase">
        km/h
      </span>
    </div>
  );
};

