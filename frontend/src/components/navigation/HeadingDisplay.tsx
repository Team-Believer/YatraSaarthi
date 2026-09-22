import React from 'react';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { Compass } from 'lucide-react';
import { clsx } from 'clsx';

interface HeadingDisplayProps {
  compact?: boolean;
  className?: string;
}

const getCardinalDirection = (deg: number): string => {
  const normalized = ((deg % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return 'N';
  if (normalized >= 22.5 && normalized < 67.5) return 'NE';
  if (normalized >= 67.5 && normalized < 112.5) return 'E';
  if (normalized >= 112.5 && normalized < 157.5) return 'SE';
  if (normalized >= 157.5 && normalized < 202.5) return 'S';
  if (normalized >= 202.5 && normalized < 247.5) return 'SW';
  if (normalized >= 247.5 && normalized < 292.5) return 'W';
  return 'NW';
};

export const HeadingDisplay: React.FC<HeadingDisplayProps> = ({
  compact = false,
  className,
}) => {
  const isLive = useNavigationStore((s) => s.isLive);
  const headingDeg = useNavigationStore((s) => s.state.heading_deg);

  const headingVal = isLive && typeof headingDeg === 'number' && !isNaN(headingDeg)
    ? Math.round(headingDeg)
    : null;
  const cardinal = headingVal !== null ? getCardinalDirection(headingVal) : 'N';

  if (compact) {
    return (
      <div className={clsx('flex items-center gap-1.5 select-none text-ink', className)}>
        <Compass
          className="w-3.5 h-3.5 text-ink transition-transform duration-300 shrink-0"
          style={{ transform: `rotate(${headingVal ?? 0}deg)` }}
        />
        <span className="text-xs md:text-sm font-semibold font-mono tabular-nums">
          {headingVal !== null ? `${headingVal}°` : '---°'}
        </span>
        <span className="text-[11px] font-medium text-ink-mute">
          {cardinal}
        </span>
      </div>
    );
  }

  return (
    <div className={clsx('flex items-center gap-1.5 select-none text-ink', className)}>
      <Compass
        className="w-4 h-4 text-ink transition-transform duration-300 shrink-0"
        style={{ transform: `rotate(${headingVal ?? 0}deg)` }}
      />
      <span className="text-sm md:text-base font-semibold font-mono tabular-nums">
        {headingVal !== null ? `${headingVal}°` : '---°'}
      </span>
      <span className="text-xs font-medium text-ink-mute">
        {cardinal}
      </span>
    </div>
  );
};

