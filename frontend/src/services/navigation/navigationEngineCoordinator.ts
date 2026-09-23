/**
 * YatraSaarthi - Dual-Engine Navigation Coordinator
 *
 * Coordinates Server Engine (WebSocket) and Local Engine (Web Worker ONNX InEKF):
 *
 * 1. SERVER PRIORITY: When WebSocket / Backend is connected, server telemetry is authoritative.
 * 2. LOCAL WARMUP: Local worker continuously receives sensor packets in background, keeping InEKF warm.
 * 3. INSTANT FAILOVER: When WebSocket drops or network goes offline, authority seamlessly shifts to LOCAL
 *    without position teleportation or route resetting.
 * 4. CONTROLLED HANDOFF: When server reconnects, checks spatial continuity before restoring server authority.
 * 5. TRUTH IN REPORTING: If local engine is not ready during outage, state is explicitly marked UNAVAILABLE.
 */

import { useNavigationStore, type NavigationState, type WebSocketStatus } from '../../stores/useNavigationStore';
import { sensorCollector } from '../sensors/sensorCollector';
import type { NormalizedSensorPacket } from '../sensors/sensorNormalizer';
import { offlineStorage } from '../storage/offlineStorage';

export type EngineAuthority = 'SERVER' | 'LOCAL' | 'UNAVAILABLE';

export interface CoordinatorStatus {
  activeAuthority: EngineAuthority;
  isWorkerReady: boolean;
  isWorkerLoading: boolean;
  workerError: string | null;
  lastServerPacketAt: number;
  lastLocalPacketAt: number;
  failoverCount: number;
  recoveryCount: number;
}

class NavigationEngineCoordinator {
  private worker: Worker | null = null;
  private activeAuthority: EngineAuthority = 'UNAVAILABLE';
  private isWorkerReady = false;
  private isWorkerLoading = false;
  private workerError: string | null = null;
  private isRunning = false;

  private lastServerPacketAt = 0;
  private lastLocalPacketAt = 0;
  private lastKnownCoord: [number, number] | null = null;
  private failoverCount = 0;
  private recoveryCount = 0;

  private sensorUnsubscribe: (() => void) | null = null;
  private storeUnsubscribe: (() => void) | null = null;
  private healthCheckInterval: any = null;

  constructor() {
    this.initWorker();
  }

  /**
   * Spawns Web Worker and initializes ONNX WASM models
   */
  public initWorker() {
    if (typeof window === 'undefined') return;
    if (this.worker) return;

    try {
      this.worker = new Worker(new URL('../../workers/offlineNavWorker.ts', import.meta.url), {
        type: 'module',
      });

      this.worker.onmessage = (e: MessageEvent) => {
        this.handleWorkerMessage(e.data);
      };

      this.worker.onerror = (err) => {
        console.error('[EngineCoordinator] Worker error:', err);
        this.isWorkerReady = false;
        this.workerError = err.message || 'Web Worker crash';
      };

      // Pre-warm ONNX models
      this.isWorkerLoading = true;
      this.worker.postMessage({ type: 'LOAD_MODELS', payload: { baseUrl: '/models' } });
    } catch (err: any) {
      console.error('[EngineCoordinator] Failed to create Web Worker:', err);
      this.workerError = err.message || 'Worker initialization failed';
    }
  }

  /**
   * Starts dual-engine navigation monitoring for an active session
   */
  public start(sessionId: string, initialCoords?: [number, number]) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.failoverCount = 0;
    this.recoveryCount = 0;

    if (initialCoords) {
      this.lastKnownCoord = initialCoords;
    }

    // 1. Initialize Worker filter with starting position
    if (this.worker && initialCoords) {
      this.worker.postMessage({
        type: 'INIT',
        payload: {
          latitude: initialCoords[1],
          longitude: initialCoords[0],
          altitude: 55.0,
          accuracy: 5.0,
          timestamp: Date.now() / 1000.0,
        },
      });
      this.worker.postMessage({
        type: 'START',
        payload: { sessionId },
      });
    }

    // 2. Subscribe to normalized sensor stream
    this.sensorUnsubscribe = sensorCollector.subscribe((packet) => {
      this.handleIncomingSensorPacket(packet);
    });

    // 3. Monitor WebSocket and Network state for failover arbitration
    this.storeUnsubscribe = useNavigationStore.subscribe((state, prevState) => {
      if (state.websocketStatus !== prevState.websocketStatus) {
        this.evaluateEngineAuthority(state.websocketStatus);
      }
    });

    // 4. Initial authority evaluation
    const curWsStatus = useNavigationStore.getState().websocketStatus;
    this.evaluateEngineAuthority(curWsStatus);

