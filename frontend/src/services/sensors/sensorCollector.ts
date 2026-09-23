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
  
  private subscribers = new Set<PacketCallback>();
  private isRunning = false;
  private gnssSuppressed = false;

  public setGnssSuppression(suppressed: boolean) {
    this.gnssSuppressed = suppressed;
  }

  public isGnssSuppressed(): boolean {
    return this.gnssSuppressed;
  }

  public subscribe(callback: PacketCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  public async start(onPacket?: PacketCallback) {
    if (onPacket) {
      this.subscribers.add(onPacket);
    }
    if (this.isRunning) return;
    this.isRunning = true;

    // Detect capabilities and report them
    const caps = detectSensorCapabilities();
    const store = useSensorStore.getState();
    store.updateCapabilities(caps);

    // Initial packet with capabilities
    this.broadcast({
      type: 'combined',
      timestamp: Date.now() / 1000.0,
      seq_num: 0,
      capabilities: caps as any,
    });

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
    this.subscribers.clear();
    this.gnssSuppressed = false;
  }

  private broadcast(packet: NormalizedSensorPacket) {
    this.subscribers.forEach((cb) => {
      try {
        cb(packet);
      } catch (err) {
        console.error('[SensorCollector] Subscriber dispatch error:', err);
      }
    });
  }

  private handleGeoData = (data: GeolocationData) => {
    if (this.gnssSuppressed || this.subscribers.size === 0) return;
    const packet = this.normalizer.normalizeGnss(data);
    this.broadcast(packet);
  };

  private handleMotionData = (data: MotionData) => {
    if (this.subscribers.size === 0) return;
    const packet = this.normalizer.normalizeImu(data);
    this.broadcast(packet);
  };

  private handleOrientationData = (data: OrientationData) => {
    if (this.subscribers.size === 0) return;
    const packet = this.normalizer.normalizeOrientation(data);
    this.broadcast(packet);
  };
}

// Export singleton instance
export const sensorCollector = new SensorCollectorSubsystem();
