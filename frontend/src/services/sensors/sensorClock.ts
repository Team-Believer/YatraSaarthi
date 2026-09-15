/**
 * YatraSaarthi - Sensor Clock
 * 
 * Synchronizes sensor event timestamps (which may be relative to page load
 * via performance.now()) to absolute UTC Unix timestamps.
 */

class SensorClock {
  private initialTimeOffset: number;

  constructor() {
    // Offset between performance.now() and Date.now()
    // performance.timeOrigin is more precise if available
    if (performance && performance.timeOrigin) {
      this.initialTimeOffset = performance.timeOrigin;
    } else {
      this.initialTimeOffset = Date.now() - performance.now();
    }
  }

  /**
   * Convert a DOMHighResTimeStamp (from sensor events) to a Unix timestamp (seconds).
   * @param eventTimestamp Timestamp from the event object (milliseconds)
   * @returns Unix timestamp in seconds
   */
  public toUnixSeconds(eventTimestamp: number): number {
    // eventTimestamp is usually relative to performance.timeOrigin
    const absoluteMs = this.initialTimeOffset + eventTimestamp;
    return absoluteMs / 1000.0;
  }

  /**
   * Get current Unix timestamp in seconds.
   */
  public nowSeconds(): number {
    return Date.now() / 1000.0;
  }
}

export const sensorClock = new SensorClock();
