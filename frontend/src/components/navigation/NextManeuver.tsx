import React from 'react';
import { useRouteStore } from '../../stores/useRouteStore';
import { useNavigationStore } from '../../stores/useNavigationStore';
import {
  CornerUpRight,
  CornerUpLeft,
  ArrowUp,
  RotateCw,
  Navigation,
} from 'lucide-react';
import { clsx } from 'clsx';

interface NextManeuverProps {
  className?: string;
}

export const NextManeuver: React.FC<NextManeuverProps> = ({ className }) => {
  const isLive = useNavigationStore((s) => s.isLive);
  const activeRoute = useRouteStore((s) => s.activeRoute);

  // ONLY render when live navigation is active AND real steps exist from the route engine
  if (!isLive || !activeRoute || !activeRoute.steps || activeRoute.steps.length === 0) {
    return null;
  }

  const step = activeRoute.steps[0];
  if (!step || !step.instruction) return null;

  const getManeuverIcon = () => {
    const text = (step.instruction || '').toLowerCase();
    const modifier = (step.modifier || '').toLowerCase();

    if (modifier.includes('right') || text.includes('right')) {
      return <CornerUpRight className="w-5 h-5 text-white" />;
    }
    if (modifier.includes('left') || text.includes('left')) {
      return <CornerUpLeft className="w-5 h-5 text-white" />;
    }
    if (modifier.includes('u-turn') || text.includes('u-turn')) {
      return <RotateCw className="w-5 h-5 text-white" />;
    }
    if (text.includes('straight') || text.includes('continue')) {
      return <ArrowUp className="w-5 h-5 text-white" />;
    }
    return <Navigation className="w-5 h-5 text-white" />;
  };

  const formattedDistance =
    step.distance_m < 1000
      ? `${Math.round(step.distance_m)} m`
      : `${(step.distance_m / 1000).toFixed(1)} km`;

  return (
    <div
      className={clsx(
        'bg-white text-ink px-4 py-3.5 rounded-2xl shadow-nav-floating border border-border-clean flex items-center gap-3.5 max-w-md w-full animate-in fade-in slide-in-from-top-2 select-none',
        className
      )}
    >
      {/* Maneuver Icon */}
      <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center shrink-0 shadow-xs">
        {getManeuverIcon()}
      </div>

      {/* Instruction & Distance */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-mute">
            Next maneuver
          </span>
          <span className="text-xs font-semibold font-mono text-ink">
            in {formattedDistance}
          </span>
        </div>
        <h4 className="font-semibold text-xs sm:text-sm text-ink truncate mt-0.5">
          {step.instruction}
        </h4>
        {step.name && step.name !== step.instruction && (
          <p className="text-[11px] text-ink-body truncate mt-0.5">
            onto {step.name}
          </p>
        )}
      </div>
    </div>
  );
};
