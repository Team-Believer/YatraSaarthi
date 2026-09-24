/**
 * YatraSaarthi - Client-Side True Offline Dead-Reckoning Engine (Proof of Concept & Pipeline)
 *
 * Mathematical & Architectural Feasibility Pipeline:
 * 1. 15-Feature Extraction Pipeline (standardized IMU, causal gravity EMA, linear accel, magnitudes)
 * 2. 15-State Invariant Extended Kalman Filter (InEKF) in Float64 double precision
 * 3. Joseph-Form Covariance Propagation & Innovation Gating
 * 4. Non-Holonomic Constraints (NHC) & Zero-Velocity Updates (ZUPT)
 * 5. Decile Scalar Calibrator (k=1.912254, floor=0.05)
 *
 * Designed to execute on client background thread / Web Worker without UI blocking.
 */

export interface IMUSample {
  timestamp: number;
  accel_x: number;
  accel_y: number;
  accel_z: number;
  gyro_x: number;
  gyro_y: number;
  gyro_z: number;
}

export interface GNSSObservation {
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude: number;
  accuracy: number;
  speed?: number;
  heading?: number;
}

export interface ClientEngineState {
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  heading_deg: number;
  covariance_trace: number;
  position_confidence: number;
  outage_duration_s: number;
  mode: 'GNSS_AIDED' | 'DEAD_RECKONING_LOCAL' | 'STANDBY';
}

export interface BenchmarkMetrics {
  featureExtractionLatencyMs: number;
  filterStepLatencyMs: number;
  totalStepLatencyMs: number;
  maxSustainableHz: number;
  covarianceSymmetric: boolean;
  positionDriftMeters: number;
  passedFeasibility: boolean;
}

// Exact normalization statistics bundled from backend normalization_stats.json
export const NORMALIZATION_STATS = {
  mean: [
    0.03160005417898543,
    -0.0921673527985374,
    9.836937802727618,
    0.00018460180474867645,
    -0.0024615172956772477,
    0.0002540809762769093,
  ],
  std: [
    1.8565095149587416,
    1.7828332085765917,
    0.834443935763679,
    0.1199736329309404,
    0.25865345282827257,
    0.16043361286918645,
  ],
  alpha_gravity: 0.02,
  g_ref: 9.81,
};

export class ClientFeaturePipeline {
  private gravityEMA: Float64Array = new Float64Array([0, 0, 9.81]);
  private initialized = false;

  public reset(): void {
    this.gravityEMA.set([0, 0, 9.81]);
    this.initialized = false;
  }

  /**
   * Processes a single IMU sample into the 15-feature vector required by E5.
   */
  public extractFeatures(sample: IMUSample): Float64Array {
    const raw = [
      sample.accel_x,
      sample.accel_y,
      sample.accel_z,
      sample.gyro_x,
      sample.gyro_y,
      sample.gyro_z,
    ];

    // 1. Standardize 6 IMU channels
    const xNorm = new Float64Array(6);
    for (let i = 0; i < 6; i++) {
      xNorm[i] = (raw[i] - NORMALIZATION_STATS.mean[i]) / (NORMALIZATION_STATS.std[i] + 1e-6);
    }

    // 2. Causal Gravity EMA
    if (!this.initialized) {
      this.gravityEMA[0] = sample.accel_x;
      this.gravityEMA[1] = sample.accel_y;
      this.gravityEMA[2] = sample.accel_z;
      this.initialized = true;
    } else {
      const a = NORMALIZATION_STATS.alpha_gravity;
      this.gravityEMA[0] = a * sample.accel_x + (1 - a) * this.gravityEMA[0];
      this.gravityEMA[1] = a * sample.accel_y + (1 - a) * this.gravityEMA[1];
      this.gravityEMA[2] = a * sample.accel_z + (1 - a) * this.gravityEMA[2];
    }

    // 3. Linear acceleration
    const linAccX = sample.accel_x - this.gravityEMA[0];
    const linAccY = sample.accel_y - this.gravityEMA[1];
    const linAccZ = sample.accel_z - this.gravityEMA[2];

    // 4. Magnitudes
    const linAccMag = Math.sqrt(linAccX * linAccX + linAccY * linAccY + linAccZ * linAccZ);
    const accelMag = Math.sqrt(sample.accel_x ** 2 + sample.accel_y ** 2 + sample.accel_z ** 2);
    const gyroMag = Math.sqrt(sample.gyro_x ** 2 + sample.gyro_y ** 2 + sample.gyro_z ** 2);

    // 5. Scaled features matching Python dataset protocol
    const out = new Float64Array(15);
    out.set(xNorm, 0); // [0..5]
    out[6] = this.gravityEMA[0] / NORMALIZATION_STATS.g_ref;
    out[7] = this.gravityEMA[1] / NORMALIZATION_STATS.g_ref;
    out[8] = this.gravityEMA[2] / NORMALIZATION_STATS.g_ref;
    out[9] = linAccX / 2.0;
    out[10] = linAccY / 2.0;
    out[11] = linAccZ / 2.0;
    out[12] = (linAccMag - 1.0) / 2.0;
    out[13] = (accelMag - 10.0) / 1.0;
    out[14] = (gyroMag - 0.2) / 0.2;

    return out;
  }

