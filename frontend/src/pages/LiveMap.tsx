import { useEffect, useState, useRef, useCallback } from 'react';
import mapboxgl, { type Map as MapboxMap } from 'mapbox-gl';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useLocationStore } from '../stores/useLocationStore';
import { useRouteStore } from '../stores/useRouteStore';
import { locationService } from '../services/location/locationService';
import { geocodingService } from '../services/location/geocodingService';
import { routeService } from '../services/navigation/routeService';
import {
  MapContainer,
  MapController,
  VehicleMarker,
  TrajectoryLayer,
  MapControls,
  DestinationSearch,
  RouteLayer,
} from '../components/map';
import type { MapOrientationMode } from '../components/map/MapController';
import { TripHudCard } from '../components/navigation/TripHudCard';
import { RoutePreviewCard } from '../components/navigation/RoutePreviewCard';
import { NextManeuver } from '../components/navigation/NextManeuver';
import { NavStatusPill } from '../components/navigation/NavStatusPill';
import { NavModeTimeline } from '../components/navigation/NavModeTimeline';
import { CalibrationModal } from '../components/navigation/CalibrationModal';
import { useResolvedHeading } from '../hooks/useResolvedHeading';
import {
  CheckCircle2,
  X,
  Radio,
} from 'lucide-react';

