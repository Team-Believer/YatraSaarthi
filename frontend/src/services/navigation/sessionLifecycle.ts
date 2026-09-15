import { useNavigationStore } from '../../stores/useNavigationStore';
import { useLocationStore } from '../../stores/useLocationStore';
import { sensorCollector } from '../sensors/sensorCollector';
import { navigationService, type EndSessionResponse } from '../api/navigationService';

export class NavigationSessionLifecycle {
  private activeWs: WebSocket | null = null;
  private isTerminating = false;

  public async startLiveSession(vehicleType: string = 'CAR'): Promise<string> {
    const store = useNavigationStore.getState();
    if (store.sessionStatus === 'STARTING' || store.sessionStatus === 'LIVE') {
      console.warn('Session already starting or active');
      return store.activeSessionId || '';
    }

    store.setSessionStatus('STARTING');
    store.setErrorMessage(null);
    store.setJourneySummary(null);

    try {
      // 1. Get real location from global location store
      const loc = useLocationStore.getState();
      const startLat = loc.latitude ?? undefined;
      const startLon = loc.longitude ?? undefined;

      // 2. Create session on backend
      const res = await navigationService.startSession(vehicleType, startLat, startLon);
      const sessionId = res.session_id;

      store.setSessionId(sessionId);
      store.setSessionStatus('LIVE');

      // 3. Open WebSocket stream
      this.openWebSocket(sessionId);

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
      // 2. Stop sensor collection & listeners immediately
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
      const summary = await navigationService.endSession(sessionId);

      // 5. Store verified journey summary and mark ENDED
      store.setJourneySummary(summary);
      store.setSessionStatus('ENDED');

      // 6. Clear active session telemetry from Zustand
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

  private openWebSocket(sessionId: string) {
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

        // Begin pushing real sensor measurements over WebSocket
        sensorCollector.start((packet) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(packet));
          }
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'navigation_state') {
            store.updateState(data);
          }
        } catch (e) {
          console.error('Failed to parse navigation WS packet', e);
        }
      };

      ws.onclose = () => {
        store.setWebsocketStatus('CLOSED');
        sensorCollector.stop();
        store.setSensorStreaming(false);
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