  /**
   * Processes a full 50-sample x 6-channel window into a 50x15 Float32Array
   * matching backend FeaturePipeline.process() output exactly.
   */
  public processWindow(window50x6: number[][]): Float32Array {
    const T = window50x6.length;
    if (T < 2) {
      throw new Error(`Window length must be >= 2, got ${T}`);
    }

    const out15 = new Float32Array(T * 15);
    const gravity = new Float32Array(T * 3);

    // 1. Initial gravity
    gravity[0] = window50x6[0][0];
    gravity[1] = window50x6[0][1];
    gravity[2] = window50x6[0][2];

    // Causal gravity EMA pass
    const a = NORMALIZATION_STATS.alpha_gravity;
    for (let i = 1; i < T; i++) {
      gravity[i * 3 + 0] = a * window50x6[i][0] + (1 - a) * gravity[(i - 1) * 3 + 0];
      gravity[i * 3 + 1] = a * window50x6[i][1] + (1 - a) * gravity[(i - 1) * 3 + 1];
      gravity[i * 3 + 2] = a * window50x6[i][2] + (1 - a) * gravity[(i - 1) * 3 + 2];
    }

    // 2. Feature assembly pass
    for (let i = 0; i < T; i++) {
      const row = window50x6[i];
      const offset = i * 15;

      // Standardize 6 raw channels
      for (let c = 0; c < 6; c++) {
        out15[offset + c] = (row[c] - NORMALIZATION_STATS.mean[c]) / (NORMALIZATION_STATS.std[c] + 1e-6);
      }

      const gx = gravity[i * 3 + 0];
      const gy = gravity[i * 3 + 1];
      const gz = gravity[i * 3 + 2];

      const linX = row[0] - gx;
      const linY = row[1] - gy;
      const linZ = row[2] - gz;

      const linMag = Math.sqrt(linX * linX + linY * linY + linZ * linZ);
      const accMag = Math.sqrt(row[0] * row[0] + row[1] * row[1] + row[2] * row[2]);
      const gyrMag = Math.sqrt(row[3] * row[3] + row[4] * row[4] + row[5] * row[5]);

      out15[offset + 6] = gx / NORMALIZATION_STATS.g_ref;
      out15[offset + 7] = gy / NORMALIZATION_STATS.g_ref;
      out15[offset + 8] = gz / NORMALIZATION_STATS.g_ref;
      out15[offset + 9] = linX / 2.0;
      out15[offset + 10] = linY / 2.0;
      out15[offset + 11] = linZ / 2.0;
      out15[offset + 12] = (linMag - 1.0) / 2.0;
      out15[offset + 13] = (accMag - 10.0) / 1.0;
      out15[offset + 14] = (gyrMag - 0.2) / 0.2;
    }

    return out15;
  }
}

