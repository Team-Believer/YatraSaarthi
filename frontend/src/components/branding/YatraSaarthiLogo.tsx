import React from 'react';
import { clsx } from 'clsx';

export interface YatraSaarthiLogoProps {
  variant?: 'full' | 'compact' | 'icon' | 'auth';
  className?: string;
  height?: number | string;
  showTagline?: boolean;
}

export const YatraSaarthiLogo: React.FC<YatraSaarthiLogoProps> = ({
  variant = 'full',
  className,
  height,
}) => {
  // Sizing maps
  const heightClasses = {
    icon: 'h-8 sm:h-9 w-auto',
    compact: 'h-9 sm:h-10 w-auto',
    full: 'h-11 sm:h-13 w-auto',
    auth: 'h-24 sm:h-28 w-auto',
  };

  const selectedHeightClass = height ? undefined : heightClasses[variant];

  return (
    <div className={clsx('flex items-center select-none shrink-0', className)}>
      <img
        src="/branding/yatrasaarthi-logo.png"
        alt="YatraSaarthi - Beyond GPS. Always With You."
        className={clsx(
          'object-contain transition-transform duration-200',
          selectedHeightClass
        )}
        style={height ? { height: typeof height === 'number' ? `${height}px` : height } : undefined}
        loading="eager"
      />
    </div>
  );
};

export default YatraSaarthiLogo;
