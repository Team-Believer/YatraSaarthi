import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { ShieldCheck, AlertCircle, ShieldAlert } from 'lucide-react';

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

  // Compute confidence percentage ONLY from real verified telemetry
  const hasConfidence = isLive && typeof positionConfidence === 'number' && positionConfidence > 0;
  const confidencePct = hasConfidence ? Math.round(positionConfidence * 100) : null;

  // Compute accuracy in meters ONLY from real telemetry or verified device accuracy
  const accuracyMeters = isLive && typeof horizontalAccuracy === 'number' && horizontalAccuracy > 0 
    ? horizontalAccuracy 
    : (deviceAccuracy !== null && deviceAccuracy > 0 ? deviceAccuracy : null);

  const uncertaintyVal = aiUncertainty !== null && typeof aiUncertainty === 'number' ? aiUncertainty : null;

  // Grade confidence: High (>=80%), Moderate (50-79%), Low (<50%)
  const isLow = confidencePct !== null && confidencePct < 50;
  const isModerate = confidencePct !== null && confidencePct >= 50 && confidencePct < 80;

  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-ink border border-border-clean shadow-nav-pill select-none text-xs font-medium',
          className
        )
      )}
    >
      {/* Icon */}
      {isLow ? (
        <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
      ) : isModerate ? (
        <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
      ) : (
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
      )}

      {/* Confidence Value */}
      <div className="flex items-center gap-1.5 leading-tight">
        <span className="text-ink-body text-xs font-normal">Confidence</span>
        <span
          className={clsx(
            'font-semibold text-xs tabular-nums',
            isLow
              ? 'text-rose-600'
              : isModerate
              ? 'text-amber-600'
              : 'text-ink'
          )}
        >
          {confidencePct !== null ? `${confidencePct}%` : isLive ? 'Estimating' : 'Ready'}
        </span>
      </div>

      {/* Accuracy Uncertainty (only if real value exists) */}
      {showAccuracy && accuracyMeters !== null && (
        <div className="flex items-center gap-1 pl-2 border-l border-border-clean text-[11px] font-mono text-ink-body">
          <span>±{accuracyMeters.toFixed(1)}m</span>
          {uncertaintyVal !== null && (
            <span className="text-[10px] text-ink-mute">
              (σ {uncertaintyVal.toFixed(2)})
            </span>
          )}
        </div>
      )}
    </div>
  );
};