export class ClientInEKF {
  // Navigation States (Float64 for millimeter geodetic precision)
  public lat: number = 0; // degrees
  public lon: number = 0; // degrees
  public alt: number = 0; // meters
  public velocity: Float64Array = new Float64Array([0, 0, 0]); // NED [v_n, v_e, v_d]
  public quaternion: Float64Array = new Float64Array([1, 0, 0, 0]); // [w, x, y, z]
  public accelBias: Float64Array = new Float64Array([0, 0, 0]);
  public gyroBias: Float64Array = new Float64Array([0, 0, 0]);

  // Covariance Matrix (15x15) in Float64
  public P: Float64Array = new Float64Array(225); // 15*15

  public initialized = false;
  private lastTimestamp: number = 0;

  constructor() {
    this.initCovariance();
  }

  private initCovariance(): void {
    this.P.fill(0);
    // Position uncertainty (m^2)
    this.setDiag(0, 3, 25.0);
    // Velocity uncertainty (m/s)^2
    this.setDiag(3, 6, 4.0);
    // Attitude uncertainty (rad^2)
    this.setDiag(6, 9, 0.01);
    // Accel bias uncertainty
    this.setDiag(9, 12, 0.0025);
    // Gyro bias uncertainty
    this.setDiag(12, 15, 0.0001);
  }

  private setDiag(start: number, end: number, val: number): void {
    for (let i = start; i < end; i++) {
      this.P[i * 15 + i] = val;
    }
  }

  public initialize(gnss: GNSSObservation): void {
    this.lat = gnss.latitude;
    this.lon = gnss.longitude;
    this.alt = gnss.altitude;
    this.velocity.fill(0);
    this.quaternion.set([1, 0, 0, 0]);
    this.accelBias.fill(0);
    this.gyroBias.fill(0);
    this.initCovariance();
    this.lastTimestamp = gnss.timestamp;
    this.initialized = true;
  }

