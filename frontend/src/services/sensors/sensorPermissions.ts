/**
 * YatraSaarthi - Sensor Permissions Handling
 * 
 * Requests real browser permissions (Geolocation API, iOS DeviceMotionEvent).
 */

export type PermissionState = 'GRANTED' | 'DENIED' | 'PROMPT' | 'UNSUPPORTED';

export async function requestGeolocationPermission(): Promise<PermissionState> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return 'UNSUPPORTED';
  
  try {
    // Some browsers support Permissions API for geolocation
    if ('permissions' in navigator) {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      if (result.state === 'granted') return 'GRANTED';
      if (result.state === 'denied') return 'DENIED';
    }
    
    // Fallback: request permission by trying to get position once
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve('GRANTED'),
        (error) => {
          if (error.code === error.PERMISSION_DENIED) resolve('DENIED');
          else resolve('PROMPT'); // Could be timeout or unavailable, but not explicitly denied
        },
        { timeout: 5000, maximumAge: 0 }
      );
    });
  } catch (error) {
    console.error('Error requesting geolocation permission:', error);
    return 'PROMPT';
  }
}

export async function requestMotionPermission(): Promise<PermissionState> {
  if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return 'UNSUPPORTED';
  
  try {
    // @ts-ignore - iOS specific API
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      // @ts-ignore
      const state = await DeviceMotionEvent.requestPermission();
      return state === 'granted' ? 'GRANTED' : 'DENIED';
    }
    // Android/Desktop generally doesn't require explicit prompt if supported
    return 'GRANTED';
  } catch (error) {
    console.error('Error requesting motion permission:', error);
    return 'PROMPT';
  }
}

export async function requestOrientationPermission(): Promise<PermissionState> {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return 'UNSUPPORTED';
  
  try {
    // @ts-ignore - iOS specific API
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      // @ts-ignore
      const state = await DeviceOrientationEvent.requestPermission();
      return state === 'granted' ? 'GRANTED' : 'DENIED';
    }
    // Android/Desktop generally doesn't require explicit prompt if supported
    return 'GRANTED';
  } catch (error) {
    console.error('Error requesting orientation permission:', error);
    return 'PROMPT';
  }
}
