/**
 * YatraSaarthi - Offline Session Recording & Export Service
 *
 * Manages local, resilient field-test session recording when network
 * is unavailable or during controlled offline benchmark tests.
 *
 * Directs sensor streams into IndexedDB with high-throughput buffered writes.
 * Generates standardized JSON exports with `data_source: "LOCAL_OFFLINE_SESSION"`.
 */

import { offlineStorage, type OfflineSessionRecord, type SensorLogEntry } from '../storage/offlineStorage';
import { sensorCollector } from '../sensors/sensorCollector';
import type { NormalizedSensorPacket } from '../sensors/sensorNormalizer';

class OfflineSessionService {
  private activeSessionId: string | null = null;
  private isRecording = false;
  private startTime: number = 0;
  private packetBuffer: Omit<SensorLogEntry, 'id'>[] = [];
  private flushTimer: any = null;
  private seqNum = 0;
  private gnssObservationsCount = 0;
  private lastKnownCoord: [number, number] | null = null;
  private totalEstimatedDistanceM = 0;

  public isSessionActive(): boolean {
    return this.isRecording;
  }

  public getActiveSessionId(): string | null {
    return this.activeSessionId;
  }

  /**
   * Starts a resilient local offline recording session
   */
  public async startOfflineSession(options: {
    vehicleType?: string;
    routeName?: string;
    sourceName?: string;
    destinationName?: string;
    geometry?: [number, number][];
  } = {}): Promise<string> {
    if (this.isRecording) {
      return this.activeSessionId || '';
    }

    const sessionId = `local-offline-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.activeSessionId = sessionId;
    this.isRecording = true;
    this.startTime = Date.now();
    this.seqNum = 0;
    this.gnssObservationsCount = 0;
    this.packetBuffer = [];
    this.lastKnownCoord = null;
    this.totalEstimatedDistanceM = 0;

    const initialRecord: OfflineSessionRecord = {
      session_id: sessionId,
      started_at: new Date(this.startTime).toISOString(),
      source: 'LOCAL_OFFLINE_SESSION',
      network_state: typeof navigator !== 'undefined' && navigator.onLine ? 'ONLINE' : 'OFFLINE',
      gnss_state: 'AVAILABLE',
      engine_state: 'LOCAL_OFFLINE_ENGINE',
      vehicle_type: options.vehicleType || 'CAR',
      route_name: options.routeName || 'Field Test / Offline Route',
      source_name: options.sourceName || 'Local Origin',
      destination_name: options.destinationName || 'Local Destination',
      geometry: options.geometry,
      packet_count: 0,
      gnss_fix_count: 0,
      sync_status: 'PENDING_SYNC',
      export_version: '1.0.0',
      summary_metrics: {
        total_duration_s: 0,
        estimated_distance_m: 0,
        sample_rate_hz: 0,
      },
    };

    // 1. Store initial metadata record in IndexedDB
    await offlineStorage.saveOfflineSession(initialRecord);

    // 2. Start sensor collection decoupled from WebSocket
    await sensorCollector.start((packet: NormalizedSensorPacket) => {
      this.handleIncomingSensorPacket(packet);
    });

    // 3. Periodic flush timer (every 1 second)
    this.flushTimer = setInterval(() => {
      this.flushBuffer();
    }, 1000);

    return sessionId;
  }

  /**
   * Handles incoming normalized sensor packets and adds to buffer
   */
  private handleIncomingSensorPacket(packet: NormalizedSensorPacket) {
    if (!this.isRecording || !this.activeSessionId) return;

    this.seqNum += 1;

    let logEntry: Omit<SensorLogEntry, 'id'> = {
      session_id: this.activeSessionId,
      timestamp: packet.timestamp || Date.now() / 1000.0,
      seq_num: this.seqNum,
      type: packet.type,
    };

    if (packet.type === 'imu' && packet.accel_x !== undefined) {
      logEntry.imu = {
        ax: packet.accel_x ?? 0,
        ay: packet.accel_y ?? 0,
        az: packet.accel_z ?? 0,
        gx: packet.gyro_x ?? 0,
        gy: packet.gyro_y ?? 0,
        gz: packet.gyro_z ?? 0,
      };
    } else if (packet.type === 'gnss' && packet.latitude !== undefined && packet.longitude !== undefined) {
      this.gnssObservationsCount += 1;
      logEntry.gnss = {
        lat: packet.latitude,
        lon: packet.longitude,
        alt: packet.altitude,
        accuracy: packet.accuracy,
        speed: packet.speed,
        heading: packet.heading,
      };

      // Accumulate rough distance if coordinates valid
      if (this.lastKnownCoord) {
        const d = this.calculateHaversineDistance(
          this.lastKnownCoord[1],
          this.lastKnownCoord[0],
          packet.latitude,
          packet.longitude
        );
        if (d > 0.5 && d < 1000) {
          this.totalEstimatedDistanceM += d;
        }
      }
      this.lastKnownCoord = [packet.longitude, packet.latitude];
    } else if (packet.type === 'orientation' && packet.alpha !== undefined) {
      logEntry.orientation = {
        alpha: packet.alpha,
        beta: packet.beta,
        gamma: packet.gamma,
        compass_heading: packet.alpha,
      };
    }

    this.packetBuffer.push(logEntry);

    // If buffer reaches 50 items, trigger immediate flush
    if (this.packetBuffer.length >= 50) {
      this.flushBuffer();
    }
  }

  /**
   * Flushes in-memory packet buffer to IndexedDB
   */
  private async flushBuffer() {
    if (!this.packetBuffer.length || !this.activeSessionId) return;

    const toFlush = [...this.packetBuffer];
    this.packetBuffer = [];

    try {
      await offlineStorage.bufferSensorBatch(this.activeSessionId, toFlush);
    } catch (err) {
      console.warn('[OfflineSessionService] Error flushing sensor buffer:', err);
    }
  }

  /**
   * Ends the local offline session and finalizes summary metrics
   */
  public async stopOfflineSession(): Promise<OfflineSessionRecord | null> {
    if (!this.isRecording || !this.activeSessionId) return null;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush any remaining packets
    await this.flushBuffer();

    // Stop sensors
    sensorCollector.stop();

    const endTime = Date.now();
    const durationSeconds = Math.max(1, (endTime - this.startTime) / 1000);
    const sampleRateHz = Math.round((this.seqNum / durationSeconds) * 10) / 10;

    const existing = await offlineStorage.getOfflineSession(this.activeSessionId);
    if (!existing) {
      this.isRecording = false;
      this.activeSessionId = null;
      return null;
    }

    const finalized: OfflineSessionRecord = {
      ...existing,
      ended_at: new Date(endTime).toISOString(),
      packet_count: this.seqNum,
      gnss_fix_count: this.gnssObservationsCount,
      summary_metrics: {
        total_duration_s: Math.round(durationSeconds),
        estimated_distance_m: Math.round(this.totalEstimatedDistanceM),
        avg_speed_mps:
          durationSeconds > 0 ? Math.round((this.totalEstimatedDistanceM / durationSeconds) * 10) / 10 : 0,
        sample_rate_hz: sampleRateHz,
      },
    };

    await offlineStorage.updateOfflineSession(finalized);

    this.isRecording = false;
    this.activeSessionId = null;

    return finalized;
  }

  /**
   * Export an offline session as downloadable JSON
   */
  public async exportSession(sessionId: string): Promise<string> {
    return offlineStorage.exportSessionAsJson(sessionId);
  }

  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

export const offlineSessionService = new OfflineSessionService();