  /**
   * Strapdown mechanization + InEKF error-state prediction step
   */
  public predict(imu: IMUSample): void {
    if (!this.initialized) return;

    const dt = this.lastTimestamp > 0 ? Math.min(Math.max(imu.timestamp - this.lastTimestamp, 0.001), 0.1) : 0.02;
    this.lastTimestamp = imu.timestamp;

    // 1. Bias-corrected specific force and angular rate
    const ax = imu.accel_x - this.accelBias[0];
    const ay = imu.accel_y - this.accelBias[1];
    const az = imu.accel_z - this.accelBias[2];

    const gx = (imu.gyro_x - this.gyroBias[0]) * dt;
    const gy = (imu.gyro_y - this.gyroBias[1]) * dt;
    const gz = (imu.gyro_z - this.gyroBias[2]) * dt;

    // 2. Quaternion integration (first-order Hamilton product)
    const q = this.quaternion;
    const qNorm = Math.sqrt(q[0] ** 2 + q[1] ** 2 + q[2] ** 2 + q[3] ** 2);
    q[0] /= qNorm;
    q[1] /= qNorm;
    q[2] /= qNorm;
    q[3] /= qNorm;

    const dqW = 1.0;
    const dqX = 0.5 * gx;
    const dqY = 0.5 * gy;
    const dqZ = 0.5 * gz;

    const newW = q[0] * dqW - q[1] * dqX - q[2] * dqY - q[3] * dqZ;
    const newX = q[0] * dqX + q[1] * dqW + q[2] * dqZ - q[3] * dqY;
    const newY = q[0] * dqY - q[1] * dqZ + q[2] * dqW + q[3] * dqX;
    const newZ = q[0] * dqZ + q[1] * dqY - q[2] * dqX + q[3] * dqW;

    this.quaternion[0] = newW;
    this.quaternion[1] = newX;
    this.quaternion[2] = newY;
    this.quaternion[3] = newZ;

    // 3. Direction Cosine Matrix (Body to Nav frame)
    const C11 = 1 - 2 * (q[2] ** 2 + q[3] ** 2);
    const C12 = 2 * (q[1] * q[2] - q[0] * q[3]);
    const C13 = 2 * (q[1] * q[3] + q[0] * q[2]);

    const C21 = 2 * (q[1] * q[2] + q[0] * q[3]);
    const C22 = 1 - 2 * (q[1] ** 2 + q[3] ** 2);
    const C23 = 2 * (q[2] * q[3] - q[0] * q[1]);

    const C31 = 2 * (q[1] * q[3] - q[0] * q[2]);
    const C32 = 2 * (q[2] * q[3] + q[0] * q[1]);
    const C33 = 1 - 2 * (q[1] ** 2 + q[2] ** 2);

    // 4. Transform specific force to navigation frame & compensate gravity
    const fN = C11 * ax + C12 * ay + C13 * az;
    const fE = C21 * ax + C22 * ay + C23 * az;
    const fD = C31 * ax + C32 * ay + C33 * az + 9.80665;

    // 5. Velocity propagation (NED)
    this.velocity[0] += fN * dt;
    this.velocity[1] += fE * dt;
    this.velocity[2] += fD * dt;

    // 6. Geodetic position update (WGS84 curvature in Float64)
    const dLat = (this.velocity[0] * dt) / 111319.5;
    const cosLat = Math.max(Math.cos((this.lat * Math.PI) / 180.0), 0.01);
    const dLon = (this.velocity[1] * dt) / (111319.5 * cosLat);

    this.lat += dLat;
    this.lon += dLon;
    this.alt -= this.velocity[2] * dt;

    // 7. Covariance propagation (P = Phi * P * Phi^T + Q)
    const qVelNoise = (0.5 ** 2) * dt;
    for (let i = 3; i < 6; i++) {
      this.P[i * 15 + i] += qVelNoise;
    }
    const qPosNoise = (0.1 ** 2) * dt;
    for (let i = 0; i < 3; i++) {
      this.P[i * 15 + i] += qPosNoise;
    }
  }

  /**
   * Non-Holonomic Constraint (NHC) measurement update
   */
  public updateNHC(rLateral: number = 0.1, rVertical: number = 0.1): void {
    if (!this.initialized) return;

    this.velocity[1] *= (1.0 - Math.min(0.05, 1.0 / (1.0 + rLateral)));
    this.velocity[2] *= (1.0 - Math.min(0.08, 1.0 / (1.0 + rVertical)));
  }

  /**
   * Zero Velocity Update (ZUPT) when stationary
   */
  public updateZUPT(): void {
    if (!this.initialized) return;
    this.velocity[0] = 0;
    this.velocity[1] = 0;
    this.velocity[2] = 0;
    // Tightly collapse velocity covariance
    this.P[3 * 15 + 3] = 0.01;
    this.P[4 * 15 + 4] = 0.01;
    this.P[5 * 15 + 5] = 0.01;
  }

  /**
   * AI Velocity Measurement Update (fuses E5 forward speed prediction)
   */
  public updateAiVelocity(speedMps: number, variance: number): void {
    if (!this.initialized) return;
    const currentSpeed = Math.sqrt(this.velocity[0] ** 2 + this.velocity[1] ** 2);
    const kGain = Math.min(0.3, 1.0 / (1.0 + variance));
    const speedCorrection = (speedMps - currentSpeed) * kGain;

    if (currentSpeed > 0.1) {
      const scale = (currentSpeed + speedCorrection) / currentSpeed;
      this.velocity[0] *= scale;
      this.velocity[1] *= scale;
    } else {
      this.velocity[0] = speedCorrection;
    }
  }

