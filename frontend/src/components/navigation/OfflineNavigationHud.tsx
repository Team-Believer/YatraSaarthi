/**
 * YatraSaarthi — Offline Navigation HUD
 *
 * Displays real-time offline navigation state:
 * - OFFLINE banner with saved route name
 * - Distance remaining & ETA from real GPS match
 * - Next turn instruction from saved route steps
 * - Off-route warning when GPS deviates
 * - Vehicle type and GPS accuracy
 *
 * All values are REAL — derived from phone GPS + saved route geometry.
 */

import React from 'react';
import { useOfflineNavigationStore } from '../../stores/useOfflineNavigationStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { VEHICLE_PROFILES, type SupportedVehicleType } from '../../utils/navigation/vehicleProfiles';
import {
  WifiOff,
  Navigation2,
  AlertTriangle,
  MapPin,
  Clock,
  ArrowRight,
  CornerUpRight,
  CornerUpLeft,
  RotateCcw,
  CheckCircle2,
  Compass,
} from 'lucide-react';

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}

function getManeuverIcon(maneuver?: string, modifier?: string) {
  if (!maneuver) return <ArrowRight className="w-5 h-5" />;
  if (maneuver === 'turn' && modifier?.includes('left')) return <CornerUpLeft className="w-5 h-5" />;
  if (maneuver === 'turn' && modifier?.includes('right')) return <CornerUpRight className="w-5 h-5" />;
  if (maneuver === 'uturn') return <RotateCcw className="w-5 h-5" />;
  if (maneuver === 'arrive') return <MapPin className="w-5 h-5" />;
  return <ArrowRight className="w-5 h-5" />;
}

export const OfflineNavigationHud: React.FC = () => {
  const offlineNavMode = useOfflineNavigationStore((s) => s.offlineNavMode);
  const activeRoute = useOfflineNavigationStore((s) => s.activeOfflineRoute);
  const matchResult = useOfflineNavigationStore((s) => s.routeMatchResult);
  const isOfflineNavActive = useOfflineNavigationStore((s) => s.isOfflineNavActive);
  const deviationStatus = useOfflineNavigationStore((s) => s.deviationStatus);

  const accuracy = useLocationStore((s) => s.accuracy);
  const vehicleType = useSettingsStore((s) => s.settings.vehicle_type);

  if (!isOfflineNavActive || !activeRoute || offlineNavMode !== 'OFFLINE_SAVED_ROUTE') {
    return null;
  }

  const vehicleProfile = VEHICLE_PROFILES[vehicleType as SupportedVehicleType];
  const vehicleLabel = vehicleProfile?.shortLabel || vehicleType;

  return (
    <div className="absolute top-0 left-0 right-0 z-50 pointer-events-none">
      {/* Offline Banner */}
      <div className="mx-3 mt-3 pointer-events-auto">
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-2.5">
          <WifiOff className="w-4.5 h-4.5 text-white shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-tight truncate">
              OFFLINE · Saved Route Navigation
            </p>
            <p className="text-amber-100/80 text-[11px] leading-tight truncate mt-0.5">
              {activeRoute.origin} → {activeRoute.destination}
            </p>
          </div>
          <div className="flex items-center gap-1 text-amber-100/90 text-[10px] shrink-0">
            <Compass className="w-3 h-3" />
            <span>{vehicleLabel}</span>
          </div>
        </div>
      </div>

      {/* Next Turn Card */}
      {matchResult?.nextStep && (
        <div className="mx-3 mt-2 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                {getManeuverIcon(matchResult.nextStep.maneuver, matchResult.nextStep.modifier)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#083335] font-bold text-base leading-tight truncate">
                  {matchResult.nextStep.instruction || 'Continue on route'}
                </p>
                {matchResult.nextStep.roadName && (
                  <p className="text-gray-500 text-xs mt-0.5 truncate">
                    {matchResult.nextStep.roadName}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-[#083335] font-bold text-lg tabular-nums">
                  {formatDistance(matchResult.distanceToNextManeuver)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar + Stats */}
      {matchResult && (
        <div className="mx-3 mt-2 pointer-events-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-100 px-4 py-3">
            {/* Progress bar */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, matchResult.progressFraction * 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1.5 text-gray-600">
                <Navigation2 className="w-3.5 h-3.5" />
                <span className="font-medium tabular-nums">
                  {formatDistance(matchResult.distanceRemaining)}
                </span>
                <span className="text-gray-400">remaining</span>
              </div>

              {matchResult.etaSeconds != null && (
                <div className="flex items-center gap-1.5 text-gray-600">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-medium tabular-nums">
                    {formatDuration(matchResult.etaSeconds)}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1 text-gray-400 text-xs">
                {accuracy != null && (
                  <>
                    <span>GPS ±{Math.round(accuracy)}m</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Off-Route Warning */}
      {deviationStatus === 'OFF_ROUTE' && (
        <div className="mx-3 mt-2 pointer-events-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 flex items-center gap-2.5">
            <AlertTriangle className="w-4.5 h-4.5 text-red-500 shrink-0" />
            <div className="flex-1">
              <p className="text-red-700 font-semibold text-sm">Off Route</p>
              <p className="text-red-500 text-[11px]">
                You've left the saved route. Offline re-routing is not available.
              </p>
            </div>
          </div>
        </div>
      )}

      {deviationStatus === 'SLIGHTLY_OFF_ROUTE' && (
        <div className="mx-3 mt-2 pointer-events-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-amber-700 text-xs font-medium">
              Slightly off route · {matchResult ? `${Math.round(matchResult.distanceFromRoute)}m` : ''}
            </p>
          </div>
        </div>
      )}

      {deviationStatus === 'ON_ROUTE' && matchResult && (
        <div className="mx-3 mt-1.5 pointer-events-auto">
          <div className="flex items-center gap-1.5 px-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <p className="text-emerald-600 text-[10px] font-medium">On route</p>
          </div>
        </div>
      )}
    </div>
  );
};
