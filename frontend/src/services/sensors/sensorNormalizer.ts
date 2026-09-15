/**
 * YatraSaarthi - Sensor Normalizer
 * 
 * Validates and normalizes raw sensor measurements into a uniform payload
 * suitable for WebSocket transmission to the IDR engine.
 */

export interface NormalizedSensorPacket {
  type: 'gnss' | 'imu' | 'orientation' | 'combined';
  timestamp: number;
  seq_num: number;
  
  // GNSS
  latitude?: number;
  longitude?: number;
  altitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  
  // IMU
  accel_x?: number;
  accel_y?: number;
  accel_z?: number;
  gyro_x?: number;
  gyro_y?: number;
  gyro_z?: number;
  
  // Orientation
  alpha?: number;
  beta?: number;
  gamma?: number;

  capabilities?: Record<string, boolean>;
}

export class SensorNormalizer {
  private seqNum = 0;

  public normalizeGnss(data: any): NormalizedSensorPacket {
    this.seqNum++;
    return {
      type: 'gnss',
      timestamp: data.timestamp,
      seq_num: this.seqNum,
      latitude: data.latitude,
      longitude: data.longitude,
      altitude: data.altitude,
      accuracy: data.accuracy,
      speed: data.speed,
      heading: data.heading,
    };
  }

  public normalizeImu(data: any): NormalizedSensorPacket {
    this.seqNum++;
    
    // Browser gives rotationRate in deg/s. IDR engine expects rad/s.
    const deg2rad = Math.PI / 180.0;
    
    return {
      type: 'imu',
      timestamp: data.timestamp,
      seq_num: this.seqNum,
      accel_x: data.accel_x,
      accel_y: data.accel_y,
      accel_z: data.accel_z,
      gyro_x: data.gyro_x !== null ? data.gyro_x * deg2rad : undefined,
      gyro_y: data.gyro_y !== null ? data.gyro_y * deg2rad : undefined,
      gyro_z: data.gyro_z !== null ? data.gyro_z * deg2rad : undefined,
    };
  }

  public normalizeOrientation(data: any): NormalizedSensorPacket {
    this.seqNum++;
    return {
      type: 'orientation',
      timestamp: data.timestamp,
      seq_num: this.seqNum,
      alpha: data.alpha,
      beta: data.beta,
      gamma: data.gamma,
    };
  }
}
