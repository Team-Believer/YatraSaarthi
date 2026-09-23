import React from 'react';
import { clsx } from 'clsx';
import logoAsset from '../../assets/yatrasaarthi-logo.png';

export interface YatraSaarthiLogoProps {
  variant?: 'full' | 'compact' | 'icon' | 'mark' | 'auth' | 'header';
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
    icon: 'h-7 sm:h-8 w-auto',
    mark: 'h-8 sm:h-9 w-auto',
    header: 'h-7 sm:h-7.5 w-auto max-h-[32px]',
    compact: 'h-9 sm:h-11 w-auto max-h-[48px]',
    full: 'h-12 sm:h-14 w-auto max-h-[60px]',
    auth: 'h-20 sm:h-28 w-auto max-h-[120px]',
  };

  const selectedHeightClass = height ? undefined : heightClasses[variant];

  return (
    <div className={clsx('flex items-center gap-2.5 select-none shrink-0', className)}>
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
        <div className="flex flex-col min-w-0 text-left">
          <span
            className={clsx(
              'font-heading font-bold text-[#083335] tracking-tight leading-tight',
              variant === 'header' ? 'text-[13px] sm:text-sm' : 'text-sm sm:text-base'
            )}
          >
            YatraSaarthi
          </span>
          <span
            className={clsx(
              'font-body text-[#4A6364] font-bold uppercase tracking-wider leading-none',
              variant === 'header' ? 'text-[8.5px] sm:text-[9px]' : 'text-[9.5px] sm:text-[10px]'
            )}
          >
            Intelligent Navigation
          </span>
        </div>
      )}
    </div>
  );
};

export default YatraSaarthiLogo;
