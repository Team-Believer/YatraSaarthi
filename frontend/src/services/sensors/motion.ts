/**
 * YatraSaarthi - Real DeviceMotion Collector
 * 
 * Subscribes to window.devicemotion for real accelerometer and gyroscope data.
 */
import { sensorClock } from './sensorClock';

export interface MotionData {
  timestamp: number;
  accel_x: number | null;
  accel_y: number | null;
  accel_z: number | null;
  gyro_x: number | null;
  gyro_y: number | null;
  gyro_z: number | null;
}

export type MotionCallback = (data: MotionData) => void;

export class MotionCollector {
  private onData: MotionCallback | null = null;
  private isRunning = false;

  public start(onData: MotionCallback) {
    if (!('DeviceMotionEvent' in window)) {
      console.warn('DeviceMotionEvent not supported');
      return;
    }

    this.onData = onData;
    if (!this.isRunning) {
      window.addEventListener('devicemotion', this.handleMotion, true);
      this.isRunning = true;
    }
  }

  public stop() {
    if (this.isRunning) {
      window.removeEventListener('devicemotion', this.handleMotion, true);
      this.isRunning = false;
    }
    this.onData = null;
  }

  private handleMotion = (event: DeviceMotionEvent) => {
    if (!this.onData) return;

    // Use event timestamp (high-res DOMHighResTimeStamp, relative to timeOrigin)
    const timestampSeconds = sensorClock.toUnixSeconds(event.timeStamp);

    // Prefer acceleration (without gravity) if available, otherwise include gravity
    // The IDR engine will handle gravity compensation if it has to.
    const accel = event.acceleration || event.accelerationIncludingGravity;
    const gyro = event.rotationRate;

    this.onData({
      timestamp: timestampSeconds,
      accel_x: accel?.x ?? null,
      accel_y: accel?.y ?? null,
      accel_z: accel?.z ?? null,
      
      // Convert deg/s (browser standard) to rad/s (IDR standard) if possible, 
      // but typically we'll normalize in sensorNormalizer.ts.
      // We pass the raw values here.
      gyro_x: gyro?.alpha ?? null,
      gyro_y: gyro?.beta ?? null,
      gyro_z: gyro?.gamma ?? null,
    });
  };
}
