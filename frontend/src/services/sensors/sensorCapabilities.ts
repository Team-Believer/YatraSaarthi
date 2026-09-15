/**
 * YatraSaarthi - Sensor Capabilities Detection
 * 
 * Detects ACTUAL browser/device sensor support.
 * No assumptions. No faking.
 */

export interface SensorCapabilities {
  geolocation: boolean;
  deviceMotion: boolean;
  deviceOrientation: boolean;
  absoluteOrientation: boolean;
  permissions: boolean;
}

export function detectSensorCapabilities(): SensorCapabilities {
  return {
    geolocation: 'geolocation' in navigator,
    deviceMotion: 'DeviceMotionEvent' in window,
    deviceOrientation: 'DeviceOrientationEvent' in window,
    absoluteOrientation: 'DeviceOrientationAbsoluteEvent' in window || 'DeviceOrientationEvent' in window,
    permissions: 'permissions' in navigator,
  };
}

export function getSensorStatusLabel(available: boolean, permissionGranted?: boolean): string {
  if (!available) return 'Unavailable on this device/browser';
  if (permissionGranted === false) return 'Permission required';
  if (permissionGranted === true) return 'Active';
  return 'Ready';
}
