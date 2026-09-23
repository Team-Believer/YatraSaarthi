import React from 'react';
import { useResolvedHeading } from '../../hooks/useResolvedHeading';
import { Compass } from 'lucide-react';
import { clsx } from 'clsx';

interface HeadingDisplayProps {
  compact?: boolean;
  className?: string;
}

export const HeadingDisplay: React.FC<HeadingDisplayProps> = ({
  compact = false,
  className,
}) => {
  const { headingDeg, cardinal, valid } = useResolvedHeading();

  if (compact) {
    return (
      <div className={clsx('flex items-center gap-1.5 select-none text-ink shrink-0', className)}>
        <Compass
          className="w-4 h-4 text-ink transition-transform duration-300 shrink-0"
          style={{ transform: valid && headingDeg !== null ? `rotate(${headingDeg}deg)` : undefined }}
        />
        {valid && headingDeg !== null ? (
          <span className="text-sm sm:text-base font-semibold font-sans tabular-nums text-ink">
            {headingDeg}°{cardinal ? ` ${cardinal}` : ''}
          </span>
        ) : (
          <span className="text-sm sm:text-base font-medium text-ink-mute font-sans">
            —
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={clsx('flex items-center gap-1.5 select-none text-ink shrink-0', className)}>
      <Compass
        className="w-4 h-4 text-ink transition-transform duration-300 shrink-0"
        style={{ transform: valid && headingDeg !== null ? `rotate(${headingDeg}deg)` : undefined }}
      />
      {valid && headingDeg !== null ? (
        <span className="text-base sm:text-[17px] font-semibold font-sans tabular-nums text-ink">
          {headingDeg}°{cardinal ? ` ${cardinal}` : ''}
        </span>
      ) : (
        <span className="text-base sm:text-[17px] font-medium text-ink-mute font-sans">
          —
        </span>
      )}
    </div>
  );
};