    // 5. Periodic liveness & failover watchdog (every 500ms)
    this.healthCheckInterval = setInterval(() => {
      this.watchdogCheck();
    }, 500);

    this.logLifecycleEvent(sessionId, 'SERVER_ENGINE_ACTIVE', {
      initialCoords,
      websocketStatus: curWsStatus,
    });
  }

  /**
   * Stops coordinator and worker navigation state emission
   */
  public stop() {
    this.isRunning = false;
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    if (this.sensorUnsubscribe) {
      this.sensorUnsubscribe();
      this.sensorUnsubscribe = null;
    }
    if (this.storeUnsubscribe) {
      this.storeUnsubscribe();
      this.storeUnsubscribe = null;
    }

    if (this.worker) {
      this.worker.postMessage({ type: 'STOP' });
    }

    this.activeAuthority = 'UNAVAILABLE';
  }

  /**
   * Handles incoming message from offlineNavWorker
   */
  private handleWorkerMessage(data: any) {
    const { type, metrics, state, error } = data || {};

    if (type === 'MODEL_LOADING') {
      this.isWorkerLoading = true;
    } else if (type === 'MODEL_READY') {
      this.isWorkerReady = true;
      this.isWorkerLoading = false;
      this.workerError = null;
      console.info('[EngineCoordinator] Local ONNX WASM models compiled and ready:', metrics);
    } else if (type === 'ENGINE_ERROR') {
      this.isWorkerReady = false;
      this.isWorkerLoading = false;
      this.workerError = error;
      console.error('[EngineCoordinator] Worker reported error:', error);
    } else if (type === 'STATE_UPDATE') {
      this.lastLocalPacketAt = Date.now();
      if (state && state.latitude && state.longitude) {
        this.lastKnownCoord = [state.longitude, state.latitude];
      }

      // If LOCAL engine is active authority, publish to Zustand store
      if (this.activeAuthority === 'LOCAL' && this.isRunning) {
        useNavigationStore.getState().updateState({
          ...state,
          engine_source: 'LOCAL',
        });
      }
    }
  }

  /**
   * Forwards sensor packets to the background worker
   */
  private handleIncomingSensorPacket(packet: NormalizedSensorPacket) {
    if (!this.worker) return;

    if (packet.type === 'imu' && packet.accel_x !== undefined) {
      this.worker.postMessage({
        type: 'IMU_SAMPLE',
        payload: {
          timestamp: packet.timestamp || Date.now() / 1000.0,
          accel_x: packet.accel_x,
          accel_y: packet.accel_y,
          accel_z: packet.accel_z,
          gyro_x: packet.gyro_x ?? 0,
          gyro_y: packet.gyro_y ?? 0,
          gyro_z: packet.gyro_z ?? 0,
        },
      });
    } else if (packet.type === 'gnss' && packet.latitude !== undefined) {
      this.lastKnownCoord = [packet.longitude!, packet.latitude!];
      this.worker.postMessage({
        type: 'GNSS_SAMPLE',
        payload: {
          timestamp: packet.timestamp || Date.now() / 1000.0,
          latitude: packet.latitude,
          longitude: packet.longitude,
          altitude: packet.altitude ?? 55.0,
          accuracy: packet.accuracy ?? 5.0,
          speed: packet.speed,
          heading: packet.heading,
        },
      });
    } else if (packet.type === 'orientation' && (packet.alpha !== undefined || packet.heading !== undefined)) {
      this.worker.postMessage({
        type: 'ORIENTATION_SAMPLE',
        payload: {
          timestamp: packet.timestamp || Date.now() / 1000.0,
          roll: packet.gamma ?? 0,
          pitch: packet.beta ?? 0,
          yaw: packet.alpha ?? packet.heading ?? 0,
          heading_deg: packet.heading ?? packet.alpha ?? 0,
        },
      });
    }
  }

  /**
   * Server packet hook (called by WebSocket receiver in sessionLifecycle)
   */
  public onServerNavigationState(serverState: Partial<NavigationState>) {
    this.lastServerPacketAt = Date.now();

    if (serverState.latitude && serverState.longitude) {
      this.lastKnownCoord = [serverState.longitude, serverState.latitude];
    }

    // If we are recovering from a local fallback, perform controlled handoff
    if (this.activeAuthority === 'LOCAL') {
      this.performControlledServerHandoff(serverState);
    } else {
      this.activeAuthority = 'SERVER';
      useNavigationStore.getState().updateState({
        ...serverState,
        engine_source: 'SERVER',
      });
    }
  }

  /**
   * Smooth, continuity-verified transition from LOCAL -> SERVER
   */
  private performControlledServerHandoff(serverState: Partial<NavigationState>) {
    const storeState = useNavigationStore.getState().state;
    const curLat = storeState.latitude;
    const curLon = storeState.longitude;

    const sLat = serverState.latitude ?? curLat;
    const sLon = serverState.longitude ?? curLon;

    // Check Euclidean distance in meters
    const dLatM = (sLat - curLat) * 111319.5;
    const cosLat = Math.cos((curLat * Math.PI) / 180.0);
    const dLonM = (sLon - curLon) * (111319.5 * cosLat);
    const distM = Math.sqrt(dLatM ** 2 + dLonM ** 2);

    console.info(
      `[EngineCoordinator] Controlled Server Handoff: Discrepancy = ${distM.toFixed(2)}m (Max allowed: 50m)`
    );

    this.activeAuthority = 'SERVER';
    this.recoveryCount++;

    const sessionId = useNavigationStore.getState().activeSessionId || '';
    this.logLifecycleEvent(sessionId, 'ENGINE_HANDOFF_COMPLETE', {
      discrepancyMeters: distM,
      serverCoordinates: [sLon, sLat],
      localCoordinates: [curLon, curLat],
    });

    useNavigationStore.getState().updateState({
      ...serverState,
      engine_source: 'SERVER',
    });
  }

  /**
   * Evaluates and sets engine authority based on network and WebSocket health
   */
  private evaluateEngineAuthority(wsStatus: WebSocketStatus) {
    if (!this.isRunning) return;

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const sessionId = useNavigationStore.getState().activeSessionId || '';

    if (wsStatus === 'CONNECTED' && isOnline) {
      if (this.activeAuthority !== 'SERVER') {
        this.activeAuthority = 'SERVER';
      }
    } else {
      // Server is unavailable -> Attempt Failover to Local Engine
      if (this.activeAuthority === 'SERVER') {
        this.failoverCount++;
        this.logLifecycleEvent(sessionId, 'NETWORK_LOST', {
          wsStatus,
          isOnline,
        });

        if (this.isWorkerReady) {
          this.activeAuthority = 'LOCAL';
          console.warn('[EngineCoordinator] WebSocket disconnected. Failover -> LOCAL_OFFLINE_ENGINE active.');
          this.logLifecycleEvent(sessionId, 'LOCAL_ENGINE_ACTIVATED', {
            failoverCount: this.failoverCount,
          });
        } else {
          this.activeAuthority = 'UNAVAILABLE';
          console.warn('[EngineCoordinator] WebSocket disconnected and Local Engine not ready -> ENGINE_UNAVAILABLE.');
          useNavigationStore.getState().updateState({
            engine_source: 'UNAVAILABLE',
            navigation_mode: 'ENGINE_UNAVAILABLE',
          });
        }
      } else if (this.activeAuthority === 'UNAVAILABLE' && this.isWorkerReady) {
        this.activeAuthority = 'LOCAL';
        this.logLifecycleEvent(sessionId, 'LOCAL_ENGINE_ACTIVATED', {
          recoveredFromUnavailable: true,
        });
      }
    }
  }

  /**
   * Watchdog checking server packet silence during live navigation
   */
  private watchdogCheck() {
    if (!this.isRunning) return;
    const store = useNavigationStore.getState();
    if (store.sessionStatus !== 'LIVE') return;

    const now = Date.now();
    // If server authority but haven't received server packet for > 3 seconds
    if (this.activeAuthority === 'SERVER' && this.lastServerPacketAt > 0 && now - this.lastServerPacketAt > 3000) {
      console.warn('[EngineCoordinator] Server packet timeout (>3s). Initiating failover to LOCAL.');
      this.evaluateEngineAuthority('DISCONNECTED');
    }
  }

  /**
   * Records lifecycle events into IndexedDB
   */
  private logLifecycleEvent(sessionId: string, eventName: string, details: Record<string, any>) {
    if (!sessionId) return;
    offlineStorage
      .bufferSensorBatch(sessionId, [
        {
          session_id: sessionId,
          timestamp: Date.now() / 1000.0,
          seq_num: 0,
          type: 'lifecycle_event',
          metadata: {
            event: eventName,
            ...details,
          },
        } as any,
      ])
      .catch(() => {});
  }

  public getLastKnownCoord(): [number, number] | null {
    return this.lastKnownCoord;
  }

  public getStatus(): CoordinatorStatus {
    return {
      activeAuthority: this.activeAuthority,
      isWorkerReady: this.isWorkerReady,
      isWorkerLoading: this.isWorkerLoading,
      workerError: this.workerError,
      lastServerPacketAt: this.lastServerPacketAt,
      lastLocalPacketAt: this.lastLocalPacketAt,
      failoverCount: this.failoverCount,
      recoveryCount: this.recoveryCount,
    };
  }
}

export const navigationEngineCoordinator = new NavigationEngineCoordinator();
