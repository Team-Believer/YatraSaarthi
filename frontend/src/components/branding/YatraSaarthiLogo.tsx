import React from 'react';
import { clsx } from 'clsx';
import logoAsset from '../../assets/yatrasaarthi-logo.png';

export interface YatraSaarthiLogoProps {
  variant?: 'full' | 'compact' | 'icon' | 'mark' | 'auth';
  className?: string;
  height?: number | string;
  showText?: boolean;
}

export const YatraSaarthiLogo: React.FC<YatraSaarthiLogoProps> = ({
  variant = 'full',
  className,
  height,
  showText = false,
}) => {
  // Sizing maps
  const heightClasses = {
    icon: 'h-8 sm:h-9 w-auto',
    mark: 'h-9 sm:h-10 w-auto',
    compact: 'h-11 sm:h-13 w-auto max-h-[56px]',
    full: 'h-13 sm:h-15 w-auto max-h-[64px]',
    auth: 'h-24 sm:h-32 w-auto max-h-[140px]',
  };

  const selectedHeightClass = height ? undefined : heightClasses[variant];

  return (
    <div className={clsx('flex items-center gap-3 select-none shrink-0', className)}>
      <img
        src={logoAsset}
        alt="YatraSaarthi"
        className={clsx(
          'object-contain transition-transform duration-200 shrink-0',
          selectedHeightClass
        )}
        style={height ? { height: typeof height === 'number' ? `${height}px` : height } : undefined}
        loading="eager"
      />
      {showText && (
        <div className="flex flex-col min-w-0">
          <span className="text-base sm:text-lg font-bold text-ink tracking-tight leading-tight">
            YatraSaarthi
          </span>
          <span className="text-[10px] text-ink-body font-medium leading-tight tracking-wider uppercase truncate">
            Intelligent Navigation
          </span>
        </div>
      )}
    </div>
  );
};

export default YatraSaarthiLogo;
