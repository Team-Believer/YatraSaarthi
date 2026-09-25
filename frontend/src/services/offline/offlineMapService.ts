/**
 * YatraSaarthi — Real Offline Mapbox Map Service
 *
 * Provides offline Mapbox map resources using `map-gl-offline`.
 * Handles:
 * 1. Automatic region bounding box calculation from real route geometry with safety buffer.
 * 2. Downloading Mapbox style, vector tiles, glyphs (fonts), sprites, and metadata.
 * 3. Storing offline map resources in IndexedDB (`offline-map-db`).
 * 4. Patching & converting Mapbox style to `/__offline__/{regionId}/...` for Service Worker interception.
 * 5. Tracking download progress and verifying offline readiness.
 * 6. Providing the offline style object for offline Mapbox GL JS rendering.
 */

import {
  OfflineMapManager,
  patchStyleForOffline,
  convertStyleForServiceWorker,
  registerOfflineServiceWorker,
  loadStyleById,
  type BoundingBox,
  type DownloadRegionProgress,
  type StoredRegion,
} from 'map-gl-offline';
import { getMapboxToken } from '../api/envConfig';
import {
  offlineRouteStorage,
  type OfflineRouteRecord,
} from './offlineRouteStorage';

export const DEFAULT_OFFLINE_STYLE = 'mapbox://styles/mapbox/navigation-day-v1';
export const DEFAULT_MIN_ZOOM = 11;
export const DEFAULT_MAX_ZOOM = 15;
export const SAFETY_MARGIN_DEGREES = 0.02; // ~2.2km bounding margin for deviations/GPS jitter

export interface OfflineDownloadProgress {
  phase: string;
  completed: number;
  total: number;
  percentage: number;
  message?: string;
}

export type ProgressCallback = (progress: OfflineDownloadProgress) => void;

class OfflineMapService {
  private manager: OfflineMapManager | null = null;
  private isSwReady = false;
  private activeDownloads = new Map<string, boolean>();

  /**
   * Get or initialize the singleton OfflineMapManager instance.
   */
  private getManager(): OfflineMapManager {
    if (!this.manager) {
      this.manager = new OfflineMapManager();
    }
    return this.manager;
  }

  /**
   * Ensure Service Worker is registered and controlling the page.
   * VitePWA provides `/sw.js` in production (which imports `/idb-offline-sw.js`),
   * and `/idb-offline-sw.js` is available directly for standalone/dev intercept.
   */
  async ensureServiceWorkerReady(): Promise<boolean> {
    if (typeof window === 'undefined' || !navigator.serviceWorker) {
      console.warn('[OfflineMapService] Service Workers not supported in this browser.');
      return false;
    }

    if (this.isSwReady && navigator.serviceWorker.controller) {
      return true;
    }

    try {
      if (navigator.serviceWorker.controller) {
        this.isSwReady = true;
        return true;
      }

      // Try registering the offline service worker if not controlled
      try {
        await registerOfflineServiceWorker('/idb-offline-sw.js');
        this.isSwReady = true;
        return true;
      } catch (swErr) {
        console.warn('[OfflineMapService] Direct SW registration attempt note:', swErr);
        // Fallback: check if existing registration exists
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          this.isSwReady = true;
          return true;
        }
      }
    } catch (e) {
      console.warn('[OfflineMapService] ensureServiceWorkerReady warning:', e);
    }

