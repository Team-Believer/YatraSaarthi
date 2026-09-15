import { useLocationStore } from '../../stores/useLocationStore';

export class LocationService {
  private watchId: number | null = null;
  private staleTimer: any = null;
  private isRunning = false;

  public startWatching() {
    if (this.isRunning) return;
    this.isRunning = true;

    if (!('geolocation' in navigator)) {
      useLocationStore.getState().setAvailability('unavailable');
      useLocationStore.getState().setError('Geolocation is not supported by this browser');
      return;
    }

    useLocationStore.getState().setAvailability('getting');

    // Check permission state via Permissions API if available
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          this.handlePermissionChange(status.state);
          status.onchange = () => this.handlePermissionChange(status.state);
        })
        .catch(() => {
          // Ignore permissions query failure on unsupported browsers
        });
    }

    // Start geolocation watcher
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        useLocationStore.getState().setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp,
        });
        useLocationStore.getState().setPermission('granted');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          useLocationStore.getState().setPermission('denied');
          useLocationStore.getState().setError('Location permission denied by user');
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          useLocationStore.getState().setAvailability('unavailable');
          useLocationStore.getState().setError('Location signal unavailable');
        } else if (err.code === err.TIMEOUT) {
          // Check if we already had a position
          if (useLocationStore.getState().latitude === null) {
            useLocationStore.getState().setAvailability('unavailable');
          } else {
            useLocationStore.getState().checkStale(10000);
          }
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );

    // Stale location check loop (every 10s)
    this.staleTimer = setInterval(() => {
      useLocationStore.getState().checkStale(25000);
    }, 10000);
  }

  private handlePermissionChange(state: PermissionState) {
    if (state === 'granted') {
      useLocationStore.getState().setPermission('granted');
    } else if (state === 'denied') {
      useLocationStore.getState().setPermission('denied');
    } else {
      useLocationStore.getState().setPermission('prompt');
    }
  }

  public stopWatching() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.staleTimer) {
      clearInterval(this.staleTimer);
      this.staleTimer = null;
    }
    this.isRunning = false;
  }
}

export const locationService = new LocationService();
