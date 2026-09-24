/**
 * YatraSaarthi — Offline Route Storage Layer
 *
 * Manages saved route geometry, steps, and metadata in IndexedDB
 * for offline turn-by-turn navigation when no internet is available.
 *
 * Uses the EXISTING IndexedDB database (yatrasaarthi_offline_db_v1)
 * with a new DB version bump to add the offline_routes object store.
 */

export interface OfflineRouteRecord {
  id: string;
  origin: string;
  destination: string;
  originCoordinates: [number, number]; // [lon, lat]
  destinationCoordinates: [number, number]; // [lon, lat]
  routeGeometry: [number, number][]; // Array of [lon, lat] coordinates
  routeDistance: number; // meters
  estimatedDuration: number; // seconds
  steps: OfflineRouteStep[];
  routeBounds: [[number, number], [number, number]] | null; // [[sw_lon, sw_lat], [ne_lon, ne_lat]]
  vehicleType: string;
  savedAt: string; // ISO timestamp
  provider: string;
  routeVersion: string;
  summary?: string;
  travelMode?: string;
}

export interface OfflineRouteStep {
  instruction: string;
  roadName: string;
  distance: number; // meters
  duration: number; // seconds
  maneuver: string; // 'turn', 'depart', 'arrive', etc.
  modifier?: string; // 'left', 'right', 'straight', etc.
  coordinates: [number, number]; // [lon, lat] of maneuver point
}

const OFFLINE_ROUTES_DB = 'yatrasaarthi_offline_routes_v1';
const OFFLINE_ROUTES_VERSION = 1;
const STORE_NAME = 'offline_routes';

class OfflineRouteStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not supported in this environment.'));
        return;
      }

      const request = indexedDB.open(OFFLINE_ROUTES_DB, OFFLINE_ROUTES_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('destination', 'destination', { unique: false });
          store.createIndex('savedAt', 'savedAt', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        const error = (event.target as IDBOpenDBRequest).error;
        console.error('[OfflineRouteStorage] IndexedDB open error:', error);
        this.dbPromise = null;
        reject(error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Save a route for offline navigation.
   */
  async saveRoute(route: OfflineRouteRecord): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(route);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get all saved offline routes, sorted by savedAt descending.
   */
  async getSavedRoutes(): Promise<OfflineRouteRecord[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = (req.result || []) as OfflineRouteRecord[];
        results.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Get a single saved route by ID.
   */
  async getSavedRoute(id: string): Promise<OfflineRouteRecord | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Check if a route with the given ID exists.
   */
  async hasSavedRoute(id: string): Promise<boolean> {
    const route = await this.getSavedRoute(id);
    return route !== null;
  }

  /**
   * Delete a saved offline route.
   */
  async deleteSavedRoute(id: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Update a saved route record.
   */
  async updateSavedRoute(route: OfflineRouteRecord): Promise<void> {
    return this.saveRoute(route);
  }

  /**
   * Get number of saved routes.
   */
  async count(): Promise<number> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
}

export const offlineRouteStorage = new OfflineRouteStorage();
