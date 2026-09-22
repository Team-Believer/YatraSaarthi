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
import { ConfidenceIndicator } from '../components/navigation/ConfidenceIndicator';
import { TripHudCard } from '../components/navigation/TripHudCard';
import { RoutePreviewCard } from '../components/navigation/RoutePreviewCard';
import { NextManeuver } from '../components/navigation/NextManeuver';
import {
  CheckCircle2,
  X,
  Radio,
} from 'lucide-react';

export default function Dashboard() {
  const mapRef = useRef<MapboxMap | null>(null);
  const [initialCentered, setInitialCentered] = useState(false);
  const [followVehicle, setFollowVehicle] = useState(true);
  const [orientationMode, setOrientationMode] = useState<MapOrientationMode>('HEADING_UP');

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

  // Smooth camera centering when real location is first acquired
  useEffect(() => {
    if (!initialCentered && mapRef.current && deviceLat !== null && deviceLon !== null) {
      mapRef.current.flyTo({
        center: [deviceLon, deviceLat],
        zoom: 16.5,
        duration: 1200,
      });
      setInitialCentered(true);
    }
  }, [deviceLat, deviceLon, initialCentered]);

  // Fit map camera bounds to route when a destination route is selected (Route Preview)
  useEffect(() => {
    if (mapRef.current && routeCoordinates && routeCoordinates.length >= 2 && !isLive) {
      const bounds = new mapboxgl.LngLatBounds();
      routeCoordinates.forEach((coord) => bounds.extend(coord));
      mapRef.current.fitBounds(bounds, {
        padding: { top: 90, bottom: 220, left: 60, right: 60 },
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
        pitch: 50,
        bearing: orientationMode === 'HEADING_UP' ? state.heading_deg : 0,
        duration: 1000,
      });
    }
  }, [isLive]);

  // Recenter handler: restores vehicle follow and eases camera to position & heading
  const handleRecenter = useCallback(() => {
    setFollowVehicle(true);
    if (!mapRef.current) return;
    const targetLat = isLive && fusedPosition ? fusedPosition.latitude : deviceLat;
    const targetLon = isLive && fusedPosition ? fusedPosition.longitude : deviceLon;
    if (targetLat !== null && targetLon !== null) {
      const targetBearing = orientationMode === 'HEADING_UP' ? (isLive ? state.heading_deg : 0) : 0;
      mapRef.current.easeTo({
        center: [targetLon, targetLat],
        zoom: 16.5,
        bearing: targetBearing,
        pitch: 50,
        duration: 800,
      });
    }
  }, [isLive, fusedPosition, deviceLat, deviceLon, orientationMode, state.heading_deg]);

  // Suspend follow mode when user manually interacts with map
  const handleManualInteraction = useCallback(() => {
    setFollowVehicle(false);
  }, []);

  // Toggle between Heading-Up and North-Up map orientation
  const handleOrientationToggle = useCallback((mode: MapOrientationMode) => {
    setOrientationMode(mode);
    if (mapRef.current) {
      const targetBearing = mode === 'HEADING_UP' ? (isLive ? state.heading_deg : 0) : 0;
      mapRef.current.easeTo({
        bearing: targetBearing,
        duration: 500,
      });
    }
  }, [isLive, state.heading_deg]);

  // Active coordinates: InEKF fused position when live, otherwise real device location
  const displayLat = isLive && fusedPosition ? fusedPosition.latitude : deviceLat;
  const displayLon = isLive && fusedPosition ? fusedPosition.longitude : deviceLon;
  const hasCoordinates = displayLat !== null && displayLon !== null;

  return (
    <div className="h-full w-full relative flex flex-col overflow-hidden bg-slate-900 select-none">
      {/* Journey Completed Banner */}
      {journeySummary && (
        <div className="absolute top-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-auto z-50 bg-emerald-600/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in border border-emerald-400/40">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />
          <div className="text-xs">
            <span className="font-bold">Journey Summary</span> •{' '}
            {journeySummary.distance_m
              ? `${(journeySummary.distance_m / 1000).toFixed(2)} km`
              : 'Zero displacement'}{' '}
            •{' '}
            {journeySummary.duration_s
              ? `${Math.round(journeySummary.duration_s)}s`
              : '<1s'}{' '}
            • Saved to history
          </div>
          <button
            onClick={() => setJourneySummary(null)}
            className="hover:bg-white/20 p-1.5 rounded-lg transition-colors ml-2 cursor-pointer"
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
            heading={isLive ? state.heading_deg : 0}
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
              heading={isLive ? state.heading_deg : 0}
              mode={isLive ? state.navigation_mode : 'STANDBY'}
            />
          )}

          {/* Planned Route Geometry */}
          {routeCoordinates && <RouteLayer geometry={routeCoordinates} />}

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
            heading={isLive ? state.heading_deg : 0}
          />
        </MapContainer>

        {/* Acquiring Location Overlay when no GPS fix yet */}
        {!hasCoordinates && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center pointer-events-none p-4 text-center z-20">
            <div className="bg-white/95 p-6 rounded-2xl border border-slate-200 shadow-xl space-y-2 max-w-sm">
              <Radio className="w-7 h-7 text-brand-600 animate-pulse mx-auto" />
              <h4 className="font-bold text-sm text-slate-900">Acquiring Navigation Fix</h4>
              <p className="text-xs text-slate-500">
                {locPermission === 'denied'
                  ? 'Please allow browser geolocation permissions to locate vehicle.'
                  : 'Connecting to GNSS satellite constellation & motion sensors...'}
              </p>
            </div>
          </div>
        )}

        {/* FLOATING TOP OVERLAY BAR */}
        <div className="absolute top-4 left-16 right-4 md:left-20 md:right-6 z-20 flex items-center justify-between gap-3 pointer-events-none">
          {/* Destination Search Box / Active Turn-by-Turn Guidance */}
          <div className="pointer-events-auto flex-1 max-w-md">
            {!isLive ? (
              <DestinationSearch />
            ) : (
              <NextManeuver />
            )}
          </div>

          {/* Top-Right Navigation Status & Confidence Pills (Desktop/Tablet) */}
          <div className="hidden md:flex items-center gap-2 pointer-events-auto shrink-0">
            <NavStatusPill />
            <ConfidenceIndicator />
          </div>
        </div>

        {/* FLOATING BOTTOM HUD COCKPIT */}
        <div className="absolute bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)] max-w-3xl z-20 pointer-events-auto">
          {/* Show RoutePreviewCard during route preview, otherwise single TripHudCard */}
          {!isLive && destination && routeCoordinates ? (
            <RoutePreviewCard onStart={() => setFollowVehicle(true)} />
          ) : (
            <TripHudCard onRecenter={handleRecenter} />
          )}
        </div>
      </div>
    </div>
  );
}
