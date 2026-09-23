import { useNavigationStore } from '../../stores/useNavigationStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { sensorCollector } from '../sensors/sensorCollector';
import { navigationService, type EndSessionResponse } from '../api/navigationService';
import { tripMetadataService, type TripMetadata } from './tripMetadataService';
import { geocodingService } from '../location/geocodingService';
import { offlineStorage } from '../storage/offlineStorage';
import { navigationEngineCoordinator } from './navigationEngineCoordinator';

export class NavigationSessionLifecycle {
  private activeWs: WebSocket | null = null;
  private isTerminating = false;

  public async startLiveSession(
    vehicleType: string = 'CAR',
    routeCoords?: number[][] | null,
    roadName: string = 'Active Route',
    metadata?: Partial<TripMetadata>
  ): Promise<string> {
    const store = useNavigationStore.getState();
    if (store.sessionStatus === 'STARTING' || store.sessionStatus === 'LIVE') {
      console.warn('Session already starting or active');
      return store.activeSessionId || '';
    }

    store.setSessionStatus('STARTING');
    store.setErrorMessage(null);
    store.setJourneySummary(null);

    try {
      // 1. Get real location from global location store or route origin coordinates
      const loc = useLocationStore.getState();
      const startLat = loc.latitude ?? (metadata?.sourceCoords ? metadata.sourceCoords[1] : undefined);
      const startLon = loc.longitude ?? (metadata?.sourceCoords ? metadata.sourceCoords[0] : undefined);

      // 2. Create session on backend
      const res = await navigationService.startSession(vehicleType, startLat, startLon);
      const sessionId = res.session_id;

      // 3. Inject route geometry to backend MapMatcher if available
      if (sessionId && routeCoords && routeCoords.length >= 2) {
        try {
          await navigationService.loadSessionRoute(sessionId, routeCoords, roadName);
          console.info(`[SessionLifecycle] Injected route (${routeCoords.length} points) to session ${sessionId}`);
        } catch (routeErr) {
          console.warn('[SessionLifecycle] Non-blocking route injection notice:', routeErr);
        }
      }

      // 4. Resolve clean source name (preferring real place name over generic placeholder)
      let resolvedSourceName = metadata?.sourceName;
      if (!resolvedSourceName || resolvedSourceName === 'Start location' || resolvedSourceName === 'Unknown location') {
        if (loc.placeName && loc.placeName !== 'Start location') {
          resolvedSourceName = loc.placeName;
        } else if (startLat !== undefined && startLon !== undefined) {
          resolvedSourceName = geocodingService.getCachedName(startLat, startLon) || undefined;
        }
      }

      // 5. Save client-side rich trip metadata mapped to this sessionId
      if (sessionId) {
        tripMetadataService.saveTripMetadata({
          sessionId,
          sourceName: resolvedSourceName,
          destinationName: metadata?.destinationName || roadName,
          sourceCoords: metadata?.sourceCoords || (startLon !== undefined && startLat !== undefined ? [startLon, startLat] : undefined),
          destinationCoords: metadata?.destinationCoords,
          roadSummary: roadName !== 'Active Route' ? roadName : metadata?.roadSummary,
          distance_meters: metadata?.distance_meters,
          duration_seconds: metadata?.duration_seconds,
          geometry: (routeCoords as [number, number][]) || metadata?.geometry,
          travelMode: metadata?.travelMode,
          vehicleType: vehicleType,
          startedAt: new Date().toISOString(),
        });

        // If source name was not yet cached, resolve asynchronously and update metadata
        if (!resolvedSourceName && startLat !== undefined && startLon !== undefined) {
          geocodingService.reverseGeocode(startLat, startLon).then((name) => {
            if (name) {
              tripMetadataService.saveTripMetadata({
                sessionId,
                sourceName: name,
              });
            }
          });
        }
      }

      store.setSessionId(sessionId);
      store.setSessionStatus('LIVE');

      // 6. Start dual-engine coordinator (pre-warms local engine in parallel)
      const originPoint: [number, number] | undefined =
        startLon !== undefined && startLat !== undefined ? [startLon, startLat] : undefined;
      navigationEngineCoordinator.start(sessionId, originPoint);

      // 7. Open WebSocket stream
      this.openWebSocket(sessionId, routeCoords, roadName);

      return sessionId;
    } catch (err: any) {
      store.setSessionStatus('ERROR');
      store.setErrorMessage(err.message || 'Failed to start navigation session');
      throw err;
    }
  }