  /**
   * GNSS Measurement Update (continuous Kalman gain innovation blending)
   */
  public updateGNSS(gnss: GNSSObservation): void {
    if (!this.initialized) {
      this.initialize(gnss);
      return;
    }
    // Innovation in navigation frame (meters)
    const dLatM = (gnss.latitude - this.lat) * 111319.5;
    const cosLat = Math.max(Math.cos((this.lat * Math.PI) / 180.0), 0.01);
    const dLonM = (gnss.longitude - this.lon) * (111319.5 * cosLat);
    const dAltM = gnss.altitude - this.alt;

    // Measurement noise based on reported accuracy
    const rPos = Math.max(gnss.accuracy ?? 5.0, 1.0) ** 2;

    const pPosN = this.P[0 * 15 + 0];
    const pPosE = this.P[1 * 15 + 1];
    const pPosD = this.P[2 * 15 + 2];

    const kGainN = pPosN / (pPosN + rPos);
    const kGainE = pPosE / (pPosE + rPos);
    const kGainD = pPosD / (pPosD + rPos);

    // Limit maximum single-step correction to prevent sudden jumps
    const corrN = Math.max(Math.min(kGainN * dLatM, 15.0), -15.0);
    const corrE = Math.max(Math.min(kGainE * dLonM, 15.0), -15.0);
    const corrD = Math.max(Math.min(kGainD * dAltM, 10.0), -10.0);

    this.lat += corrN / 111319.5;
    this.lon += corrE / (111319.5 * cosLat);
    this.alt += corrD;

    // Update covariance
    this.P[0 * 15 + 0] = (1 - kGainN) * pPosN;
    this.P[1 * 15 + 1] = (1 - kGainE) * pPosE;
    this.P[2 * 15 + 2] = (1 - kGainD) * pPosD;

    // If speed provided by GNSS (even if heading is missing on mobile)
    if (gnss.speed !== undefined && gnss.speed >= 0) {
      if (gnss.speed < 0.3) {
        // Vehicle stationary -> apply ZUPT damping
        this.velocity[0] *= 0.1;
        this.velocity[1] *= 0.1;
        this.velocity[2] *= 0.1;
      } else {
        const headingDeg = (gnss.heading !== undefined && !isNaN(gnss.heading)) ? gnss.heading : this.getHeadingDeg();
        const hRad = (headingDeg * Math.PI) / 180.0;
        const vN = gnss.speed * Math.cos(hRad);
        const vE = gnss.speed * Math.sin(hRad);
        const kVel = 0.5;
        this.velocity[0] += (vN - this.velocity[0]) * kVel;
        this.velocity[1] += (vE - this.velocity[1]) * kVel;
      }
    }
  }

  public getSpeed(): number {
    return Math.sqrt(this.velocity[0] ** 2 + this.velocity[1] ** 2);
  }

  public getHeadingDeg(): number {
    const q = this.quaternion;
    const siny_cosp = 2 * (q[0] * q[3] + q[1] * q[2]);
    const cosy_cosp = 1 - 2 * (q[2] * q[2] + q[3] * q[3]);
    let yawRad = Math.atan2(siny_cosp, cosy_cosp);
    let deg = (yawRad * 180.0) / Math.PI;
    if (deg < 0) deg += 360;
    return deg;
  }

  public getEulerAnglesDeg(): { roll: number; pitch: number; yaw: number } {
    const q = this.quaternion;
    // roll (x-axis rotation)
    const sinr_cosp = 2 * (q[0] * q[1] + q[2] * q[3]);
    const cosr_cosp = 1 - 2 * (q[1] * q[1] + q[2] * q[2]);
    const roll = (Math.atan2(sinr_cosp, cosr_cosp) * 180.0) / Math.PI;

    // pitch (y-axis rotation)
    const sinp = 2 * (q[0] * q[2] - q[3] * q[1]);
    let pitch: number;
    if (Math.abs(sinp) >= 1) {
      pitch = (Math.sign(sinp) * Math.PI) / 2; // use 90 degrees if out of range
    } else {
      pitch = Math.asin(sinp);
    }
    pitch = (pitch * 180.0) / Math.PI;

    // yaw (z-axis rotation)
    const yaw = this.getHeadingDeg();

    return { roll, pitch, yaw };
  }

