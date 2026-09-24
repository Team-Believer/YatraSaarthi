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
  const hasNavigator = typeof navigator !== 'undefined';
  const hasWindow = typeof window !== 'undefined';

  return {
    geolocation: hasNavigator && 'geolocation' in navigator,
    deviceMotion: hasWindow && 'DeviceMotionEvent' in window,
    deviceOrientation: hasWindow && 'DeviceOrientationEvent' in window,
    absoluteOrientation:
      hasWindow && ('DeviceOrientationAbsoluteEvent' in window || 'DeviceOrientationEvent' in window),
    permissions: hasNavigator && 'permissions' in navigator,
  };
}

export function getSensorStatusLabel(available: boolean, permissionGranted?: boolean): string {
  if (!available) return 'Unavailable on this device/browser';
  if (permissionGranted === false) return 'Permission required';
  if (permissionGranted === true) return 'Active';
  return 'Ready';
}
