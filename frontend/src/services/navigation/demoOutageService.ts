/**
 * YatraSaarthi - Real GNSS Outage Demo Mode Service
 * 
 * Implements judge/engineering demonstration of real dead-reckoning pipeline:
 * 1. Intentionally suppresses outgoing GNSS packets via sensorCollector.setGnssSuppression(true)
 * 2. IMU packets continue streaming uninterrupted over WebSocket to backend
 * 3. Backend OutageManager naturally detects GNSS outage
 * 4. InEKF + E5 velocity + U2 uncertainty + NHC/ZUPT take over dead reckoning
 * 5. On "Restore GNSS", sensorCollector.setGnssSuppression(false) resumes GNSS packets
 * 6. Backend OutageManager enters GNSS_REACQUISITION and reacquires
 * 
 * Guaranteed safety:
 * - Automatically restores GNSS and cleans up timers on session termination, unmount, or stop.
 * - Never leaves GNSS suppression active after demo.
 * - Does NOT fake positions, does NOT animate coordinates, does NOT bypass backend.
 */

import { sensorCollector } from '../sensors/sensorCollector';

export type DemoOutageListener = (state: DemoOutageState) => void;

export interface DemoOutageState {
  isSimulating: boolean;
  outageSeconds: number;
}

export class DemoOutageService {
  private isSimulating = false;
  private outageSeconds = 0;
  private timer: any = null;
  private listeners = new Set<DemoOutageListener>();

  public getState(): DemoOutageState {
    return {
      isSimulating: this.isSimulating,
      outageSeconds: this.outageSeconds,
    };
  }

  public subscribe(listener: DemoOutageListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('[DemoOutageService] Listener error:', err);
      }
    });
  }

  /**
   * Start simulating GNSS outage by withholding GNSS packets.
   * IMU data continues streaming through normal sensorCollector.
   */
  public startOutage(): void {
    if (this.isSimulating) return;

    this.isSimulating = true;
    this.outageSeconds = 0;

    // Suppress GNSS packets in sensor collector (IMU packets continue unimpeded)
    sensorCollector.setGnssSuppression(true);

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.outageSeconds += 1;
      this.notify();
    }, 1000);

    this.notify();
    console.info('[DemoOutageService] Real GNSS suppression activated. IMU packets streaming to backend.');
  }

  /**
   * Restore GNSS stream.
   * Resumes broadcasting normalized GNSS packets to the active session WebSocket.
   */
  public restoreGnss(): void {
    if (!this.isSimulating) return;

    this.isSimulating = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Restore GNSS packet transmission
    sensorCollector.setGnssSuppression(false);

    this.notify();
    console.info('[DemoOutageService] GNSS restored. Satellite fix packets resuming to backend.');
  }

  /**
   * Toggle between simulated outage and restored GNSS.
   */
  public toggleOutage(): boolean {
    if (this.isSimulating) {
      this.restoreGnss();
      return false;
    } else {
      this.startOutage();
      return true;
    }
  }

  /**
   * Safety reset: ensure GNSS suppression is cleared and timer cancelled.
   */
  public reset(): void {
    this.isSimulating = false;
    this.outageSeconds = 0;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    sensorCollector.setGnssSuppression(false);
    this.notify();
  }
}

export const demoOutageService = new DemoOutageService();
