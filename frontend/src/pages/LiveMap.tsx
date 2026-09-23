import { useEffect, useState, useRef, useCallback } from 'react';
import mapboxgl, { type Map as MapboxMap } from 'mapbox-gl';
import { useNavigationStore } from '../stores/useNavigationStore';
import { useLocationStore } from '../stores/useLocationStore';
import { locationService } from '../services/location/locationService';
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
import { NavStatusPill } from '../components/navigation/NavStatusPill';
import { TripHudCard } from '../components/navigation/TripHudCard';
import { RoutePreviewCard } from '../components/navigation/RoutePreviewCard';
import { NextManeuver } from '../components/navigation/NextManeuver';
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

  // Navigation store
  const {
    isLive,
    fusedPosition,
    trajectory,
    journeySummary,
    state,
    setJourneySummary,
    destination,
    routeCoordinates,
  } = useNavigationStore();

  // Start real browser geolocation watcher on mount
  useEffect(() => {
    locationService.startWatching();
  }, []);

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
      const bounds = new mapboxgl.LngLatBounds();
      routeCoordinates.forEach((coord) => bounds.extend(coord));
      mapRef.current.fitBounds(bounds, {
        padding: { top: 120, bottom: 200, left: 60, right: 60 },
        maxZoom: 16,
        duration: 1000,
      });
    }
  }, [routeCoordinates, isLive]);

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
    <div className="h-full w-full relative flex flex-col overflow-hidden bg-canvas-soft select-none">
      {/* Journey Completed Banner */}
      {journeySummary && (
        <div className="absolute top-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-50 bg-white text-ink px-4.5 py-3 rounded-2xl shadow-nav-floating flex items-center gap-3 animate-in fade-in border border-border-clean">
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

          {/* Planned Route Geometry with Destination Label */}
          {routeCoordinates && (
            <RouteLayer
              geometry={routeCoordinates}
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

        {/* PRIMARY TOP-CENTER DESTINATION SEARCH / ACTIVE MANEUVER GUIDANCE */}
        <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 z-20 w-[calc(100%-6rem)] sm:w-[520px] max-w-[560px] pointer-events-auto flex justify-center">
          {!isLive ? (
            <DestinationSearch />
          ) : (
            <NextManeuver />
          )}
        </div>

        {/* TOP-RIGHT ACTIVE NAVIGATION STATUS PILL (Only renders when starting or live) */}
        <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-20 pointer-events-auto shrink-0">
          <NavStatusPill />
        </div>

        {/* ROUTE PREVIEW PLANNING PANEL (Lower-Left / Bottom Sheet) */}
        {!isLive && destination && routeCoordinates && (
          <div className="absolute bottom-20 sm:bottom-6 left-4 sm:left-24 z-20 pointer-events-auto w-[calc(100%-2rem)] sm:w-[420px] max-w-[420px] pb-[env(safe-area-inset-bottom)]">
            <RoutePreviewCard onStart={() => setFollowVehicle(true)} />
          </div>
        )}

        {/* FLOATING BOTTOM HUD COCKPIT (Active Navigation / Standby) */}
        {(isLive || !destination || !routeCoordinates) && (
          <div className="absolute bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-3xl z-20 pointer-events-auto">
            <TripHudCard onRecenter={handleRecenter} />
          </div>
        )}
      </div>
    </div>
  );
}

