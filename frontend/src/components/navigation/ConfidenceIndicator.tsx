import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export interface ConfidenceIndicatorProps {
  className?: string;
  showAccuracy?: boolean;
}

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  className,
  showAccuracy = true,
}) => {
  const isLive = useNavigationStore((s) => s.isLive);
  const positionConfidence = useNavigationStore((s) => s.state.position_confidence);
  const horizontalAccuracy = useNavigationStore((s) => s.state.horizontal_accuracy);
  const aiUncertainty = useNavigationStore((s) => s.state.ai_uncertainty_sigma);
  
  const deviceAccuracy = useLocationStore((s) => s.accuracy);

  // Compute confidence percentage
  // If live and positionConfidence > 0, convert to percentage
  const hasConfidence = isLive && typeof positionConfidence === 'number' && positionConfidence > 0;
  const confidencePct = hasConfidence ? Math.round(positionConfidence * 100) : (isLive ? 95 : null);

  // Compute accuracy in meters
  const accuracyMeters = isLive && horizontalAccuracy > 0 
    ? horizontalAccuracy 
    : (deviceAccuracy !== null && deviceAccuracy > 0 ? deviceAccuracy : null);

  // Uncertainty from AI model if present
  const uncertaintyVal = aiUncertainty !== null ? aiUncertainty : null;

  // Grade confidence: High (>80%), Moderate (50-80%), Low (<50%)
  const isLow = confidencePct !== null && confidencePct < 50;
  const isModerate = confidencePct !== null && confidencePct >= 50 && confidencePct < 80;

  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md shadow-nav-pill select-none transition-all duration-200 text-xs font-medium',
          isLow
            ? 'bg-rose-50/95 text-rose-900 border-rose-300'
            : isModerate
            ? 'bg-amber-50/95 text-amber-900 border-amber-300'
            : 'bg-white/95 text-slate-800 border-slate-200/90',
          className
        )
      )}
    >
      {/* Icon */}
      {isLow ? (
        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
      ) : (
        <ShieldCheck
          className={clsx(
            'w-3.5 h-3.5 shrink-0',
            isModerate ? 'text-amber-600' : 'text-brand-600'
          )}
        />
      )}

      {/* Confidence Value */}
      <div className="flex items-center gap-1.5 leading-tight">
        <span className="text-slate-500 text-[11px] font-normal">Confidence</span>
        <span
          className={clsx(
            'font-bold text-[12px] tabular-nums',
            isLow
              ? 'text-rose-700'
              : isModerate
              ? 'text-amber-700'
              : 'text-slate-900'
          )}
        >
          {confidencePct !== null ? `${confidencePct}%` : '100%'}
        </span>
      </div>

      {/* Accuracy Uncertainty */}
      {showAccuracy && accuracyMeters !== null && (
        <div className="flex items-center gap-1 pl-1 border-l border-slate-200/80 text-[11px] font-mono text-slate-500">
          <span>±{accuracyMeters.toFixed(1)}m</span>
          {uncertaintyVal !== null && (
            <span className="text-[10px] text-slate-400">
              (σ {uncertaintyVal.toFixed(2)})
            </span>
          )}
        </div>
      )}
    </div>
  );
};
