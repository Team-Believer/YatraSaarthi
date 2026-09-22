/**
 * YatraSaarthi - Master Sensor Collector
 * 
 * Coordinates all raw sensor streams, normalizes them, and sends them
 * via WebSocket to the backend IDR engine.
 */
import { GeolocationCollector, type GeolocationData } from './geolocation';
import { MotionCollector, type MotionData } from './motion';
import { OrientationCollector, type OrientationData } from './orientation';
import { SensorNormalizer, type NormalizedSensorPacket } from './sensorNormalizer';
import { detectSensorCapabilities } from './sensorCapabilities';
import { requestGeolocationPermission, requestMotionPermission, requestOrientationPermission } from './sensorPermissions';
import { useSensorStore } from '../../stores/useSensorStore';


export type PacketCallback = (packet: NormalizedSensorPacket) => void;

export class SensorCollectorSubsystem {
  private geo = new GeolocationCollector();
  private motion = new MotionCollector();
  private orientation = new OrientationCollector();
  private normalizer = new SensorNormalizer();
  
  private onPacket: PacketCallback | null = null;
  private isRunning = false;
  private gnssSuppressed = false;

  public setGnssSuppression(suppressed: boolean) {
    this.gnssSuppressed = suppressed;
  }

  public isGnssSuppressed(): boolean {
    return this.gnssSuppressed;
  }

  public async start(onPacket: PacketCallback) {
    if (this.isRunning) return;
    this.onPacket = onPacket;
    this.isRunning = true;

    // Detect capabilities and report them
    const caps = detectSensorCapabilities();
    const store = useSensorStore.getState();
    store.updateCapabilities(caps);

    // Initial packet with capabilities
    if (this.onPacket) {
      this.onPacket({
        type: 'combined',
        timestamp: Date.now() / 1000.0,
        seq_num: 0,
        capabilities: caps as any
      });
    }

    // Geolocation
    if (caps.geolocation) {
      const p = await requestGeolocationPermission();
      store.updatePermission('geolocation', p);
      if (p === 'GRANTED') {
        this.geo.start(
          this.handleGeoData,
          (err) => console.error('Geo error:', err)
        );
      }
    }

    // Motion (IMU)
    if (caps.deviceMotion) {
      const p = await requestMotionPermission();
      store.updatePermission('deviceMotion', p);
      if (p === 'GRANTED') {
        this.motion.start(this.handleMotionData);
      }
    }

    // Orientation
    if (caps.deviceOrientation) {
      const p = await requestOrientationPermission();
      store.updatePermission('deviceOrientation', p);
      if (p === 'GRANTED') {
        this.orientation.start(this.handleOrientationData);
      }
    }
  }

  public stop() {
    this.geo.stop();
    this.motion.stop();
    this.orientation.stop();
    this.isRunning = false;
    this.onPacket = null;
    this.gnssSuppressed = false;
  }

  private handleGeoData = (data: GeolocationData) => {
    if (!this.onPacket || this.gnssSuppressed) return;
    const packet = this.normalizer.normalizeGnss(data);
    this.onPacket(packet);
  };

  private handleMotionData = (data: MotionData) => {
    if (!this.onPacket) return;
    const packet = this.normalizer.normalizeImu(data);
    this.onPacket(packet);
  };

  private handleOrientationData = (data: OrientationData) => {
    if (!this.onPacket) return;
    const packet = this.normalizer.normalizeOrientation(data);
    this.onPacket(packet);
  };
}

// Export singleton instance
export const sensorCollector = new SensorCollectorSubsystem();
