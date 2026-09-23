/**
 * YatraSaarthi - Robust Native IndexedDB Offline Storage Layer
 *
 * Provides transactional, asynchronous client-side storage for:
 * 1. Saved Routes and Place Waypoints
 * 2. Cached Trip History with synchronization timestamps
 * 3. Offline Field-Test Sessions with buffered 50Hz sensor writes
 * 4. Raw Sensor Log Samples (IMU, Orientation, GNSS)
 * 5. Pending Synchronization Queue
 * 6. Deterministic JSON Export for field-test analysis
 */

export interface OfflineSessionRecord {
  session_id: string;
  started_at: string;
  ended_at?: string;
  source: 'LOCAL_OFFLINE_SESSION';
  network_state: string;
  gnss_state: string;
  engine_state: string;
  vehicle_type: string;
  route_name?: string;
  source_name?: string;
  destination_name?: string;
  geometry?: [number, number][];
  packet_count: number;
  gnss_fix_count: number;
  sync_status: 'PENDING_SYNC' | 'SYNCED' | 'LOCAL_ONLY';
  export_version: string;
  summary_metrics?: {
    total_duration_s?: number;
    estimated_distance_m?: number;
    avg_speed_mps?: number;
    sample_rate_hz?: number;
  };
}

export interface SensorLogEntry {
  id?: number;
  session_id: string;
  timestamp: number;
  seq_num: number;
  type: string;
  imu?: {
    ax: number;
    ay: number;
    az: number;
    gx: number;
    gy: number;
    gz: number;
    interval?: number;
  };
  gnss?: {
    lat: number;
    lon: number;
    alt?: number | null;
    accuracy?: number | null;
    speed?: number | null;
    heading?: number | null;
  };
  orientation?: {
    alpha?: number | null;
    beta?: number | null;
    gamma?: number | null;
    compass_heading?: number | null;
  };
  raw_payload?: any;
}

export interface CachedHistoryRecord {
  id: string; // 'primary_trips_cache'
  trips: any[];
  last_synchronized: string;
  trip_count: number;
}

const DB_NAME = 'yatrasaarthi_offline_db_v1';
const DB_VERSION = 1;

const STORES = {
  SAVED_ROUTES: 'saved_routes',
  CACHED_HISTORY: 'cached_history',
  OFFLINE_SESSIONS: 'offline_sessions',
  SENSOR_LOGS: 'sensor_logs',
  SYNC_QUEUE: 'sync_queue',
} as const;

class OfflineStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  public async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not supported in this browser environment.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Saved Routes & Places Store
        if (!db.objectStoreNames.contains(STORES.SAVED_ROUTES)) {
          const store = db.createObjectStore(STORES.SAVED_ROUTES, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }

        // 2. Cached Trip History Store
        if (!db.objectStoreNames.contains(STORES.CACHED_HISTORY)) {
          db.createObjectStore(STORES.CACHED_HISTORY, { keyPath: 'id' });
        }

        // 3. Offline Sessions Store
        if (!db.objectStoreNames.contains(STORES.OFFLINE_SESSIONS)) {
          const store = db.createObjectStore(STORES.OFFLINE_SESSIONS, { keyPath: 'session_id' });
          store.createIndex('started_at', 'started_at', { unique: false });
          store.createIndex('sync_status', 'sync_status', { unique: false });
        }

        // 4. Raw Sensor Logs Store (Buffered IMU/GNSS)
        if (!db.objectStoreNames.contains(STORES.SENSOR_LOGS)) {
          const store = db.createObjectStore(STORES.SENSOR_LOGS, { keyPath: 'id', autoIncrement: true });
          store.createIndex('session_id', 'session_id', { unique: false });
          store.createIndex('session_timestamp', ['session_id', 'timestamp'], { unique: false });
        }

        // 5. Sync Queue Store
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const store = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'queue_id', autoIncrement: true });
          store.createIndex('session_id', 'session_id', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onerror = (event) => {
        const error = (event.target as IDBOpenDBRequest).error;
        console.error('[OfflineStorage] IndexedDB Open Error:', error);
        reject(error);
      };
    });

    return this.dbPromise;
  }

  // ==========================================
  // OFFLINE SESSIONS MANAGEMENT
  // ==========================================

  public async saveOfflineSession(session: OfflineSessionRecord): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.OFFLINE_SESSIONS, 'readwrite');
      const store = tx.objectStore(STORES.OFFLINE_SESSIONS);
      const req = store.put(session);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getOfflineSessions(): Promise<OfflineSessionRecord[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.OFFLINE_SESSIONS, 'readonly');
      const store = tx.objectStore(STORES.OFFLINE_SESSIONS);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = (req.result || []) as OfflineSessionRecord[];
        // Sort descending by started_at
        results.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  public async getOfflineSession(sessionId: string): Promise<OfflineSessionRecord | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.OFFLINE_SESSIONS, 'readonly');
      const store = tx.objectStore(STORES.OFFLINE_SESSIONS);
      const req = store.get(sessionId);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  public async updateOfflineSession(session: OfflineSessionRecord): Promise<void> {
    return this.saveOfflineSession(session);
  }

  public async deleteOfflineSession(sessionId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.OFFLINE_SESSIONS, STORES.SENSOR_LOGS], 'readwrite');
      const sessionStore = tx.objectStore(STORES.OFFLINE_SESSIONS);
      const sensorStore = tx.objectStore(STORES.SENSOR_LOGS);

      sessionStore.delete(sessionId);

      // Clean up related sensor logs
      const index = sensorStore.index('session_id');
      const req = index.openKeyCursor(IDBKeyRange.only(sessionId));

      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          sensorStore.delete(cursor.primaryKey);
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ==========================================
  // BUFFERED SENSOR LOGGING
  // ==========================================

  /**
   * Performs high-throughput batch writes of normalized sensor samples
   * into IndexedDB without blocking the UI main thread.
   */
  public async bufferSensorBatch(sessionId: string, entries: Omit<SensorLogEntry, 'id'>[]): Promise<void> {
    if (!entries.length) return;
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SENSOR_LOGS, 'readwrite');
      const store = tx.objectStore(STORES.SENSOR_LOGS);

      for (let i = 0; i < entries.length; i++) {
        store.add({
          ...entries[i],
          session_id: sessionId,
        });
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getSensorLogsForSession(sessionId: string): Promise<SensorLogEntry[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SENSOR_LOGS, 'readonly');
      const store = tx.objectStore(STORES.SENSOR_LOGS);
      const index = store.index('session_id');
      const req = index.getAll(IDBKeyRange.only(sessionId));

      req.onsuccess = () => {
        const results = (req.result || []) as SensorLogEntry[];
        results.sort((a, b) => a.timestamp - b.timestamp);
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // ==========================================
  // CACHED TRIP HISTORY
  // ==========================================

  public async cacheTripHistory(trips: any[]): Promise<void> {
    const db = await this.getDB();
    const record: CachedHistoryRecord = {
      id: 'primary_trips_cache',
      trips,
      last_synchronized: new Date().toISOString(),
      trip_count: trips.length,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CACHED_HISTORY, 'readwrite');
      const store = tx.objectStore(STORES.CACHED_HISTORY);
      const req = store.put(record);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  public async getCachedTripHistory(): Promise<CachedHistoryRecord | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.CACHED_HISTORY, 'readonly');
      const store = tx.objectStore(STORES.CACHED_HISTORY);
      const req = store.get('primary_trips_cache');

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  // ==========================================
  // SAVED ROUTES & PLACES
  // ==========================================

  public async cacheSavedRoutes(items: any[]): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SAVED_ROUTES, 'readwrite');
      const store = tx.objectStore(STORES.SAVED_ROUTES);

      // Clear old items and write current items
      store.clear();
      for (const item of items) {
        store.put(item);
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  public async getCachedSavedRoutes(): Promise<any[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SAVED_ROUTES, 'readonly');
      const store = tx.objectStore(STORES.SAVED_ROUTES);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // ==========================================
  // OFFLINE JSON EXPORT (FIELD TEST SPEC)
  // ==========================================

  /**
   * Generates a fully compliant, deterministic JSON export of the offline session
   * containing raw sensor samples, metadata, and state tags.
   */
  public async exportSessionAsJson(sessionId: string): Promise<string> {
    const session = await this.getOfflineSession(sessionId);
    if (!session) {
      throw new Error(`Offline session '${sessionId}' not found.`);
    }

    const sensorLogs = await this.getSensorLogsForSession(sessionId);

    const exportPayload = {
      export_version: '1.0.0',
      data_source: 'LOCAL_OFFLINE_SESSION',
      exported_at: new Date().toISOString(),
      session: {
        session_id: session.session_id,
        started_at: session.started_at,
        ended_at: session.ended_at || null,
        vehicle_type: session.vehicle_type,
        source_name: session.source_name || 'Origin',
        destination_name: session.destination_name || 'Destination',
        route_name: session.route_name || 'Offline Session Route',
        geometry: session.geometry || null,
        system_states: {
          network: session.network_state,
          gnss: session.gnss_state,
          navigation_engine: session.engine_state,
        },
        metrics: {
          total_packets: sensorLogs.length,
          gnss_observations: sensorLogs.filter((s) => s.type === 'gnss' || s.gnss).length,
          imu_samples: sensorLogs.filter((s) => s.type === 'imu' || s.imu).length,
          summary: session.summary_metrics || {},
        },
      },
      sensor_samples: sensorLogs.map((log) => ({
        timestamp: log.timestamp,
        seq_num: log.seq_num,
        type: log.type,
        imu: log.imu || null,
        gnss: log.gnss || null,
        orientation: log.orientation || null,
      })),
    };

    const jsonString = JSON.stringify(exportPayload, null, 2);

    // Trigger browser file download
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `yatrasaarthi_offline_session_${sessionId}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    }

    return jsonString;
  }

  // ==========================================
  // STORAGE DIAGNOSTICS & METRICS
  // ==========================================

  public async getStorageMetrics(): Promise<{
    sessionCount: number;
    totalSensorSamples: number;
    cachedTripsCount: number;
    savedRoutesCount: number;
    estimatedStorageBytes?: number;
  }> {
    const db = await this.getDB();
    const sessions = await this.getOfflineSessions();
    const tripsRecord = await this.getCachedTripHistory();
    const savedRoutes = await this.getCachedSavedRoutes();

    let totalSensorSamples = 0;
    try {
      const tx = db.transaction(STORES.SENSOR_LOGS, 'readonly');
      const store = tx.objectStore(STORES.SENSOR_LOGS);
      totalSensorSamples = await new Promise<number>((resolve) => {
        const countReq = store.count();
        countReq.onsuccess = () => resolve(countReq.result);
        countReq.onerror = () => resolve(0);
      });
    } catch {
      totalSensorSamples = 0;
    }

    let estimatedStorageBytes: number | undefined;
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        estimatedStorageBytes = est.usage;
      } catch {
        // Storage estimate optional
      }
    }

    return {
      sessionCount: sessions.length,
      totalSensorSamples,
      cachedTripsCount: tripsRecord?.trip_count || 0,
      savedRoutesCount: savedRoutes.length,
      estimatedStorageBytes,
    };
  }
}

export const offlineStorage = new OfflineStorageService();
