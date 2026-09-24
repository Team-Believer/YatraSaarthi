/**
 * YatraSaarthi - Vehicle Mounting & Sensor Calibration Service
 * 
 * Manages first-run phone-to-vehicle alignment status:
 * - NOT_CALIBRATED
 * - CALIBRATING
 * - CALIBRATED
 * - NEEDS_RECOVERY
 * 
 * Tracks real state:
 * - Gravity alignment: Phone attitude & gravity vector decomposition
 * - Motion alignment: IMU stream & Non-Holonomic Constraint (NHC)
 * - Heading alignment: Magnetic/GPS course resolution
 */

export type CalibrationStatus =
  | 'NOT_CALIBRATED'
  | 'CALIBRATING'
  | 'CALIBRATED'
  | 'NEEDS_RECOVERY';

export interface CalibrationProgress {
  gravityAligned: boolean;
  motionAligned: boolean;
  headingAligned: boolean;
  isComplete: boolean;
}

const STORAGE_KEY = 'yatrasaarthi_calibration_status';

class CalibrationService {
  private status: CalibrationStatus = 'NOT_CALIBRATED';
  private listeners = new Set<(status: CalibrationStatus) => void>();

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as CalibrationStatus | null;
      if (stored === 'CALIBRATED' || stored === 'NEEDS_RECOVERY') {
        this.status = stored;
      }
    }
  }

  public getStatus(): CalibrationStatus {
    return this.status;
  }

  public setStatus(newStatus: CalibrationStatus): void {
    this.status = newStatus;
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newStatus);
    }
    this.listeners.forEach((cb) => cb(newStatus));
  }

  public subscribe(cb: (status: CalibrationStatus) => void): () => void {
    this.listeners.add(cb);
    cb(this.status);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public reset(): void {
    this.setStatus('NOT_CALIBRATED');
  }

  public markCalibrated(): void {
    this.setStatus('CALIBRATED');
  }
}

export const calibrationService = new CalibrationService();