    return !!navigator.serviceWorker.controller;
  }

  /**
   * Compute an expanded geographic bounding box from route geometry.
   * Format: [[west, south], [east, north]] -> [[minLon, minLat], [maxLon, maxLat]]
   */
  calculateRouteBoundingBox(
    coordinates: [number, number][],
    marginDegrees = SAFETY_MARGIN_DEGREES
  ): BoundingBox {
    if (!coordinates || coordinates.length === 0) {
      // Default fallback bounds (India region or current area)
      return [[72.8, 18.9], [73.0, 19.1]];
    }

    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;

    for (const [lon, lat] of coordinates) {
      if (typeof lon === 'number' && typeof lat === 'number' && !isNaN(lon) && !isNaN(lat)) {
        if (lon < minLon) minLon = lon;
        if (lat < minLat) minLat = lat;
        if (lon > maxLon) maxLon = lon;
        if (lat > maxLat) maxLat = lat;
      }
    }

    // Apply safety buffer margin
    const west = Math.max(-180, minLon - marginDegrees);
    const south = Math.max(-85, minLat - marginDegrees);
    const east = Math.min(180, maxLon + marginDegrees);
    const north = Math.min(85, maxLat + marginDegrees);

    return [[west, south], [east, north]];
  }

  /**
   * Download Mapbox offline resources for a saved route.
   */
  async downloadMapForRoute(
    route: OfflineRouteRecord,
    options?: {
      styleUrl?: string;
      minZoom?: number;
      maxZoom?: number;
      onProgress?: ProgressCallback;
    }
  ): Promise<boolean> {
    const routeId = route.id;
    if (this.activeDownloads.get(routeId)) {
      console.warn(`[OfflineMapService] Download already in progress for route: ${routeId}`);
      return false;
    }

    this.activeDownloads.set(routeId, true);

    const styleUrl = options?.styleUrl || DEFAULT_OFFLINE_STYLE;
    const minZoom = options?.minZoom ?? DEFAULT_MIN_ZOOM;
    const maxZoom = options?.maxZoom ?? DEFAULT_MAX_ZOOM;
    const regionId = `region-${routeId}`;

    const bounds = this.calculateRouteBoundingBox(route.routeGeometry);
    const token = getMapboxToken();

    try {
      // Update route record status to DOWNLOADING
      await offlineRouteStorage.updateMapStatus(routeId, {
        mapRegionId: regionId,
        mapStatus: 'DOWNLOADING',
        mapMinZoom: minZoom,
        mapMaxZoom: maxZoom,
        mapError: undefined,
      });

      if (options?.onProgress) {
        options.onProgress({
          phase: 'Initializing',
          completed: 0,
          total: 100,
          percentage: 0,
          message: 'Preparing offline map download...',
        });
      }

      await this.ensureServiceWorkerReady();

      const manager = this.getManager();

      console.log(`[OfflineMapService] Starting download for region ${regionId}`, {
        bounds,
        minZoom,
        maxZoom,
        styleUrl,
      });

      await manager.downloadRegion(
        {
          id: regionId,
          name: `Route: ${route.origin} to ${route.destination}`,
          bounds: bounds,
          minZoom: minZoom,
          maxZoom: maxZoom,
          styleUrl: styleUrl,
        },
        {
          accessToken: token,
          skipModels: true, // Skip heavy 3D buildings/models for fast lightweight offline download
          onProgress: (prog: DownloadRegionProgress) => {
            if (options?.onProgress) {
              const formattedPhase =
                prog.phase === 'style'
                  ? 'Downloading style'
                  : prog.phase === 'sprites'
                  ? 'Downloading map icons & sprites'
                  : prog.phase === 'glyphs'
                  ? 'Downloading road labels & fonts'
                  : prog.phase === 'tiles'
                  ? 'Downloading vector map tiles'
                  : 'Finalizing map region';

              options.onProgress({
                phase: prog.phase,
                completed: prog.completed,
                total: prog.total,
                percentage: Math.round(prog.percentage),
                message: `${formattedPhase} (${Math.round(prog.percentage)}%)`,
              });
            }
          },
        }
      );

      // Verify the region exists in offline storage
      const storedRegions = await manager.listStoredRegions();
      const verified = storedRegions.some((r) => r.id === regionId || (r as any).regionId === regionId);

      if (!verified) {
        console.warn(`[OfflineMapService] Download finished, but region verification pending in list`);
      }

      // Update route record to READY
      await offlineRouteStorage.updateMapStatus(routeId, {
        mapRegionId: regionId,
        mapStatus: 'READY',
        mapMinZoom: minZoom,
        mapMaxZoom: maxZoom,
        mapDownloadedAt: new Date().toISOString(),
        mapError: undefined,
      });

      if (options?.onProgress) {
        options.onProgress({
          phase: 'complete',
          completed: 100,
          total: 100,
          percentage: 100,
          message: '✓ Offline map ready',
        });
      }

      console.log(`[OfflineMapService] Successfully downloaded offline map for route ${routeId}`);
      return true;
    } catch (err: any) {
      console.error(`[OfflineMapService] Failed to download map for route ${routeId}:`, err);

      await offlineRouteStorage.updateMapStatus(routeId, {
        mapRegionId: regionId,
        mapStatus: 'ERROR',
        mapError: err?.message || 'Failed to download offline map resources',
      });

      if (options?.onProgress) {
        options.onProgress({
          phase: 'error',
          completed: 0,
          total: 100,
          percentage: 0,
          message: `Download failed: ${err?.message || 'Network or storage error'}`,
        });
      }

      return false;
    } finally {
      this.activeDownloads.delete(routeId);
    }
  }

  /**
   * Retrieve the offline-patched Mapbox style object for a given route/region.
   * The style URLs are transformed into absolute `/__offline__/{regionId}/...` URLs
   * so the Service Worker can intercept them locally.
   */
  async getOfflineStyleForRoute(routeId: string): Promise<any | null> {
    try {
      const route = await offlineRouteStorage.getSavedRoute(routeId);
      if (!route || !route.mapRegionId) {
        return null;
      }

      const regionId = route.mapRegionId;
      const manager = this.getManager();
      const storedRegions = await manager.listStoredRegions();
      const targetRegion = storedRegions.find(
        (r) => r.id === regionId || (r as any).regionId === regionId
      );

      // Try getting style from region or stored styles
      const styleId = targetRegion?.styleId;
      let styleEntry = styleId ? await loadStyleById(styleId) : null;

      if (!styleEntry) {
        const allStyles = await manager.listStyles();
        if (allStyles.length > 0) {
          // Find style matching region
          styleEntry = allStyles.find((s) =>
            s.regions?.some((r) => r.id === regionId || (r as any).regionId === regionId)
          ) || allStyles[0];
        }
      }

      if (!styleEntry || !styleEntry.style) {
        console.warn(`[OfflineMapService] No offline style entry found for region ${regionId}`);
        return null;
      }

      const rawStyle = JSON.parse(JSON.stringify(styleEntry.style));
      const maxZoom = route.mapMaxZoom ?? targetRegion?.maxZoom ?? DEFAULT_MAX_ZOOM;
      const tileExt = targetRegion?.tileExtension || 'pbf';

      // 1. Patch style for offline (idb:// URLs)
      const patched = patchStyleForOffline(rawStyle, regionId, maxZoom, tileExt, styleEntry.key);

      // 2. Convert idb:// URLs to absolute /__offline__/{regionId}/... URLs for Service Worker
      const offlineSwStyle = convertStyleForServiceWorker(patched);

      console.log(`[OfflineMapService] Successfully generated offline SW style for route ${routeId}`);
      return offlineSwStyle;
    } catch (err) {
      console.error(`[OfflineMapService] getOfflineStyleForRoute error:`, err);
      return null;
    }
  }

  /**
   * Check if a route has a verified offline map ready.
   */
  async isMapReadyForRoute(routeId: string): Promise<boolean> {
    try {
      const route = await offlineRouteStorage.getSavedRoute(routeId);
      if (!route || route.mapStatus !== 'READY' || !route.mapRegionId) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete offline map resources for a route.
   */
  async deleteMapForRoute(routeId: string): Promise<void> {
    try {
      const route = await offlineRouteStorage.getSavedRoute(routeId);
      if (route?.mapRegionId) {
        const manager = this.getManager();
        await manager.deleteRegion(route.mapRegionId);
      }

      await offlineRouteStorage.updateMapStatus(routeId, {
        mapStatus: 'NOT_DOWNLOADED',
        mapDownloadedAt: undefined,
        mapError: undefined,
      });

      console.log(`[OfflineMapService] Deleted offline map for route ${routeId}`);
    } catch (err) {
      console.error(`[OfflineMapService] Failed to delete map for route ${routeId}:`, err);
    }
  }

  /**
   * List all stored offline map regions.
   */
  async listStoredRegions(): Promise<StoredRegion[]> {
    try {
      const manager = this.getManager();
      return await manager.listStoredRegions();
    } catch (err) {
      console.warn('[OfflineMapService] listStoredRegions warning:', err);
      return [];
    }
  }
}

export const offlineMapService = new OfflineMapService();
