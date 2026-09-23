import React from 'react';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useRouteStore, type TravelMode } from '../../stores/useRouteStore';
import { routeService, TRAVEL_MODES } from '../../services/navigation/routeService';
import { sessionLifecycle } from '../../services/navigation/sessionLifecycle';
import {
  Play,
  X,
  CarFront,
  Bike,
  Footprints,
  Loader2,
  Check,
} from 'lucide-react';
import { clsx } from 'clsx';

interface RoutePreviewCardProps {
  onStart?: () => void;
  className?: string;
}

export const RoutePreviewCard: React.FC<RoutePreviewCardProps> = ({
  onStart,
  className,
}) => {
  const isLive = useNavigationStore((s) => s.isLive);
  const sessionStatus = useNavigationStore((s) => s.sessionStatus);
  const destination = useNavigationStore((s) => s.destination);
  const setDestination = useNavigationStore((s) => s.setDestination);
  const setRouteCoordinates = useNavigationStore((s) => s.setRouteCoordinates);

  const travelMode = useRouteStore((s) => s.travelMode);
  const setTravelMode = useRouteStore((s) => s.setTravelMode);
  const availableRoutes = useRouteStore((s) => s.availableRoutes);
  const selectedRouteIndex = useRouteStore((s) => s.selectedRouteIndex);
  const isLoadingRoutes = useRouteStore((s) => s.isLoadingRoutes);
  const routeError = useRouteStore((s) => s.routeError);
  const clearRoute = useRouteStore((s) => s.clearRoute);

  // Render ONLY during route preview (destination selected, but navigation not live)
  if (isLive || !destination) return null;

  const handleModeChange = (newMode: TravelMode) => {
    if (newMode === travelMode && availableRoutes.length > 0) return;
    setTravelMode(newMode);
    if (destination.coordinates) {
      routeService.calculateRoutes(destination.coordinates, newMode);
    }
  };

  const handleStartDrive = async () => {
    try {
      if (onStart) onStart();
      const vehicleType = routeService.getVehicleTypeForMode(travelMode);
      const selectedRoute = availableRoutes[selectedRouteIndex] || availableRoutes[0];
      const routeGeometry = (selectedRoute?.geometry || (selectedRoute as any)?.geometry_coords) || null;
      const roadName = selectedRoute?.summary || destination?.name || 'Active Route';

      await sessionLifecycle.startLiveSession(vehicleType, routeGeometry, roadName);
    } catch (err: any) {
      alert(err.message || 'Failed to start navigation session');
    }
  };

  const handleCancel = () => {
    setDestination(null);
    setRouteCoordinates(null);
    clearRoute();
  };

  const formatDistance = (meters: number) => {
    return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds: number) => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.round((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
    return `${Math.round(seconds / 60)} min`;
  };

  const getModeIcon = (mode: TravelMode) => {
    switch (mode) {
      case 'driving':
        return <CarFront className="w-4 h-4 shrink-0" />;
      case 'motorcycle':
        return <Bike className="w-4 h-4 shrink-0" />;
      case 'cycling':
        return <Bike className="w-4 h-4 shrink-0" />;
      case 'walking':
        return <Footprints className="w-4 h-4 shrink-0" />;
    }
  };

  return (
    <div
      className={clsx(
        'w-full max-w-[420px] bg-white rounded-2xl p-4 sm:p-5 shadow-nav-sheet border border-border-clean select-none animate-in fade-in duration-150 flex flex-col gap-3.5',
        className
      )}
    >
      {/* 1. Header: Eyebrow + Destination Name + Close X */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-bold text-ink-mute uppercase tracking-wider block leading-none">
            Route preview
          </span>
          <h3 className="font-bold text-ink text-lg sm:text-xl truncate mt-1">
            {destination.name}
          </h3>
        </div>

        <button
          type="button"
          onClick={handleCancel}
          aria-label="Cancel route preview"
          className="w-8 h-8 rounded-full bg-canvas-soft hover:bg-surface-pressed text-ink-mute hover:text-ink transition-colors flex items-center justify-center cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Travel Mode Selector (with visible text labels & >=44px target) */}
      <div className="grid grid-cols-4 gap-2">
        {TRAVEL_MODES.map((mode) => {
          const isSelected = travelMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => handleModeChange(mode.id)}
              aria-label={`Travel mode: ${mode.label}`}
              className={clsx(
                'h-11 px-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none active:scale-[0.97] border',
                isSelected
                  ? 'bg-[#F3F3F3] text-ink font-semibold border-neutral-300 shadow-2xs'
                  : 'bg-white text-ink-body border-border-clean hover:bg-canvas-soft hover:text-ink'
              )}
            >
              {getModeIcon(mode.id)}
              <span className="truncate">{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Route Options Hierarchy */}
      <div className="space-y-2 max-h-52 overflow-y-auto pr-0.5 hide-scrollbar">
        {isLoadingRoutes ? (
          <div className="py-7 flex flex-col items-center justify-center gap-2 text-ink-mute text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-ink" />
            <span>Finding best routes...</span>
          </div>
        ) : routeError ? (
          <div className="py-5 text-center text-xs text-ink-mute">
            {routeError}
          </div>
        ) : availableRoutes.length > 0 ? (
          availableRoutes.map((route, idx) => {
            const isSelected = idx === selectedRouteIndex;
            return (
              <button
                key={route.id}
                type="button"
                onClick={() => routeService.selectAlternativeRoute(idx)}
                aria-label={`Select route ${formatDuration(route.duration_seconds)}, ${formatDistance(route.distance_meters)}`}
                className={clsx(
                  'w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none active:scale-[0.99]',
                  isSelected
                    ? 'border-black bg-canvas-softer shadow-2xs'
                    : 'border-border-clean bg-white hover:bg-canvas-soft'
                )}
              >
                <div className="min-w-0 flex-1">
                  {/* Primary Metric Line */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg sm:text-xl font-bold text-ink leading-tight">
                      {formatDuration(route.duration_seconds)}
                    </span>
                    <span className="text-xs sm:text-sm text-ink-mute font-mono">
                      • {formatDistance(route.distance_meters)}
                    </span>
                    {route.isFastest && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 ml-auto">
                        Fastest
                      </span>
                    )}
                  </div>

                  {/* Via Street Description */}
                  <p className="text-xs text-ink-body truncate mt-1">
                    {route.summary || (idx === 0 ? 'Main route' : `Alternative route ${idx + 1}`)}
                  </p>
                </div>

                <div className="shrink-0 pl-1">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center shadow-2xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-border-clean" />
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className="py-4 text-center text-xs text-ink-mute">
            No route available.
          </div>
        )}
      </div>

      {/* 4. Action Buttons */}
      <div className="pt-2 border-t border-border-clean flex items-center gap-2.5">
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 h-11 bg-white hover:bg-canvas-soft text-ink border border-border-clean rounded-full text-xs sm:text-sm font-medium transition-colors cursor-pointer select-none active:scale-[0.97]"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleStartDrive}
          disabled={sessionStatus === 'STARTING' || availableRoutes.length === 0 || isLoadingRoutes}
          className="flex-2 h-11 bg-black hover:bg-neutral-800 disabled:bg-neutral-300 text-white rounded-full text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer select-none active:scale-[0.97]"
        >
          <Play className="w-3.5 h-3.5 fill-white" />
          <span>{sessionStatus === 'STARTING' ? 'Starting...' : 'Start navigation'}</span>
        </button>
      </div>
    </div>
  );
};


