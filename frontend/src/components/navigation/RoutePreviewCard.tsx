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
  Zap,
  AlertCircle,
  RotateCw,
} from 'lucide-react';
import { clsx } from 'clsx';

interface RoutePreviewCardProps {
  onStart?: () => void;
  onFitRoute?: () => void;
  className?: string;
}

export const RoutePreviewCard: React.FC<RoutePreviewCardProps> = ({
  onStart,
  onFitRoute,
  className,
}) => {
  const isLive = useNavigationStore((s) => s.isLive);
  const sessionStatus = useNavigationStore((s) => s.sessionStatus);
  const errorMessage = useNavigationStore((s) => s.errorMessage);
  const setErrorMessage = useNavigationStore((s) => s.setErrorMessage);
  const source = useNavigationStore((s) => s.source);
  const destination = useNavigationStore((s) => s.destination);
  const setSource = useNavigationStore((s) => s.setSource);
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
      routeService.calculateRoutes(destination.coordinates, newMode, source?.coordinates);
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
          originCoordinates: selectedRoute?.origin || source?.coordinates,
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
      let sourceName = source?.name?.trim() || useLocationStore.getState().placeName?.trim();
      if (!sourceName || sourceName === 'Start location' || sourceName === 'Unknown location' || sourceName === 'Your location') {
        sourceName = undefined;
      }

      await sessionLifecycle.startLiveSession(vehicleType, routeGeometry, roadName, {
        sourceName: sourceName,
        destinationName: destName,
        sourceCoords: source?.coordinates || activeSelectedRoute?.origin,
        destinationCoords: destination?.coordinates || activeSelectedRoute?.destination,
        roadSummary: activeSelectedRoute?.summary || roadName,
        distance_meters: activeSelectedRoute?.distance_meters,
        duration_seconds: activeSelectedRoute?.duration_seconds,
        travelMode: travelMode,
      });
    } catch (err: any) {
      console.warn('[RoutePreviewCard] Navigation start notice:', err?.message || err);
      // State is already set to ERROR and errorMessage populated by sessionLifecycle
    }
  };

  const handleCancel = () => {
    setSource(null);
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
        return <CarFront className="w-3.5 h-3.5 shrink-0" />;
      case 'motorcycle':
        return <Bike className="w-3.5 h-3.5 shrink-0" />;
      case 'cycling':
        return <Bike className="w-3.5 h-3.5 shrink-0" />;
      case 'walking':
        return <Footprints className="w-3.5 h-3.5 shrink-0" />;
    }
  };

  return (
    <div
      className={clsx(
        'w-full bg-white/98 backdrop-blur-md rounded-2xl p-3.5 sm:p-4 shadow-[0_6px_24px_rgba(8,51,53,0.08)] border border-[#E2E8E7] select-none animate-in fade-in duration-150 flex flex-col gap-2.5 max-h-[calc(100dvh-130px)] sm:max-h-[68dvh] overflow-hidden font-body',
        className
      )}
    >
      {/* Mobile Drag Handle */}
      <div className="w-8 h-1 bg-slate-200 rounded-full mx-auto -mt-1 sm:hidden shrink-0" />

      {/* 1. Header: Eyebrow + Destination Title + Actions */}
      <div className="flex items-start justify-between gap-2 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6F7F7D] uppercase tracking-[0.08em] font-heading leading-none">
            <span>ROUTE PREVIEW</span>
            {selectedRoute?.isFastest && (
              <>
                <span>•</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                  <Zap className="w-2.5 h-2.5 inline fill-emerald-600" />
                  Fastest
                </span>
              </>
            )}
          </div>

          <h3 className="font-bold text-[#083335] text-base sm:text-lg truncate mt-0.5 font-heading leading-tight">
            {destination.name}
          </h3>

          {selectedRoute && (
            <div className="text-xs text-[#4A6364] mt-0.5 flex items-center gap-1.5 truncate">
              <span className="font-semibold text-[#083335]">
                {formatDuration(selectedRoute.duration_seconds)}
              </span>
              <span>•</span>
              <span>{formatDistance(selectedRoute.distance_meters)}</span>
              {selectedRoute.summary && (
                <>
                  <span>•</span>
                  <span className="truncate">{selectedRoute.summary}</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          {/* Fit Route Camera Button */}
          {onFitRoute && (
            <button
              type="button"
              onClick={onFitRoute}
              aria-label="Fit route to map"
              title="Fit route to map"
              className="w-7.5 h-7.5 rounded-full bg-[#F5F8F7] hover:bg-[#EAF0F0] text-[#6F7F7D] hover:text-[#083335] transition-all flex items-center justify-center cursor-pointer select-none active:scale-95"
            >
              <Navigation2 className="w-3.5 h-3.5 rotate-45" />
            </button>
          )}

          {/* Save Route Action Button */}
          <button
            type="button"
            onClick={handleToggleSave}
            aria-label={isSaved ? 'Remove saved route' : 'Save route'}
            title={isSaved ? 'Remove saved route' : 'Save route'}
            className={clsx(
              'w-7.5 h-7.5 rounded-full border transition-all flex items-center justify-center cursor-pointer select-none active:scale-95',
              isSaved
                ? 'bg-[#EAF0F0] text-[#083335] border-[#083335]/30 shadow-2xs'
                : 'bg-white text-[#6F7F7D] border-[#E2E8E7] hover:bg-[#F5F8F7] hover:text-[#083335]'
            )}
          >
            {isSaved ? (
              <BookmarkCheck className="w-3.5 h-3.5 text-[#083335] shrink-0" />
            ) : (
              <Bookmark className="w-3.5 h-3.5 shrink-0" />
            )}
          </button>

          {/* Close Action Button */}
          <button
            type="button"
            onClick={handleCancel}
            aria-label="Cancel route preview"
            title="Cancel route preview"
            className="w-7.5 h-7.5 rounded-full bg-[#F5F8F7] hover:bg-[#EAF0F0] text-[#6F7F7D] hover:text-[#083335] transition-colors flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Optional Feedback Toast */}
      {toastMessage && (
        <div className="text-[11px] font-medium text-[#083335] bg-[#EAF0F0] border border-[#083335]/20 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 animate-in fade-in duration-150 shrink-0">
          <Check className="w-3 h-3 text-[#083335] shrink-0 stroke-[2.5]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. Compact Travel Mode Selector (Segmented Bar) */}
      <div className="flex items-center p-0.5 bg-[#F0F4F4] rounded-xl border border-[#E2EBEB] shrink-0">
        {TRAVEL_MODES.map((mode) => {
          const isSelected = travelMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => handleModeChange(mode.id)}
              aria-label={`Travel mode: ${mode.label}`}
              className={clsx(
                'flex-1 h-7.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer select-none font-medium',
                isSelected
                  ? 'bg-white text-[#083335] font-semibold shadow-2xs'
                  : 'text-[#6F7F7D] hover:text-[#083335]'
              )}
            >
              {getModeIcon(mode.id)}
              <span className="truncate text-[11px]">{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Compact Route Options Rows */}
      <div className="space-y-1 overflow-y-auto pr-0.5 max-h-[160px] hide-scrollbar flex-1 min-h-[50px]">
        {isLoadingRoutes ? (
          <div className="py-5 flex flex-col items-center justify-center gap-1.5 text-[#6F7F7D] text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-[#083335]" />
            <span>Finding best routes...</span>
          </div>
        ) : routeError ? (
          <div className="py-3 text-center text-xs text-rose-600 bg-rose-50 rounded-xl p-2 border border-rose-200">
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
                  'w-full text-left px-2.5 py-2 rounded-xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer select-none active:scale-[0.99]',
                  isSelected
                    ? 'border-[#083335]/30 bg-[#F0F5F5] shadow-2xs'
                    : 'border-transparent hover:bg-[#F8FAFA] hover:border-[#E2E8E7]'
                )}
              >
                <div className="min-w-0 flex-1">
                  {/* Primary Metric Line */}
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[14px] font-bold text-[#083335] leading-tight font-heading">
                      {formatDuration(route.duration_seconds)}
                    </span>
                    <span className="text-xs text-[#6F7F7D] font-medium">
                      • {formatDistance(route.distance_meters)}
                    </span>
                    {route.isFastest && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-1 py-0.2 rounded font-heading ml-auto">
                        Fastest
                      </span>
                    )}
                  </div>

                  {/* Road / Via Summary */}
                  <p className="text-[11px] text-[#4A6364] truncate mt-0.5">
                    {route.summary ? `Via ${route.summary}` : (idx === 0 ? 'Main Highway Route' : `Alternative route ${idx + 1}`)}
                  </p>
                </div>

                {/* Radio Selection Indicator */}
                <div className="shrink-0 pl-1">
                  {isSelected ? (
                    <div className="w-4 h-4 rounded-full bg-[#083335] text-white flex items-center justify-center shadow-2xs">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 bg-white" />
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className="py-3 text-center text-xs text-[#6F7F7D]">
            No route available.
          </div>
        )}
      </div>

      {/* 4. Error banner when navigation server unavailable */}
      {errorMessage && (
        <div className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2 animate-in fade-in shrink-0">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-tight">{errorMessage}</p>
            <p className="text-[11px] text-amber-700 mt-0.5">Route preview remains ready. Tap Retry to connect.</p>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-amber-500 hover:text-amber-800 p-0.5 rounded cursor-pointer"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 5. Dominant Action Buttons */}
      <div className="pt-2 border-t border-[#E2E8E7] flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleCancel}
          className="h-10 px-3 text-[#6F7F7D] hover:text-[#083335] hover:bg-[#F5F8F7] rounded-xl text-xs font-semibold transition-colors cursor-pointer select-none active:scale-[0.98]"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleStartDrive}
          disabled={sessionStatus === 'STARTING' || availableRoutes.length === 0 || isLoadingRoutes}
          className="flex-1 h-10 bg-[#083335] hover:bg-[#052426] active:bg-[#031718] disabled:bg-neutral-300 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(8,51,53,0.18)] transition-all cursor-pointer select-none active:scale-[0.98]"
        >
          {sessionStatus === 'STARTING' ? (
            <>
              <Loader2 className="w-4 h-4 text-white animate-spin shrink-0" />
              <span>Starting...</span>
            </>
          ) : sessionStatus === 'ERROR' ? (
            <>
              <RotateCw className="w-4 h-4 text-white shrink-0" />
              <span>Retry navigation</span>
            </>
          ) : (
            <>
              <Navigation2 className="w-4 h-4 fill-white text-white rotate-45 shrink-0" />
              <span>Start navigation</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};