  public async endLiveSession(): Promise<EndSessionResponse | null> {
    const store = useNavigationStore.getState();
    const sessionId = store.activeSessionId;

    // Idempotent safeguard: if not live or already ending, don't re-run
    if (!sessionId || store.sessionStatus === 'ENDING') {
      return store.journeySummary;
    }

    if (this.isTerminating) return null;
    this.isTerminating = true;

    // 1. Immediately transition to ENDING to disable buttons and prevent duplicate clicks
    store.setSessionStatus('ENDING');

    try {
      // 2. Stop dual-engine coordinator and sensor collection
      navigationEngineCoordinator.stop();
      sensorCollector.stop();
      store.setSensorStreaming(false);

      // 3. Close WebSocket cleanly
      if (this.activeWs) {
        try {
          this.activeWs.close(1000, 'Session completed by user');
        } catch (e) {
          console.warn('WS close error:', e);
        }
        this.activeWs = null;
      }
      store.setWebsocketStatus('CLOSED');

      // 4. Tell backend to finalize session and persist summary in SQLite
      let summary: EndSessionResponse | null = null;
      try {
        summary = await navigationService.endSession(sessionId);
      } catch (endErr) {
        console.warn('[SessionLifecycle] Backend endSession call failed (offline/unreachable):', endErr);
      }

      // 5. Update local trip metadata with finalized distance & duration metrics
      if (summary) {
        tripMetadataService.updateTripMetrics(sessionId, summary.distance_m, summary.duration_s);
      }

      // 6. Store verified journey summary and mark ENDED
      store.setJourneySummary(summary);
      store.setSessionStatus('ENDED');

      // 7. Clear active session telemetry from Zustand
      store.clearActiveSession();

      return summary;
    } catch (err: any) {
      console.error('Error terminating navigation session:', err);
      // Even if network fails, ensure client resets cleanly
      store.clearActiveSession();
      store.setSessionStatus('IDLE');
      throw err;
    } finally {
      this.isTerminating = false;
    }
  }

  private openWebSocket(sessionId: string, routeCoords?: number[][] | null, roadName?: string) {
    const store = useNavigationStore.getState();
    store.setWebsocketStatus('CONNECTING');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/navigation/${sessionId}`;

    try {
      const ws = new WebSocket(wsUrl);
      this.activeWs = ws;

      ws.onopen = () => {
        store.setWebsocketStatus('CONNECTED');
        store.setSensorStreaming(true);

        // Send initial route geometry if available
        if (routeCoords && routeCoords.length >= 2) {
          ws.send(JSON.stringify({
            type: 'route',
            coordinates: routeCoords,
            road_name: roadName || 'Active Route',
            timestamp: Date.now() / 1000.0,
          }));
        }

        // Begin pushing real sensor measurements over WebSocket and buffering locally
        sensorCollector.start((packet) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(packet));
          } else {
            // Buffer locally if WS drops during live session
            if (packet.type === 'imu' && packet.accel_x !== undefined) {
              offlineStorage.bufferSensorBatch(sessionId, [{
                session_id: sessionId,
                timestamp: packet.timestamp || Date.now() / 1000.0,
                seq_num: packet.seq_num || 0,
                type: 'imu',
                imu: {
                  ax: packet.accel_x ?? 0,
                  ay: packet.accel_y ?? 0,
                  az: packet.accel_z ?? 0,
                  gx: packet.gyro_x ?? 0,
                  gy: packet.gyro_y ?? 0,
                  gz: packet.gyro_z ?? 0,
                },
              }]).catch(() => {});
            }
          }
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'navigation_state') {
            // Forward to Dual-Engine Coordinator to maintain server priority & continuity
            navigationEngineCoordinator.onServerNavigationState(data);
          }
        } catch (e) {
          console.error('Failed to parse navigation WS packet', e);
        }
      };

      ws.onclose = () => {
        store.setWebsocketStatus('CLOSED');
        if (store.sessionStatus === 'LIVE') {
          console.warn('[SessionLifecycle] WebSocket lost during live session. Local fallback engine taking over.');
        } else {
          sensorCollector.stop();
          store.setSensorStreaming(false);
        }
      };

      ws.onerror = (err) => {
        console.warn('Navigation WebSocket error:', err);
        store.setWebsocketStatus('ERROR');
      };
    } catch (e) {
      console.error('Failed to initialize WebSocket', e);
      store.setWebsocketStatus('ERROR');
    }
  }

  public getWebSocket(): WebSocket | null {
    return this.activeWs;
  }
}

export const sessionLifecycle = new NavigationSessionLifecycle();
