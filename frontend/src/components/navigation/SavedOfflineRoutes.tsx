/**
 * YatraSaarthi — Saved Offline Routes Page
 *
 * Lists all routes saved for offline navigation.
 * Allows starting offline navigation, deleting routes.
 * Shows real route data: distance, duration, vehicle type, saved date.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  offlineRouteStorage,
  type OfflineRouteRecord,
} from '../../services/offline/offlineRouteStorage';
import { offlineNavigationController } from '../../services/offline/offlineNavigationController';
import { useOfflineNavigationStore } from '../../stores/useOfflineNavigationStore';
import { VEHICLE_PROFILES, type SupportedVehicleType } from '../../utils/navigation/vehicleProfiles';
import {
  WifiOff,
  Navigation,
  Trash2,
  CloudOff,
  CheckCircle2,
} from 'lucide-react';

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hrs}h ${remMins}m`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Unknown';
  }
}

export const SavedOfflineRoutes: React.FC<{ className?: string }> = ({ className }) => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<OfflineRouteRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const connectivity = useOfflineNavigationStore((s) => s.connectivity);

  const loadRoutes = useCallback(async () => {
    try {
      const saved = await offlineRouteStorage.getSavedRoutes();
      setRoutes(saved);
    } catch (err) {
      console.error('[SavedOfflineRoutes] Failed to load:', err);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoutes();
  }, [loadRoutes]);

  const handleStartNavigation = useCallback(
    (route: OfflineRouteRecord) => {
      offlineNavigationController.startNavigation(route);
      navigate('/app/map');
    },
    [navigate]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await offlineRouteStorage.deleteSavedRoute(id);
        setRoutes((prev) => prev.filter((r) => r.id !== id));
      } catch (err) {
        console.error('[SavedOfflineRoutes] Delete failed:', err);
      } finally {
        setDeletingId(null);
        setConfirmDeleteId(null);
      }
    },
    []
  );

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className || ''}`}>
        <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (routes.length === 0) {
    return (
      <div className={`text-center py-10 px-6 ${className || ''}`}>
        <CloudOff className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-gray-600 font-semibold text-base mb-1">No Saved Routes</h3>
        <p className="text-gray-400 text-sm max-w-xs mx-auto">
          Save a route while online to use it for offline navigation later.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-2.5 ${className || ''}`}>
      <div className="flex items-center gap-2 px-1 mb-2">
        <WifiOff className="w-4 h-4 text-amber-500" />
        <h3 className="text-[#083335] font-semibold text-sm">Saved Offline Routes</h3>
        <span className="text-gray-400 text-xs ml-auto">{routes.length} route{routes.length !== 1 ? 's' : ''}</span>
      </div>

      {routes.map((route) => {
        const vehicleProfile = VEHICLE_PROFILES[route.vehicleType as SupportedVehicleType];
        const isDeleting = deletingId === route.id;
        const isConfirmingDelete = confirmDeleteId === route.id;

        return (
          <div
            key={route.id}
            className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[#083335] font-semibold text-sm truncate">
                    {route.origin} → {route.destination}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-gray-500 text-xs">
                    <span className="tabular-nums">{formatDistance(route.routeDistance)}</span>
                    <span>·</span>
                    <span className="tabular-nums">{formatDuration(route.estimatedDuration)}</span>
                    <span>·</span>
                    <span>{vehicleProfile?.label || route.vehicleType}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600 text-[11px] font-medium">Available Offline</span>
                    <span className="text-gray-300 text-[10px] ml-1">
                      Saved {formatDate(route.savedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(route.id)}
                        disabled={isDeleting}
                        className="px-2.5 py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 disabled:opacity-50"
                      >
                        {isDeleting ? '...' : 'Delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setConfirmDeleteId(route.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete offline route"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleStartNavigation(route)}
                        className="px-3 py-1.5 bg-emerald-500 text-white text-xs font-semibold rounded-lg hover:bg-emerald-600 flex items-center gap-1.5 transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        {connectivity === 'OFFLINE' ? 'Navigate' : 'Start'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
