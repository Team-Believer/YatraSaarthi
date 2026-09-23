import React, { useState, useEffect, useMemo } from 'react';
import { useNavigationStore } from '../../stores/useNavigationStore';
import { useRouteStore, type TravelMode } from '../../stores/useRouteStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { routeService, TRAVEL_MODES } from '../../services/navigation/routeService';
import { savedRouteService, type SavedPlaceItem } from '../../services/navigation/savedRouteService';
import { sessionLifecycle } from '../../services/navigation/sessionLifecycle';
import {
  Navigation2,
  X,
  CarFront,
  Bike,
  Footprints,
  Loader2,
  Check,
  Bookmark,
  BookmarkCheck,
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

  const [savedItems, setSavedItems] = useState<SavedPlaceItem[]>(() => {
    return savedRouteService.getSavedItems();
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync with savedRouteService updates
  useEffect(() => {
    const unsubscribe = savedRouteService.subscribe((items) => {
      setSavedItems(items);
    });
    return unsubscribe;
  }, []);

  // Clear toast after timeout
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 2500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Determine if the CURRENTLY SELECTED route is saved
  const selectedRoute = availableRoutes[selectedRouteIndex] || availableRoutes[0];
  const savedMatchingItem = useMemo(() => {
    if (!destination?.coordinates) return null;
    const routeGeometry = (selectedRoute?.geometry || (selectedRoute as any)?.geometry_coords) || undefined;
    const routeSummary = selectedRoute?.summary;
    return savedRouteService.findMatchingRoute(destination.coordinates, routeGeometry, routeSummary, savedItems);
  }, [destination, selectedRoute, savedItems]);

  const isSaved = !!savedMatchingItem;

  // Render ONLY during route preview (destination selected, but navigation not live)
  if (isLive || !destination) return null;

  const handleModeChange = (newMode: TravelMode) => {
    if (newMode === travelMode && availableRoutes.length > 0) return;
    setTravelMode(newMode);
    if (destination.coordinates) {
      routeService.calculateRoutes(destination.coordinates, newMode);
    }
  };

  const handleToggleSave = () => {
    if (!destination?.coordinates) return;

    try {
      if (savedMatchingItem) {
        // Unsave / remove
        savedRouteService.removeSavedItem(savedMatchingItem.id);
        setToastMessage('Route removed');
      } else {
        // Save currently selected route
        const routeGeometry = (selectedRoute?.geometry || (selectedRoute as any)?.geometry_coords) || [];
        const routeSummary = selectedRoute?.summary;
        const distance = selectedRoute?.distance_meters;
        const duration = selectedRoute?.duration_seconds;
        const address = routeSummary ? `Via ${routeSummary}` : (destination.name || 'Saved route');

        savedRouteService.saveRoute({
          name: destination.name,
          coordinates: destination.coordinates,
          originCoordinates: selectedRoute?.origin,
          address: address,
          summary: routeSummary,
          distance_meters: distance,
          duration_seconds: duration,
          geometry: routeGeometry,
          travelMode: travelMode,
          steps: selectedRoute?.steps,
        });
        setToastMessage('Route saved');
      }
    } catch (e: any) {
      console.error('Failed to update saved route:', e);
      setToastMessage('Failed to update saved route');
    }
  };

  const handleStartDrive = async () => {
    try {
      if (onStart) onStart();
      const vehicleType = routeService.getVehicleTypeForMode(travelMode);
      const activeSelectedRoute = availableRoutes[selectedRouteIndex] || availableRoutes[0];
      const routeGeometry = (activeSelectedRoute?.geometry || (activeSelectedRoute as any)?.geometry_coords) || null;
      const roadName = activeSelectedRoute?.summary || destination?.name || 'Active Route';

      // 1. Destination name resolution
      const destName = destination?.name?.trim() || roadName;

      // 2. Source name resolution
      let sourceName = useLocationStore.getState().placeName?.trim();
      if (!sourceName || sourceName === 'Start location' || sourceName === 'Unknown location') {
        sourceName = undefined;
      }

      await sessionLifecycle.startLiveSession(vehicleType, routeGeometry, roadName, {
        sourceName: sourceName,
        destinationName: destName,
        sourceCoords: activeSelectedRoute?.origin,
        destinationCoords: destination?.coordinates || activeSelectedRoute?.destination,
        roadSummary: activeSelectedRoute?.summary || roadName,
        distance_meters: activeSelectedRoute?.distance_meters,
        duration_seconds: activeSelectedRoute?.duration_seconds,
        travelMode: travelMode,
      });
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
        'w-full max-w-[440px] bg-white rounded-2xl p-4 sm:p-5 shadow-nav-sheet border border-border-clean select-none animate-in fade-in duration-150 flex flex-col gap-3.5 max-h-[75dvh]',
        className
      )}
    >
      {/* Mobile Drag Indicator Handle */}
      <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto -mt-1 sm:hidden shrink-0" />

      {/* 1. Header: Eyebrow + Destination Name + Actions */}
      <div className="flex items-start justify-between gap-3 font-body shrink-0">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] font-bold text-ink-mute uppercase tracking-wider block leading-none">
            Route preview
          </span>
          <h3 className="font-bold text-ink text-lg sm:text-xl truncate mt-1 font-heading">
            {destination.name}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Save Route Action Button */}
          <div className="relative group">
            <button
              type="button"
              onClick={handleToggleSave}
              aria-label={isSaved ? 'Remove saved route' : 'Save route'}
              title={isSaved ? 'Remove saved route' : 'Save route'}
              className={clsx(
                'w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] min-h-[36px] rounded-full border transition-all flex items-center justify-center cursor-pointer select-none active:scale-[0.95]',
                isSaved
                  ? 'bg-[#EAF0F0] text-ink border-[#083335]/30 shadow-2xs hover:bg-[#DCE6E6]'
                  : 'bg-white text-ink-body border-border-clean hover:bg-canvas-soft hover:text-ink hover:border-[#083335]/30'
              )}
            >
              {isSaved ? (
                <BookmarkCheck className="w-4 h-4 text-ink shrink-0" />
              ) : (
                <Bookmark className="w-4 h-4 shrink-0" />
              )}
            </button>

            {/* Hover Tooltip */}
            <div className="hidden md:block absolute right-0 top-full mt-1.5 px-2.5 py-1 bg-white border border-border-clean text-ink text-xs font-medium rounded-lg shadow-nav-floating whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-150 pointer-events-none z-50">
              {isSaved ? 'Remove saved route' : 'Save route'}
            </div>
          </div>

          {/* Close Action Button */}
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Cancel route preview"
            title="Cancel route preview"
            className="w-9 h-9 sm:w-8 sm:h-8 min-w-[36px] min-h-[36px] rounded-full bg-canvas-soft hover:bg-surface-pressed text-ink-mute hover:text-ink transition-colors flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Optional Feedback Toast */}
      {toastMessage && (
        <div className="text-xs font-medium text-slate-800 bg-[#F7F7F7] border border-border-clean px-3 py-1.5 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-150 shrink-0">
          <Check className="w-3.5 h-3.5 text-ink shrink-0 stroke-[2.5]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. Travel Mode Selector (with visible text labels & >=44px target) */}
      <div className="grid grid-cols-4 gap-2 shrink-0">
        {TRAVEL_MODES.map((mode) => {
          const isSelected = travelMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => handleModeChange(mode.id)}
              aria-label={`Travel mode: ${mode.label}`}
              className={clsx(
                'h-11 px-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none active:scale-[0.97] border font-body',
                isSelected
                  ? 'bg-[#EAF0F0] text-ink font-semibold border-[#083335]/30 shadow-2xs'
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
      <div className="space-y-2 overflow-y-auto pr-0.5 hide-scrollbar flex-1 min-h-[70px]">
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
                    ? 'border-[#083335] bg-[#EAF0F0] shadow-2xs'
                    : 'border-border-clean bg-white hover:bg-canvas-soft'
                )}
              >
                <div className="min-w-0 flex-1 font-body">
                  {/* Primary Metric Line */}
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg sm:text-xl font-bold text-ink leading-tight font-heading">
                      {formatDuration(route.duration_seconds)}
                    </span>
                    <span className="text-xs sm:text-sm text-ink-mute font-body font-medium">
                      • {formatDistance(route.distance_meters)}
                    </span>
                    {route.isFastest && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 ml-auto font-body">
                        Fastest
                      </span>
                    )}
                  </div>

                  {/* Via Street Description */}
                  <p className="text-xs text-ink-body truncate mt-1 font-body">
                    {route.summary || (idx === 0 ? 'Main route' : `Alternative route ${idx + 1}`)}
                  </p>
                </div>

                <div className="shrink-0 pl-1">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-[#083335] text-white flex items-center justify-center shadow-2xs">
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
      <div className="pt-2 border-t border-border-clean flex items-center gap-2.5 shrink-0">
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 h-11 bg-white hover:bg-canvas-soft text-ink border border-border-clean rounded-full text-xs sm:text-sm font-semibold transition-colors cursor-pointer select-none active:scale-[0.97]"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleStartDrive}
          disabled={sessionStatus === 'STARTING' || availableRoutes.length === 0 || isLoadingRoutes}
          className="flex-2 h-11 bg-[#083335] hover:bg-[#052426] active:bg-[#031718] disabled:bg-neutral-300 text-white rounded-full text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-2xs transition-colors cursor-pointer select-none active:scale-[0.97] font-body"
        >
          <Navigation2 className="w-4 h-4 fill-white text-white rotate-45 shrink-0" />
          <span>{sessionStatus === 'STARTING' ? 'Starting...' : 'Start navigation'}</span>
        </button>
      </div>
    </div>
  );
};