export default function LiveMap() {
  const mapRef = useRef<MapboxMap | null>(null);
  const [initialCentered, setInitialCentered] = useState(false);
  const [followVehicle, setFollowVehicle] = useState(true);
  const [orientationMode, setOrientationMode] = useState<MapOrientationMode>('HEADING_UP');

  const { headingDeg: resolvedHeadingDeg, valid: isHeadingValid } = useResolvedHeading();
  const activeHeading = isHeadingValid && resolvedHeadingDeg !== null ? resolvedHeadingDeg : 0;

  // Real device location from Geolocation API
  const {
    latitude: deviceLat,
    longitude: deviceLon,
    permission: locPermission,
  } = useLocationStore();

  // Map picking mode: 'source' | 'destination' | null
  const [pickingField, setPickingField] = useState<'source' | 'destination' | null>(null);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);

  // Navigation store
  const {
    isLive,
    fusedPosition,
    trajectory,
    journeySummary,
    state,
    setJourneySummary,
    source,
    destination,
    setSource,
    setDestination,
    routeCoordinates,
  } = useNavigationStore();

  // Start real browser geolocation watcher on mount
  useEffect(() => {
    locationService.startWatching();
  }, []);

  // Map click listener for Map Picking Mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !pickingField) return;

    map.getCanvas().style.cursor = 'crosshair';

    const handleMapClick = async (e: mapboxgl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      const targetField = pickingField;
      setPickingField(null);

      // Asynchronously resolve place name via geocodingService
      let placeName = `Selected location (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
      try {
        const resolved = await geocodingService.reverseGeocode(lat, lng);
        if (resolved) {
          placeName = resolved;
        }
      } catch (err) {
        console.warn('Map picking reverse geocode notice:', err);
      }

      const travelMode = useRouteStore.getState().travelMode;

      if (targetField === 'source') {
        const newSource = {
          name: placeName,
          coordinates: [lng, lat] as [number, number],
          isCurrentLocation: false,
        };
        setSource(newSource);
        if (destination?.coordinates) {
          routeService.calculateRoutes(destination.coordinates, travelMode, [lng, lat]);
        }
      } else {
        const newDest = {
          name: placeName,
          coordinates: [lng, lat] as [number, number],
        };
        setDestination(newDest);

        let originCoords: [number, number] | undefined = undefined;
        if (source?.coordinates) {
          originCoords = source.coordinates;
        } else if (deviceLon !== null && deviceLat !== null) {
          originCoords = [deviceLon, deviceLat];
        }

        if (originCoords) {
          routeService.calculateRoutes([lng, lat], travelMode, originCoords);
        }
      }
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
      map.getCanvas().style.cursor = '';
    };
  }, [pickingField, source, destination, deviceLat, deviceLon, setSource, setDestination]);

  // Calculate responsive padding for route camera framing to keep route completely unobscured
  const getResponsiveRoutePadding = useCallback(() => {
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
    if (isDesktop) {
      // Desktop: Nav Rail (72px) + Gap (16px) + Route Column (390px) + Safe Gap (20px) = ~498px
      const leftPadding = Math.max(450, Math.min(Math.round(window.innerWidth * 0.36), 520));
      return {
        top: 70,
        bottom: 60,
        left: leftPadding,
        right: 90,
      };
    } else {
      // Mobile: Route preview bottom sheet (~280px) + mobile nav
      const bottomPadding = Math.min(Math.round(window.innerHeight * 0.42), 360);
      return {
        top: 120,
        bottom: Math.max(bottomPadding, 240),
        left: 24,
        right: 24,
      };
    }
  }, []);

  // Fit bounds to route geometry with intelligent safe-area padding
  const fitRouteBounds = useCallback(() => {
    if (!routeCoordinates || routeCoordinates.length < 2 || !mapRef.current || isLive) return;

    const bounds = new mapboxgl.LngLatBounds();
    routeCoordinates.forEach((coord) => bounds.extend(coord));
    if (source?.coordinates) bounds.extend(source.coordinates);
    if (destination?.coordinates) bounds.extend(destination.coordinates);

    const padding = getResponsiveRoutePadding();
    mapRef.current.fitBounds(bounds, {
      padding,
      maxZoom: 16,
      duration: 900,
    });
  }, [routeCoordinates, source, destination, isLive, getResponsiveRoutePadding]);

  // Set initial map position once coordinates arrive
  useEffect(() => {
    if (!initialCentered && mapRef.current && deviceLat !== null && deviceLon !== null) {
      mapRef.current.setCenter([deviceLon, deviceLat]);
      mapRef.current.setZoom(15.5);
      setInitialCentered(true);
    }
  }, [deviceLat, deviceLon, initialCentered]);

  // Automatically fit bounds when route coordinates change
  useEffect(() => {
    if (routeCoordinates && routeCoordinates.length > 1 && mapRef.current && !isLive) {
      fitRouteBounds();
    }
  }, [routeCoordinates, source, destination, isLive, fitRouteBounds]);

  // Transition camera into 3D driver follow mode when navigation starts
  useEffect(() => {
    const targetLat = isLive && fusedPosition ? fusedPosition.latitude : deviceLat;
    const targetLon = isLive && fusedPosition ? fusedPosition.longitude : deviceLon;

    if (isLive && mapRef.current && targetLat !== null && targetLon !== null) {
      setFollowVehicle(true);
      mapRef.current.easeTo({
        center: [targetLon, targetLat],
        zoom: 16.5,
        pitch: 52,
        offset: [0, 70],
        bearing: orientationMode === 'HEADING_UP' ? activeHeading : 0,
        duration: 1000,
      });
    }
  }, [isLive, activeHeading]);

  // Recenter handler: restores vehicle follow and eases camera to position & heading
  const handleRecenter = useCallback(() => {
    setFollowVehicle(true);
    if (!mapRef.current) return;
    const targetLat = isLive && fusedPosition ? fusedPosition.latitude : deviceLat;
    const targetLon = isLive && fusedPosition ? fusedPosition.longitude : deviceLon;
    if (targetLat !== null && targetLon !== null) {
      const targetBearing = orientationMode === 'HEADING_UP' ? activeHeading : 0;
      mapRef.current.easeTo({
        center: [targetLon, targetLat],
        zoom: 16.5,
        bearing: targetBearing,
        pitch: 52,
        offset: [0, 70],
        duration: 800,
      });
    }
  }, [isLive, fusedPosition, deviceLat, deviceLon, orientationMode, activeHeading]);

  // Suspend follow mode when user manually interacts with map
  const handleManualInteraction = useCallback(() => {
    setFollowVehicle(false);
  }, []);

  // Toggle between Heading-Up and North-Up map orientation
  const handleOrientationToggle = useCallback((mode: MapOrientationMode) => {
    setOrientationMode(mode);
    if (mapRef.current) {
      const targetBearing = mode === 'HEADING_UP' ? activeHeading : 0;
      mapRef.current.easeTo({
        bearing: targetBearing,
        duration: 500,
      });
    }
  }, [activeHeading]);

  // Active coordinates: InEKF fused position when live, otherwise real device location
  const displayLat = isLive && fusedPosition ? fusedPosition.latitude : deviceLat;
  const displayLon = isLive && fusedPosition ? fusedPosition.longitude : deviceLon;
  const hasCoordinates = displayLat !== null && displayLon !== null;

  return (
    <div className="h-full w-full relative flex flex-col overflow-hidden bg-canvas-soft select-none font-body">
      {/* Journey Completed Banner */}
      {journeySummary && (
        <div className="absolute top-[calc(env(safe-area-inset-top)+68px)] left-3 right-3 md:left-1/2 md:-translate-x-1/2 md:w-auto z-50 bg-white text-ink px-4.5 py-3 rounded-2xl shadow-nav-floating flex items-center gap-3 animate-in fade-in border border-border-clean">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <div className="text-xs">
            <span className="font-semibold text-ink">Journey summary</span> •{' '}
            {journeySummary.distance_m
              ? `${(journeySummary.distance_m / 1000).toFixed(2)} km`
              : '0 km'}{' '}
            •{' '}
            {journeySummary.duration_s
              ? `${Math.round(journeySummary.duration_s)}s`
              : '<1s'}{' '}
            • Saved
          </div>
          <button
            type="button"
            onClick={() => setJourneySummary(null)}
            aria-label="Dismiss summary"
            className="hover:bg-canvas-soft p-1.5 rounded-full transition-colors ml-2 cursor-pointer text-ink-mute hover:text-ink"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Map Picking Mode Active Helper Banner */}
      {pickingField && (
        <div className="absolute top-[calc(env(safe-area-inset-top)+14px)] left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-auto z-50 bg-[#083335] text-white px-4 py-2.5 rounded-2xl shadow-nav-floating flex items-center gap-3 animate-in fade-in slide-in-from-top-2 border border-white/20">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <div className="text-xs font-semibold">
            Tap anywhere on map to set {pickingField === 'source' ? 'starting point' : 'destination'}
          </div>
          <button
            type="button"
            onClick={() => setPickingField(null)}
            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer ml-1"
          >
            Cancel
          </button>
        </div>
      )}

      {/* FULL-SCREEN MAP CANVAS */}
      <div className="flex-1 w-full h-full relative">
        <MapContainer
          onMapLoaded={(map) => {
            mapRef.current = map;
          }}
          className="w-full h-full"
        >
          {/* Follow camera during active navigation session */}
          <MapController
            latitude={displayLat}
            longitude={displayLon}
            heading={activeHeading}
            followVehicle={followVehicle}
            orientationMode={orientationMode}
            is3D={true}
            onManualInteraction={handleManualInteraction}
          />

          {/* Vehicle Marker */}
          {hasCoordinates && (
            <VehicleMarker
              latitude={displayLat}
              longitude={displayLon}
              heading={activeHeading}
              mode={isLive ? state.navigation_mode : 'STANDBY'}
            />
          )}

          {/* Planned Route Geometry with Source & Destination Markers */}
          {routeCoordinates && (
            <RouteLayer
              geometry={routeCoordinates}
              sourceName={source?.name}
              destinationName={destination?.name}
            />
          )}

          {/* Real-time InEKF Dead Reckoning Trajectory Track */}
          {isLive && trajectory.length > 0 && (
            <TrajectoryLayer fusedTrack={trajectory} />
          )}

          {/* Floating Right Map Controls */}
          <MapControls
            onRecenter={handleRecenter}
            onFitRoute={!isLive && routeCoordinates ? fitRouteBounds : undefined}
            onOrientationToggle={handleOrientationToggle}
            orientationMode={orientationMode}
            followVehicle={followVehicle}
            heading={activeHeading}
          />
        </MapContainer>

        {/* Acquiring Location Overlay when no GPS fix yet */}
        {!hasCoordinates && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-xs flex items-center justify-center pointer-events-none p-4 text-center z-20">
            <div className="bg-white p-6 rounded-2xl border border-border-clean shadow-nav-floating space-y-2 max-w-sm">
              <Radio className="w-6 h-6 text-ink animate-pulse mx-auto" />
              <h4 className="font-semibold text-sm text-ink">Acquiring navigation fix</h4>
              <p className="text-xs text-ink-mute">
                {locPermission === 'denied'
                  ? 'Please allow browser geolocation permissions to locate vehicle.'
                  : 'Connecting to GNSS satellites and motion sensors...'}
              </p>
            </div>
          </div>
        )}

        {/* ACTIVE NAVIGATION TOP HUD (When Live Navigation is Active) */}
        {isLive && (
          <div className="absolute top-[calc(env(safe-area-inset-top)+12px)] left-3 right-3 sm:top-5 sm:left-1/2 sm:-translate-x-1/2 sm:w-[500px] sm:max-w-[520px] z-30 pointer-events-auto flex flex-col items-center gap-2">
            {/* Top Status Strip */}
            <div className="flex items-center justify-between gap-2 w-full max-w-md px-1">
              <NavStatusPill alwaysVisible={true} showDrawerOnClick={true} />
              <NavModeTimeline />
            </div>

            {/* Primary Driving Maneuver Card */}
            <NextManeuver className="w-full" />
          </div>
        )}

        {/* PRIMARY ROUTE PLANNER (Desktop: Floating Left Safe Area; Mobile: Top Floating Bar - Only when NOT live) */}
        {!isLive && (
          <div className="absolute top-[calc(env(safe-area-inset-top)+68px)] left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-[480px] md:top-4 md:left-[96px] lg:left-[104px] md:translate-x-0 md:w-[380px] lg:w-[390px] md:max-w-[390px] z-20 pointer-events-auto flex justify-center md:justify-start">
            <DestinationSearch onPickOnMap={(field) => setPickingField(field)} />
          </div>
        )}

        {/* ROUTE PREVIEW PLANNING PANEL (Desktop: Floating Left Column below planner; Mobile: Bottom Sheet) */}
        {!isLive && destination && routeCoordinates && (
          <div className="absolute bottom-[calc(68px+env(safe-area-inset-bottom)+10px)] left-3 right-3 md:bottom-auto md:top-[96px] md:left-[96px] lg:left-[104px] z-30 pointer-events-auto w-auto md:w-[380px] lg:w-[390px] md:max-w-[390px]">
            <RoutePreviewCard
              onStart={() => setFollowVehicle(true)}
              onFitRoute={fitRouteBounds}
            />
          </div>
        )}

        {/* FLOATING BOTTOM HUD COCKPIT (Active Navigation / Standby - sits strictly above bottom nav) */}
        {(isLive || !destination || !routeCoordinates) && (
          <div className="absolute bottom-[calc(68px+env(safe-area-inset-bottom)+10px)] md:bottom-5 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 w-auto sm:w-[calc(100%-2rem)] max-w-3xl z-30 pointer-events-auto">
            <TripHudCard onRecenter={handleRecenter} />
          </div>
        )}
      </div>

      {/* First-Run Vehicle Alignment / Sensor Calibration Modal */}
      <CalibrationModal
        isOpen={showCalibrationModal}
        onClose={() => setShowCalibrationModal(false)}
      />
    </div>
  );
}

