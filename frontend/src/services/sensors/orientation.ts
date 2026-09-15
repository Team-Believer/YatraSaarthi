/**
 * YatraSaarthi - Real DeviceOrientation Collector
 * 
 * Subscribes to window.deviceorientation for magnetic heading and tilt.
 */
import { sensorClock } from './sensorClock';

export interface OrientationData {
  timestamp: number;
  alpha: number | null; // Compass heading
  beta: number | null;  // Front-back tilt
  gamma: number | null; // Left-right tilt
}

export type OrientationCallback = (data: OrientationData) => void;

export class OrientationCollector {
  private onData: OrientationCallback | null = null;
  private isRunning = false;

  public start(onData: OrientationCallback) {
    if (!('DeviceOrientationEvent' in window)) {
      console.warn('DeviceOrientationEvent not supported');
      return;
    }

    this.onData = onData;
    const win = window as any;
    if (!this.isRunning) {
      if ('ondeviceorientationabsolute' in win) {
        win.addEventListener('deviceorientationabsolute', this.handleOrientation, true);
      } else if ('addEventListener' in win) {
        win.addEventListener('deviceorientation', this.handleOrientation, true);
      }
      this.isRunning = true;
    }
  }

  public stop() {
    const win = window as any;
    if (this.isRunning) {
      if ('ondeviceorientationabsolute' in win) {
        win.removeEventListener('deviceorientationabsolute', this.handleOrientation, true);
      } else if ('removeEventListener' in win) {
        win.removeEventListener('deviceorientation', this.handleOrientation, true);
      }
      this.isRunning = false;
    }
    this.onData = null;
  }



  private handleOrientation = (event: DeviceOrientationEvent) => {
    if (!this.onData) return;

    const timestampSeconds = sensorClock.toUnixSeconds(event.timeStamp);

    this.onData({
      timestamp: timestampSeconds,
      alpha: event.alpha ?? null,
      beta: event.beta ?? null,
      gamma: event.gamma ?? null,
    });
  };
}