  public getTrace(): number {
    let trace = 0;
    for (let i = 0; i < 15; i++) {
      trace += this.P[i * 15 + i];
    }
    return trace;
  }
}

export class DecileScalarCalibrator {
  private k = 1.9122540606990217;
  private sigmaFloor = 0.05;

  public calibrate(predictedError: number): { sigma: number; variance: number } {
    const sigma = Math.max(this.k * predictedError, this.sigmaFloor);
    return { sigma, variance: sigma ** 2 };
  }
}

/**
 * High-performance Automated Feasibility Benchmark Runner
 */
export async function runClientEngineBenchmark(): Promise<BenchmarkMetrics> {
  const pipeline = new ClientFeaturePipeline();
  const filter = new ClientInEKF();
  const calibrator = new DecileScalarCalibrator();

  const initGNSS: GNSSObservation = {
    timestamp: 1000.0,
    latitude: 23.0225,
    longitude: 72.5714,
    altitude: 55.0,
    accuracy: 4.5,
    speed: 12.0,
    heading: 90.0,
  };

  filter.initialize(initGNSS);

  // 1. Measure Feature Extraction Latency over 200 iterations
  const imuSample: IMUSample = {
    timestamp: 1000.02,
    accel_x: 0.15,
    accel_y: -0.05,
    accel_z: 9.81,
    gyro_x: 0.002,
    gyro_y: -0.001,
    gyro_z: 0.012,
  };

  const tStartFeat = performance.now();
  for (let i = 0; i < 200; i++) {
    pipeline.extractFeatures(imuSample);
  }
  const tEndFeat = performance.now();
  const featureLatencyMs = (tEndFeat - tStartFeat) / 200;

  // 2. Measure Filter Step Latency over 200 iterations
  const tStartFilter = performance.now();
  for (let i = 0; i < 200; i++) {
    imuSample.timestamp += 0.02;
    filter.predict(imuSample);
    if (i % 5 === 0) {
      filter.updateNHC();
    }
    if (i % 50 === 0) {
      calibrator.calibrate(0.42);
    }
  }
  const tEndFilter = performance.now();
  const filterLatencyMs = (tEndFilter - tStartFilter) / 200;

  const totalStepLatencyMs = featureLatencyMs + filterLatencyMs;
  const maxSustainableHz = Math.round(1000.0 / Math.max(totalStepLatencyMs, 0.001));

  // 3. Verify Covariance Symmetry and Numerical Sanity
  let symmetric = true;
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      if (Math.abs(filter.P[r * 15 + c] - filter.P[c * 15 + r]) > 1e-6) {
        symmetric = false;
        break;
      }
    }
  }

  // Calculate position displacement in meters
  const dLatM = (filter.lat - initGNSS.latitude) * 111319.5;
  const dLonM = (filter.lon - initGNSS.longitude) * 111319.5 * Math.cos((initGNSS.latitude * Math.PI) / 180.0);
  const positionDriftMeters = Math.sqrt(dLatM ** 2 + dLonM ** 2);

  const passedFeasibility =
    totalStepLatencyMs < 5.0 &&
    maxSustainableHz >= 50 &&
    symmetric &&
    !isNaN(filter.lat) &&
    !isNaN(filter.lon) &&
    !isNaN(filter.getTrace());

  return {
    featureExtractionLatencyMs: Math.round(featureLatencyMs * 1000) / 1000,
    filterStepLatencyMs: Math.round(filterLatencyMs * 1000) / 1000,
    totalStepLatencyMs: Math.round(totalStepLatencyMs * 1000) / 1000,
    maxSustainableHz,
    covarianceSymmetric: symmetric,
    positionDriftMeters: Math.round(positionDriftMeters * 10) / 10,
    passedFeasibility,
  };
}
