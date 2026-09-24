/**
 * YatraSaarthi - Real Geolocation Collector
 * 
 * Subscribes to navigator.geolocation for real coordinates.
 */
export interface GeolocationData {
  timestamp: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number;
  speed: number | null;
  heading: number | null;
}

export type GeolocationCallback = (data: GeolocationData) => void;
export type GeolocationErrorCallback = (error: GeolocationPositionError) => void;

export class GeolocationCollector {
  private watchId: number | null = null;
  private onData: GeolocationCallback | null = null;
  private onError: GeolocationErrorCallback | null = null;

  public start(onData: GeolocationCallback, onError: GeolocationErrorCallback) {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      console.error('Geolocation not supported');
      return;
    }

    this.onData = onData;
    this.onError = onError;

    this.watchId = navigator.geolocation.watchPosition(
      this.handlePosition,
      this.handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  public stop() {
    if (typeof navigator !== 'undefined' && this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    this.watchId = null;
    this.onData = null;
    this.onError = null;
  }

  private handlePosition = (position: GeolocationPosition) => {
    if (!this.onData) return;

    // position.timestamp is Unix time in milliseconds
    const timestampSeconds = position.timestamp / 1000.0;

    this.onData({
      timestamp: timestampSeconds,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude,
      accuracy: position.coords.accuracy,
      speed: position.coords.speed,
      heading: position.coords.heading,
    });
  };

  private handleError = (error: GeolocationPositionError) => {
    if (this.onError) {
      this.onError(error);
    }
  };
}
