import { useLocationStore } from '../../stores/useLocationStore';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export class LocationService {
  private watchId: number | null = null;
  private staleTimer: any = null;
  private isRunning = false;
  private lastResolvedLat: number | null = null;
  private lastResolvedLon: number | null = null;
  private lastResolvedTime = 0;
  private isResolving = false;

  public async reverseGeocode(lat: number, lon: number) {
    if (this.isResolving || !MAPBOX_TOKEN) return;

    const now = Date.now();
    if (
      this.lastResolvedLat !== null &&
      this.lastResolvedLon !== null &&
      now - this.lastResolvedTime < 15000 &&
      haversineDistanceMeters(this.lastResolvedLat, this.lastResolvedLon, lat, lon) < 250
    ) {
      return;
    }

    this.isResolving = true;
    this.lastResolvedLat = lat;
    this.lastResolvedLon = lon;
    this.lastResolvedTime = now;

    try {
      // Primary: Mapbox Geocoding v5 places endpoint (most reliable reverse geocoder)
      const v5Url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?types=neighborhood,locality,place,district,region&limit=1&access_token=${MAPBOX_TOKEN}`;
      const v5Res = await fetch(v5Url);
      const v5Data = await v5Res.json();

      if (v5Data.features && v5Data.features.length > 0) {
        const feat = v5Data.features[0];
        let label = '';
        if (feat.text && feat.context && feat.context.length > 0) {
          const parent = feat.context[0]?.text;
          label = parent && !parent.toLowerCase().includes(feat.text.toLowerCase())
            ? `${feat.text}, ${parent}`
            : feat.text;
        } else if (feat.place_name) {
          label = feat.place_name.split(',').slice(0, 2).join(', ').trim();
        }

        if (label) {
          useLocationStore.getState().setPlaceName(label);
          return;
        }
      }

      // Secondary fallback: Mapbox Geocoding v6 search endpoint
      const v6Url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lon}&latitude=${lat}&access_token=${MAPBOX_TOKEN}&types=neighborhood,locality,place,district,region&limit=1`;
      const res6 = await fetch(v6Url);
      const data6 = await res6.json();

      if (data6.features && data6.features.length > 0) {
        const feat6 = data6.features[0];
        const name = feat6.properties?.name || feat6.properties?.name_preferred;
        const ctx = feat6.properties?.context;
        const higherPlace = ctx?.place?.name || ctx?.locality?.name || ctx?.region?.name;

        let label6 = name;
        if (name && higherPlace && !higherPlace.toLowerCase().includes(name.toLowerCase())) {
          label6 = `${name}, ${higherPlace}`;
        } else if (!label6 && feat6.properties?.place_formatted) {
          label6 = feat6.properties.place_formatted.split(',').slice(0, 2).join(', ').trim();
        }

        if (label6) {
          useLocationStore.getState().setPlaceName(label6);
          return;
        }
      }
    } catch (err) {
      console.warn('Reverse geocoding lookup non-fatal error:', err);
    } finally {
      this.isResolving = false;
    }
  }

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
        const { latitude, longitude, accuracy, altitude, speed, heading } = position.coords;
        useLocationStore.getState().setLocation({
          latitude,
          longitude,
          accuracy,
          altitude,
          speed,
          heading,
          timestamp: position.timestamp,
        });
        useLocationStore.getState().setPermission('granted');

        // Asynchronously resolve human-readable place name with throttling
        this.reverseGeocode(latitude, longitude).catch(() => {});
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

    // Start orientation compass listener if supported
    const win = window as any;
    if ('ondeviceorientationabsolute' in win) {
      win.addEventListener('deviceorientationabsolute', this.handleOrientation, true);
    } else if ('addEventListener' in win) {
      win.addEventListener('deviceorientation', this.handleOrientation, true);
    }

    // Stale location check loop (every 10s)
    this.staleTimer = setInterval(() => {
      useLocationStore.getState().checkStale(25000);
    }, 10000);
  }

  public async requestOrientationPermission(): Promise<boolean> {
    const win = window as any;
    if (win.DeviceOrientationEvent && typeof win.DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const res = await win.DeviceOrientationEvent.requestPermission();
        if (res === 'granted') {
          if ('ondeviceorientationabsolute' in win) {
            win.addEventListener('deviceorientationabsolute', this.handleOrientation, true);
          } else {
            win.addEventListener('deviceorientation', this.handleOrientation, true);
          }
          return true;
        }
        return false;
      } catch (err) {
        console.warn('Orientation permission request error:', err);
        return false;
      }
    }
    return true;
  }

  private handleOrientation = (event: DeviceOrientationEvent) => {
    let heading: number | null = null;
    const winEvent = event as any;
    if (typeof winEvent.webkitCompassHeading === 'number' && !isNaN(winEvent.webkitCompassHeading) && winEvent.webkitCompassHeading >= 0) {
      heading = winEvent.webkitCompassHeading;
    } else if (typeof event.alpha === 'number' && !isNaN(event.alpha) && (event.absolute || 'ondeviceorientationabsolute' in window || event.alpha !== 0)) {
      heading = (360 - event.alpha) % 360;
    }

    if (heading !== null && isFinite(heading) && heading >= 0 && heading <= 360) {
      useLocationStore.getState().setCompassHeading(Math.round(heading));
    }
  };

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
    const win = window as any;
    if ('ondeviceorientationabsolute' in win) {
      win.removeEventListener('deviceorientationabsolute', this.handleOrientation, true);
    } else if ('removeEventListener' in win) {
      win.removeEventListener('deviceorientation', this.handleOrientation, true);
    }
    if (this.staleTimer) {
      clearInterval(this.staleTimer);
      this.staleTimer = null;
    }
    this.isRunning = false;
  }
}

export const locationService = new LocationService();
